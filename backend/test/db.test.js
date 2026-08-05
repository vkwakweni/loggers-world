process.env.TABLE_NAME = 'test-table';

const test = require('node:test');
const assert = require('node:assert/strict');
const { docClient, userKey, queryAllPages, batchDeleteItems } = require('../db');

test('userKey: builds the USER# partition key', () => {
  assert.equal(userKey('owner-1'), 'USER#owner-1');
});

test('queryAllPages: returns items from a single page', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'QueryCommand');
    assert.equal(command.input.ExclusiveStartKey, undefined);
    return { Items: [{ id: 'a' }, { id: 'b' }] };
  });

  const items = await queryAllPages({ TableName: 'test-table', KeyConditionExpression: 'PK = :pk' });

  assert.equal(sendMock.mock.callCount(), 1);
  assert.deepEqual(items, [{ id: 'a' }, { id: 'b' }]);
});

test('queryAllPages: follows LastEvaluatedKey across multiple pages', async (t) => {
  let call = 0;
  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    call += 1;
    if (call === 1) {
      assert.equal(command.input.ExclusiveStartKey, undefined);
      return { Items: [{ id: 'a' }], LastEvaluatedKey: { PK: 'x', SK: 'y' } };
    }
    if (call === 2) {
      assert.deepEqual(command.input.ExclusiveStartKey, { PK: 'x', SK: 'y' });
      return { Items: [{ id: 'b' }], LastEvaluatedKey: { PK: 'x', SK: 'z' } };
    }
    assert.deepEqual(command.input.ExclusiveStartKey, { PK: 'x', SK: 'z' });
    return { Items: [{ id: 'c' }] };
  });

  const items = await queryAllPages({ TableName: 'test-table', KeyConditionExpression: 'PK = :pk' });

  assert.equal(sendMock.mock.callCount(), 3);
  assert.deepEqual(items, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
});

test('batchDeleteItems: no-op on an empty key list', async (t) => {
  const sendMock = t.mock.method(docClient, 'send', async () => ({}));

  await batchDeleteItems([]);

  assert.equal(sendMock.mock.callCount(), 0);
});

test('batchDeleteItems: sends a single batch for 25 or fewer keys', async (t) => {
  const keys = Array.from({ length: 10 }, (_, i) => ({ PK: 'USER#owner-1', SK: `ENTRY#${i}` }));

  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    assert.equal(command.constructor.name, 'BatchWriteCommand');
    const requests = command.input.RequestItems['test-table'];
    assert.equal(requests.length, 10);
    assert.deepEqual(requests[0], { DeleteRequest: { Key: keys[0] } });
    return { UnprocessedItems: {} };
  });

  await batchDeleteItems(keys);

  assert.equal(sendMock.mock.callCount(), 1);
});

test('batchDeleteItems: splits more than 25 keys into multiple batches', async (t) => {
  const keys = Array.from({ length: 30 }, (_, i) => ({ PK: 'USER#owner-1', SK: `ENTRY#${i}` }));
  const batchSizes = [];

  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    batchSizes.push(command.input.RequestItems['test-table'].length);
    return { UnprocessedItems: {} };
  });

  await batchDeleteItems(keys);

  assert.equal(sendMock.mock.callCount(), 2);
  assert.deepEqual(batchSizes, [25, 5]);
});

test('batchDeleteItems: retries UnprocessedItems until none remain', async (t) => {
  const keys = [{ PK: 'USER#owner-1', SK: 'ENTRY#1' }, { PK: 'USER#owner-1', SK: 'ENTRY#2' }];
  let call = 0;

  const sendMock = t.mock.method(docClient, 'send', async (command) => {
    call += 1;
    if (call === 1) {
      assert.equal(command.input.RequestItems['test-table'].length, 2);
      return {
        UnprocessedItems: {
          'test-table': [{ DeleteRequest: { Key: keys[1] } }],
        },
      };
    }
    assert.equal(command.input.RequestItems['test-table'].length, 1);
    assert.deepEqual(command.input.RequestItems['test-table'][0], { DeleteRequest: { Key: keys[1] } });
    return { UnprocessedItems: {} };
  });

  await batchDeleteItems(keys);

  assert.equal(sendMock.mock.callCount(), 2);
});
