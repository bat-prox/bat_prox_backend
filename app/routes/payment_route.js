const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const verifyToken = require('../middleware/auth_middleware');
const verifyAdmin = require('../middleware/admin_middleware');

const {
    addPaymentMethod,
    getPaymentMethods,
    getAllPaymentMethodsAdmin,
    updatePaymentMethod,
    deletePaymentMethod
} = require('../controllers/payment_controller');

// Public Routes
router.get('/', getPaymentMethods);

// Admin Routes
router.post('/admin/add', verifyToken, verifyAdmin, upload.none(), addPaymentMethod);
router.get('/admin/all', verifyToken, verifyAdmin, getAllPaymentMethodsAdmin);
router.put('/admin/:id', verifyToken, verifyAdmin, upload.none(), updatePaymentMethod);
router.delete('/admin/:id', verifyToken, verifyAdmin, upload.none(), deletePaymentMethod);

module.exports = router;
