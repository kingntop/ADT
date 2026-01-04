require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const helmet = require('helmet');
const session = require('express-session');
const si = require('systeminformation');

const fs = require('fs');
const logger = require('./utils/logger'); // Import Logger

// Resource History Buffer (In-Memory)
const historyBuffer = [];
const MAX_HISTORY_POINTS = 200; // 10 mins at 3s interval

// Background Resource Poller
setInterval(async () => {
    try {
        const [cpu, mem] = await Promise.all([
            si.currentLoad(),
            si.mem()
        ]);

        const timestamp = new Date().toISOString();
        const dataPoint = {
            timestamp,
            cpu: cpu.currentLoad,
            memory: (mem.active / mem.total) * 100
        };

        historyBuffer.push(dataPoint);
        if (historyBuffer.length > MAX_HISTORY_POINTS) {
            historyBuffer.shift(); // Remove oldest
        }
    } catch (err) {
        console.error('Resource Poller Error:', err);
    }
}, 3000); // 3 seconds

const app = express();
const port = 3000;

// Process Level Error Handling (Capture startup errors)
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    logger.error(err, '[Process] Uncaught Exception');
    process.exit(1); // Mandatory exit
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error(err, '[Process] Unhandled Rejection');
});

// 1. Access Logging Middleware (Moved below Session)
// app.use(logger.accessMiddleware);

// Security Middleware

app.use(helmet({
    // 🔴 1. HSTS 비활성화 (HTTP 전용 환경에서 필수)
    // 이걸 끄지 않으면 브라우저가 강제로 HTTPS로 리다이렉트 시도할 수 있습니다.
    hsts: false,

    contentSecurityPolicy: {
        // 🔵 2. upgrade-insecure-requests 방지
        // 현재 작성하신 directives에는 포함되어 있지 않아 다행이지만, 
        // 확실히 하기 위해 명시적으로 null 처리하거나 포함하지 않아야 합니다.
        directives: {
            "upgrade-insecure-requests": null, // 혹시 모를 자동 변환 방지

            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "*"],
            connectSrc: ["'self'"],
        },
    },
}));

// Session Middleware
app.use(session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // Set to true if using HTTPS
        maxAge: 10 * 60 * 1000 // 10 minutes
    }
}));

// Access Logging Middleware (Must be after session to capture user)
app.use(logger.accessMiddleware);

// Body Parser
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    // Check if it's an API request (Use originalUrl as path strips mount point)
    if (req.originalUrl.startsWith('/api/') || req.path.startsWith('/api/')) {
        const msg = 'Unauthorized: Session expired or invalid';
        logger.error(new Error(msg), `[Auth] 401 ${req.method} ${req.originalUrl} IP:${req.ip}`);
        return res.status(401).json({ success: false, message: msg });
    }
    res.redirect('/login.html');
};

// SSR Helper Function
const renderPage = (viewName, res) => {
    try {
        let pageHtml = fs.readFileSync(path.join(__dirname, 'views', viewName), 'utf8');
        const headerHtml = fs.readFileSync(path.join(__dirname, 'views/components/header.html'), 'utf8');
        const sidebarHtml = fs.readFileSync(path.join(__dirname, 'views/components/sidebar.html'), 'utf8');

        // Replace placeholders
        pageHtml = pageHtml.replace('<!-- HEADER -->', headerHtml);
        pageHtml = pageHtml.replace('<!-- SIDEBAR -->', sidebarHtml);

        // Inject Client Logger, Auth Interceptor, and Tailwind Config
        const scripts = `
            <script>
                tailwind.config = {
                    darkMode: 'class',
                    theme: {
                        extend: {
                            colors: {
                                gray: {
                                    900: '#1a202c',
                                    800: '#2d3748',
                                    700: '#4a5568',
                                }
                            }
                        }
                    }
                }
            </script>
            <script src="/js/client-logger.js"></script>
            <script src="/js/auth-interceptor.js"></script>
        `;
        if (pageHtml.includes('</body>')) {
            pageHtml = pageHtml.replace('</body>', `${scripts}</body>`);
        } else {
            pageHtml += scripts;
        }

        res.send(pageHtml);
    } catch (err) {
        console.error('SSR Error:', err);
        logger.error(err, `[SSR] Failed to render ${viewName}`);
        res.status(500).send('Internal Server Error');
    }
};


// Database Connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

