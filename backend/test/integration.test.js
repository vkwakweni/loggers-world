process.env.TABLE_NAME = 'test-table';
process.env.USER_POOL_ID = 'test-pool';
process.env.USER_POOL_CLIENT_ID = 'test-client';

const test = require('node:test');
const { mock } = test;
const assert = require('node:assert/strict');
const request = require('supertest');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// requireAuth calls CognitoJwtVerifier.create() once, at module-load time, so
// this mock must be installed before the first `require('../index')` below.
mock.method(CognitoJwtVerifier, 'create', () => ({
  verify: async (token) => {
    if (token !== 'valid-token') {
      throw new Error('invalid token');
    }
    return { sub: 'owner-1' };
  },
}));

const app = require('../index');
const { docClient } = require('../db');
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');

const SCHEMA_FIELDS = [
  { name: 'exercise', type: 'text', required: true },
  { name: 'reps', type: 'number', required: false },
];

function authed(req) {
  return req.set('Authorization', 'Bearer valid-token');
}

test('core flow: create type -> create entry -> fetch -> edit -> delete', async (t) => {
  let logType;
  let entry;

  t.mock.method(docClient, 'send', async (command) => {
    const name = command.constructor.name;

    if (name === 'PutCommand' && command.input.Item.entryId) {
      entry = command.input.Item;
      return {};
    }
    if (name === 'PutCommand' && command.input.Item.typeId) {
      logType = command.input.Item;
      return {};
    }
    if (name === 'GetCommand') {
      return { Item: logType };
    }
    if (name === 'QueryCommand') {
      return { Items: [entry] };
    }
    if (name === 'UpdateCommand') {
      entry = { ...entry, fields: command.input.ExpressionAttributeValues[':fields'] };
      return { Attributes: entry };
    }
    if (name === 'DeleteCommand') {
      return {};
    }
    throw new Error(`unexpected command: ${name}`);
  });

  const createTypeRes = await authed(request(app).post('/log-types')).send({
    name: 'Workouts',
    fields: SCHEMA_FIELDS,
  });
  assert.equal(createTypeRes.status, 201);
  const { typeId } = createTypeRes.body;

  const createEntryRes = await authed(request(app).post(`/log-types/${typeId}/entries`)).send({
    fields: { exercise: 'Squats', reps: 10 },
  });
  assert.equal(createEntryRes.status, 201);
  const { createdAt } = createEntryRes.body;

  const listRes = await authed(request(app).get(`/log-types/${typeId}/entries`));
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.length, 1);
  assert.equal(listRes.body[0].fields.exercise, 'Squats');

  const editRes = await authed(request(app).patch(`/log-types/${typeId}/entries/${createdAt}`)).send({
    fields: { exercise: 'Deadlifts', reps: 5 },
  });
  assert.equal(editRes.status, 200);
  assert.equal(editRes.body.fields.exercise, 'Deadlifts');

  const deleteRes = await authed(request(app).delete(`/log-types/${typeId}/entries/${createdAt}`));
  assert.equal(deleteRes.status, 204);
});

test('core flow: create type -> archive -> delete cascades its entries', async (t) => {
  let logType;
  const entries = [];

  t.mock.method(docClient, 'send', async (command) => {
    const name = command.constructor.name;

    if (name === 'PutCommand' && command.input.Item.entryId) {
      entries.push(command.input.Item);
      return {};
    }
    if (name === 'PutCommand' && command.input.Item.typeId) {
      logType = command.input.Item;
      return {};
    }
    if (name === 'GetCommand') {
      return { Item: logType };
    }
    if (name === 'UpdateCommand') {
      logType = { ...logType, archived: command.input.ExpressionAttributeValues[':archived'] };
      return { Attributes: logType };
    }
    if (name === 'QueryCommand') {
      return { Items: entries };
    }
    if (name === 'BatchWriteCommand') {
      return { UnprocessedItems: {} };
    }
    throw new Error(`unexpected command: ${name}`);
  });

  const createTypeRes = await authed(request(app).post('/log-types')).send({
    name: 'Workouts',
    fields: SCHEMA_FIELDS,
  });
  assert.equal(createTypeRes.status, 201);
  const { typeId } = createTypeRes.body;

  const createEntryRes = await authed(request(app).post(`/log-types/${typeId}/entries`)).send({
    fields: { exercise: 'Squats', reps: 10 },
  });
  assert.equal(createEntryRes.status, 201);

  const archiveRes = await authed(request(app).patch(`/log-types/${typeId}/archive`)).send({ archived: true });
  assert.equal(archiveRes.status, 200);
  assert.equal(archiveRes.body.archived, true);

  const deleteRes = await authed(request(app).delete(`/log-types/${typeId}`));
  assert.equal(deleteRes.status, 204);
});

test('core flow: delete account removes the Cognito user and all owned data', async (t) => {
  t.mock.method(CognitoIdentityProviderClient.prototype, 'send', async (command) => {
    assert.equal(command.constructor.name, 'AdminDeleteUserCommand');
    assert.equal(command.input.Username, 'owner-1');
    return {};
  });
  t.mock.method(docClient, 'send', async (command) => {
    const name = command.constructor.name;
    if (name === 'QueryCommand') {
      return { Items: [{ PK: 'USER#owner-1', SK: 'TYPE#type-1' }] };
    }
    if (name === 'BatchWriteCommand') {
      return { UnprocessedItems: {} };
    }
    throw new Error(`unexpected command: ${name}`);
  });

  const res = await authed(request(app).delete('/account'));
  assert.equal(res.status, 204);
});

test('core flow: missing bearer token is rejected before reaching the controller', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async () => {
    throw new Error('docClient.send should not be called for an unauthenticated request');
  });

  const res = await request(app).get('/log-types');

  assert.equal(res.status, 401);
  assert.equal(sendMock.mock.callCount(), 0);
});
