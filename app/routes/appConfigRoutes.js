const express = require('express');
const router = express.Router();
const { getPublicAppConfig } = require('../controllers/appConfigController');

// Public app config endpoint (no auth middleware)
router.get('/', getPublicAppConfig);

module.exports = router;