// Pool Event Listeners for Debugging
pool.on('connect', () => {
    console.log('📦 New client connected to database');
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Immediate Connection Check
(async () => {
    try {
        console.log(`🔌 Attempting to connect to database... (Host: ${process.env.DB_HOST || 'localhost'})`);
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database successfully!');
        client.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1); // Exit if DB is unreachable
    }
})();



// Routes
const authRoutes = require('./routes/auth')(pool);
const statsRoutes = require('./routes/stats')(pool);
const employeeRoutes = require('./routes/employees')(pool);

// System Resource API
app.get('/api/stats/resources', async (req, res) => {
    try {
        const [cpu, mem, fsSize] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize()
        ]);

        // Find main partition (usually where OS is installed)
        // For Windows it might be 'C:', for Linux '/'
        // We'll take the first one or look for mount '/'
        const mainFs = fsSize.find(d => d.mount === '/' || d.mount === 'C:') || fsSize[0] || {};

        res.json({
            cpu: cpu.currentLoad,
            memory: {
                total: mem.total,
                active: mem.active,
                used: mem.used,
                percent: (mem.active / mem.total) * 100
            },
            disk: {
                size: mainFs.size,
                used: mainFs.used,
                use: mainFs.use
            }
        });
    } catch (error) {
        logger.error(error, '[Resources] Failed to fetch metrics');
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

app.get('/api/stats/resources/history', (req, res) => {
    res.json(historyBuffer);
});
const departmentRoutes = require('./routes/departments')(pool);
const treeRoutes = require('./routes/tree')(pool);
const taskRoutes = require('./routes/tasks')(pool);
const imageRoutes = require('./routes/images')(pool);
const movieRoutes = require('./routes/movies')(pool);

app.use('/auth', authRoutes);
app.use('/api/stats', isAuthenticated, statsRoutes);
app.use('/api/employees', isAuthenticated, employeeRoutes);
app.use('/api/departments', isAuthenticated, departmentRoutes);
app.use('/api/tree', isAuthenticated, treeRoutes);
app.use('/api/tasks', isAuthenticated, taskRoutes);
app.use('/api/images', imageRoutes); // Public access for images (or add auth if needed)
app.use('/api/movies', isAuthenticated, movieRoutes);
app.use('/api/keys', isAuthenticated, require('./routes/apikeys')(pool));

// External API (v1)

const apiKeyAuth = require('./middleware/apiKeyAuth')(pool);
app.use('/v1/employees', apiKeyAuth, require('./routes/api/v1/employees')(pool));
app.use('/v1/departments', apiKeyAuth, require('./routes/api/v1/departments')(pool));

// App Users
app.use('/api/app_users', isAuthenticated, require('./routes/app_users')(pool));
app.get('/app_users', isAuthenticated, (req, res) => renderPage('app_users.html', res));
app.get('/password_change', isAuthenticated, (req, res) => renderPage('password_change.html', res));

// API Management
app.use('/api/endpoints', isAuthenticated, require('./routes/api_endpoints')(pool));
app.get('/api_endpoints', isAuthenticated, (req, res) => renderPage('api_endpoints.html', res));

// System Management APIs
app.use('/api/menus', isAuthenticated, require('./routes/menus')(pool));
app.use('/api/roles', isAuthenticated, require('./routes/roles')(pool));
app.use('/api/permissions', isAuthenticated, require('./routes/permissions')(pool));

// System Management Views
const checkPagePermission = require('./middleware/checkPagePermission')(pool);

// Apply explicit permission check for these sensitive pages
app.get('/system/menus', isAuthenticated, checkPagePermission, (req, res) => renderPage('menus.html', res));
app.get('/system/roles', isAuthenticated, checkPagePermission, (req, res) => renderPage('roles.html', res));
app.get('/system/permissions', isAuthenticated, checkPagePermission, (req, res) => renderPage('permissions.html', res)); // Sidebar link
app.get('/permissions.html', isAuthenticated, checkPagePermission, (req, res) => renderPage('permissions.html', res)); // Legacy link

// Also apply to other administrative pages if they are in the menus table
app.get('/app_users', isAuthenticated, checkPagePermission, (req, res) => renderPage('app_users.html', res));
app.get('/api_endpoints', isAuthenticated, checkPagePermission, (req, res) => renderPage('api_endpoints.html', res));
app.get('/apikeys', isAuthenticated, checkPagePermission, (req, res) => renderPage('apikeys.html', res));

// Client Logger Endpoint
app.post('/api/logs/client', (req, res) => {
    const { message, stack, source, lineno, colno } = req.body;
    const userAgent = req.get('User-Agent');
    const logMsg = `[Client] ${message}\nSource: ${source}:${lineno}:${colno}\nAgent: ${userAgent}\nStack: ${stack || 'N/A'}`;

    // Use logger.error but wrap in Error object or just string?
    // Logger expects (err, context).
    // Let's create a custom error object or just log string log
    // We'll reuse the error logger methodology
    logger.error({ message: message, stack: stack || 'Client Error' }, `[Client] URL:${source}`);

    res.status(200).send('Logged');
});

// View Routes (SSR)
app.get('/dashboard', isAuthenticated, (req, res) => renderPage('dashboard.html', res));
app.get('/employees', isAuthenticated, (req, res) => renderPage('employees.html', res));
app.get('/departments', isAuthenticated, (req, res) => renderPage('departments.html', res));
app.get('/search', isAuthenticated, (req, res) => renderPage('search.html', res));
app.get('/tree', isAuthenticated, (req, res) => renderPage('tree.html', res)); // New View
app.get('/tasks', isAuthenticated, (req, res) => renderPage('tasks.html', res)); // Tasks View
app.get('/calendars', isAuthenticated, (req, res) => renderPage('calendars.html', res)); // Calendars View
app.get('/movies', isAuthenticated, (req, res) => renderPage('movie.html', res)); // Movies View
app.get('/images', isAuthenticated, (req, res) => renderPage('images.html', res)); // Images View
app.get('/apikeys', isAuthenticated, (req, res) => renderPage('apikeys.html', res)); // API Keys View
app.get('/resource', isAuthenticated, (req, res) => renderPage('resource.html', res)); // Resource View

// Login Page (No SSR needed for header/sidebar usually, but let's serve it from views)
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Root Redirect
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// 404 Handler (Must be after all routes, before Error Handler)
app.use((req, res, next) => {
    // Suppress logs for specific known paths
    if (req.originalUrl.includes('.well-known/appspecific/com.chrome.devtools.json')) {
        return res.status(404).send('Not Found');
    }

    const err = new Error('Not Found');
    err.status = 404;
    logger.error(err, `[404] ${req.method} ${req.originalUrl} IP:${req.ip}`);
    res.status(404).send('Page Not Found');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Build Context
    const user = req.session && req.session.user ? `[User: ${req.session.user.ename}]` : '[Guest]';
    const body = req.body ? JSON.stringify(req.body) : '{}';
    const context = `${req.method} ${req.url} ${user} Body:${body}`;

    logger.error(err, context);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
