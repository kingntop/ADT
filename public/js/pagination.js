/**
 * Renders pagination controls into a container.
 * @param {string} containerId - The ID of the container element.
 * @param {number} totalItems - Total number of items.
 * @param {number} itemsPerPage - Items per page.
 * @param {number} currentPage - Current page number (1-based).
 * @param {function} onPageChange - Callback function(newPage).
 */
function renderPagination(containerId, totalItems, itemsPerPage, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = ''; // Clear if only 1 page
        return;
    }

    let html = `
        <div class="flex items-center justify-between border-t border-gray-200 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-sm">
            <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                        Displaying <span class="font-medium">${(currentPage - 1) * itemsPerPage + 1}</span> to <span class="font-medium">${Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span class="font-medium">${totalItems}</span> results
                    </p>
                </div>
                <div>
                    <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
    `;

    // Previous Button
    const prevClass = currentPage === 1 ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-500 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 cursor-pointer";
    html += `
        <a href="#" onclick="return false;" data-page="${currentPage - 1}" class="${prevClass} relative inline-flex items-center rounded-l-md px-2 py-2 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0">
            <span class="sr-only">Previous</span>
            <i class="fa-solid fa-chevron-left h-5 w-5" aria-hidden="true"></i>
        </a>
    `;

    // Page Numbers
    // Logic: show 1, 2, ..., current-1, current, current+1, ..., last
    // Simplified: Show 5 pages around current
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        html += `<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:outline-offset-0">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const activeClass = isActive
            ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            : "text-gray-900 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-offset-0 cursor-pointer";

        html += `
            <a href="#" onclick="return false;" data-page="${i}" aria-current="${isActive ? 'page' : 'false'}" class="${activeClass} relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20">
                ${i}
            </a>
        `;
    }

    if (endPage < totalPages) {
        html += `<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:outline-offset-0">...</span>`;
    }

    // Next Button
    const nextClass = currentPage === totalPages ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-500 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 cursor-pointer";
    html += `
        <a href="#" onclick="return false;" data-page="${currentPage + 1}" class="${nextClass} relative inline-flex items-center rounded-r-md px-2 py-2 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0">
            <span class="sr-only">Next</span>
            <i class="fa-solid fa-chevron-right h-5 w-5" aria-hidden="true"></i>
        </a>
                    </nav>
                </div>
            </div>
            <!-- Mobile View (Simple) -->
             <div class="flex flex-1 justify-between sm:hidden">
                <a href="#" onclick="return false;" data-page="${currentPage - 1}" class="${currentPage === 1 ? 'pointer-events-none opacity-50' : ''} relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Previous</a>
                <a href="#" onclick="return false;" data-page="${currentPage + 1}" class="${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Next</a>
             </div>
        </div>
    `;

    container.innerHTML = html;

    // Attach Event Listeners
    const links = container.querySelectorAll('a[data-page]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.getAttribute('data-page'));
            if (page > 0 && page <= totalPages && page !== currentPage) {
                onPageChange(page);
            }
        });
    });
}
