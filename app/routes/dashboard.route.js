const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth_middleware');
const verifyAdmin = require('../middleware/admin_middleware');
const { getDashboard } = require('../controllers/dashboard.controller');

router.get('/summary', verifyToken, verifyAdmin, getDashboard);

module.exports = router;
