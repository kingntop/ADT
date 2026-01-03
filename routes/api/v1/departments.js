const express = require('express');
const router = express.Router();
const logger = require('../../../utils/logger'); // Adjust path for routes/api/v1/

module.exports = (pool) => {
    // GET /v1/departments
    router.get('/', async (req, res) => {
        try {
            // Aggregating employees into a JSON array per department
            const query = `
                SELECT 
                    d.deptno, d.dname, d.loc,
                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'empno', e.empno,
                                'ename', e.ename,
                                'job', e.job,
                                'mgr', e.mgr,
                                'hiredate', TO_CHAR(e.hiredate, 'YYYY-MM-DD'),
                                'sal', e.sal,
                                'comm', e.comm
                            ) ORDER BY e.empno
                        ) FILTER (WHERE e.empno IS NOT NULL),
                        '[]'::json
                    ) as employees
                FROM dept d
                LEFT JOIN emp e ON d.deptno = e.deptno
                GROUP BY d.deptno, d.dname, d.loc
                ORDER BY d.deptno
            `;
            const result = await pool.query(query);

            res.json({
                success: true,
                count: result.rows.length,
                data: result.rows
            });
        } catch (err) {
            logger.error(err, '[API v1] GET /departments Error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return router;
};
