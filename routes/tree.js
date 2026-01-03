const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // Import Logger

module.exports = (pool) => {


    router.get('/', async (req, res) => {
        try {
            // Recursive CTE to build hierarchy
            // We use ARRAY to sort siblings by name effectively
            const query = `
            WITH RECURSIVE org AS (
                -- Anchor: Top Level (MGR is NULL)
                SELECT 
                    empno, ename, job, mgr,
                    1::int as level,
                    ARRAY[ename::text] as path_sort
                FROM emp
                WHERE mgr IS NULL

                UNION ALL

                -- Recursive: Subordinates
                SELECT 
                    e.empno, e.ename, e.job, e.mgr,
                    o.level + 1,
                    o.path_sort || e.ename::text
                FROM emp e
                JOIN org o ON e.mgr = o.empno
            )
            SELECT 
                o.empno, 
                o.ename, 
                o.level,
                o.mgr,
                (SELECT COUNT(*) = 0 FROM emp e WHERE e.mgr = o.empno) as is_leaf
            FROM org o
            ORDER BY path_sort
        `;

            const { rows } = await pool.query(query);

            // Map to user-requested format
            const data = rows.map(row => {
                let status = -1; // Default: Inner Node (Expanded/Collapsible)
                if (row.level === 1) status = 1; // Root
                else if (row.is_leaf) status = 0; // Leaf

                return {
                    status: status,
                    level: row.level,
                    title: row.ename,         // "ENAME" as title
                    icon: null,
                    value: row.empno,         // "EMPNO" as value
                    tooltip: null,
                    link: null,
                    // Additional helpful data for frontend reconstruction
                    mgr: row.mgr,
                    isLeaf: row.is_leaf
                };
            });

            res.json(data);
        } catch (err) {
            console.error("Tree Query Error:", err);
            logger.error(err, "Tree Query Error"); // Log to file
            res.status(500).json({ error: err.message });
        }
    });

    // Move Endpoint (Drag and Drop)
    router.post('/move', async (req, res) => {
        const { empnos, targetMgr } = req.body;

        if (!empnos || !Array.isArray(empnos) || empnos.length === 0) {
            return res.status(400).json({ success: false, message: 'No employees selected' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Identify valid Target Manager
            // If targetMgr is null/undefined, it means making them Root (MGR=NULL)? 
            // Or usually dragging to "Top Level" means MGR=NULL. 
            // For now assume targetMgr is a valid EMPNO or null.

            // 2. Validate Target (Circular Check is complex, skipping for MVP unless requested)
            // But we should at least check if target exists if not null.

            // 3. Update
            const query = `UPDATE EMP SET MGR = $1 WHERE EMPNO = ANY($2::int[])`;
            await client.query(query, [targetMgr, empnos]);

            await client.query('COMMIT');
            res.json({ success: true, message: `Updated ${empnos.length} employees` });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Move Error:", err);
            logger.error(err, "Move Error"); // Log to file
            res.status(500).json({ success: false, message: err.message });
        } finally {
            client.release();
        }
    });

    // Salary Stats Endpoint
    router.get('/stats/salary/:empno', async (req, res) => {
        const { empno } = req.params;
        try {
            // 1. Get Deptno of the user
            const deptRes = await pool.query('SELECT deptno, ename FROM emp WHERE empno = $1', [empno]);
            if (deptRes.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

            const { deptno, ename } = deptRes.rows[0];

            // 2. Get all salaries in that dept
            // If deptno is null, maybe return just that employee or nothing?
            // Assuming deptno is valid.
            let query = 'SELECT ename, sal FROM emp WHERE deptno = $1 ORDER BY sal DESC';
            let params = [deptno];

            if (!deptno) {
                // Handle case where employee has no department (unlikely but possible)
                query = 'SELECT ename, sal FROM emp WHERE empno = $1';
                params = [empno];
            }

            const { rows } = await pool.query(query, params);
            res.json({ department: deptno, target: ename, data: rows });
        } catch (err) {
            console.error("Stats Error:", err);
            logger.error(err, "Stats Error");
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
