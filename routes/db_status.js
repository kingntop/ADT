const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (pool) => {

    // SQL File Path
    // SQL File Path
    const SQL_FILE_PATH = path.join(process.cwd(), 'sql', 'postgresql.sql');

    // Helper to parse SQL file
    const parseQueries = () => {
        try {
            if (!fs.existsSync(SQL_FILE_PATH)) {
                throw new Error(`SQL file not found at ${SQL_FILE_PATH}`);
            }
            const data = fs.readFileSync(SQL_FILE_PATH, 'utf8');
            const lines = data.split('\n');
            const categories = [];
            let currentCategory = null;
            let currentQuery = null;

            lines.forEach(line => {
                const trimmed = line.trim();
                // SQL Content might need empty lines, but for now we skip purely empty unless inside query?
                // The original logic skipped empty lines.
                if (!trimmed) return;

                if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
                    // New Category
                    if (currentQuery) {
                        currentCategory.queries.push(currentQuery);
                        currentQuery = null;
                    }
                    if (currentCategory) {
                        categories.push(currentCategory);
                    }
                    currentCategory = {
                        name: trimmed.substring(1).trim(),
                        queries: []
                    };
                } else if (trimmed.startsWith('##')) {
                    // New Query Title
                    if (currentQuery) {
                        currentCategory.queries.push(currentQuery);
                    }
                    if (!currentCategory) {
                        // Default category if none exists
                        currentCategory = { name: 'General', queries: [] };
                    }
                    currentQuery = {
                        title: trimmed.substring(2).trim(),
                        sql: ''
                    };
                } else {
                    // SQL Content
                    if (currentQuery) {
                        currentQuery.sql += line + '\n';
                    }
                }
            });

            // Push last items
            if (currentQuery && currentCategory) {
                currentCategory.queries.push(currentQuery);
            }
            if (currentCategory) {
                categories.push(currentCategory);
            }

            return categories;
        } catch (err) {
            logger.error(err, '[DB Status] Failed to parse SQL file');
            throw err; // Re-throw to be caught by route handler
        }
    };

    // GET available queries
    router.get('/queries', (req, res) => {
        try {
            const categories = parseQueries();
            // Add IDs for reference
            categories.forEach((cat, catIdx) => {
                cat.id = catIdx;
                cat.queries.forEach((q, qIdx) => {
                    q.id = qIdx;
                });
            });
            res.json(categories);
        } catch (err) {
            res.status(500).json({ error: 'Failed to load queries', details: err.message });
        }
    });

    // POST execute query
    router.post('/execute', async (req, res) => {
        const { categoryId, queryId } = req.body;

        const categories = parseQueries();
        const category = categories[categoryId];

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const queryObj = category.queries[queryId];
        if (!queryObj) {
            return res.status(404).json({ error: 'Query not found' });
        }

        try {
            // Remove trailing semicolon if present, though pg usually handles it
            let sql = queryObj.sql.trim();
            if (sql.endsWith(';')) {
                sql = sql.slice(0, -1);
            }

            const client = await pool.connect();
            try {
                const result = await client.query(sql);
                res.json({
                    success: true,
                    rows: result.rows,
                    fields: result.fields.map(f => f.name),
                    rowCount: result.rowCount
                });
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error(err, `[DB Status] Stats Query Failed: ${queryObj.title}`);
            res.status(500).json({ error: err.message, sql: queryObj.sql });
        }
    });

    return router;
};
