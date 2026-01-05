require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

(async () => {
    try {
        const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
        const vectorString = `[${mockEmbedding.join(',')}]`;

        console.log('Updating last task with mock embedding...');
        const res = await pool.query(`
            UPDATE tasks 
            SET embedding = $1 
            WHERE task_id = (SELECT MAX(task_id) FROM tasks)
            RETURNING task_id, todo
        `, [vectorString]);

        console.log('Updated:', res.rows[0]);

    } catch (err) {
        console.error('Update Failed:', err);
    } finally {
        process.exit(0);
    }
})();
