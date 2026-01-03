const fs = require('fs');
const path = require('path');

// Helper to get Custom Date: [YYYY-MM-DD HH:mm:ss]
const getLogDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
};

// Ensure logs directory exists (redundant if mkdir run, but good for safety)
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const writeLog = (type, message) => {
    let filename;
    if (type === 'error') {
        filename = 'error.log';
    } else {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        filename = `${type}_${dateStr}.log`;
    }

    const filePath = path.join(logDir, filename);

    // If it's an error log, ensure we have a timestamp if not present (though our error logger adds context, raw message might not)
    // But let's stick to the plan: just write the message.

    fs.appendFile(filePath, message + '\n', (err) => {
        if (err) console.error(`Failed to write to ${filename}:`, err);
    });
};

const logger = {
    // Access Logger Middleware
    accessMiddleware: (req, res, next) => {
        // We log on finish to get status code and length
        res.on('finish', () => {
            const ip = req.ip || req.connection.remoteAddress;
            // User from session if available, else '-'
            const user = (req.session && req.session.user && req.session.user.ename) ? req.session.user.ename : '-';
            const date = getLogDate();
            const method = req.method;
            const url = req.originalUrl || req.url;
            const httpVer = `HTTP/${req.httpVersion}`;
            const status = res.statusCode;
            const length = res.get('Content-Length') || 0;

            // Format: 127.0.0.1 - scott [31/Dec/2025:14:30:05 +0900] "POST /api/manage-dept HTTP/1.1" 200 128
            const logMsg = `${ip} - ${user} ${date} "${method} ${url} ${httpVer}" ${status} ${length}`;

            writeLog('access', logMsg);
        });
        next();
    },

    // Error Logger
    error: (err, context = '') => {
        const date = getLogDate();
        const msg = context ? `${date} [ERROR] ${context}: ${err.message}\nStack: ${err.stack}\n` : `${date} [ERROR] ${err.message}\nStack: ${err.stack}\n`;

        // Also log to console for immediate visibility
        console.error(msg);

        writeLog('error', msg);
    },

    // General Info Logger (optional, writes to access log or typically stdout/debug)
    info: (msg) => {
        console.log(msg); // Keep console active for dev
        writeLog('access', `INFO: ${msg}`);
    }
};

module.exports = logger;
