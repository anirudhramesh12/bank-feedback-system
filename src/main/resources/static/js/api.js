(function() {
    function readCookie(name) {
        const cookie = document.cookie.split('; ').find(value => value.startsWith(`${name}=`));
        return cookie ? decodeURIComponent(cookie.substring(name.length + 1)) : null;
    }

    async function request(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const headers = new Headers(options.headers || {});
        let body = options.body;

        if (body && typeof body !== 'string') {
            headers.set('Content-Type', 'application/json');
            body = JSON.stringify(body);
        }

        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            let token = readCookie('XSRF-TOKEN');
            if (!token) {
                const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
                if (!csrfResponse.ok) throw new Error('Unable to initialize request security');
                await csrfResponse.json();
                token = readCookie('XSRF-TOKEN');
            }
            if (!token) throw new Error('Security token is unavailable; reload and try again');
            headers.set('X-XSRF-TOKEN', token);
        }

        const response = await fetch(url, { ...options, method, headers, body, credentials: 'same-origin' });
        if (response.status === 204) return null;

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await response.json() : null;
        if (!response.ok) {
            throw new Error(payload?.detail || payload?.message || `Request failed (${response.status})`);
        }
        return payload;
    }

    window.BankApi = {
        get: url => request(url),
        post: (url, body) => request(url, { method: 'POST', body }),
        patch: (url, body) => request(url, { method: 'PATCH', body }),
        delete: url => request(url, { method: 'DELETE' })
    };
})();