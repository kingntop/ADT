const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Get All Employees with Pagination
    router.get('/', async (req, res) => {
        try {
            // Check if "all" is requested (for Faceted Search which needs client-side filtering on full dataset)
            if (req.query.all === 'true') {
                const query = `
                    SELECT 
                        E.EMPNO, 
                        E.ENAME, 
                        E.JOB, 
                        E.MGR,
                        M.ENAME as M_NAME, 
                        TO_CHAR(E.HIREDATE, 'YYYY-MM-DD') as HIREDATE_STR,
                        E.SAL, 
                        E.COMM, 
                        E.DEPTNO,
                        D.DNAME
                    FROM EMP E
                    LEFT JOIN DEPT D ON E.DEPTNO = D.DEPTNO
                    LEFT JOIN EMP M ON E.MGR = M.EMPNO
                    ORDER BY E.EMPNO
                `;
                const result = await pool.query(query);
                // Return array for compatibility with client-side logic expecting pure array
                return res.json(result.rows);
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const sortField = req.query.sortField || 'empno';
            const sortOrder = (req.query.sortOrder || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

            // Whitelist sort fields to prevent SQL injection
            const validSortFields = {
                'empno': 'E.EMPNO',
                'ename': 'E.ENAME',
                'job': 'E.JOB',
                'hiredate': 'E.HIREDATE',
                'sal': 'E.SAL',
                'deptno': 'E.DEPTNO'
            };

            const orderBy = validSortFields[sortField.toLowerCase()] || 'E.EMPNO';

            // Get Total Count
            const countRes = await pool.query('SELECT COUNT(*) FROM EMP');
            const total = parseInt(countRes.rows[0].count);

            const query = `
                SELECT 
                    E.EMPNO, 
                    E.ENAME, 
                    E.JOB, 
                    E.MGR,
                    M.ENAME as M_NAME, 
                    TO_CHAR(E.HIREDATE, 'YYYY-MM-DD') as HIREDATE_STR,
                    E.SAL, 
                    E.COMM, 
                    E.DEPTNO,
                    D.DNAME
                FROM EMP E
                LEFT JOIN DEPT D ON E.DEPTNO = D.DEPTNO
                LEFT JOIN EMP M ON E.MGR = M.EMPNO
                ORDER BY ${orderBy} ${sortOrder}
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

    // Create Employee
    router.post('/', async (req, res) => {
        const { empid, ename, job, mgr, hiredate, sal, comm, deptno } = req.body;
        // Note: EMPNO is not auto-increment in standard SCOTT schema usually, 
        // but for this demo I'll assume the user provides it or we generate it. 
        // Let's generate a simple max+1 for now if not provided, or ask user. 
        // Ref image didn't show EMPNO field, so I will auto-generate.

        try {
            // Auto-generate ID if needed (Simple MAX+1)
            const idRes = await pool.query('SELECT COALESCE(MAX(EMPNO), 7900) + 1 as new_id FROM EMP');
            const newEmpNo = idRes.rows[0].new_id;

            const query = `
                INSERT INTO EMP(EMPNO, ENAME, JOB, MGR, HIREDATE, SAL, COMM, DEPTNO)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
                `;
            const values = [newEmpNo, ename, job, mgr || null, hiredate, sal, comm || null, deptno || null];

            const result = await pool.query(query, values);
            res.json({ success: true, employee: result.rows[0] });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Update Employee
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { ename, job, mgr, hiredate, sal, comm, deptno } = req.body;

        try {
            const query = `
                UPDATE EMP 
                SET ENAME = $1, JOB = $2, MGR = $3, HIREDATE = $4, SAL = $5, COMM = $6, DEPTNO = $7
                WHERE EMPNO = $8
            RETURNING *
                `;
            const values = [ename, job, mgr || null, hiredate, sal, comm || null, deptno || null, id];

            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }
            res.json({ success: true, employee: result.rows[0] });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Delete Employee
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const query = 'DELETE FROM EMP WHERE EMPNO = $1 RETURNING *';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }
            res.json({ success: true, message: 'Employee deleted', employee: result.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: err.message });
        }
    });

    return router;
};
