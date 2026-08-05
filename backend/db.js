const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME;

function userKey(ownerId) {
  return `USER#${ownerId}`;
}

function logTypeKey(ownerId, typeId) {
  return { PK: userKey(ownerId), SK: `TYPE#${typeId}` };
}

function logEntryKey(ownerId, typeId, createdAt) {
  return { PK: userKey(ownerId), SK: `ENTRY#${typeId}#${createdAt}` };
}

function logEntriesSkPrefix(typeId) {
  return `ENTRY#${typeId}#`;
}

/**
 * Runs a QueryCommand repeatedly, following `LastEvaluatedKey`, and returns
 * every matching item across all pages.
 * @param {import('@aws-sdk/lib-dynamodb').QueryCommandInput} params
 * @returns {Promise<Array<object>>}
 */
async function queryAllPages(params) {
  const items = [];
  let exclusiveStartKey;
  do {
    const result = await docClient.send(new QueryCommand({ ...params, ExclusiveStartKey: exclusiveStartKey }));
    items.push(...result.Items);
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return items;
}

/**
 * Deletes every item in `keys` (each a `{PK, SK}`), batching into groups of
 * 25 (BatchWriteItem's limit) and retrying any `UnprocessedItems`.
 * @param {Array<{PK: string, SK: string}>} keys
 */
async function batchDeleteItems(keys) {
  const BATCH_SIZE = 25;
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const chunk = keys.slice(i, i + BATCH_SIZE);
    let requestItems = {
      [tableName]: chunk.map((Key) => ({ DeleteRequest: { Key } })),
    };
    do {
      const result = await docClient.send(new BatchWriteCommand({ RequestItems: requestItems }));
      requestItems = result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0
        ? result.UnprocessedItems
        : undefined;
    } while (requestItems);
  }
}

module.exports = {
  docClient,
  tableName,
  userKey,
  logTypeKey,
  logEntryKey,
  logEntriesSkPrefix,
  queryAllPages,
  batchDeleteItems,
};
