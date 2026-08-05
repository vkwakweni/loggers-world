process.env.TABLE_NAME = 'test-table';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ConditionalCheckFailedException } = require('@aws-sdk/client-dynamodb');
const { docClient } = require('../db');
const logTypesController = require('../controllers/logTypesController');
const { createMockRes } = require('../test-support/helpers');

test('createLogType: valid payload writes item and responds 201', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'PutCommand');
    assert.equal(command.input.Item.name, 'Books');
    assert.equal(command.input.Item.ownerId, 'owner-1');
    assert.equal(command.input.Item.PK, 'USER#owner-1');
    assert.match(command.input.Item.SK, /^TYPE#/);
    return {};
  });

  const req = {
    ownerId: 'owner-1',
    body: { name: 'Books', fields: [{ name: 'title', type: 'string', required: true }] },
  };
  const res = createMockRes();

  await logTypesController.createLogType(req, res);

  assert.equal(sendMock.mock.callCount(), 1);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.name, 'Books');
});

test('createLogType: missing name responds 400 without writing', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async () => ({}));

  const req = { ownerId: 'owner-1', body: { fields: [{ name: 'title', type: 'string' }] } };
  const res = createMockRes();

  await logTypesController.createLogType(req, res);

  assert.equal(sendMock.mock.callCount(), 0);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'name is required');
});

test('createLogType: empty fields array responds 400', async (t) => {
  t.mock.method(docClient, 'send', async () => ({}));

  const req = { ownerId: 'owner-1', body: { name: 'Books', fields: [] } };
  const res = createMockRes();

  await logTypesController.createLogType(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'fields must be a non-empty array');
});

test('createLogType: field missing type responds 400', async (t) => {
  t.mock.method(docClient, 'send', async () => ({}));

  const req = { ownerId: 'owner-1', body: { name: 'Books', fields: [{ name: 'title' }] } };
  const res = createMockRes();

  await logTypesController.createLogType(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'each field requires a type');
});

test('listLogTypes: queries by owner and returns items', async (t) => {
  const items = [{ typeId: 'a' }, { typeId: 'b' }];
  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'QueryCommand');
    assert.equal(command.input.ExpressionAttributeValues[':pk'], 'USER#owner-1');
    assert.equal(command.input.ExpressionAttributeValues[':skPrefix'], 'TYPE#');
    return { Items: items };
  });

  const req = { ownerId: 'owner-1' };
  const res = createMockRes();

  await logTypesController.listLogTypes(req, res);

  assert.equal(sendMock.mock.callCount(), 1);
  assert.deepEqual(res.body, items);
});

test('getLogType: found responds 200 with the item', async (t) => {
  const item = { typeId: 'abc', name: 'Books' };
  t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'GetCommand');
    return { Item: item };
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'abc' } };
  const res = createMockRes();

  await logTypesController.getLogType(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, item);
});

test('getLogType: not found responds 404', async (t) => {
  t.mock.method(docClient, 'send', async () => ({}));

  const req = { ownerId: 'owner-1', params: { typeId: 'does-not-exist' } };
  const res = createMockRes();

  await logTypesController.getLogType(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'log type not found');
});

test('deleteLogType: not found responds 404 without querying or deleting', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'GetCommand');
    return {};
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'does-not-exist' } };
  const res = createMockRes();

  await logTypesController.deleteLogType(req, res);

  assert.equal(sendMock.mock.callCount(), 1, 'only the existence check should run');
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'log type not found');
});

test('deleteLogType: success cascades entries then the type, responds 204', async (t) => {
  const entries = [
    { PK: 'USER#owner-1', SK: 'ENTRY#type-1#2026-01-01T00:00:00Z' },
    { PK: 'USER#owner-1', SK: 'ENTRY#type-1#2026-01-02T00:00:00Z' },
  ];
  const calls = [];

  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    const name = command.constructor.name;
    calls.push(name);
    if (name === 'GetCommand') {
      return { Item: { typeId: 'type-1' } };
    }
    if (name === 'QueryCommand') {
      assert.equal(command.input.ExpressionAttributeValues[':pk'], 'USER#owner-1');
      assert.equal(command.input.ExpressionAttributeValues[':skPrefix'], 'ENTRY#type-1#');
      return { Items: entries };
    }
    if (name === 'BatchWriteCommand') {
      const requests = command.input.RequestItems['test-table'];
      assert.equal(requests.length, 3, 'both entries plus the type itself');
      assert.deepEqual(requests[2], { DeleteRequest: { Key: { PK: 'USER#owner-1', SK: 'TYPE#type-1' } } });
      return { UnprocessedItems: {} };
    }
    throw new Error(`unexpected command: ${name}`);
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'type-1' } };
  const res = createMockRes();

  await logTypesController.deleteLogType(req, res);

  assert.deepEqual(calls, ['GetCommand', 'QueryCommand', 'BatchWriteCommand']);
  assert.equal(sendMock.mock.callCount(), 3);
  assert.equal(res.statusCode, 204);
});

test('archiveLogType: non-boolean archived responds 400 without writing', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async () => ({}));

  const req = { ownerId: 'owner-1', params: { typeId: 'type-1' }, body: { archived: 'yes' } };
  const res = createMockRes();

  await logTypesController.archiveLogType(req, res);

  assert.equal(sendMock.mock.callCount(), 0);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'archived must be a boolean');
});

test('archiveLogType: valid payload responds 200 with updated attributes', async (t) => {
  t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'UpdateCommand');
    assert.equal(command.input.ExpressionAttributeValues[':archived'], true);
    return { Attributes: { typeId: 'type-1', archived: true } };
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'type-1' }, body: { archived: true } };
  const res = createMockRes();

  await logTypesController.archiveLogType(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.archived, true);
});

test('archiveLogType: nonexistent type responds 404', async (t) => {
  t.mock.method(docClient, 'send', async () => {
    throw new ConditionalCheckFailedException({ message: 'condition failed', $metadata: {} });
  });

  const req = { ownerId: 'owner-1', params: { typeId: 'does-not-exist' }, body: { archived: true } };
  const res = createMockRes();

  await logTypesController.archiveLogType(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'log type not found');
});
