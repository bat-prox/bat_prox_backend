const { sendSuccess, sendError } = require('../utils/response');
const { getAllConfigs, createConfig, updateConfigByKey } = require('../models/app_config.model');

const CACHE_TTL_MS = Math.max(1000, Number(process.env.APP_CONFIG_CACHE_TTL_MS || 60000));

const cacheState = {
  payload: null,
  expiresAt: 0
};

const resetAppConfigCache = () => {
  cacheState.payload = null;
  cacheState.expiresAt = 0;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
};

const buildConfigPayload = (configs) => {
  const flat = {};
  const features = {};
  const extra = {};

  for (const item of configs) {
    flat[item.key] = item.value;

    if (item.key.startsWith('enable_')) {
      features[item.key] = toBoolean(item.value, false);
      continue;
    }

    if (
      item.key !== 'maintenance_mode' &&
      item.key !== 'min_version' &&
      item.key !== 'force_update'
    ) {
      extra[item.key] = item.value;
    }
  }

  const payload = {
    maintenance_mode: toBoolean(flat.maintenance_mode, false),
    min_version: flat.min_version === undefined ? null : String(flat.min_version),
    force_update: toBoolean(flat.force_update, false),
    features
  };

  if (payload.maintenance_mode) {
    payload.message = 'App is under maintenance';
  }

  if (Object.keys(extra).length > 0) {
    payload.configs = extra;
  }

  return payload;
};

const getPublicAppConfig = async (req, res) => {
  try {
    const now = Date.now();
    if (cacheState.payload && cacheState.expiresAt > now) {
      res.set('Cache-Control', `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
      return res.status(200).json(cacheState.payload);
    }

    const configs = await getAllConfigs();
    const payload = buildConfigPayload(configs);

    cacheState.payload = payload;
    cacheState.expiresAt = now + CACHE_TTL_MS;

    res.set('Cache-Control', `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
    return res.status(200).json(payload);
  } catch (err) {
    return sendError(res, 'Failed to fetch app configuration', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const createAppConfig = async (req, res) => {
  const { key, value, type } = req.body || {};

  if (!key) {
    return sendError(res, 'key is required', 400, 'BAD_REQUEST');
  }

  if (type === undefined || type === null || String(type).trim() === '') {
    return sendError(res, 'type is required', 400, 'BAD_REQUEST');
  }

  if (value === undefined) {
    return sendError(res, 'value is required', 400, 'BAD_REQUEST');
  }

  try {
    const created = await createConfig(key, value, type);
    resetAppConfigCache();

    console.log(
      `[app-config] CREATE key=${created.key} type=${created.type} by_user=${req.user && req.user.id ? req.user.id : 'unknown'}`
    );

    return sendSuccess(res, 'App config created successfully', created, 201);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return sendError(res, 'Config key already exists', 409, 'CONFLICT');
    }

    if (err && /Invalid config type|Invalid config key|Invalid boolean value|Invalid number value|Unexpected token|Config key is required/i.test(err.message || '')) {
      return sendError(res, err.message, 400, 'BAD_REQUEST');
    }

    return sendError(res, 'Failed to create app config', 500, 'INTERNAL_SERVER_ERROR');
  }
};

const updateAppConfig = async (req, res) => {
  const { key } = req.params;
  const { value, type } = req.body || {};

  if (!key) {
    return sendError(res, 'key parameter is required', 400, 'BAD_REQUEST');
  }

  if (value === undefined) {
    return sendError(res, 'value is required', 400, 'BAD_REQUEST');
  }

  try {
    const updated = await updateConfigByKey(key, value, type);
    if (!updated) {
      return sendError(res, 'Config not found', 404, 'NOT_FOUND');
    }

    resetAppConfigCache();

    console.log(
      `[app-config] UPDATE key=${updated.key} type=${updated.type} by_user=${req.user && req.user.id ? req.user.id : 'unknown'}`
    );

    return sendSuccess(res, 'App config updated successfully', updated, 200);
  } catch (err) {
    if (err && /Invalid config type|Invalid config key|Invalid boolean value|Invalid number value|Unexpected token|Config key is required/i.test(err.message || '')) {
      return sendError(res, err.message, 400, 'BAD_REQUEST');
    }

    return sendError(res, 'Failed to update app config', 500, 'INTERNAL_SERVER_ERROR');
  }
};

module.exports = {
  getPublicAppConfig,
  createAppConfig,
  updateAppConfig
};
