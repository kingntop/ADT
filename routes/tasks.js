const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

module.exports = (pool) => {

    // GET /api/tasks - List all tasks
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT t.task_id, t.todo, t.status, t.created_at, t.empno, e.ename as assignee_name 
                FROM tasks t 
                LEFT JOIN emp e ON t.empno = e.empno 
                ORDER BY t.updated_at DESC NULLS LAST
            `);
            res.json(result.rows);
        } catch (err) {
            logger.error(err, "GET /api/tasks Error");
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/tasks - Create new task
    router.post('/', async (req, res) => {
        const { todo, status, empno } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO tasks (todo, status, empno) VALUES ($1, $2, $3) RETURNING *',
                [todo, status || 'PENDING', empno || null]
            );
            res.json({ success: true, task: result.rows[0] });
        } catch (err) {
            logger.error(err, "POST /api/tasks Error");
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/tasks/:id - Update task
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { todo, status, empno } = req.body;
        try {
            const result = await pool.query(
                'UPDATE tasks SET todo = $1, status = $2, empno = $3, updated_at = CURRENT_TIMESTAMP WHERE task_id = $4 RETURNING *',
                [todo, status, empno || null, id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            res.json({ success: true, task: result.rows[0] });
        } catch (err) {
            logger.error(err, "PUT /api/tasks/:id Error");
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/tasks/:id - Delete task
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM tasks WHERE task_id = $1', [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }
            res.json({ success: true, message: 'Task deleted' });
        } catch (err) {
            logger.error(err, "DELETE /api/tasks/:id Error");
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
