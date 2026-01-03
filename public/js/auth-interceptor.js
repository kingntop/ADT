(function () {
    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(function (response) {
            if (response.status === 401) {
                // If the response is 401 Unauthorized, redirect to login
                window.location.href = '/login.html';
            }
            return response;
        });
    };
})();
