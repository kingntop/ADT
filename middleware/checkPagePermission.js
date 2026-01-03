
const checkPagePermission = (pool) => {
    return async (req, res, next) => {
        // Skip if not authenticated (should be covered by isAuthenticated, but safety double-check)
        if (!req.session || !req.session.user) {
            return res.redirect('/login.html');
        }

        const roleId = req.session.user.role_id;
        const currentPath = req.path;

        // Paths that are always allowed for authenticated users
        const allowedPaths = [
            '/dashboard',
            '/login.html',
            '/password_change',
            '/auth/logout',
            '/' // Home redirects to login, but if auth'd maybe dashboard?
        ];

        // Simple check for allowed paths
        if (allowedPaths.includes(currentPath)) {
            return next();
        }

        // Check against menus table/permissions
        // We need to match currentPath against menu.url
        // Strategy: 
        // 1. Fetch all allowed URLs for this role.
        // 2. Check if currentPath starts with one of the allowed URLs.

        try {
            // Optimization: Cache this or use session if we trust session to update? 
            // User wanted immediate update, so DB query is safer.

            // Get all allowed URLs for this role
            const query = `
                SELECT m.url 
                FROM menus m
                JOIN role_menu_permissions rmp ON m.menu_id = rmp.menu_id
                WHERE rmp.role_id = $1 AND rmp.can_view = true 
                AND m.url IS NOT NULL
            `;
            const result = await pool.query(query, [roleId]);
            const allowedUrls = result.rows.map(r => r.url);

            // Log for debugging
            // console.log(`[AuthCheck] User: ${req.session.user.username}, Role: ${roleId}, Path: ${currentPath}, Allowed: ${allowedUrls.length}`);

            const isAllowed = allowedUrls.some(allowed => {
                if (allowed === '/') return false; // Don't match root loosely here
                // Exact match or sub-path match
                return currentPath === allowed || currentPath.startsWith(allowed + '/');
            });

            if (isAllowed) {
                return next();
            } else {
                console.warn(`[Access Denied] User: ${req.session.user.username} tried to access ${currentPath}`);
                // Redirect to dashboard or show 403 page? User asked to "send to dashboard"
                return res.redirect('/dashboard?error=unauthorized');
            }

        } catch (err) {
            console.error('Permission Check Error:', err);
            // Fail safe: allow? No, deny.
            return res.redirect('/dashboard?error=server_error');
        }
    };
};

module.exports = checkPagePermission;
