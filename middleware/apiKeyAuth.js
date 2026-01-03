const logger = require('../utils/logger'); // Assuming logger exists

module.exports = (pool) => {
    return async (req, res, next) => {
        console.log('[Middleware] Checking API Key for:', req.originalUrl);
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({ error: 'Unauthorized: API Key missing' });
        }

        try {
            const query = `
                SELECT * FROM api_keys 
                WHERE api_key = $1 
                  AND status = 'ACTIVE' 
                  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            `;
            const result = await pool.query(query, [apiKey]);

            if (result.rows.length === 0) {
                logger.warn(`[API Auth] Invalid or expired key used: ${apiKey}`);
                return res.status(401).json({ error: 'Unauthorized: Invalid or expired API Key' });
            }

            // Valid key
            req.apiKey = result.rows[0];
            // Optional: Update last_used_at if column exists (skipped for now as not in schema)

            next();
        } catch (err) {
            logger.error(err, '[API Auth] Database Error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };
};
