const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Get All Menus (Hierarchical or Flat)
    // For listing, we might want flat with parent name, or we handle hierarchy on client.
    // Let's return flat list with parent info.

    // Get My Allowed Menus
    router.get('/my-menus', async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Fetch fresh role_id from DB to handle immediate permission changes
            const userRes = await pool.query('SELECT role_id FROM app_users WHERE user_id = $1', [req.session.user.user_id]);
            if (userRes.rows.length === 0) {
                return res.status(401).json({ error: 'User not found' });
            }
            const roleId = userRes.rows[0].role_id;

            // If super admin (role_code='ROLE_SUPER'), return all menus? 
            // Better to rely on permissions table populated correctly for SUPER.
            // Assumption: ROLE_SUPER has all permissions in role_menu_permissions.

            const query = `
                SELECT 
                    m.menu_id, 
                    m.menu_name, 
                    m.url, 
                    m.parent_id,
                    m.sort_order
                FROM menus m
                JOIN role_menu_permissions rmp ON m.menu_id = rmp.menu_id
                WHERE rmp.role_id = $1 AND rmp.can_view = true AND m.is_use = true
                ORDER BY COALESCE(m.parent_id, m.menu_id), m.sort_order
            `;
            const result = await pool.query(query, [roleId]);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Get All Menus (Hierarchical or Flat)
    // For listing, we might want flat with parent name, or we handle hierarchy on client.
    // Let's return flat list with parent info.
    router.get('/', async (req, res) => {
        try {
            const query = `
                SELECT 
                    m.menu_id, 
                    m.menu_name, 
                    m.url, 
                    m.sort_order, 
                    m.is_use, 
                    m.parent_id,
                    p.menu_name as parent_name,
                    m.created_at
                FROM menus m
                LEFT JOIN menus p ON m.parent_id = p.menu_id
                ORDER BY COALESCE(m.parent_id, m.menu_id), m.sort_order
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Create Menu
    router.post('/', async (req, res) => {
        const { parent_id, menu_name, url, sort_order, is_use } = req.body;
        try {
            const query = `
                INSERT INTO menus (parent_id, menu_name, url, sort_order, is_use)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const values = [parent_id || null, menu_name, url, sort_order || 0, is_use !== undefined ? is_use : true];
            const result = await pool.query(query, values);
            res.json({ success: true, menu: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Update Menu
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { parent_id, menu_name, url, sort_order, is_use } = req.body;
        try {
            const query = `
                UPDATE menus 
                SET parent_id = $1, menu_name = $2, url = $3, sort_order = $4, is_use = $5
                WHERE menu_id = $6
                RETURNING *
            `;
            const values = [parent_id || null, menu_name, url, sort_order, is_use, id];
            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Menu not found' });
            }
            res.json({ success: true, menu: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Delete Menu
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const query = 'DELETE FROM menus WHERE menu_id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Menu not found' });
            }
            res.json({ success: true, message: 'Menu deleted' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
