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
    deletePaymentMethod,
    depositAmount,
    uploadReceiptSingle,
    getDepositRequests,
    updateDepositStatus,
    updateWithdrawStatus,
    withdrawAmount,
    getWithdrawRequests,
    getUserPaymentRequests
} = require('../controllers/payment_controller');

// Public Routes
router.get('/', getPaymentMethods);

// Admin Routes
router.post('/admin/add', verifyToken, verifyAdmin, upload.none(), addPaymentMethod);
router.get('/admin/all', verifyToken, verifyAdmin, getAllPaymentMethodsAdmin);
router.put('/admin/:id', verifyToken, verifyAdmin, upload.none(), updatePaymentMethod);
router.delete('/admin/:id', verifyToken, verifyAdmin, upload.none(), deletePaymentMethod);
router.delete('/admin/payment-method/:id', verifyToken, verifyAdmin, upload.none(), deletePaymentMethod);
router.get('/admin/deposits', verifyToken, verifyAdmin, getDepositRequests);
router.put('/admin/deposits/:id/status', verifyToken, verifyAdmin, updateDepositStatus);
router.get('/admin/withdraws', verifyToken, verifyAdmin, getWithdrawRequests);
router.put('/admin/withdraws/:id/status', verifyToken, verifyAdmin, updateWithdrawStatus);
router.post('/user/withdraw', verifyToken, upload.none(), withdrawAmount);
router.post('/user/deposit', verifyToken, uploadReceiptSingle, depositAmount);
router.get('/user/requests', verifyToken, getUserPaymentRequests);

module.exports = router;
