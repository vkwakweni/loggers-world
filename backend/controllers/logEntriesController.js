const crypto = require('crypto');
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { ConditionalCheckFailedException } = require('@aws-sdk/client-dynamodb');
const { docClient, tableName, logTypeKey, logEntryKey, logEntriesSkPrefix } = require('../db');

/**
 * Validates `entryFields` (a plain object keyed by field name) against a LogType's
 * `schemaFields` (an array of `{name, type, required}`).
 * @param {object} entryFields
 * @param {Array<{name: string, type: string, required?: boolean}>} schemaFields
 * @returns {string|null} an error message, or null if valid
 */
function validateFieldsAgainstSchema(entryFields, schemaFields) {
  if (typeof entryFields !== 'object' || entryFields === null || Array.isArray(entryFields)) {
    return 'fields must be an object';
  }
  for (const field of schemaFields) {
    const value = entryFields[field.name];
    if (value === undefined) {
      if (field.required) {
        return `missing required field "${field.name}"`;
      }
      continue;
    }
    if (field.type === 'number' && typeof value !== 'number') {
      return `field "${field.name}" must be a number`;
    }
    if (field.type === 'string' && typeof value !== 'string') {
      return `field "${field.name}" must be a string`;
    }
    if (field.type === 'boolean' && typeof value !== 'boolean') {
      return `field "${field.name}" must be a boolean`;
    }
  }
  return null;
}

/**
 * Create a LogEntry under the given LogType, owned by the authenticated user.
 * Validates `fields` against the parent LogType's schema before writing.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.createLogEntry = async (req, res) => {
  const { typeId } = req.params;
  const { fields } = req.body;

  const logTypeResult = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: logTypeKey(req.ownerId, typeId),
  }));
  if (!logTypeResult.Item) {
    return res.status(404).json({ error: 'log type not found' });
  }

  const validationError = validateFieldsAgainstSchema(fields, logTypeResult.Item.fields);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const entryId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const item = {
    ...logEntryKey(req.ownerId, typeId, createdAt),
    entryId,
    typeId,
    ownerId: req.ownerId,
    fields,
    createdAt,
  };

  await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
  res.status(201).json(item);
};

/**
 * List all LogEntries for a given LogType, owned by the authenticated user,
 * newest first.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.listLogEntries = async (req, res) => {
  const result = await docClient.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `USER#${req.ownerId}`,
      ':skPrefix': logEntriesSkPrefix(req.params.typeId),
    },
    ScanIndexForward: false,
  }));
  res.json(result.Items);
};

/**
 * Update a LogEntry's `fields`, re-validated against the parent LogType's schema.
 * Responds 404 if the entry doesn't exist.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.updateLogEntry = async (req, res) => {
  const { typeId, createdAt } = req.params;
  const { fields } = req.body;

  const logTypeResult = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: logTypeKey(req.ownerId, typeId),
  }));
  if (!logTypeResult.Item) {
    return res.status(404).json({ error: 'log type not found' });
  }

  const validationError = validateFieldsAgainstSchema(fields, logTypeResult.Item.fields);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: logEntryKey(req.ownerId, typeId, createdAt),
      ConditionExpression: 'attribute_exists(PK)',
      UpdateExpression: 'SET #fields = :fields',
      ExpressionAttributeNames: { '#fields': 'fields' },
      ExpressionAttributeValues: { ':fields': fields },
      ReturnValues: 'ALL_NEW',
    }));
    res.json(result.Attributes);
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return res.status(404).json({ error: 'log entry not found' });
    }
    throw err;
  }
};

/**
 * Delete a LogEntry. Responds 404 if it doesn't exist.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.deleteLogEntry = async (req, res) => {
  const { typeId, createdAt } = req.params;

  try {
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: logEntryKey(req.ownerId, typeId, createdAt),
      ConditionExpression: 'attribute_exists(PK)',
    }));
    res.status(204).send();
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return res.status(404).json({ error: 'log entry not found' });
    }
    throw err;
  }
};
