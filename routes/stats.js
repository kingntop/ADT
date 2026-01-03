const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // 0. Total Employee Stat
    router.get('/total_employee', async (req, res) => {
        try {
            const query = 'SELECT COUNT(*) as count FROM EMP';
            const result = await pool.query(query);
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 0.1 Total Department Stat
    router.get('/total_dept', async (req, res) => {
        try {
            const query = 'SELECT COUNT(*) as count FROM DEPT';
            const result = await pool.query(query);
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 0.2 Average Salary Stat
    router.get('/avg_sal', async (req, res) => {
        try {
            const query = 'SELECT COALESCE(ROUND(AVG(SAL), 0), 0) as avg_sal FROM EMP';
            const result = await pool.query(query);
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 1. Employees per Department
    router.get('/dept-emp', async (req, res) => {
        try {
            const query = `
                SELECT D.DNAME, COUNT(E.EMPNO) as count 
                FROM DEPT D 
                LEFT JOIN EMP E ON D.DEPTNO = E.DEPTNO 
                GROUP BY D.DNAME
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 2. Employees per Job
    router.get('/job-emp', async (req, res) => {
        try {
            const query = `
                SELECT JOB, COUNT(EMPNO) as count 
                FROM EMP 
                WHERE JOB IS NOT NULL
                GROUP BY JOB
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 3. Total Salary per Department
    router.get('/dept-sal', async (req, res) => {
        try {
            const query = `
                SELECT D.DNAME, SUM(COALESCE(E.SAL, 0)) as total 
                FROM DEPT D 
                LEFT JOIN EMP E ON D.DEPTNO = E.DEPTNO 
                GROUP BY D.DNAME
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 4. Total Salary per Job
    router.get('/job-sal', async (req, res) => {
        try {
            const query = `
                SELECT JOB, SUM(SAL) as total 
                FROM EMP 
                WHERE JOB IS NOT NULL
                GROUP BY JOB
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
