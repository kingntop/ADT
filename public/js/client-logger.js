(function () {
    // Prevent recursive loop if logging itself fails
    let isValues = false;

    function sendLog(data) {
        if (isValues) return;
        isValues = true;

        fetch('/api/logs/client', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch(err => {
            console.warn('Failed to send client log', err);
        }).finally(() => {
            isValues = false;
        });
    }

    // Global Error Handler
    window.onerror = function (message, source, lineno, colno, error) {
        sendLog({
            message: message,
            source: source,
            lineno: lineno,
            colno: colno,
            stack: error ? error.stack : null
        });
        // Return false to allow default handler (console log) to run
        return false;
    };

    // Unhandled Promise Rejection
    window.addEventListener('unhandledrejection', function (event) {
        sendLog({
            message: 'Unhandled Rejection: ' + (event.reason ? (event.reason.message || event.reason) : 'Unknown'),
            source: window.location.href,
            lineno: 0,
            colno: 0,
            stack: event.reason ? event.reason.stack : null
        });
    });

    console.log("[Client Logger] Initialized");
})();
