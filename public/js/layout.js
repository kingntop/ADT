// Sidebar Toggle Logic
window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const title = document.getElementById('sidebarTitle');
    const texts = document.querySelectorAll('.sidebar-text');

    if (sidebar.classList.contains('w-64')) {
        // Collapse
        sidebar.classList.remove('w-64');
        sidebar.classList.add('w-20');

        title.classList.add('opacity-0', 'w-0');
        title.classList.remove('ml-4');

        texts.forEach(text => {
            text.classList.add('opacity-0', 'hidden'); // Use hidden to remove width impact
            text.classList.remove('opacity-100');
        });

        localStorage.setItem('sidebarCollapsed', 'true');
    } else {
        // Expand
        sidebar.classList.remove('w-20');
        sidebar.classList.add('w-64');

        title.classList.remove('opacity-0', 'w-0');
        title.classList.add('ml-4');

        texts.forEach(text => {
            text.classList.remove('hidden');
            // Small delay to allow transition
            setTimeout(() => {
                text.classList.remove('opacity-0');
                text.classList.add('opacity-100');
            }, 10);
        });

        localStorage.setItem('sidebarCollapsed', 'false');
    }
};

// Theme Toggle Logic
window.toggleTheme = function () {
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');

    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (icon) icon.className = 'fa-solid fa-moon text-xl';
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if (icon) icon.className = 'fa-solid fa-sun text-xl text-yellow-500';
    }
};

async function loadLayout(pageTitle) {
    try {
        // Init Theme
        const theme = localStorage.getItem('theme');
        const icon = document.getElementById('themeIcon');
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (icon) icon.className = 'fa-solid fa-sun text-xl text-yellow-500';
        } else {
            document.documentElement.classList.remove('dark');
            if (icon) icon.className = 'fa-solid fa-moon text-xl';
        }

        // Init Sidebar State
        // Init Sidebar State
        const sidebar = document.getElementById('sidebar');
        const title = document.getElementById('sidebarTitle');
        const texts = document.querySelectorAll('.sidebar-text');

        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-20');
            title.classList.add('opacity-0', 'w-0');
            title.classList.remove('ml-4');
            texts.forEach(text => {
                text.classList.add('opacity-0', 'hidden');
                text.classList.remove('opacity-100');
            });
        }

        // SSR now handles Sidebar/Header loading.

        // Set Title
        if (pageTitle) {
            // Wait briefly for DOM update
            setTimeout(() => {
                const titleEl = document.getElementById('page-title');
                if (titleEl) titleEl.textContent = pageTitle;
            }, 10);
        }

        // Highlight Active Menu
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('aside nav a');
        links.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.remove('text-gray-400', 'hover:bg-gray-700', 'hover:text-white');
                link.classList.add('bg-gray-900', 'text-white', 'shadow-sm');
            }
        });

        // Inject Pretendard Font Globally
        if (!document.getElementById('font-pretendard')) {
            const link = document.createElement('link');
            link.id = 'font-pretendard';
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
            document.head.appendChild(link);

            const style = document.createElement('style');
            style.innerHTML = `
                body, html, button, input, select, textarea {
                    font-family: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif !important;
                }
            `;
            document.head.appendChild(style);
        }

        // --- Recent Tabs Logic ---
        if (pageTitle && window.location.pathname !== '/login.html') {
            updateRecentTabs(pageTitle, window.location.pathname);
        }
        renderRecentTabs();

    } catch (error) {
        console.error("Error loading layout:", error);
    }
}

function updateRecentTabs(title, url) {
    let recent = JSON.parse(localStorage.getItem('recentTabs') || '[]');

    // Remove if exists (to move to top)
    recent = recent.filter(tab => tab.url !== url);

    // Add to top
    recent.unshift({ title, url });

    // Limit to 5
    if (recent.length > 5) {
        recent = recent.slice(0, 5);
    }

    localStorage.setItem('recentTabs', JSON.stringify(recent));
}

function renderRecentTabs() {
    const container = document.getElementById('recent-tabs');
    if (!container) return;

    const recent = JSON.parse(localStorage.getItem('recentTabs') || '[]');
    const currentPath = window.location.pathname;

    container.innerHTML = recent.map(tab => {
        const isActive = tab.url === currentPath;
        const classes = isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600';

        return `
            <a href="${tab.url}" class="flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${classes}">
                ${tab.title}
                ${isActive ? '' : `<span onclick="event.preventDefault(); removeRecentTab('${tab.url}')" class="ml-2 hover:text-red-500"><i class="fa-solid fa-xmark"></i></span>`}
            </a>
        `;
    }).join('');
}

window.removeRecentTab = function (url) {
    let recent = JSON.parse(localStorage.getItem('recentTabs') || '[]');
    recent = recent.filter(tab => tab.url !== url);
    localStorage.setItem('recentTabs', JSON.stringify(recent));
    renderRecentTabs();
};

// Global Fetch Interceptor to handle 401s
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const response = await originalFetch(...args);
    if (response.status === 401) {
        // Session expired
        window.location.href = '/login.html?expired=true';
    }
    return response;
};

// Global Logout Function
window.logout = async function () {
    try {
        await fetch('/auth/logout', { method: 'POST' });
    } catch (e) {
        console.error(e);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('recentTabs'); // Clear Recent Tabs
    window.location.href = '/login.html';
};

// --- Global Toast Notification (Replaces Alert) ---

// Inject Toast Container if not exists
if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-5 right-5 z-50 flex flex-col space-y-3';
    document.body.appendChild(container); // Wait, body might not be ready if script runs in head? layout.js is usually at bottom or post-load.
    // Ideally put this in loadLayout or check DOMContentLoaded. 
    // layout.js is included at bottom of body in all our files.
    document.body.appendChild(container);
}

window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Safety

    // Style Configuration
    const styles = {
        success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: 'fa-circle-check' },
        error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: 'fa-circle-exclamation' },
        info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: 'fa-circle-info' },
        warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: 'fa-triangle-exclamation' }
    };

    const style = styles[type] || styles.info;

    // Create Toast Element
    const toast = document.createElement('div');
    toast.className = `flex items-center w-full max-w-sm p-4 rounded-lg shadow border ${style.bg} ${style.border} ${style.text} transform transition-all duration-75 translate-x-full opacity-0`;

    toast.innerHTML = `
        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full ${style.bg} bg-opacity-50">
            <i class="fa-solid ${style.icon}"></i>
        </div>
        <div class="ml-3 text-sm font-normal break-words flex-1">${message}</div>
        <button type="button" class="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 p-1.5 hover:bg-opacity-20 hover:bg-black inline-flex h-8 w-8 text-gray-500 hover:text-gray-900" aria-label="Close" onclick="this.parentElement.remove()">
            <span class="sr-only">Close</span>
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    });

    // Auto Dismiss after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 4000); // 4 seconds visibility
};
