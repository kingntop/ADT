const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure Multer (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = (pool) => {
    // List All Images
    router.get('/', async (req, res) => {
        try {
            const query = 'SELECT image_id, file_name, content_type, file_size, created_at FROM image_storage ORDER BY created_at DESC';
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            console.error('Error listing images:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Upload Image
    router.post('/', upload.single('image'), async (req, res) => {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        try {
            const query = `
                INSERT INTO image_storage (file_name, content_type, file_size, image_data)
                VALUES ($1, $2, $3, $4)
                RETURNING image_id, file_name, created_at
            `;
            const result = await pool.query(query, [file.originalname, file.mimetype, file.size, file.buffer]);

            res.json({ success: true, image: result.rows[0] });

        } catch (err) {
            console.error('Error uploading image:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // Get Image by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const query = 'SELECT content_type, image_data FROM image_storage WHERE image_id = $1';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).send('Image not found');
            }

            const img = result.rows[0];
            res.setHeader('Content-Type', img.content_type);
            res.send(img.image_data);

        } catch (err) {
            console.error('Error serving image:', err);
            res.status(500).send('Internal server error');
        }
    });

    // Delete Image
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Try to set DEPT.image_id to NULL if referenced
            try {
                await client.query('UPDATE DEPT SET image_id = NULL WHERE image_id = $1', [id]);
            } catch (deptErr) {
                console.warn('Could not update DEPT table (column might not exist):', deptErr.message);
            }

            // Delete from image_storage
            const query = 'DELETE FROM image_storage WHERE image_id = $1 RETURNING *';
            const result = await client.query(query, [id]);

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Image not found' });
            }

            await client.query('COMMIT');
            res.json({ success: true, message: 'Image deleted' });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error deleting image:', err);
            res.status(500).json({ success: false, message: err.message });
        } finally {
            client.release();
        }
    });

    return router;
};
