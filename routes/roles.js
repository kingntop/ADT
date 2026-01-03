const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Get All Roles
    router.get('/', async (req, res) => {
        try {
            const query = 'SELECT role_id, role_code, role_name, description, created_at FROM roles ORDER BY role_id';
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Create Role
    router.post('/', async (req, res) => {
        const { role_code, role_name, description } = req.body;
        try {
            const query = `
                INSERT INTO roles (role_code, role_name, description)
                VALUES ($1, $2, $3)
                RETURNING *
            `;
            const result = await pool.query(query, [role_code, role_name, description]);
            res.json({ success: true, role: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Update Role
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { role_code, role_name, description } = req.body;
        try {
            const query = `
                UPDATE roles 
                SET role_code = $1, role_name = $2, description = $3
                WHERE role_id = $4
                RETURNING *
            `;
            const result = await pool.query(query, [role_code, role_name, description, id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Role not found' });
            }
            res.json({ success: true, role: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Delete Role
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const query = 'DELETE FROM roles WHERE role_id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Role not found' });
            }
            res.json({ success: true, message: 'Role deleted' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
