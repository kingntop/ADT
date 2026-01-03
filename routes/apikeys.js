const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (pool) => {
    // GET /api/keys - List all keys
    router.get('/', async (req, res) => {
        try {
            const query = `
                SELECT 
                    k.key_id, 
                    k.empno, 
                    e.ename, 
                    k.api_key, 
                    k.key_name, 
                    k.status, 
                    TO_CHAR(k.expires_at, 'YYYY-MM-DD HH24:MI:SS') as expires_at,
                    TO_CHAR(k.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
                FROM api_keys k
                LEFT JOIN emp e ON k.empno = e.empno
                ORDER BY k.created_at DESC
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/keys - Create new key
    router.post('/', async (req, res) => {
        const { empno, key_name, expires_at } = req.body;

        if (!empno) {
            return res.status(400).json({ error: 'Employee is required' });
        }

        try {
            // Generate API Key (64 chars hex)
            const apiKey = crypto.randomBytes(32).toString('hex');

            const query = `
                INSERT INTO api_keys (empno, api_key, key_name, expires_at)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const values = [empno, apiKey, key_name, expires_at || null];

            const result = await pool.query(query, values);
            res.json({ success: true, key: result.rows[0], plain_key: apiKey });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/keys/:id/revoke - Revoke key
    router.put('/:id/revoke', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(
                "UPDATE api_keys SET status = 'REVOKED', updated_at = CURRENT_TIMESTAMP WHERE key_id = $1 RETURNING *",
                [id]
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Key not found' });
            res.json({ success: true, key: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/keys/:id - Delete key
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM api_keys WHERE key_id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) return res.status(404).json({ error: 'Key not found' });
            res.json({ success: true, message: 'Key deleted' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
