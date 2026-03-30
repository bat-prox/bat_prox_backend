const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth_middleware');
const verifyAdmin = require('../middleware/admin_middleware');
const { createAppConfig, updateAppConfig } = require('../controllers/appConfigController');

router.post('/', verifyToken, verifyAdmin, createAppConfig);
router.put('/:key', verifyToken, verifyAdmin, updateAppConfig);

module.exports = router;
