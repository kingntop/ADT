const fs = require('fs');
const path = require('path');

// Helper to get CLF Date: [31/Dec/2025:14:30:05 +0900]
const getCLFDate = () => {
    const d = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    // Timezone offset (e.g., -540 for +09:00)
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const pad = (num) => String(Math.floor(Math.abs(num))).padStart(2, '0');
    const offsetStr = `${sign}${pad(offset / 60)}${pad(offset % 60)}`;

    return `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${offsetStr}]`;
};

// Ensure logs directory exists (redundant if mkdir run, but good for safety)
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const writeLog = (type, message) => {
    // For error logs, keep using YYYYMMDD for filename
    // For access logs, arguably same
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const filename = `${type}_${dateStr}.log`;
    const filePath = path.join(logDir, filename);

    // If it's an error log, adding timestamp might be redundant if message has it, 
    // but the `accessMiddleware` constructs the full line.
    // Let's just append message directly for raw control.

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
            const date = getCLFDate();
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
        const msg = context ? `${context}: ${err.message}\nStack: ${err.stack}` : `${err.message}\nStack: ${err.stack}`;
        writeLog('error', msg);
    },

    // General Info Logger (optional, writes to access log or typically stdout/debug)
    info: (msg) => {
        console.log(msg); // Keep console active for dev
        writeLog('access', `INFO: ${msg}`);
    }
};

module.exports = logger;
