const express = require('express');
const router = express.Router();
const logger = require('../../../utils/logger'); // Adjust path for routes/api/v1/

module.exports = (pool) => {
    // GET /v1/employees
    router.get('/', async (req, res) => {
        try {
            // Using a simple query to get public facing data
            // Excluding sensitive info if any
            const query = `
                SELECT 
                    empno, ename, job, mgr, 
                    TO_CHAR(hiredate, 'YYYY-MM-DD') as hiredate, 
                    sal, comm, deptno
                FROM emp
                ORDER BY empno
            `;
            const result = await pool.query(query);

            res.json({
                success: true,
                count: result.rows.length,
                data: result.rows
            });
        } catch (err) {
            logger.error(err, '[API v1] GET /employees Error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
};
