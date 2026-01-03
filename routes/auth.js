const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger');

module.exports = (pool) => {
    // Login Endpoint
    router.post('/login', async (req, res) => {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and Password are required' });
        }

        email = email.toLowerCase();

        try {
            const query = `
                SELECT u.user_id, u.email, u.username, u.password_hash, u.role_id, u.is_locked, r.role_code, r.role_name
                FROM app_users u
                LEFT JOIN roles r ON u.role_id = r.role_id
                WHERE u.email = $1
            `;
            const result = await pool.query(query, [email]);

            if (result.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid Email' });
            }

            const user = result.rows[0];

            if (user.is_locked) {
                return res.status(403).json({ success: false, message: 'Account is locked. Contact administrator.' });
            }

            const salt = '!Coderslab12';
            const inputHash = crypto.createHash('sha256').update(password + salt).digest('hex');

            if (inputHash !== user.password_hash) {
                return res.status(401).json({ success: false, message: 'Invalid Password' });
            }

            await pool.query('UPDATE app_users SET last_login_at = NOW(), failed_attempts = 0 WHERE user_id = $1', [user.user_id]);

            req.session.user = {
                user_id: user.user_id,
                email: user.email,
                username: user.username,
                ename: user.username, // Fallback for display
                role_id: user.role_id,
                role_code: user.role_code,
                role_name: user.role_name
            };

            res.json({
                success: true,
                message: 'Login successful',
                user: req.session.user
            });

        } catch (err) {
            console.error('Database error:', err);
            logger.error(err, '[Auth] Login Failed');
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    router.post('/change-password', async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        try {
            // Get user from DB to get current hash
            const result = await pool.query('SELECT password_hash FROM app_users WHERE user_id = $1', [req.session.user.user_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const user = result.rows[0];
            const salt = '!Coderslab12';
            const currentHash = crypto.createHash('sha256').update(currentPassword + salt).digest('hex');

            if (currentHash !== user.password_hash) {
                return res.status(401).json({ success: false, message: 'Incorrect current password' });
            }

            const newHash = crypto.createHash('sha256').update(newPassword + salt).digest('hex');

            await pool.query('UPDATE app_users SET password_hash = $1 WHERE user_id = $2', [newHash, req.session.user.user_id]);

            res.json({ success: true, message: 'Password updated successfully' });

        } catch (err) {
            console.error('Password change error:', err);
            logger.error(err, '[Auth] Password Change Failed');
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    router.post('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Could not log out' });
            }
            res.clearCookie('sid');
            res.json({ success: true, message: 'Logout successful' });
        });
    });

    return router;
};
