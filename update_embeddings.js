require('dotenv').config();
const { Pool } = require('pg');
const OpenAI = require('openai');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const openai = new OpenAI();

(async () => {
    try {
        console.log('Fetching tasks without embeddings (or all tasks)...');
        const res = await pool.query('SELECT task_id, todo FROM tasks WHERE todo IS NOT NULL');

        console.log(`Found ${res.rows.length} tasks.`);

        for (const task of res.rows) {
            console.log(`Generating embedding for Task ${task.task_id}: "${task.todo.substring(0, 20)}..."`);

            try {
                const embeddingResponse = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: task.todo,
                });

                const embedding = embeddingResponse.data[0].embedding;
                const vectorString = `[${embedding.join(',')}]`;

                await pool.query('UPDATE tasks SET embedding = $1 WHERE task_id = $2', [vectorString, task.task_id]);
                console.log(`✅ Updated Task ${task.task_id}`);
            } catch (ignore) {
                console.error(`❌ Failed Task ${task.task_id}:`, ignore.message);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
})();
