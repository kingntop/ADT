const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const OpenAI = require('openai');
const openai = new OpenAI(); // Expects OPENAI_API_KEY in env

module.exports = (pool) => {

    // GET /api/tasks - List all tasks
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT t.task_id, t.todo, t.status, t.created_at, t.completed_at, t.empno, e.ename as assignee_name 
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

    // POST /api/tasks/search - Vector Search
    router.post('/search', async (req, res) => {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });

        try {
            // OpenAI Embedding
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: query,
            });

            const embedding = embeddingResponse.data[0].embedding;
            const vectorString = `[${embedding.join(',')}]`;

            // Call Supabase RPC
            const result = await pool.query(
                `SELECT * FROM match_tasks($1, $2, $3)`,
                [vectorString, 0.5, 10] // Threshold 0.5 for better quality
            );

            // Fetch full details for the matched IDs
            if (result.rows.length > 0) {
                const ids = result.rows.map(r => r.id);
                const tasksQuery = `
                    SELECT t.task_id, t.todo, t.status, t.created_at, t.completed_at, t.empno, e.ename as assignee_name 
                    FROM tasks t 
                    LEFT JOIN emp e ON t.empno = e.empno 
                    WHERE t.task_id = ANY($1::int[])
                `;
                const tasksRes = await pool.query(tasksQuery, [ids]);

                // Preserve order from similarity search
                const orderedTasks = ids.map(id => tasksRes.rows.find(t => t.task_id === id)).filter(Boolean);

                res.json(orderedTasks);
            } else {
                res.json([]);
            }

        } catch (err) {
            logger.error(err, "POST /api/tasks/search Error");

            // Handle OpenAI Errors
            if (err.response) {
                return res.status(err.response.status || 500).json({ error: `OpenAI Error: ${err.response.statusText || err.message}` });
            }
            if (err.status) { // Newer OpenAI SDK might use this
                return res.status(err.status).json({ error: `OpenAI Error: ${err.message}` });
            }

            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST /api/tasks - Create new task
    router.post('/', async (req, res) => {
        const { todo, status, empno, completed_at } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO tasks (todo, status, empno, completed_at) VALUES ($1, $2, $3, $4) RETURNING *',
                [todo, status || 'PENDING', empno || null, completed_at || null]
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
        const { todo, status, empno, completed_at } = req.body;
        try {
            const result = await pool.query(
                'UPDATE tasks SET todo = $1, status = $2, empno = $3, completed_at = $4, updated_at = CURRENT_TIMESTAMP WHERE task_id = $5 RETURNING *',
                [todo, status, empno || null, completed_at || null, id]
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
