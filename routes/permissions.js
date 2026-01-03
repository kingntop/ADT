const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Get Permissions by Role ID
    router.get('/:role_id', async (req, res) => {
        const { role_id } = req.params;
        try {
            // Need to return ALL menus and attach permission if exists
            const query = `
                SELECT 
                    m.menu_id, 
                    m.menu_name, 
                    m.parent_id,
                    p.menu_name as parent_name,
                    m.sort_order,
                    rmp.can_view,
                    rmp.can_create,
                    rmp.can_update,
                    rmp.can_delete,
                    rmp.can_print
                FROM menus m
                LEFT JOIN menus p ON m.parent_id = p.menu_id
                LEFT JOIN role_menu_permissions rmp ON m.menu_id = rmp.menu_id AND rmp.role_id = $1
                ORDER BY COALESCE(m.parent_id, m.menu_id), m.sort_order
            `;
            const result = await pool.query(query, [role_id]);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Update Permission (Upsert)
    // Expect body: { menu_id: 1, can_view: true, ... }
    router.post('/:role_id', async (req, res) => {
        const { role_id } = req.params;
        const { menu_id, can_view, can_create, can_update, can_delete, can_print } = req.body;

        try {
            // Check if exists
            const checkQuery = 'SELECT 1 FROM role_menu_permissions WHERE role_id = $1 AND menu_id = $2';
            const checkRes = await pool.query(checkQuery, [role_id, menu_id]);

            if (checkRes.rows.length > 0) {
                // Update
                const updateQuery = `
                    UPDATE role_menu_permissions
                    SET can_view = $3, can_create = $4, can_update = $5, can_delete = $6, can_print = $7
                    WHERE role_id = $1 AND menu_id = $2
                `;
                await pool.query(updateQuery, [role_id, menu_id, can_view, can_create, can_update, can_delete, can_print]);
            } else {
                // Insert
                const insertQuery = `
                    INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;
                await pool.query(insertQuery, [role_id, menu_id, can_view, can_create, can_update, can_delete, can_print]);
            }
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Bulk Update support (optional, if frontend sends array)
    router.post('/:role_id/bulk', async (req, res) => {
        const { role_id } = req.params;
        const { permissions } = req.body; // Array of { menu_id, can_view... }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const p of permissions) {
                const checkQuery = 'SELECT 1 FROM role_menu_permissions WHERE role_id = $1 AND menu_id = $2';
                const checkRes = await client.query(checkQuery, [role_id, p.menu_id]);

                if (checkRes.rows.length > 0) {
                    await client.query(`
                        UPDATE role_menu_permissions
                        SET can_view = $3, can_create = $4, can_update = $5, can_delete = $6, can_print = $7
                        WHERE role_id = $1 AND menu_id = $2
                     `, [role_id, p.menu_id, p.can_view, p.can_create, p.can_update, p.can_delete, p.can_print]);
                } else {
                    await client.query(`
                        INSERT INTO role_menu_permissions (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                     `, [role_id, p.menu_id, p.can_view, p.can_create, p.can_update, p.can_delete, p.can_print]);
                }
            }

            await client.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    });

    return router;
};
