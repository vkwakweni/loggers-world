process.env.TABLE_NAME = 'test-table';
process.env.USER_POOL_ID = 'test-pool';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CognitoIdentityProviderClient, UserNotFoundException } = require('@aws-sdk/client-cognito-identity-provider');
const { docClient } = require('../db');
const accountController = require('../controllers/accountController');
const { createMockRes } = require('../test-support/helpers');

test('deleteAccount: nonexistent Cognito user responds 404 without touching DynamoDB', async (t) => {
  const cognitoMock = t.mock.method(CognitoIdentityProviderClient.prototype, 'send', async (command) => {
    assert.equal(command.constructor.name, 'AdminDeleteUserCommand');
    throw new UserNotFoundException({ message: 'user not found', $metadata: {} });
  });
  const dynamoMock = t.mock.method(docClient, 'send', async () => {
    throw new Error('docClient.send should not be called when the Cognito user is missing');
  });

  const req = { ownerId: 'owner-1' };
  const res = createMockRes();

  await accountController.deleteAccount(req, res);

  assert.equal(cognitoMock.mock.callCount(), 1);
  assert.equal(dynamoMock.mock.callCount(), 0);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'account not found');
});

test('deleteAccount: success deletes the Cognito user then cascades owned data, responds 204', async (t) => {
  const ownedItems = [
    { PK: 'USER#owner-1', SK: 'TYPE#type-1' },
    { PK: 'USER#owner-1', SK: 'ENTRY#type-1#2026-01-01T00:00:00Z' },
  ];
  const calls = [];

  t.mock.method(CognitoIdentityProviderClient.prototype, 'send', async (command) => {
    calls.push(command.constructor.name);
    assert.equal(command.constructor.name, 'AdminDeleteUserCommand');
    assert.equal(command.input.UserPoolId, 'test-pool');
    assert.equal(command.input.Username, 'owner-1');
    return {};
  });

  const dynamoMock = t.mock.method(docClient, 'send', async (command) => {
    const name = command.constructor.name;
    calls.push(name);
    if (name === 'QueryCommand') {
      assert.equal(command.input.ExpressionAttributeValues[':pk'], 'USER#owner-1');
      assert.equal(command.input.KeyConditionExpression, 'PK = :pk');
      return { Items: ownedItems };
    }
    if (name === 'BatchWriteCommand') {
      const requests = command.input.RequestItems['test-table'];
      assert.equal(requests.length, 2);
      return { UnprocessedItems: {} };
    }
    throw new Error(`unexpected command: ${name}`);
  });

  const req = { ownerId: 'owner-1' };
  const res = createMockRes();

  await accountController.deleteAccount(req, res);

  assert.deepEqual(calls, ['AdminDeleteUserCommand', 'QueryCommand', 'BatchWriteCommand']);
  assert.equal(dynamoMock.mock.callCount(), 2);
  assert.equal(res.statusCode, 204);
});
