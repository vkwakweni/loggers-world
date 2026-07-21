process.env.TABLE_NAME = 'test-table';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ConditionalCheckFailedException } = require('@aws-sdk/client-dynamodb');
const { docClient } = require('../db');
const logEntriesController = require('../controllers/logEntriesController');
const { createMockRes } = require('../test-support/helpers');

const SCHEMA_FIELDS = [
  { name: 'exercise', type: 'string', required: true },
  { name: 'reps', type: 'number', required: false },
];

function mockLogTypeThenCommand(t, otherCommandName, otherResult) {
  return t.mock.method(docClient, 'send', async (command) => {
    if (command.constructor.name === 'GetCommand') {
      return { Item: { typeId: 'type-1', fields: SCHEMA_FIELDS } };
    }
    assert.equal(command.constructor.name, otherCommandName);
    if (otherResult instanceof Error) {
      throw otherResult;
    }
    return otherResult;
  });
}

test('createLogEntry: parent LogType not found responds 404', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'GetCommand');
    return {};
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'type-1' }, body: { fields: { exercise: 'Squats' } } };
  const res = createMockRes();

  await logEntriesController.createLogEntry(req, res);

  assert.equal(sendMock.mock.callCount(), 1);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'log type not found');
});

test('createLogEntry: entryFields failing schema validation responds 400', async (t) => {
  const sendMock = mockLogTypeThenCommand(t, 'PutCommand', {});

  const req = { ownerId: 'owner-1', params: { typeId: 'type-1' }, body: { fields: { reps: 10 } } };
  const res = createMockRes();

  await logEntriesController.createLogEntry(req, res);

  assert.equal(sendMock.mock.callCount(), 1, 'PutCommand should not be reached');
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'missing required field "exercise"');
});

test('createLogEntry: valid payload writes item and responds 201', async (t) => {
  mockLogTypeThenCommand(t, 'PutCommand', {});

  const req = {
    ownerId: 'owner-1',
    params: { typeId: 'type-1' },
    body: { fields: { exercise: 'Squats', reps: 10 } },
  };
  const res = createMockRes();

  await logEntriesController.createLogEntry(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.typeId, 'type-1');
  assert.equal(res.body.ownerId, 'owner-1');
  assert.deepEqual(res.body.fields, { exercise: 'Squats', reps: 10 });
  assert.match(res.body.SK, /^ENTRY#type-1#/);
});

test('listLogEntries: queries newest-first and returns items', async (t) => {
  const items = [{ createdAt: '2026-01-02' }, { createdAt: '2026-01-01' }];
  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'QueryCommand');
    assert.equal(command.input.ExpressionAttributeValues[':skPrefix'], 'ENTRY#type-1#');
    assert.equal(command.input.ScanIndexForward, false);
    return { Items: items };
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'type-1' } };
  const res = createMockRes();

  await logEntriesController.listLogEntries(req, res);

  assert.equal(sendMock.mock.callCount(), 1);
  assert.deepEqual(res.body, items);
});

test('updateLogEntry: parent LogType not found responds 404', async (t) => {
  t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'GetCommand');
    return {};
  });

  const req = {
    ownerId: 'owner-1',
    params: { typeId: 'type-1', createdAt: '2026-01-01' },
    body: { fields: { exercise: 'Squats' } },
  };
  const res = createMockRes();

  await logEntriesController.updateLogEntry(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'log type not found');
});

test('updateLogEntry: entryFields failing schema validation responds 400', async (t) => {
  mockLogTypeThenCommand(t, 'UpdateCommand', {});

  const req = {
    ownerId: 'owner-1',
    params: { typeId: 'type-1', createdAt: '2026-01-01' },
    body: { fields: { exercise: 'Squats', reps: 'not-a-number' } },
  };
  const res = createMockRes();

  await logEntriesController.updateLogEntry(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'field "reps" must be a number');
});

test('updateLogEntry: valid payload responds 200 with updated attributes', async (t) => {
  const updated = { exercise: 'Squats', reps: 12 };
  mockLogTypeThenCommand(t, 'UpdateCommand', { Attributes: { fields: updated } });

  const req = {
    ownerId: 'owner-1',
    params: { typeId: 'type-1', createdAt: '2026-01-01' },
    body: { fields: updated },
  };
  const res = createMockRes();

  await logEntriesController.updateLogEntry(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.fields, updated);
});

test('updateLogEntry: nonexistent entry responds 404', async (t) => {
  mockLogTypeThenCommand(t, 'UpdateCommand', new ConditionalCheckFailedException({ message: 'condition failed', $metadata: {} }));

  const req = {
    ownerId: 'owner-1',
    params: { typeId: 'type-1', createdAt: 'does-not-exist' },
    body: { fields: { exercise: 'Squats' } },
  };
  const res = createMockRes();

  await logEntriesController.updateLogEntry(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'log entry not found');
});

test('deleteLogEntry: success responds 204', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'DeleteCommand');
    return {};
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'type-1', createdAt: '2026-01-01' } };
  const res = createMockRes();

  await logEntriesController.deleteLogEntry(req, res);

  assert.equal(sendMock.mock.callCount(), 1);
  assert.equal(res.statusCode, 204);
});

test('deleteLogEntry: nonexistent entry responds 404', async (t) => {
  t.mock.method(docClient, 'send', async () => {
    throw new ConditionalCheckFailedException({ message: 'condition failed', $metadata: {} });
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'type-1', createdAt: 'does-not-exist' } };
  const res = createMockRes();

  await logEntriesController.deleteLogEntry(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'log entry not found');
});
