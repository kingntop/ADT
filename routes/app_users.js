const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');

// Configure Multer for Memory Storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

module.exports = (pool) => {
    // Helper: Hash Password
    const hashPassword = (password) => {
        const salt = '!Coderslab12';
        return crypto.createHash('sha256').update(password + salt).digest('hex');
    };

    // Get All Users (Exclude Photo)
    router.get('/', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const countRes = await pool.query('SELECT COUNT(*) FROM app_users');
            const total = parseInt(countRes.rows[0].count);

            const query = `
                SELECT u.user_id, u.email, u.username, u.role_id, r.role_name, u.is_locked, u.last_login_at
                FROM app_users u
                LEFT JOIN roles r ON u.role_id = r.role_id
                ORDER BY u.user_id DESC
                LIMIT $1 OFFSET $2
            `;
            const result = await pool.query(query, [limit, offset]);

            res.json({
                data: result.rows,
                total: total,
                page: page,
                limit: limit
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Get User Photo
    router.get('/:id/photo', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT photo FROM app_users WHERE user_id = $1', [id]);

            if (result.rows.length === 0 || !result.rows[0].photo) {
                return res.status(404).send('No photo');
            }

            const img = result.rows[0].photo;
            res.set('Content-Type', 'image/jpeg'); // Defaulting to jpeg, browser usually auto-detects or we could store mime type
            res.send(img);
        } catch (err) {
            console.error(err);
            res.status(500).send('Error fetching photo');
        }
    });

    // Create User with Photo
    router.post('/', upload.single('photo'), async (req, res) => {
        let { email, username, password, role_id, is_locked } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        email = email.toLowerCase();

        try {
            // Check Duplicate Email or Username
            const dupCheck = await pool.query('SELECT 1 FROM app_users WHERE email = $1 OR username = $2', [email, username]);
            if (dupCheck.rows.length > 0) {
                return res.status(409).json({ success: false, message: 'Email or Username already exists' });
            }

            const password_hash = hashPassword(password);
            const photo = req.file ? req.file.buffer : null;

            const query = `
                INSERT INTO app_users (email, username, password_hash, role_id, is_locked, photo)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING user_id, email, username, role_id, is_locked, created_at
            `;
            const values = [email, username, password_hash, role_id || null, is_locked || false, photo];

            const result = await pool.query(query, values);
            res.json({ success: true, user: result.rows[0] });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Update User with Photo
    router.put('/:id', upload.single('photo'), async (req, res) => {
        const { id } = req.params;
        let { email, role_id, is_locked, password } = req.body;

        if (email) email = email.toLowerCase();

        try {
            const updates = [];
            const values = [];
            let idx = 1;

            if (email) {
                updates.push(`email = $${idx++}`);
                values.push(email);
            }
            if (role_id) {
                updates.push(`role_id = $${idx++}`);
                values.push(role_id);
            }
            if (is_locked !== undefined) {
                updates.push(`is_locked = $${idx++}`);
                values.push(is_locked);
            }
            if (password) {
                updates.push(`password_hash = $${idx++}`);
                values.push(hashPassword(password));
            }
            if (req.file) {
                updates.push(`photo = $${idx++}`);
                values.push(req.file.buffer);
            }

            if (updates.length === 0) {
                return res.json({ success: true, message: 'No changes' });
            }

            values.push(id);
            const query = `UPDATE app_users SET ${updates.join(', ')} WHERE user_id = $${idx} RETURNING user_id, email, username, role_id, is_locked, last_login_at`; // Exclude photo from return for perf

            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            res.json({ success: true, user: result.rows[0] });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Delete User
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const query = 'DELETE FROM app_users WHERE user_id = $1 RETURNING user_id'; // Reduced return
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.json({ success: true, message: 'User deleted' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
