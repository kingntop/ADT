const fs = require('fs');
const path = require('path');

// Simulate the logic in routes/db_status.js
const SQL_FILE_PATH = path.join(process.cwd(), 'sql', 'postgresql.sql');

console.log(`Checking for SQL file at: ${SQL_FILE_PATH}`);

try {
    if (!fs.existsSync(SQL_FILE_PATH)) {
        throw new Error(`SQL file not found at ${SQL_FILE_PATH}`);
    }
    console.log('File exists.');

    const data = fs.readFileSync(SQL_FILE_PATH, 'utf8');
    const lines = data.split('\n');
    const categories = [];
    let currentCategory = null;
    let currentQuery = null;

    lines.forEach(line => {
        const trimmed = line.trim();
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

    if (currentQuery && currentCategory) {
        currentCategory.queries.push(currentQuery);
    }
    if (currentCategory) {
        categories.push(currentCategory);
    }

    console.log(`Successfully parsed ${categories.length} categories.`);
    categories.forEach(c => {
        console.log(`- ${c.name} (${c.queries.length} queries)`);
    });

} catch (err) {
    console.error('Verification Failed:', err.message);
    process.exit(1);
}
