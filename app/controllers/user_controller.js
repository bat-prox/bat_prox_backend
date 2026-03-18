
const bcrypt = require('bcrypt');
const saltRounds = 10;
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { error } = require('console');
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET; // Store securely in .env
const refreshSecret = process.env.JWT_REFRESH_SECRET || secretKey; // fallback to main secret if refresh secret not set

//*set up multer storage*/
const storage = multer.diskStorage({
    destination: function (req, file, cb) {

        // cb(null, 'uploads/'); //Make sure this folder EXISTs
        if (file.mimetype.startsWith('video/')) {
            cb(null, 'uploads/');
        } else if (file.mimetype.startsWith('image/')) {
            cb(null, 'uploads/');
        } else {
            cb(new Error('Unsupported file type'), false);
        }
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const uploadMedia = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true)
        } else {
            cb(new Error('Only image and video files are allowed!'), false)
        }
    }

});

//!GET all users
const getUser = async (req, res) => {
    try {
        // Pagination params
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
        const offset = parseInt(req.query.offset, 10) || 0;

        // Select only non-sensitive columns to reduce payload and use LIMIT/OFFSET
        const [result] = await db.query(
            `SELECT id, name, image, video, email, created_at, age, fb_id, address, status, is_Verified, phone, token_version FROM users LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        // Remove sensitive fields before sending response (defensive)
        const sanitized = result.map(({ password, refresh_token, ...rest }) => rest);

        res.status(200).json({
            status: 200,
            message: "success",
            data: sanitized
        });

    } catch (err) {
        return res.status(500).json({
            status: 500,
            message: "Database error",
            error: err.message
        });
    }
};




const loginUser = async (req, res) => {
    const { phone, password } = req.body || {};

    if (!phone || !password) {
        return res.status(400).json({ message: 'Phone and password are required' });
    }

    if (!secretKey) {
        return res.status(500).json({ message: 'Server configuration error: JWT secret not set' });
    }

    try {
        // select only needed columns
        const [rows] = await db.query('SELECT id, name, phone, password, token_version, refresh_token FROM users WHERE phone = ?', [phone]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // increment token_version to invalidate previous tokens and create refresh token
        const currentVersion = user.token_version || 0;
        const newVersion = currentVersion + 1;

            const refreshTokenStr = jwt.sign({ id: user.id, token_version: newVersion, type: 'refresh' }, refreshSecret, { expiresIn: '7d' });

        await db.query('UPDATE users SET token_version = ?, refresh_token = ? WHERE id = ?', [newVersion, refreshTokenStr, user.id]);

        const expiresIn = '1h';
              const token = jwt.sign({ id: user.id, phone: user.phone, token_version: newVersion, type: 'access' }, secretKey, { expiresIn });

        const expiresInSeconds = 60 * 60; // 1 hour
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

        const { password: _, refresh_token: __, ...userSafe } = user;
        userSafe.token_version = newVersion;

        res.json({
            message: 'Login successful',
            token,
            refreshToken: refreshTokenStr,
            expiresIn: expiresInSeconds,
            expiresAt,
            user: userSafe
        });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
};



// registerUser
const registerUser = async (req, res) => {
    const { name, phone, password } = req.body;

  if (!name ) {
    return res.status(400).json({ message: 'Name required' });
    } else   if (!phone) {
        return res.status(400).json({ message: 'Phone required' });
  } else   if (!password) {
    return res.status(400).json({ message: 'Password required' });
  }



    try {
            // prevent duplicate registration by phone
            const [existing] = await db.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
            if (existing.length > 0) {
                return res.status(409).json({ message: 'Phone already registered' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const [result] = await db.query('INSERT INTO users (name, phone, password, token_version) VALUES (?, ?, ?, ?)', [name, phone, hashedPassword, 0]);

        const user = { id: result.insertId, name, phone, token_version: 0};

        // const accessToken = jwt.sign({ id: user.id, phone: user.phone, token_version: 0 }, secretKey, { expiresIn: '1d' });
            const accessToken = jwt.sign({ id: user.id, phone: user.phone, token_version: 0, type: 'access' }, secretKey, { expiresIn: '1d' });
            const refreshTokenStr = jwt.sign({ id: user.id, token_version: 0, type: 'refresh' }, refreshSecret, { expiresIn: '7d' });

        // Store refresh token
        await db.query('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshTokenStr, user.id]);

        res.status(201).json({
            message: 'User registered',
            token: accessToken,
            refreshToken: refreshTokenStr,
            user
        });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};


//! Update user
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const image = req.file ? req.file.filename : null
    try {
        const [result] = await db.query('UPDATE users SET name=?,image=? WHERE id=?', [name, image, id]);
        if (result.affectedRows === 0) {
            return res.status(400).json({
                status:400,
                message:"User not found",
                error: `${id} User not found ` });
        }
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        return res.status(500).json({
            status: 500,
            message: "Database error", error: err.message
        });
    }
};

//! Delete user
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM users WHERE id=?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 404,
                message: "user not found",
                error: `User with id ${id} not found`
            });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: "Database error", error: err.message
        });
    }
    // const userIndex = users.findIndex(u => u.id === parseInt(id));
    // if (userIndex === -1) {
    //     return res.status(400).json({ error: `${id} User not found` });
    // }
    // const deleteUser = users.splice(userIndex, 1);
    // res.json(deleteUser[0]);
}



//controller for creating user with image 
const createUserWithImage = async (req, res) => {
    const { name } = req.body;
    const image = req.file ? req.file.filename : null
    if (!name || !image) {
        return res.status(400).json({
            status: 400,
            message: "Name and image are required",
            error: 'Name and image are required'
        });
    }
    try {
        const [result] = await db.query('INSERT INTO users (name,image) VALUE (?,?)', [name, image]);
        res.status(201).json({
            status: 201,
            message: "User created successfully", id: result.insertId, name, image
        });

    } catch (err) {
        res.status(500).json({
            status: 500,
            message: "Database error", eorr: err.message
        });
    }
}

const createUserWithMedia = async (req, res) => {
    const { name } = req.body;
    const image = req.files?.image?.[0]?.filename || null;
    const video = req.files?.video?.[0]?.filename || null;
    if (!name || !image || !video) {
        return res.status(400).json({
            status: 400,
            message: "Name,image, and video are required",
            error: 'Name,image, and video are required'
        });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO users (name, image, video) VALUES (?, ?, ?)',
            [name, image, video]
        );
        res.status(201).json({
            status: 201,
            message: "success", id: result.insertId, name, image, video
        });
    } catch (err) {
        res.status(500).json({
            status: 500,
            message: "Database error", error: err.message
        });
    }
}

// Refresh access token using refresh token (rotates refresh token)
const refreshToken = async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    try {
        const payload = jwt.verify(refreshToken, refreshSecret);
        if (payload.type !== 'refresh') {
            return res.status(401).json({ code: 'Unauthorized', message: 'Refresh token must not be used to access resources' });
        }
        const userId = payload.id;

        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(401).json({ message: 'User not found' });

        const user = rows[0];
        if (!user.refresh_token || user.refresh_token !== refreshToken) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        // Optionally ensure token_version matches
        const dbVersion = user.token_version || 0;
        if ((payload.token_version || 0) !== dbVersion) {
            return res.status(403).json({ message: 'Refresh token invalidated' });
        }

        // Issue new access token and rotate refresh token
        const newAccessToken = jwt.sign({ id: user.id, phone: user.phone, token_version: dbVersion, type: 'access' }, secretKey, { expiresIn: '1h' });
        const newRefreshToken = jwt.sign({ id: user.id, token_version: dbVersion, type: 'refresh' }, refreshSecret, { expiresIn: '7d' });

        await db.query('UPDATE users SET refresh_token = ? WHERE id = ?', [newRefreshToken, user.id]);

        const { password: _, refresh_token: __, ...userSafe } = user;
        res.json({ message: 'Token refreshed', token: newAccessToken, refreshToken: newRefreshToken, user: userSafe });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ code: 'Unauthorized', message: 'Refresh token expired.' });
        }
        return res.status(401).json({ code: 'Unauthorized', message: 'Refresh token invalid or tampered.', error: err.message });
    }
};

// Logout: invalidate access and refresh tokens for the current user
const logoutUser = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ code: 'Unauthorized', message: 'Authentication problem unauthenticate' });

        // increment token_version and clear refresh_token
        await db.query('UPDATE users SET token_version = token_version + 1, refresh_token = NULL WHERE id = ?', [userId]);

        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// User creates forgot-password request using phone number
const createForgotPasswordRequest = async (req, res) => {
    const { phone } = req.body || {};

    if (!phone) {
        return res.status(400).json({ message: 'Phone required' });
    }

    try {
        const [users] = await db.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found with this phone number' });
        }

        const userId = users[0].id;
        const [result] = await db.query(
            'INSERT INTO forgot_password_requests (user_id, phone, status) VALUES (?, ?, ?)',
            [userId, phone, 'pending']
        );

        return res.status(201).json({
            message: 'Forgot password request submitted',
            request: {
                id: result.insertId,
                user_id: userId,
                phone,
                status: 'pending'
            }
        });
    } catch (err) {
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                message: 'Forgot password requests table is missing. Please run migration script first.',
                error: err.message
            });
        }

        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Admin gets forgot-password requests, optionally filtered by phone
const getForgotPasswordRequests = async (req, res) => {
    const { phone } = req.query || {};

    try {
        let query = `
            SELECT id, user_id, phone, status, requested_at, processed_at
            FROM forgot_password_requests
        `;
        const params = [];

        if (phone) {
            query += ' WHERE phone = ?';
            params.push(phone);
        }

        query += ' ORDER BY requested_at DESC';

        const [rows] = await db.query(query, params);

        return res.status(200).json({
            message: 'success',
            total: rows.length,
            data: rows
        });
    } catch (err) {
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                message: 'Forgot password requests table is missing. Please run migration script first.',
                error: err.message
            });
        }

        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

module.exports = {
    getUser,
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
    getForgotPasswordRequests
};