
// Admin Dashboard Logic

const AdminDashboard = {
    charts: {
        dept: null,
        status: null,
        trend: null
    },
    pollingInterval: null,

    init: async function () {
        if (!Auth.getToken()) {
            window.location.href = '/login.html';
            return;
        }

        console.log("Initializing Admin Dashboard...");

        // Initial Chart Setup (Must be before data load)
        this.initCharts();

        // Initial Load
        await this.loadData();

        // Setup Polling (Real-time effect)
        this.pollingInterval = setInterval(() => {
            this.loadData(true); // silent update
        }, 5000);
    },

    loadData: async function (silent = false) {
        try {
            // Parallel Fetch
            const [stats, audits, users, requests] = await Promise.all([
                API.get('/admin/stats'),
                API.get('/admin/audits'),
                API.get('/admin/users'),
                API.get('/requests/all')
            ]);

            this.updateKPIs(stats, requests);
            this.updateCharts(stats, requests);
            this.updateApproverPerformance(users, requests);
            this.updateAssignmentMonitor(requests, users);
            this.updateAuditLogs(audits);
            this.updateNotifications(audits);

        } catch (error) {
            console.error("Dashboard Data Load Error:", error);
            if (!silent) Toast.error("Failed to load dashboard data.");
        }
    },

    updateKPIs: function (stats, requests) {
        // totalRequests, statusBreakdown map
        const breakdown = stats.statusBreakdown || {};

        document.getElementById('kpi-total').innerText = stats.totalRequests || 0;

        let pending = (breakdown.PENDING || 0) + (breakdown.NEW || 0);
        document.getElementById('kpi-pending').innerText = pending;

        let completed = (breakdown.APPROVED || 0) + (breakdown.RESOLVED || 0) + (breakdown.CLOSED || 0);
        document.getElementById('kpi-completed').innerText = completed;

        document.getElementById('kpi-rejected').innerText = breakdown.REJECTED || 0;

        // Active Agents (Online now) - Mocked logic for "Active" as "Registered Approvers" for now
        // In real system, we'd check session status. here we use stats.totalApprovers
        document.getElementById('kpi-agents').innerText = stats.totalApprovers || 0;

        // SLA Breaches (Mock logic: Requests > 24h old and still pending)
        // Or if backend passed it. Let's calc from requests for now.
        // Assuming "ESCALATED" status implies breach or specific flag
        const breaches = requests.filter(r => r.status === 'ESCALATED' || r.escalated).length;
        document.getElementById('kpi-breaches').innerText = breaches;
    },

    initCharts: function () {
        // Dept Chart
        this.charts.dept = new Chart(document.getElementById('deptChart'), {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });

        // Status Chart
        this.charts.status = new Chart(document.getElementById('statusChart'), {
            type: 'doughnut',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } } },
                cutout: '70%',
                elements: { arc: { borderWidth: 0 } }
            }
        });

        // Trend Chart
        this.charts.trend = new Chart(document.getElementById('trendChart'), {
            type: 'line',
            data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], datasets: [{ label: 'Requests', data: [0, 0, 0, 0, 0], borderColor: '#6366f1', tension: 0.4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    },

    updateCharts: function (stats, requests) {
        // 1. Dept Chart
        const deptMap = stats.departmentBreakdown || {};
        this.charts.dept.data = {
            labels: Object.keys(deptMap),
            datasets: [{
                label: 'Requests',
                data: Object.values(deptMap),
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        };
        this.charts.dept.update();

        // 2. Status Chart
        const statusMap = stats.statusBreakdown || {};
        const statusLabels = Object.keys(statusMap);
        const statusData = Object.values(statusMap);
        // Colors mapping
        const colors = statusLabels.map(s => {
            if (s === 'APPROVED' || s === 'RESOLVED') return '#10b981';
            if (s === 'REJECTED') return '#ef4444';
            if (s === 'PENDING' || s === 'new') return '#f59e0b';
            return '#64748b';
        });

        this.charts.status.data = {
            labels: statusLabels,
            datasets: [{
                data: statusData,
                backgroundColor: colors
            }]
        };
        this.charts.status.update();

        // 3. Trend Chart (Simulated for Demo from requests dates)
        // Group requests by date (last 7 days?)
        const last7Days = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            last7Days[key] = 0;
        }

        requests.forEach(r => {
            const dateKey = r.createdAt.split('T')[0];
            if (last7Days[dateKey] !== undefined) {
                last7Days[dateKey]++;
            }
        });

        this.charts.trend.data = {
            labels: Object.keys(last7Days).map(d => d.slice(5)), // MM-DD
            datasets: [{
                label: 'New Requests',
                data: Object.values(last7Days),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };
        this.charts.trend.update();
    },

    updateAssignmentMonitor: function (requests, users) {
        // Show recent assignments
        const tbody = document.getElementById('assignment-table-body');
        // Filter requests that have an assigned agent
        const assigned = requests.filter(r => r.assignedAgent); // && status is active?
        // Sort by Newest
        assigned.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        // Take top 5
        const recent = assigned.slice(0, 5);

        if (recent.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4" style="color:#64748b; text-align:center; padding: 1rem;">No active assignments.</td></tr>`;
            return;
        }

        tbody.innerHTML = recent.map(r => `
            <tr>
                <td style="color: #fff;">#${r.id}</td>
                <td style="color: #94a3b8;">${r.requestType ? r.requestType.name : 'General'}</td>
                <td style="color: #fbbf24; font-weight:500;">${r.assignedAgent.username}</td>
                <td><span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">ACTIVE</span></td>
            </tr>
        `).join('');
    },

    updateApproverPerformance: function (users, requests) {
        const tbody = document.getElementById('approver-perf-body');
        const approvers = users.filter(u => u.role.name === 'APPROVER');

        // Calculate stats for each approver
        const stats = approvers.map(agent => {
            const agentRequests = requests.filter(r => r.assignedAgent && r.assignedAgent.id === agent.id);
            const active = agentRequests.filter(r => ['PENDING', 'IN_PROGRESS', 'NEW'].includes(r.status)).length;
            const completed = agentRequests.filter(r => ['APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED'].includes(r.status)).length;

            return {
                name: agent.username,
                dept: agent.department ? agent.department.name : 'All',
                active,
                completed
            };
        });

        // Sort by most active
        stats.sort((a, b) => b.active - a.active);

        tbody.innerHTML = stats.map(s => `
            <tr>
                <td style="font-weight: 500; color: #fff;">${s.name}</td>
                <td style="color: #94a3b8;">${s.dept}</td>
                <td style="color: #f59e0b; font-weight: 700;">${s.active}</td>
                <td style="color: #10b981; font-weight: 700;">${s.completed}</td>
            </tr>
        `).join('');
    },

    updateAuditLogs: function (audits) {
        const consoleDiv = document.getElementById('audit-console');
        if (!audits || audits.length === 0) {
            consoleDiv.innerHTML = '<div class="audit-entry" style="color: #64748b;">No logs available.</div>';
            return;
        }

        // Take top 20
        const recent = audits.slice(0, 20);

        consoleDiv.innerHTML = recent.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            let actionColor = '#facc15';
            if (log.action.includes('REJECT')) actionColor = '#ef4444';
            if (log.action.includes('APPROVE')) actionColor = '#10b981';

            return `
            <div class="audit-entry">
                <span class="audit-time">[${time}]</span>
                <span class="audit-action" style="color: ${actionColor}">${log.action}</span>
                <span style="color: #cbd5e1;">Req #${log.requestId}: ${log.remarks || ''}</span>
                <span style="color: #64748b; font-size: 0.75rem;">(${log.performedBy ? log.performedBy.username : 'SYSTEM'})</span>
            </div>
            `;
        }).join('');
    },

    activeView: 'dashboard',

    // --- Notification Logic ---
    toggleNotifications: function () {
        const dropdown = document.getElementById('notification-dropdown');
        const badge = document.getElementById('notification-badge');
        if (dropdown.style.display === 'none' || !dropdown.style.display) {
            dropdown.style.display = 'block';
            if (badge) badge.style.display = 'none'; // Clear badge on open
        } else {
            dropdown.style.display = 'none';
        }
    },

    updateNotifications: function (audits) {
        const list = document.getElementById('notification-list');
        const badge = document.getElementById('notification-badge');

        if (!audits || audits.length === 0) {
            list.innerHTML = '<div style="padding: 1rem; color: #94a3b8; text-align: center;">No new notifications</div>';
            return;
        }

        // Use audits as notifications for Admin
        const recent = audits.slice(0, 5); // Top 5

        // Simple badge logic: if we have recent audits (last 5 mins?), show badge. 
        // For now, just show if list is not empty and dropdown is closed (handled in toggle)
        if (badge && recent.length > 0) badge.style.display = 'block';

        list.innerHTML = recent.map(log => `
            <div style="padding: 0.75rem 1rem; border-bottom: 1px solid #334155; display: flex; gap: 0.75rem; align-items: start;">
                <div style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-info"></i>
                </div>
                <div>
                    <div style="font-size: 0.85rem; font-weight: 500; color: #f1f5f9;">
                         Req #${log.requestId}: ${log.action}
                    </div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">
                        ${log.remarks || 'Update'} - ${new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            </div>
        `).join('');
    },


    switchView: function (viewName) {
        this.activeView = viewName;

        // Update Nav
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        // Special case for dashboard (which might be the logo or a hidden link, but here we added one)
        const navEl = document.getElementById('nav-' + viewName);
        if (navEl) navEl.classList.add('active');

        // Hide all views
        ['view-dashboard', 'view-departments', 'view-users', 'view-approvers'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Show selected
        const selected = document.getElementById('view-' + viewName);
        if (selected) selected.style.display = viewName === 'dashboard' ? 'block' : 'block';
        // Note: dashboard has 'block' normally, flex/grid internal layout handles itself.

        // Style overrides if needed
        if (viewName === 'dashboard') {
            // Ensure any specific display properties are restored if overridden
        }
        if (viewName === 'departments') {
            this.fetchDepartments();
        }
        if (viewName === 'users') {
            this.fetchUsers();
        }
        if (viewName === 'approvers') {
            this.fetchApprovers();
        }
    },

    // --- Department Management ---

    fetchDepartments: async function () {
        const tbody = document.getElementById('dept-list-body');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">Loading...</td></tr>';

        try {
            const departments = await API.get('/departments');
            if (!departments || departments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">No departments found.</td></tr>';
                return;
            }

            tbody.innerHTML = departments.map(d => `
                <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 1rem; color: #fff;">${d.id}</td>
                    <td style="padding: 1rem; color: #f8fafc; font-weight: 500;">${d.name}</td>
                    <td style="padding: 1rem; color: #94a3b8;">${d.description || '-'}</td>
                    <td style="padding: 1rem; text-align: right;">
                        <button class="btn btn-sm" onclick='AdminDashboard.openDeptModal(${JSON.stringify(d).replace(/'/g, "&#39;")})'
                            style="background: tomato; background: transparent; color: #3b82f6; margin-right: 0.5rem;" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm" onclick="AdminDashboard.deleteDepartment(${d.id})"
                            style="background: transparent; color: #ef4444;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error("Error fetching departments:", error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500">Failed to load departments.</td></tr>';
        }
    },

    openDeptModal: function (dept = null) {
        const modal = document.getElementById('dept-modal');
        const title = document.getElementById('dept-modal-title');
        const idInput = document.getElementById('dept-id');
        const nameInput = document.getElementById('dept-name');
        const descInput = document.getElementById('dept-desc');

        if (dept) {
            title.innerText = 'Edit Department';
            idInput.value = dept.id;
            nameInput.value = dept.name;
            descInput.value = dept.description || '';
        } else {
            title.innerText = 'Add Department';
            idInput.value = '';
            nameInput.value = '';
            descInput.value = '';
        }

        modal.classList.add('show');
    },

    saveDepartment: async function (event) {
        event.preventDefault();
        const id = document.getElementById('dept-id').value;
        const name = document.getElementById('dept-name').value;
        const description = document.getElementById('dept-desc').value;

        const payload = { name, description };

        try {
            if (id) {
                // Update
                await API.put(`/departments/${id}`, payload);
                Toast.success("Department updated successfully!");
            } else {
                // Create
                await API.post('/departments', payload);
                Toast.success("Department created successfully!");
            }
            document.getElementById('dept-modal').classList.remove('show');
            this.fetchDepartments(); // Refresh list
        } catch (error) {
            console.error("Error saving department:", error);
            Toast.error("Failed to save department. " + (error.message || ""));
        }
    },

    deleteDepartment: function (id) {
        CustomConfirm.show(
            "Delete Department?",
            "Are you sure you want to delete this department? This cannot be undone.",
            async () => {
                try {
                    await API.delete(`/departments/${id}`);
                    Toast.success("Department deleted successfully!");
                    this.fetchDepartments();
                } catch (error) {
                    console.error("Error deleting department:", error);
                    Toast.error("Failed to delete department. " + (error.message || ""));
                }
            }
        );
    },

    // --- User Management ---

    fetchUsers: async function () {
        const tbody = document.getElementById('user-list-body');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-muted">Loading...</td></tr>';

        try {
            const allUsers = await API.get('/admin/users');
            // Filter to show only 'USER' role as requested
            const users = allUsers.filter(u => u.role.name === 'USER');

            if (!users || users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-muted">No Standard Users found.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => `
                <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 1rem; color: #fff;">${u.id}</td>
                    <td style="padding: 1rem; color: #f8fafc; font-weight: 500;">${u.username}</td>
                    <td style="padding: 1rem; color: #94a3b8;">${u.email}</td>
                    <td style="padding: 1rem;"><span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">${u.role.name}</span></td>
                    <td style="padding: 1rem; color: #94a3b8;">${u.department ? u.department.name : '-'}</td>
                    <td style="padding: 1rem; text-align: right;">
                        <button class="btn btn-sm" onclick='AdminDashboard.openUserModal(${JSON.stringify(u).replace(/'/g, "&#39;")})'
                            style="background: transparent; color: #3b82f6; margin-right: 0.5rem;" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm" onclick="AdminDashboard.deleteUser(${u.id})"
                            style="background: transparent; color: #ef4444;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error("Error fetching users:", error);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-red-500">Failed to load users.</td></tr>';
        }
    },

    // --- Approver Management ---

    fetchApprovers: async function () {
        const tbody = document.getElementById('approver-list-body');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted">Loading...</td></tr>';

        try {
            const allUsers = await API.get('/admin/users');
            // Filter to show only 'APPROVER' role
            const approvers = allUsers.filter(u => u.role.name === 'APPROVER');

            if (!approvers || approvers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted">No Approvers found.</td></tr>';
                return;
            }

            tbody.innerHTML = approvers.map(u => `
                <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 1rem; color: #fff;">${u.id}</td>
                    <td style="padding: 1rem; color: #f8fafc; font-weight: 500;">${u.username}</td>
                    <td style="padding: 1rem; color: #94a3b8;">${u.email}</td>
                    <td style="padding: 1rem; color: #94a3b8;">${u.department ? u.department.name : '<span class="text-warning">Unassigned</span>'}</td>
                    <td style="padding: 1rem; text-align: right;">
                        <button class="btn btn-sm" onclick='AdminDashboard.openUserModal(${JSON.stringify(u).replace(/'/g, "&#39;")})'
                            style="background: transparent; color: #3b82f6; margin-right: 0.5rem;" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm" onclick="AdminDashboard.deleteUser(${u.id})"
                            style="background: transparent; color: #ef4444;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error("Error fetching approvers:", error);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Failed to load approvers.</td></tr>';
        }
    },

    openUserModal: async function (user = null, defaultRole = 'USER') {
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const idInput = document.getElementById('user-id');
        const nameInput = document.getElementById('user-username');
        const emailInput = document.getElementById('user-email');
        const passInput = document.getElementById('user-password');
        const passGroup = document.getElementById('password-group');
        const roleSelect = document.getElementById('user-role');
        const deptSelect = document.getElementById('user-dept');
        const deptGroup = document.getElementById('dept-select-group');

        // Populate departments first
        try {
            const departments = await API.get('/departments');
            deptSelect.innerHTML = '<option value="">-- Select Department --</option>' +
                departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        } catch (e) {
            console.error("Failed to load depts for modal", e);
        }

        if (user) {
            title.innerText = 'Edit User';
            idInput.value = user.id;
            nameInput.value = user.username;
            emailInput.value = user.email;

            passInput.value = '';
            passInput.required = false;
            passGroup.style.display = 'block'; // Allow pass reset logic if needed, or hide? Let's allow but optional

            roleSelect.value = user.role.name;
            if (user.department) deptSelect.value = user.department.id;
            else deptSelect.value = '';

        } else {
            title.innerText = 'Add User';
            idInput.value = '';
            nameInput.value = '';
            emailInput.value = '';

            passInput.value = '';
            passInput.required = true;
            passGroup.style.display = 'block';

            roleSelect.value = 'USER';
            deptSelect.value = '';
        }

        this.toggleDeptSelect();
        modal.classList.add('show');
    },

    toggleDeptSelect: function () {
        const role = document.getElementById('user-role').value;
        const deptGroup = document.getElementById('dept-select-group');
        if (role === 'APPROVER') {
            deptGroup.style.display = 'block';
            document.getElementById('user-dept').required = true;
        } else {
            deptGroup.style.display = 'none';
            document.getElementById('user-dept').required = false;
        }
    },

    saveUser: async function (event) {
        event.preventDefault();
        const id = document.getElementById('user-id').value;
        const username = document.getElementById('user-username').value;
        const email = document.getElementById('user-email').value;
        const password = document.getElementById('user-password').value;
        const roleName = document.getElementById('user-role').value;
        const deptId = document.getElementById('user-dept').value;

        const payload = {
            username,
            email,
            role: { name: roleName }
        };

        if (password) payload.password = password;
        if (roleName === 'APPROVER' && deptId) {
            payload.department = { id: deptId };
        }

        try {
            if (id) {
                await API.put(`/admin/users/${id}`, payload);
                Toast.success("User updated successfully!");
            } else {
                await API.post('/admin/users', payload);
                Toast.success("User created successfully!");
            }
            document.getElementById('user-modal').classList.remove('show');

            // Refresh based on what we are viewing or what changed
            if (this.activeView === 'approvers' || roleName === 'APPROVER') {
                this.fetchApprovers();
            }
            if (this.activeView === 'users' || roleName === 'USER') {
                this.fetchUsers();
            }
        } catch (error) {
            console.error("Error saving user:", error);
            Toast.error("Failed to save user. " + (error.message || ""));
        }
    },

    deleteUser: function (id) {
        CustomConfirm.show(
            "Delete User?",
            "Are you sure you want to delete this user? This cannot be undone.",
            async () => {
                try {
                    await API.delete(`/admin/users/${id}`);
                    Toast.success("User deleted successfully!");

                    if (this.activeView === 'approvers') {
                        this.fetchApprovers();
                    } else {
                        this.fetchUsers();
                    }
                } catch (error) {
                    console.error("Error deleting user:", error);
                    Toast.error("Failed to delete user. " + (error.message || ""));
                }
            }
        );
    }

};

const Toast = {
    show: function (message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info} toast-icon"></i>
            <div class="toast-content">${message}</div>
            <i class="fas fa-times toast-close"></i>
        `;

        container.appendChild(toast);

        // Click to close
        toast.querySelector('.toast-close').onclick = () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        };

        // Auto remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    },
    success: function (msg) { this.show(msg, 'success'); },
    error: function (msg) { this.show(msg, 'error'); },
    info: function (msg) { this.show(msg, 'info'); }
};

const CustomConfirm = {
    callback: null,

    show: function (title, text, callback) {
        this.callback = callback;
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-text').innerText = text;
        document.getElementById('confirmation-modal').classList.add('show');
    },

    hide: function () {
        document.getElementById('confirmation-modal').classList.remove('show');
        this.callback = null;
    },

    init: function () {
        const cancelBtn = document.getElementById('confirm-cancel');
        const proceedBtn = document.getElementById('confirm-proceed');

        if (cancelBtn) cancelBtn.addEventListener('click', () => this.hide());
        if (proceedBtn) proceedBtn.addEventListener('click', () => {
            if (this.callback) this.callback();
            this.hide();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AdminDashboard.init();
    CustomConfirm.init();

    // Close notifications on click outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notification-dropdown');
        const bell = e.target.closest('.fa-bell') || e.target.closest('[onclick="AdminDashboard.toggleNotifications()"]');

        if (dropdown && dropdown.style.display === 'block' && !dropdown.contains(e.target) && !bell) {
            dropdown.style.display = 'none';
        }
    });
});
