const crypto = require('crypto');
const { PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient, tableName, logTypeKey } = require('../db');

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
