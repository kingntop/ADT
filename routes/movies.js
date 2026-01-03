const express = require('express');
const router = express.Router();
const https = require('https');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

module.exports = (pool) => {

    // GET /api/movies - Fetch movies from TMDB
    router.get('/', (req, res) => {
        // Using 'popular' as a reasonable default for a list of movies
        const url = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`;

        https.get(url, (tmdbRes) => {
            let data = '';

            tmdbRes.on('data', (chunk) => {
                data += chunk;
            });

            tmdbRes.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    res.json(jsonData.results || []);
                } catch (e) {
                    console.error('Error parsing TMDB response:', e);
                    res.status(500).json({ error: 'Failed to parse TMDB data' });
                }
            });

        }).on('error', (err) => {
            console.error('TMDB Request Error:', err);
            res.status(500).json({ error: 'Failed to fetch from TMDB' });
        });
    });

    return router;
};
