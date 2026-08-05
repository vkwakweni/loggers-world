const crypto = require('crypto');
const { PutCommand, QueryCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { ConditionalCheckFailedException } = require('@aws-sdk/client-dynamodb');
const {
  docClient,
  tableName,
  userKey,
  logTypeKey,
  logEntriesSkPrefix,
  queryAllPages,
  batchDeleteItems,
} = require('../db');

/**
 * Create a LogType owned by the authenticated user.
 * Validates `name` and `fields` before writing; responds 400 on malformed input.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.createLogType = async (req, res) => {
  const { name, fields } = req.body;

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ error: 'fields must be a non-empty array' });
  }
  for (const field of fields) {
    if (typeof field.name !== 'string' || field.name.trim() === '') {
      return res.status(400).json({ error: 'each field requires a name' });
    }
    if (typeof field.type !== 'string' || field.type.trim() === '') {
      return res.status(400).json({ error: 'each field requires a type' });
    }
  }

  const typeId = crypto.randomUUID();

  const item = {
    ...logTypeKey(req.ownerId, typeId),
    typeId,
    ownerId: req.ownerId,
    name,
    fields,
  };

  await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
  res.status(201).json(item);
};

/**
 * List all LogTypes owned by the authenticated user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.listLogTypes = async (req, res) => {
  const result = await docClient.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `USER#${req.ownerId}`,
      ':skPrefix': 'TYPE#',
    },
  }));
  res.json(result.Items);
};

/**
 * Fetch a single LogType by `typeId`, scoped to the authenticated user.
 * Responds 404 if the LogType doesn't exist or isn't owned by this user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getLogType = async (req, res) => {
  const result = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: logTypeKey(req.ownerId, req.params.typeId),
  }));

  if (!result.Item) {
    return res.status(404).json({ error: 'log type not found' });
  }
  res.json(result.Item);
};

/**
 * Delete a LogType and cascade-delete all of its LogEntry items.
 * Responds 404 if the LogType doesn't exist or isn't owned by this user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.deleteLogType = async (req, res) => {
  const { typeId } = req.params;
  const typeKey = logTypeKey(req.ownerId, typeId);

  const existing = await docClient.send(new GetCommand({ TableName: tableName, Key: typeKey }));
  if (!existing.Item) {
    return res.status(404).json({ error: 'log type not found' });
  }

  const entries = await queryAllPages({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': userKey(req.ownerId),
      ':skPrefix': logEntriesSkPrefix(typeId),
    },
  });

  await batchDeleteItems([...entries.map((entry) => ({ PK: entry.PK, SK: entry.SK })), typeKey]);
  res.status(204).send();
};

/**
 * Toggle a LogType's `archived` flag, hiding/unhiding it (and its entries)
 * from the default dashboard view without deleting anything.
 * Responds 404 if the LogType doesn't exist or isn't owned by this user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.archiveLogType = async (req, res) => {
  const { typeId } = req.params;
  const { archived } = req.body;

  if (typeof archived !== 'boolean') {
    return res.status(400).json({ error: 'archived must be a boolean' });
  }

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: logTypeKey(req.ownerId, typeId),
      ConditionExpression: 'attribute_exists(PK)',
      UpdateExpression: 'SET archived = :archived',
      ExpressionAttributeValues: { ':archived': archived },
      ReturnValues: 'ALL_NEW',
    }));
    res.json(result.Attributes);
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return res.status(404).json({ error: 'log type not found' });
    }
    throw err;
  }
};
