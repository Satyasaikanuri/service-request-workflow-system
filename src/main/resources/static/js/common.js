const API_BASE_URL = 'https://service-request-workflow-system-1.onrender.com/api';

const Auth = {
    getToken: () => localStorage.getItem('token'),
    getUser: () => JSON.parse(localStorage.getItem('user')),

    saveToken: (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    },

    checkAuth: () => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Optional: Check role matches page
        const user = JSON.parse(localStorage.getItem('user'));
        const path = window.location.pathname;

        if (path.includes('user-dashboard') && !user.roles.includes('ROLE_USER')) {
            // alert('Unauthorized');
            // window.location.href = 'login.html';
        }
    },

    getHeader: () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        };
    }
};

const API = {
    get: async (endpoint) => {
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'GET',
            headers: Auth.getHeader()
        });
        if (response.status === 401) {
            Auth.logout();
            return;
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
        return response.text();
    },

    post: async (endpoint, body, auth = true) => {
        const headers = auth ? Auth.getHeader() : { 'Content-Type': 'application/json' };

        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (response.status === 401 && auth) {
            Auth.logout();
            return;
        }

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw new Error(data.message || data || 'Something went wrong');
        }
        return data;
    },

    put: async (endpoint, body) => {
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'PUT',
            headers: Auth.getHeader(),
            body: JSON.stringify(body)
        });

        if (response.status === 401) {
            Auth.logout();
            return;
        }

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw new Error(data.message || data || 'Something went wrong');
        }
        return data;
    },

    delete: async (endpoint) => {
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'DELETE',
            headers: Auth.getHeader()
        });

        if (response.status === 401) {
            Auth.logout();
            return;
        }

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw new Error(data.message || data || 'Something went wrong');
        }
        return data;
    }
};
