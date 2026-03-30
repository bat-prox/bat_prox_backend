const db = require('../config/db');

const ALLOWED_TYPES = new Set(['string', 'boolean', 'number', 'json']);
const KEY_PATTERN = /^[a-zA-Z0-9_.-]+$/;

const validateKey = (key) => {
  if (!key || typeof key !== 'string') {
    throw new Error('Config key is required');
  }

  const cleanKey = key.trim();
  if (!cleanKey) {
    throw new Error('Config key is required');
  }

  if (!KEY_PATTERN.test(cleanKey)) {
    throw new Error('Invalid config key. Use only letters, numbers, dot, underscore, and hyphen.');
  }

  return cleanKey;
};

const wrapError = (message, err) => {
  const wrapped = new Error(`${message}: ${err.message || err}`);
  if (err && err.code) {
    wrapped.code = err.code;
  }
  return wrapped;
};

const normalizeType = (type) => {
  if (typeof type !== 'string') return '';
  return type.trim().toLowerCase();
};

const validateType = (type) => {
  const normalized = normalizeType(type);
  if (!ALLOWED_TYPES.has(normalized)) {
    throw new Error('Invalid config type. Allowed: string, boolean, number, json');
  }
  return normalized;
};

const serializeValueByType = (value, type) => {
  switch (type) {
    case 'string':
      return value === null || value === undefined ? '' : String(value);
    case 'boolean': {
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (value === 1 || value === '1' || value === 'true') return 'true';
      if (value === 0 || value === '0' || value === 'false') return 'false';
      throw new Error('Invalid boolean value');
    }
    case 'number': {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error('Invalid number value');
      }
      return String(parsed);
    }
    case 'json': {
      if (typeof value === 'string') {
        JSON.parse(value);
        return value;
      }
      return JSON.stringify(value);
    }
    default:
      throw new Error('Unsupported config type');
  }
};

const deserializeValueByType = (value, type) => {
  if (value === null || value === undefined) return null;

  switch (type) {
    case 'string':
      return String(value);
    case 'boolean':
      return String(value).toLowerCase() === 'true';
    case 'number': {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case 'json': {
      try {
        return JSON.parse(value);
      } catch (err) {
        return null;
      }
    }
    default:
      return value;
  }
};

const mapRow = (row) => ({
  id: row.id,
  key: row.key,
  value: deserializeValueByType(row.value, row.type),
  raw_value: row.value,
  type: row.type,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const getAllConfigs = async () => {
  try {
    const [rows] = await db.query(
      'SELECT id, `key`, value, type, created_at, updated_at FROM app_config ORDER BY `key` ASC'
    );
    return rows.map(mapRow);
  } catch (err) {
    throw wrapError('Failed to fetch app configs', err);
  }
};

const getConfigByKey = async (key) => {
  try {
    const cleanKey = validateKey(key);

    const [rows] = await db.query(
      'SELECT id, `key`, value, type, created_at, updated_at FROM app_config WHERE `key` = ? LIMIT 1',
      [cleanKey]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  } catch (err) {
    throw wrapError('Failed to fetch config by key', err);
  }
};

const setConfig = async (key, value, type = 'string') => {
  try {
    const cleanKey = validateKey(key);
    const normalizedType = validateType(type);
    const serializedValue = serializeValueByType(value, normalizedType);

    await db.query(
      `INSERT INTO app_config (\`key\`, value, type)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         value = VALUES(value),
         type = VALUES(type),
         updated_at = CURRENT_TIMESTAMP`,
      [cleanKey, serializedValue, normalizedType]
    );

    return await getConfigByKey(cleanKey);
  } catch (err) {
    throw wrapError('Failed to set config', err);
  }
};

const createConfig = async (key, value, type) => {
  try {
    const cleanKey = validateKey(key);
    const normalizedType = validateType(type);
    const serializedValue = serializeValueByType(value, normalizedType);

    await db.query(
      'INSERT INTO app_config (`key`, value, type) VALUES (?, ?, ?)',
      [cleanKey, serializedValue, normalizedType]
    );

    return await getConfigByKey(cleanKey);
  } catch (err) {
    throw wrapError('Failed to create config', err);
  }
};

const updateConfigByKey = async (key, value, type) => {
  try {
    const cleanKey = validateKey(key);

    const [existingRows] = await db.query(
      'SELECT id, type FROM app_config WHERE `key` = ? LIMIT 1',
      [cleanKey]
    );

    if (existingRows.length === 0) {
      return null;
    }

    const resolvedType = type === undefined || type === null || type === ''
      ? existingRows[0].type
      : validateType(type);

    const serializedValue = serializeValueByType(value, resolvedType);

    await db.query(
      `UPDATE app_config
       SET value = ?, type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE \`key\` = ?`,
      [serializedValue, resolvedType, cleanKey]
    );

    return await getConfigByKey(cleanKey);
  } catch (err) {
    throw wrapError('Failed to update config', err);
  }
};

module.exports = {
  getAllConfigs,
  getConfigByKey,
  setConfig,
  createConfig,
  updateConfigByKey
};
