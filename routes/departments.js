const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Get All Departments with Pagination
    router.get('/', async (req, res) => {
        try {
            // Check if pagination is requested (if no page param, return all for dropdowns usually, but user asked for "List Pages" pagination. 
            // However, dropdowns use this endpoint too. We should handle "all" mode if needed, or if dropdowns can use the new format.
            // Dropdowns usually expect an array. If we change response to object, we break dropdowns.
            // Let's check if 'page' query param exists. If so, paginate. If not, return full list (backward compatibility).

            if (req.query.page) {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const offset = (page - 1) * limit;

                const countRes = await pool.query('SELECT COUNT(*) FROM DEPT');
                const total = parseInt(countRes.rows[0].count);

                const query = 'SELECT DEPTNO, DNAME, LOC FROM DEPT ORDER BY DEPTNO LIMIT $1 OFFSET $2';
                const result = await pool.query(query, [limit, offset]);

                res.json({
                    data: result.rows,
                    total: total,
                    page: page,
                    limit: limit
                });
            } else {
                // Return all for dropdowns (legacy mode)
                const query = 'SELECT DEPTNO, DNAME, LOC FROM DEPT ORDER BY DEPTNO';
                const result = await pool.query(query);
                res.json(result.rows);
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Create Department
    router.post('/', async (req, res) => {
        const { dname, loc } = req.body;
        try {
            // Check Duplicate DNAME
            const dupCheck = await pool.query('SELECT 1 FROM DEPT WHERE UPPER(DNAME) = UPPER($1)', [dname]);
            if (dupCheck.rows.length > 0) {
                return res.status(409).json({ success: false, message: 'Duplicate DNAME' });
            }

            // Auto-generate DEPTNO: MAX(DEPTNO) + 10 (Standard Oracle/SCOTT practice)
            const idRes = await pool.query('SELECT COALESCE(MAX(DEPTNO), 0) + 10 as new_id FROM DEPT');
            const newId = idRes.rows[0].new_id;

            const query = 'INSERT INTO DEPT (DEPTNO, DNAME, LOC) VALUES ($1, $2, $3) RETURNING *';
            const result = await pool.query(query, [newId, dname, loc]);
            res.json({ success: true, department: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Update Department
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { dname, loc } = req.body;
        try {
            // Check Duplicate DNAME (excluding self)
            const dupCheck = await pool.query('SELECT 1 FROM DEPT WHERE UPPER(DNAME) = UPPER($1) AND DEPTNO != $2', [dname, id]);
            if (dupCheck.rows.length > 0) {
                return res.status(409).json({ success: false, message: 'Duplicate DNAME' });
            }

            const query = 'UPDATE DEPT SET DNAME = $1, LOC = $2 WHERE DEPTNO = $3 RETURNING *';
            const result = await pool.query(query, [dname, loc, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Department not found' });
            }
            res.json({ success: true, department: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Delete Department
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const query = 'DELETE FROM DEPT WHERE DEPTNO = $1 RETURNING *';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Department not found' });
            }
            res.json({ success: true, message: 'Department deleted', department: result.rows[0] });
        } catch (err) {
            console.error(err);
            if (err.code === '23503') { // Postgres FK violation code
                return res.status(400).json({ success: false, message: 'Cannot delete department with existing employees' });
            }
            res.status(500).json({ success: false, message: err.message });
        }
    });

    return router;
};
