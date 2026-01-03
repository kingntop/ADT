const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

module.exports = (pool) => {

    // GET / - List all endpoints
    router.get('/', async (req, res) => {
        try {
            if (req.query.page) {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const offset = (page - 1) * limit;

                const countRes = await pool.query('SELECT COUNT(*) FROM api_endpoints');
                const total = parseInt(countRes.rows[0].count);

                const query = `
                    SELECT * FROM api_endpoints 
                    ORDER BY endpoint_path
                    LIMIT $1 OFFSET $2
                `;
                const result = await pool.query(query, [limit, offset]);
                res.json({
                    data: result.rows,
                    total: total,
                    page: page,
                    limit: limit
                });
            } else {
                // Return all
                const query = `
                    SELECT * FROM api_endpoints 
                    ORDER BY endpoint_path
                `;
                const result = await pool.query(query);
                res.json(result.rows);
            }
        } catch (err) {
            logger.error(err, 'GET /api/endpoints Error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST / - Create new endpoint
    router.post('/', async (req, res) => {
        const { api_name, method, endpoint_path, description, remarks, version, is_active } = req.body;
        try {
            const query = `
                INSERT INTO api_endpoints 
                (api_name, method, endpoint_path, description, remarks, version, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            const result = await pool.query(query, [
                api_name, method, endpoint_path, description,
                remarks, version || '1.0.0', is_active !== false
            ]);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            logger.error(err, 'POST /api/endpoints Error');
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Endpoint path already exists' });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // PUT /:id - Update endpoint
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { api_name, method, endpoint_path, description, remarks, version, is_active } = req.body;
        try {
            const query = `
                UPDATE api_endpoints 
                SET api_name = $1, method = $2, endpoint_path = $3, 
                    description = $4, remarks = $5, version = $6, 
                    is_active = $7, updated_at = CURRENT_TIMESTAMP
                WHERE api_id = $8
                RETURNING *
            `;
            const result = await pool.query(query, [
                api_name, method, endpoint_path, description,
                remarks, version, is_active, id
            ]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Endpoint not found' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            logger.error(err, 'PUT /api/endpoints/:id Error');
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Endpoint path already exists' });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // DELETE /:id - Delete endpoint
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM api_endpoints WHERE api_id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Endpoint not found' });
            }
            res.json({ message: 'Deleted successfully' });
        } catch (err) {
            logger.error(err, 'DELETE /api/endpoints/:id Error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
};
