const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const verifyToken = require('../middleware/auth_middleware'); // <- import middleware
const verifyAdmin = require('../middleware/admin_middleware');

const {
  getUser,
  getAllUsersByAdmin,
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  updateUser,
  deleteUser,
  uploadMedia,
  createUserWithImage,
  createUserWithMedia,
  createForgotPasswordRequest,
  getForgotPasswordRequests,
  updateUserByAdmin,
  getUserByAdmin,
  getUserBalanceById,
  getUserProfile
} = require('../controllers/user_controller');

// Public Routes
router.post('/create_user', upload.none(), registerUser);
router.post('/login', upload.none(), loginUser);
router.post('/forgot_password', upload.none(), createForgotPasswordRequest);
router.post('/refresh-token', upload.none(), refreshToken);
router.post('/logout', verifyToken, logoutUser);
router.get('/admin/forgot_password_requests', verifyToken, verifyAdmin, getForgotPasswordRequests);
router.get('/admin/user/:id', verifyToken, verifyAdmin, getUserByAdmin);
router.put('/admin/user/:id', verifyToken, verifyAdmin, upload.none(), updateUserByAdmin);
router.get('/balance/:id', verifyToken, getUserBalanceById);

// Protected Routes
router.get('/admin/all_users', verifyToken, verifyAdmin, getUser);
router.get('/admin/all_users/get_all', verifyToken, verifyAdmin, getAllUsersByAdmin);
router.put('/update_user/:id', verifyToken, uploadMedia.single('image'), updateUser);
router.delete('/delete_user/:id', verifyToken, upload.none(), deleteUser);
router.post(
  '/upload_user_media',
  verifyToken,
  uploadMedia.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
  createUserWithMedia
);
router.post('/upload_user', verifyToken, uploadMedia.single('image'), createUserWithImage);
router.get('/profile', verifyToken, getUserProfile);

module.exports = router;
