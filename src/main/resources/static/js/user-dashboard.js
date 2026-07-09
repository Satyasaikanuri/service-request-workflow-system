
// User Dashboard Real-Time Logic

const UserDashboard = {
    requests: [],
    notifications: [],
    currentPage: 0,
    pageSize: 5,
    totalPages: 0,
    totalElements: 0,
    searchQuery: '',
    statusFilter: '',
    priorityFilter: '',
    debounceTimeout: null,

    init: async function () {
        if (!Auth.getToken()) {
            window.location.href = 'login.html';
            return;
        }

        const user = Auth.getUser();
        if (user) {
            document.getElementById('user-name').innerText = user.username;
        }

        console.log("Initializing Real-Time User Dashboard...");

        // Setup Event Listeners
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 0;
                clearTimeout(this.debounceTimeout);
                this.debounceTimeout = setTimeout(() => this.loadData(), 300);
            });
        }

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 0;
                this.loadData();
            });
        }

        const priorityFilter = document.getElementById('priority-filter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                this.priorityFilter = e.target.value;
                this.currentPage = 0;
                this.loadData();
            });
        }

        const prevBtn = document.getElementById('prev-page-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 0) {
                    this.currentPage--;
                    this.loadData();
                }
            });
        }

        const nextBtn = document.getElementById('next-page-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages - 1) {
                    this.currentPage++;
                    this.loadData();
                }
            });
        }

        await this.loadData();

        // Polling (every 10 seconds)
        setInterval(() => this.loadData(true), 10000);

        // SLA Ticker (every 1 second)
        setInterval(() => this.updateTimers(), 1000);
    },

    loadData: async function (silent = false) {
        if (!silent) {
            const icon = document.getElementById('refresh-icon');
            if (icon) icon.classList.add('fa-spin');
        }

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                size: this.pageSize,
                search: this.searchQuery,
                status: this.statusFilter,
                priority: this.priorityFilter,
                sortBy: 'createdAt',
                direction: 'DESC'
            });

            const [requestsPage, notifs] = await Promise.all([
                API.get('/requests/my?' + params.toString()),
                API.get('/requests/notifications')
            ]);

            this.requests = requestsPage.content || [];
            this.totalPages = requestsPage.totalPages || 0;
            this.totalElements = requestsPage.totalElements || 0;

            this.notifications = notifs || [];

            this.updateStats();
            this.renderTable();
            this.renderPagination();
            this.renderNotifications();
            this.renderLiveTimeline();
            this.renderCharts();

        } catch (error) {
            console.error("Dashboard Sync Error:", error);
        } finally {
            if (!silent) {
                const icon = document.getElementById('refresh-icon');
                if (icon) icon.classList.remove('fa-spin');
            }
        }
    },

    chartInstance1: null,
    chartInstance2: null,

    renderCharts: function () {
        // 1. Sidebar Donut Chart (Status)
        const ctx1 = document.getElementById('statusChart');
        if (ctx1) {
            const pending = this.requests.filter(r => ['PENDING', 'NEW', 'AUTO_ASSIGNED', 'IN_PROGRESS'].includes(r.status)).length;
            const approved = this.requests.filter(r => r.status === 'APPROVED').length;
            const rejected = this.requests.filter(r => r.status === 'REJECTED').length;

            if (this.chartInstance1) this.chartInstance1.destroy();

            this.chartInstance1 = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Approved', 'Rejected'],
                    datasets: [{
                        data: [pending, approved, rejected],
                        backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        // 2. Main Trend Chart (Bar)
        const ctx2 = document.getElementById('trendChart');
        if (ctx2) {
            // Group by date (Last 7 days)
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const dataMap = last7Days.reduce((acc, date) => { acc[date] = 0; return acc; }, {});

            this.requests.forEach(r => {
                const d = r.createdAt.split('T')[0];
                if (dataMap.hasOwnProperty(d)) {
                    dataMap[d]++;
                }
            });

            if (this.chartInstance2) this.chartInstance2.destroy();

            this.chartInstance2 = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: last7Days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
                    datasets: [{
                        label: 'Requests Created',
                        data: Object.values(dataMap),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }
    },

    updateStats: function () {
        document.getElementById('kpi-total').innerText = this.requests.length;
        document.getElementById('kpi-pending').innerText = this.requests.filter(r => ['PENDING', 'NEW', 'AUTO_ASSIGNED', 'IN_PROGRESS'].includes(r.status)).length;
        document.getElementById('kpi-approved').innerText = this.requests.filter(r => r.status === 'APPROVED').length;
        document.getElementById('kpi-rejected').innerText = this.requests.filter(r => r.status === 'REJECTED').length;
    },

    activeView: 'dashboard',

    switchView: function (viewName) {
        this.activeView = viewName;

        // Visuals: Nav items
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navEl = document.getElementById('nav-' + viewName);
        if (navEl) navEl.classList.add('active');

        // Containers
        const mainView = document.getElementById('view-dashboard-main');
        const reportsView = document.getElementById('view-reports');
        const rightSidebar = document.getElementById('dashboard-right-sidebar');

        // Specific elements to toggle within main view
        const kpiRow = document.querySelector('#view-dashboard-main .kpi-row');
        const trendCard = document.querySelector('#view-dashboard-main .card'); // The first card is analytics
        const tableTitle = document.getElementById('table-title');

        // Sync status filter select box value if possible
        const statusSelect = document.getElementById('status-filter');

        if (viewName === 'reports') {
            if (mainView) mainView.style.display = 'none';
            if (rightSidebar) rightSidebar.style.display = 'none';
            if (reportsView) reportsView.style.display = 'block';
            this.renderReports();
        } else {
            if (mainView) mainView.style.display = 'block';
            if (rightSidebar) rightSidebar.style.display = 'block';
            if (reportsView) reportsView.style.display = 'none';

            // Sub-toggling for Dashboard vs List views
            if (viewName === 'dashboard') {
                if (kpiRow) kpiRow.style.display = 'grid';
                if (trendCard) trendCard.style.display = 'block';
                if (tableTitle) tableTitle.innerText = "My Requests";
                this.statusFilter = '';
                if (statusSelect) statusSelect.value = '';
            } else {
                // List Views (Pending, Approved, etc)
                if (kpiRow) kpiRow.style.display = 'none';
                if (trendCard) trendCard.style.display = 'none';

                // Set Title
                if (viewName === 'myrequests') {
                    tableTitle.innerText = "All Requests";
                    this.statusFilter = '';
                    if (statusSelect) statusSelect.value = '';
                } else if (viewName === 'pending') {
                    tableTitle.innerText = "Pending Requests";
                    this.statusFilter = 'PENDING';
                    if (statusSelect) statusSelect.value = 'PENDING';
                } else if (viewName === 'approved') {
                    tableTitle.innerText = "Approved Requests";
                    this.statusFilter = 'APPROVED';
                    if (statusSelect) statusSelect.value = 'APPROVED';
                } else if (viewName === 'rejected') {
                    tableTitle.innerText = "Rejected Requests";
                    this.statusFilter = 'REJECTED';
                    if (statusSelect) statusSelect.value = 'REJECTED';
                }
            }
        }

        // Reset pagination and reload from server
        this.currentPage = 0;
        this.loadData();
    },

    renderReports: function () {
        // Destroy existing report charts
        ['chart-user-status', 'chart-user-priority', 'chart-user-sla', 'chart-user-volume'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const chart = Chart.getChart(el);
                if (chart) chart.destroy();
            }
        });

        // 1. Status Breakdown
        const statusCounts = {};
        this.requests.forEach(r => statusCounts[r.status] = (statusCounts[r.status] || 0) + 1);

        new Chart(document.getElementById('chart-user-status'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: { plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
        });

        // 2. Priority Breakdown
        const prioCounts = { 'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0 };
        this.requests.forEach(r => {
            if (prioCounts.hasOwnProperty(r.priority)) prioCounts[r.priority]++;
        });

        new Chart(document.getElementById('chart-user-priority'), {
            type: 'bar',
            data: {
                labels: Object.keys(prioCounts),
                datasets: [{
                    label: 'Unresolved Requests',
                    data: Object.values(prioCounts),
                    backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6'],
                    borderRadius: 4
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // 3. SLA Compliance (Breached vs Safe)
        let breached = 0, safe = 0;
        const now = new Date();
        this.requests.forEach(r => {
            const created = new Date(r.createdAt);
            const slaHours = r.slaHours || 24;
            const due = new Date(created.getTime() + slaHours * 60 * 60 * 1000);
            const isClosed = ['APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED'].includes(r.status);

            if (!isClosed && now > due) {
                breached++;
            } else {
                safe++;
            }
        });

        new Chart(document.getElementById('chart-user-sla'), {
            type: 'pie',
            data: {
                labels: ['Safe', 'Breached'],
                datasets: [{
                    data: [safe, breached],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });

        // 4. Daily Volume (Last 7 Days)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toLocaleDateString();
        });

        const volumeData = last7Days.map(dateStr => {
            return this.requests.filter(r => new Date(r.createdAt).toLocaleDateString() === dateStr).length;
        });

        new Chart(document.getElementById('chart-user-volume'), {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Requests',
                    data: volumeData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 45 } }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    renderTable: function () {
        const tbody = document.getElementById('requests-list');

        let filtered = this.requests;

        // Filter based on activeView
        if (this.activeView === 'pending') {
            filtered = this.requests.filter(r => ['PENDING', 'NEW', 'AUTO_ASSIGNED', 'IN_PROGRESS'].includes(r.status));
        } else if (this.activeView === 'approved') {
            filtered = this.requests.filter(r => r.status === 'APPROVED');
        } else if (this.activeView === 'rejected') {
            filtered = this.requests.filter(r => r.status === 'REJECTED');
        }
        // 'dashboard' and 'myrequests' show all (with sorting)

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">No requests found. Create one!</td></tr>';
            return;
        }

        // Sort: Priority DESC, then Date DESC
        const sorted = [...filtered].sort((a, b) => {
            const pScore = (p) => {
                if (p === 'CRITICAL') return 3;
                if (p === 'HIGH') return 2;
                if (p === 'MEDIUM') return 1;
                return 0;
            };
            if (pScore(a.priority) !== pScore(b.priority)) return pScore(b.priority) - pScore(a.priority);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        tbody.innerHTML = sorted.map(r => {
            const isCompleted = ['APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED'].includes(r.status);

            return `
            <tr onclick="UserDashboard.openTimeline(${r.id})" style="cursor: pointer;" class="hover:bg-gray-50">
                <td style="padding: 1rem; color: #64748b;">#${r.id}</td>
                <td style="padding: 1rem; font-weight: 600;">${escapeHTML(r.title)}</td>
                <td style="padding: 1rem; color: #64748b;">${escapeHTML(r.department.name)}</td>
                <td style="padding: 1rem;">
                    <span style="${r.priority === 'CRITICAL' ? 'color: #ef4444; font-weight: 800;' : r.priority === 'HIGH' ? 'color: #f97316; font-weight: 600;' : 'color: #64748b;'}">
                        ${escapeHTML(r.priority)}
                    </span>
                </td>
                <td style="padding: 1rem;"><span class="badge badge-${r.status}">${r.status}</span></td>
                <td style="padding: 1rem;">
                    <span id="timer-${r.id}" class="sla-countdown" data-created="${r.createdAt}" data-sla="${r.slaHours || 24}" data-status="${r.status}">--:--</span>
                </td>
                <td style="padding: 1rem; font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; justify-content: space-between;">
                    <span>${this.timeAgo(new Date(r.updatedAt))}</span>
                    <button onclick="UserDashboard.deleteRequest(${r.id}, event)" class="btn-icon-danger" title="Delete Request" style="background:none; border:none; color: #ef4444; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        this.updateTimers();
    },

    updateTimers: function () {
        this.requests.forEach(r => {
            const timerEl = document.getElementById(`timer-${r.id}`);
            if (!timerEl) return;

            if (['APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED'].includes(r.status)) {
                timerEl.innerText = "DONE";
                timerEl.style.color = "#10b981";
                timerEl.style.background = "#dcfce7";
                return;
            }

            const created = new Date(r.createdAt);
            const slaHours = r.slaHours || 24;
            const due = new Date(created.getTime() + slaHours * 60 * 60 * 1000);
            const now = new Date();
            const diff = due - now;

            if (diff <= 0) {
                timerEl.innerText = "BREACHED";
                timerEl.style.color = "#ef4444";
                timerEl.style.background = "#fee2e2";
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                timerEl.innerText = `${hours}h ${minutes}m`;

                if (hours < 2) {
                    timerEl.style.color = "#f97316"; // Orange
                    timerEl.style.background = "#ffedd5";
                } else {
                    timerEl.style.color = "#15803d"; // Green
                    timerEl.style.background = "#dcfce7";
                }
            }
        });
    },

    renderNotifications: function () {
        const list = document.getElementById('notif-list');
        const count = document.getElementById('notif-count');

        // Use Notifications from backend (which are audits)
        // Filter for truly recent or unread? 
        // For now, show top 5 recent actions on my requests

        if (this.notifications.length === 0) {
            count.style.display = 'none';
            return;
        }

        count.innerText = this.notifications.length > 9 ? '9+' : this.notifications.length;
        count.style.display = 'block';

        list.innerHTML = this.notifications.map(n => {
            let iconClass = 'fa-info';
            let bgClass = '#e0f2fe';
            let colorClass = '#0284c7';
            let actionText = n.action;

            if (n.action === 'SEEN') {
                iconClass = 'fa-eye';
                bgClass = '#f3e8ff'; // purple-100
                colorClass = '#7e22ce'; // purple-700
                actionText = "Request Viewed";
            } else if (n.action === 'STATUS_CHANGE') {
                actionText = n.newStatus;
                if (n.newStatus === 'APPROVED') {
                    iconClass = 'fa-check';
                    bgClass = '#dcfce7';
                    colorClass = '#15803d';
                } else if (n.newStatus === 'REJECTED') {
                    iconClass = 'fa-times';
                    bgClass = '#fee2e2';
                    colorClass = '#b91c1c';
                }
            } else if (n.action === 'CREATED') {
                actionText = "Request Created";
            }

            return `
            <div style="padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; display: flex; gap: 0.75rem; align-items: start;">
                 <div style="background: ${bgClass}; color: ${colorClass}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas ${iconClass}"></i>
                 </div>
                 <div>
                    <div style="font-size: 0.85rem; font-weight: 500; color: #334155;">
                        Req #${n.requestId}: ${escapeHTML(actionText)}
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b;">
                        ${escapeHTML(n.remarks) || 'Status updated'} - ${this.timeAgo(new Date(n.timestamp))}
                    </div>
                 </div>
            </div>
        `}).join('');
    },

    renderLiveTimeline: function () {
        const container = document.getElementById('live-timeline');
        // Combined stream of recent audits across my requests
        if (this.notifications.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#94a3b8;">No recent activity</div>';
            return;
        }

        // Show top 3 events
        const recent = this.notifications.slice(0, 4);

        container.innerHTML = recent.map(n => {
            let displayText = n.action;
            let dotColor = '#3b82f6'; // Default Blue
            let shadowColor = 'rgba(59, 130, 246, 0.2)';

            if (n.action === 'STATUS_CHANGE') {
                displayText = n.newStatus;
                if (n.newStatus === 'APPROVED' || n.newStatus === 'RESOLVED' || n.newStatus === 'CLOSED') {
                    dotColor = '#10b981'; // Green
                    shadowColor = 'rgba(16, 185, 129, 0.2)';
                } else if (n.newStatus === 'REJECTED') {
                    dotColor = '#ef4444'; // Red
                    shadowColor = 'rgba(239, 68, 68, 0.2)';
                } else {
                    dotColor = '#f59e0b'; // Amber/Orange for others
                    shadowColor = 'rgba(245, 158, 11, 0.2)';
                }
            } else if (n.action === 'SEEN') {
                displayText = 'Request Viewed';
                dotColor = '#8b5cf6'; // Purple
                shadowColor = 'rgba(139, 92, 246, 0.2)';
            } else if (n.action === 'CREATED') {
                displayText = 'Request Created';
                dotColor = '#3b82f6'; // Blue
                shadowColor = 'rgba(59, 130, 246, 0.2)';
            }

            return `
             <div class="timeline-item active">
                <div class="timeline-dot" style="background: ${dotColor}; box-shadow: 0 0 0 4px ${shadowColor};"></div>
                <div style="font-size: 0.85rem; font-weight: 600; color: #f1f5f9;">${displayText}</div>
                <div style="font-size: 0.8rem; color: #94a3b8;">Request #${n.requestId}</div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">${this.timeAgo(new Date(n.timestamp))}</div>
            </div>
        `}).join('');
    },

    openTimeline: async function (reqId) {
        document.getElementById('modal-title').innerText = `Timeline: Request #${reqId}`;
        const container = document.getElementById('modal-timeline-content');
        container.innerHTML = '<div style="padding:1rem; text-align:center;">Loading...</div>';

        document.getElementById('timeline-modal').classList.add('show');

        try {
            const audits = await API.get(`/requests/${reqId}/timeline`);

            if (!audits || audits.length === 0) {
                container.innerHTML = 'No history found.';
                return;
            }

            container.innerHTML = audits.map(a => `
                <div class="timeline-item active">
                    <div class="timeline-dot"></div>
                    <div style="font-weight: 600;">${escapeHTML(a.action)}</div>
                    <div style="color: #64748b; font-size: 0.9rem;">By: ${a.performedBy ? escapeHTML(a.performedBy.username) : 'SYSTEM'}</div>
                    <div style="color: #64748b; font-size: 0.9rem;">${escapeHTML(a.remarks)}</div>
                    <div style="color: #94a3b8; font-size: 0.8rem;">${new Date(a.timestamp).toLocaleString()}</div>
                </div>
            `).join('');

        } catch (e) {
            container.innerHTML = 'Error loading timeline.';
        }
    },

    timeAgo: function (date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    },

    deleteRequest: function (id, event) {
        // Stop propagation to prevent row click (which opens timeline/details)
        if (event) event.stopPropagation();

        showConfirmationModal(
            'Delete Request',
            'Are you sure you want to delete this request? This cannot be undone.',
            'Yes, Delete',
            async () => {
                try {
                    await API.delete(`/requests/${id}`);
                    showSuccessToast('Request deleted successfully');
                    this.loadData(); // Refresh
                } catch (error) {
                    console.error("Delete failed", error);
                    showErrorToast("Failed to delete request: " + (error.message || "Unknown error"));
                }
            }
        );
    },

    renderPagination: function () {
        const infoEl = document.getElementById('pagination-info');
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');

        if (!infoEl || !prevBtn || !nextBtn) return;

        const startEntry = this.currentPage * this.pageSize + 1;
        const endEntry = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);

        if (this.totalElements === 0) {
            infoEl.innerText = "Showing 0 to 0 of 0 entries";
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            prevBtn.style.background = "#cbd5e1";
            nextBtn.style.background = "#cbd5e1";
            return;
        }

        infoEl.innerText = `Showing ${startEntry} to ${endEntry} of ${this.totalElements} entries`;

        prevBtn.disabled = this.currentPage === 0;
        nextBtn.disabled = this.currentPage >= this.totalPages - 1;

        prevBtn.style.background = this.currentPage === 0 ? "#cbd5e1" : "#3b82f6";
        prevBtn.style.color = this.currentPage === 0 ? "#475569" : "white";

        nextBtn.style.background = this.currentPage >= this.totalPages - 1 ? "#cbd5e1" : "#3b82f6";
        nextBtn.style.color = this.currentPage >= this.totalPages - 1 ? "#475569" : "white";
    },

    exportCsv: async function () {
        try {
            const token = Auth.getToken();
            const response = await fetch(API_BASE_URL + '/requests/export', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            if (response.status === 401) {
                Auth.logout();
                return;
            }
            if (!response.ok) {
                throw new Error("Failed to export requests");
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'requests.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showSuccessToast("CSV exported successfully!");
        } catch (e) {
            showErrorToast(e.message || "Failed to export CSV");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UserDashboard.init();
});
