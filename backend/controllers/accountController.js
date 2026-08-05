const {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  UserNotFoundException,
} = require('@aws-sdk/client-cognito-identity-provider');
const { tableName, userKey, queryAllPages, batchDeleteItems } = require('../db');

const cognitoClient = new CognitoIdentityProviderClient({});

/**
 * Delete the authenticated user's account: removes the Cognito user, then
 * cascade-deletes every LogType/LogEntry item they own.
 * Responds 404 if the Cognito user no longer exists.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.deleteAccount = async (req, res) => {
  try {
    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: req.ownerId,
    }));
  } catch (err) {
    if (err instanceof UserNotFoundException) {
      return res.status(404).json({ error: 'account not found' });
    }
    throw err;
  }

  const items = await queryAllPages({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': userKey(req.ownerId) },
  });

  await batchDeleteItems(items.map((item) => ({ PK: item.PK, SK: item.SK })));
  res.status(204).send();
};
