const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

function logTypeKey(ownerId, typeId) {
  return { PK: `USER#${ownerId}`, SK: `TYPE#${typeId}` };
}

function logEntryKey(ownerId, typeId, createdAt) {
  return { PK: `USER#${ownerId}`, SK: `ENTRY#${typeId}#${createdAt}` };
}

function logEntriesSkPrefix(typeId) {
  return `ENTRY#${typeId}#`;
}

module.exports = {
  docClient,
  tableName: process.env.TABLE_NAME,
  logTypeKey,
  logEntryKey,
  logEntriesSkPrefix,
};
