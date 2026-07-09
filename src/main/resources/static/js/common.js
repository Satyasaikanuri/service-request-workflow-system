const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://localhost:8080/api'
    : 'https://service-request-workflow-system-1.onrender.com/api';

const Auth = {
    getToken: () => localStorage.getItem('token'),
    getUser: () => JSON.parse(localStorage.getItem('user')),

    saveToken: (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    logout: () => {
        if (typeof showConfirmationModal === 'function') {
            showConfirmationModal('Logout', 'Are you sure you want to log out?', 'Logout', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            });
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
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

// UI Toggles
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
}

// Notifications (SweetAlert2)
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#111827',
    color: '#ffffff',
    customClass: {
        popup: 'saas-toast'
    },
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

function showSuccessToast(message) {
    Toast.fire({
        icon: 'success',
        title: message
    });
}

function showErrorToast(message) {
    Toast.fire({
        icon: 'error',
        title: message
    });
}

function showConfirmationModal(title, text, confirmText, callback) {
    Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3B82F6',
        cancelButtonColor: 'rgba(255,255,255,0.1)',
        confirmButtonText: confirmText,
        background: '#111827',
        color: '#ffffff',
        customClass: {
            popup: 'saas-modal',
            cancelButton: 'saas-cancel-btn'
        },
        showClass: {
            popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
        }
    }).then((result) => {
        if (result.isConfirmed && typeof callback === 'function') {
            callback();
        }
    });
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

