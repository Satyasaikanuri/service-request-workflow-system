
// Approver Dashboard Logic

const ApproverDashboard = {
    requests: [],
    currentReqId: null,
    activeView: 'dashboard',

    init: async function () {
        if (!Auth.getToken()) {
            window.location.href = '/login.html';
            return;
        }

        const user = Auth.getUser();
        if (user) {
            document.getElementById('user-name').innerText = user.username;
            // user.department might be a string (from JwtResponse) or an object (if structure changed)
            if (typeof user.department === 'string') {
                document.getElementById('user-dept').innerText = user.department;
            } else if (user.department && user.department.name) {
                document.getElementById('user-dept').innerText = user.department.name;
            } else {
                document.getElementById('user-dept').innerText = '';
            }
        }

        console.log("Initializing Approver Dashboard...");

        // Setup Nav Clicks (redundant if using onclick in HTML, but good practice to have logic here if needed)
        // For now relying on onclick="ApproverDashboard.switchView(...)" in HTML

        await this.loadData();

        // Polling interaction
        setInterval(() => this.loadData(true), 10000);

        // SLA Ticker
        setInterval(() => this.updateTimers(), 1000);

        this.renderEfficiencyChart();
    },

    loadData: async function (silent = false) {
        try {
            // Fetch Assigned Requests
            const requests = await API.get('/requests/assigned');
            this.requests = requests;

            this.updateStats();

            // Re-render current view if it depends on data
            if (this.activeView === 'approvals' || this.activeView === 'history') {
                this.renderTable();
            } else if (this.activeView === 'dashboard') {
                this.renderDashboardTable();
            }
            this.updateActivityFeed();

        } catch (error) {
            console.error(error);
            if (!silent) showErrorToast("Failed to load requests.");
        }
    },

    switchView: function (viewName) {
        this.activeView = viewName;

        // 1. Update Sidebar Active State
        document.querySelectorAll('.nav-item-mock').forEach(el => el.classList.remove('active'));
        const navId = `nav-${viewName}`; // works for dashboard, approvals, history, reports
        const navEl = document.getElementById(navId);
        if (navEl) navEl.classList.add('active');

        // 2. Hide all Views
        ['dashboard', 'list', 'reports'].forEach(v => {
            const el = document.getElementById(`view-${v}`);
            if (el) el.style.display = 'none';
        });

        // 3. Show Target View
        if (viewName === 'dashboard') {
            document.getElementById('view-dashboard').style.display = 'block';
            this.renderDashboardTable();
        } else if (viewName === 'reports') {
            document.getElementById('view-reports').style.display = 'block';
            this.renderReports();
        } else {
            // approvals or history -> show list view
            document.getElementById('view-list').style.display = 'block';

            // Update Title
            const titleMap = {
                'approvals': 'My Pending Approvals',
                'history': 'Approval History'
            };
            document.getElementById('list-title').innerText = titleMap[viewName] || 'Requests';

            this.renderTable();
        }
    },

    renderDashboardTable: function () {
        const tbody = document.getElementById('dashboard-requests-body');
        if (!tbody) return;

        // Filter: Only Pending/Active for Dashboard
        const filtered = this.requests.filter(r => ['PENDING', 'NEW', 'AUTO_ASSIGNED', 'IN_PROGRESS'].includes(r.status));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">No pending requests. All caught up!</td></tr>';
            return;
        }

        // Sort: Priority then Date
        const sorted = [...filtered].sort((a, b) => {
            const pScore = (p) => {
                if (p === 'CRITICAL') return 0;
                if (p === 'HIGH') return 1;
                if (p === 'MEDIUM') return 2;
                return 3;
            };
            if (pScore(a.priority) !== pScore(b.priority)) return pScore(a.priority) - pScore(b.priority);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Limit to top 5 for dashboard? Or show all? User said "Assigned request also show", implies list.
        // Let's show all pending but maybe strictly pending.

        tbody.innerHTML = sorted.map(r => {
            let priorityClass = '';
            if (r.priority === 'CRITICAL' || r.priority === 'HIGH') priorityClass = 'text-red-600 font-bold';

            return `
            <tr>
                <td style="font-weight: 600;">#${r.id}</td>
                <td>${escapeHTML(r.user.username)}</td>
                <td>${escapeHTML(r.title)}</td>
                <td style="font-size: 0.85rem;"><span class="${priorityClass}">${escapeHTML(r.priority)}</span></td>
                <td style="color: #64748b; font-size: 0.85rem;">${new Date(r.createdAt).toLocaleDateString()}</td>
                <td><span id="dash-timer-${r.id}" class="sla-badge" data-created="${r.createdAt}" data-sla="${r.slaHours || 24}" data-status="${r.status}">--:--</span></td>
                <td><span class="badge badge-${escapeHTML(r.status)}">${escapeHTML(r.status)}</span></td>
                <td>
                    <button onclick="ApproverDashboard.openModal(${r.id})" class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; width: auto;">
                        View
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        // We need to update timers for these new elements too.
        // updateTimers iterates requests and looks for ElementId `timer-${r.id}`.
        // We used `dash-timer-${r.id}` here to avoid duplicate IDs if both views somehow existed (though hidden).
        // Let's make updateTimers robust enough to check both? or just reuse updateTimers logic.
        this.updateTimers();
    },

    renderReports: function () {
        // Destroy existing charts if any
        ['chart-status', 'chart-priority', 'chart-sla', 'chart-volume'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const chartInstance = Chart.getChart(canvas);
                if (chartInstance) chartInstance.destroy();
            }
        });

        // 1. Status Breakdown
        const statusCounts = {};
        this.requests.forEach(r => statusCounts[r.status] = (statusCounts[r.status] || 0) + 1);

        new Chart(document.getElementById('chart-status'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: { plugins: { legend: { position: 'right' } } }
        });

        // 2. Priority Breakdown
        const prioCounts = { 'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0 };
        this.requests.forEach(r => {
            if (prioCounts.hasOwnProperty(r.priority)) prioCounts[r.priority]++;
        });

        new Chart(document.getElementById('chart-priority'), {
            type: 'bar',
            data: {
                labels: Object.keys(prioCounts),
                datasets: [{
                    label: 'Requests',
                    data: Object.values(prioCounts),
                    backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6'],
                    borderRadius: 4
                }]
            },
            options: {
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
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

            // If closed, check if closed before due? Simplified: just current status
            // Ideally we check actual completion time vs due time.
            // For now, if status is closed/approved/rejected, assume safe unless we track breach flag
            const isClosed = ['APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED'].includes(r.status);

            if (!isClosed && now > due) {
                breached++;
            } else {
                safe++;
            }
        });

        new Chart(document.getElementById('chart-sla'), {
            type: 'pie',
            data: {
                labels: ['Safe', 'Breached'],
                datasets: [{
                    data: [safe, breached],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: { plugins: { legend: { position: 'bottom' } } }
        });

        // 4. Daily Volume (Last 7 Days)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toLocaleDateString();
        });

        const volumeData = last7Days.map(dateStr => {
            // Count requests created on this date
            // Note: dateStr format depends on locale, consistent matching needed
            return this.requests.filter(r => new Date(r.createdAt).toLocaleDateString() === dateStr).length;
        });

        new Chart(document.getElementById('chart-volume'), {
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
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
                plugins: { legend: { display: false } }
            }
        });
    },

    updateStats: function () {
        const total = this.requests.length;
        const pending = this.requests.filter(r => ['PENDING', 'NEW', 'AUTO_ASSIGNED', 'IN_PROGRESS'].includes(r.status)).length;
        const approved = this.requests.filter(r => r.status === 'APPROVED').length;
        const rejected = this.requests.filter(r => r.status === 'REJECTED').length;

        // SLA: For now, assume Escalated or < 30 mins left
        // Logic will be refined in updateTimers

        document.getElementById('kpi-assigned').innerText = total;
        document.getElementById('kpi-pending').innerText = pending;
        document.getElementById('kpi-approved').innerText = approved;
        document.getElementById('kpi-rejected').innerText = rejected;
    },

    renderTable: function () {
        const tbody = document.getElementById('requests-body');

        // Filter based on active view
        let filtered = [];
        if (this.activeView === 'approvals') {
            filtered = this.requests.filter(r => ['PENDING', 'NEW', 'AUTO_ASSIGNED', 'IN_PROGRESS'].includes(r.status));
        } else if (this.activeView === 'history') {
            filtered = this.requests.filter(r => ['APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED', 'CANCELLED'].includes(r.status));
            // Maybe just all that are NOT pending?
        } else {
            // Fallback or dashboard view (though dashboard view doesn't have the table anymore in this layout)
            filtered = this.requests;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">No ${this.activeView === 'history' ? 'history' : 'pending requests'} found.</td></tr>`;
            return;
        }

        // Sort: Pending first, then by Priority, then Created Date
        const sorted = [...filtered].sort((a, b) => {
            const statusScore = (s) => ['PENDING', 'NEW', 'AUTO_ASSIGNED'].includes(s) ? 0 : 1;
            if (statusScore(a.status) !== statusScore(b.status)) return statusScore(a.status) - statusScore(b.status);

            // Priority
            const pScore = (p) => {
                if (p === 'CRITICAL') return 0;
                if (p === 'HIGH') return 1;
                if (p === 'MEDIUM') return 2;
                return 3;
            };
            if (pScore(a.priority) !== pScore(b.priority)) return pScore(a.priority) - pScore(b.priority);

            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        tbody.innerHTML = sorted.map(r => {
            const isPending = ['PENDING', 'NEW', 'AUTO_ASSIGNED'].includes(r.status);

            let priorityClass = '';
            if (r.priority === 'CRITICAL' || r.priority === 'HIGH') priorityClass = 'text-red-600 font-bold';

            return `
            <tr style="${!isPending ? 'opacity: 0.7;' : ''}">
                <td style="font-weight: 600;">#${r.id}</td>
                <td>${escapeHTML(r.user.username)}</td>
                <td>${escapeHTML(r.title)}</td>
                <td style="font-size: 0.85rem;"><span class="${priorityClass}">${escapeHTML(r.priority)}</span></td>
                <td style="color: #64748b; font-size: 0.85rem;">${new Date(r.createdAt).toLocaleDateString()}</td>
                <td><span id="timer-${r.id}" class="sla-badge" data-created="${r.createdAt}" data-sla="${r.slaHours || 24}" data-status="${r.status}">--:--</span></td>
                <td><span class="badge badge-${escapeHTML(r.status)}">${escapeHTML(r.status)}</span></td>
                <td>
                    <button onclick="ApproverDashboard.openModal(${r.id})" class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; width: auto;">
                        View
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        this.updateTimers();
    },

    updateTimers: function () {
        let atRiskCount = 0;

        this.requests.forEach(r => {
            // We need to check for BOTH possible timer elements (List View and Dashboard View)
            const listTimer = document.getElementById(`timer-${r.id}`);
            const dashTimer = document.getElementById(`dash-timer-${r.id}`);

            // Collect them to iterate updates
            const timersToUpdate = [];
            if (listTimer) timersToUpdate.push(listTimer);
            if (dashTimer) timersToUpdate.push(dashTimer);

            // Only process if there are elements to update or if the request is pending (for atRiskCount)
            if (timersToUpdate.length === 0 && !['PENDING', 'NEW', 'AUTO_ASSIGNED', 'IN_PROGRESS'].includes(r.status)) return;

            // Calculate logic once
            const isCompleted = ['APPROVED', 'REJECTED', 'RESOLVED', 'CLOSED', 'CANCELLED'].includes(r.status);
            let text = '';
            let className = 'sla-badge';
            let style = {};

            if (isCompleted) {
                text = 'DONE';
                style = { background: '#e2e8f0', color: '#64748b' };
            } else {
                const created = new Date(r.createdAt);
                const slaHours = r.slaHours || 24;
                const due = new Date(created.getTime() + slaHours * 60 * 60 * 1000);
                const now = new Date();
                const diff = due - now;

                if (diff <= 0) {
                    text = "BREACHED";
                    className += ' sla-danger';
                    atRiskCount++;
                } else {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    // Compact format for dashboard might be needed, but sticking to standard for now
                    text = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;

                    if (hours < 1) {
                        className += ' sla-danger';
                        atRiskCount++;
                    } else if (hours < 4) {
                        className += ' sla-badge sla-warning'; // Ensure base class is present
                    } else {
                        className += ' sla-badge sla-safe'; // Ensure base class is present
                    }
                }
            }

            // Apply to all found elements
            timersToUpdate.forEach(el => {
                el.innerText = text;
                el.className = className;
                if (isCompleted) {
                    Object.assign(el.style, style);
                } else {
                    el.style = ''; // reset inline styles if previously set
                }
            });
        });

        document.getElementById('kpi-sla').innerText = atRiskCount;
        const globalAlert = document.getElementById('sla-global-alert');
        if (atRiskCount > 0) {
            globalAlert.style.display = 'block';
            document.getElementById('notif-dot').style.display = 'block';
        } else {
            globalAlert.style.display = 'none';
        }
    },

    openModal: async function (id) {
        this.currentReqId = id;
        const req = this.requests.find(r => r.id === id);
        if (!req) return;

        document.getElementById('modal-title').innerText = `Request #${req.id}`;
        document.getElementById('modal-user').innerText = req.user.username;
        document.getElementById('modal-dept').innerText = req.department ? req.department.name : '-';
        document.getElementById('modal-type').innerText = req.requestType ? req.requestType.name : 'General';
        document.getElementById('modal-priority').innerText = req.priority;
        document.getElementById('modal-desc').innerText = req.description;
        document.getElementById('action-remarks').value = '';

        // Trigger Seen Status (Fire and Forget)
        API.post(`/requests/${id}/seen`, {}).catch(err => console.error("Failed to mark as seen", err));

        // Show/Hide Actions based on status
        const isActionable = ['PENDING', 'NEW', 'AUTO_ASSIGNED', 'IN_PROGRESS'].includes(req.status);
        if (isActionable) {
            document.getElementById('modal-actions-area').style.display = 'block';
            document.getElementById('modal-status-display').style.display = 'none';
        } else {
            document.getElementById('modal-actions-area').style.display = 'none';
            document.getElementById('modal-status-display').style.display = 'block';
            document.getElementById('modal-status-text').innerText = req.status;
            document.getElementById('modal-status-text').className = `badge badge-${req.status}`;
        }

        // Fetch Audit
        document.getElementById('modal-audit-list').innerHTML = 'Loading history...';
        document.getElementById('action-modal').classList.add('show');

        try {
            const audits = await API.get(`/requests/${id}/audit`);

            const list = document.getElementById('modal-audit-list');
            if (!audits || audits.length === 0) {
                list.innerHTML = '<div class="audit-item">No history recorded.</div>';
            } else {
                list.innerHTML = audits.map(a => `
                    <div class="audit-item">
                        <span class="timestamp">${new Date(a.timestamp).toLocaleString()}</span>
                        <strong>${escapeHTML(a.action)}</strong> by ${a.performedBy ? escapeHTML(a.performedBy.username) : 'SYSTEM'}
                        <div>${escapeHTML(a.remarks)}</div>
                    </div>
                `).join('');
            }

        } catch (e) {
            console.error("Audit load failed", e);
            document.getElementById('modal-audit-list').innerHTML = 'Failed to load history.';
        }
    },

    updateActivityFeed: function () {
        const list = document.getElementById('activity-list');
        // Filter my recent actions? Or just recent events on my assigned reqs
        // Let's just list recent critical request arrival or status changes
        // Since we don't have a dedicated feed API, we mock from requests list
        // Sort by updated at
        const recent = [...this.requests].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);

        list.innerHTML = recent.map(r => `
            <li style="padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
                <div>
                   <span style="font-weight: 600;">#${r.id}</span> updated
                   <div style="font-size: 0.75rem; color: #94a3b8;">${new Date(r.updatedAt).toLocaleTimeString()}</div>
                </div>
                 <span class="badge badge-${r.status}" style="font-size: 0.7rem;">${r.status}</span>
            </li>
        `).join('');
    },

    renderEfficiencyChart: function () {
        // Mock data or calculate from requests locally
        const ctx = document.getElementById('efficiencyChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['On Time', 'Late', 'Breached'],
                datasets: [{
                    data: [85, 10, 5],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    },

    toggleNotifications: function () {
        const dd = document.getElementById('notification-dropdown');
        const isVisible = dd.style.display === 'block';
        dd.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            this.renderNotifications();
        }
    },

    renderNotifications: function () {
        const list = document.getElementById('notification-list');
        // Generate notifications from real data: e.g. "New Request Assigned #ID" or "SLA Warning"
        // For now, filter PENDING requests as "New Assignments"

        const pending = this.requests.filter(r => ['PENDING', 'NEW', 'AUTO_ASSIGNED'].includes(r.status));
        const slaRisk = this.requests.filter(r => {
            // simplified logic
            return ['PENDING', 'IN_PROGRESS'].includes(r.status) && (r.slaHours && r.slaHours < 4); // mock check
        });

        // Combine into notification items
        let items = [];

        pending.forEach(r => {
            items.push({
                type: 'info',
                msg: `New Request #${r.id} from ${r.user.username}`,
                time: r.createdAt
            });
        });

        // Mock SLA warnings for demonstration if no real breach flag yet
        // In real app, we would have a Notification entity from backend

        if (items.length === 0) {
            list.innerHTML = '<div style="padding: 1rem; color: #94a3b8; text-align: center; font-size: 0.85rem;">No new notifications</div>';
            document.getElementById('notif-dot').style.display = 'none';
        } else {
            // Sort by time desc
            items.sort((a, b) => new Date(b.time) - new Date(a.time));

            list.innerHTML = items.map(Item => `
                <div style="padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); hover:bg-slate-800; cursor: pointer;">
                    <div style="font-size: 0.85rem; color: #f1f5f9;">${Item.msg}</div>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">${new Date(Item.time).toLocaleTimeString()}</div>
                </div>
             `).join('');

            document.getElementById('notif-dot').style.display = 'block';
        }
    },

    markAllRead: function () {
        // Just hide dot and clear list visually for this session
        document.getElementById('notif-dot').style.display = 'none';
        document.getElementById('notification-dropdown').style.display = 'none';
    }

};

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    const dd = document.getElementById('notification-dropdown');
    const bellContainer = dd.parentElement;
    if (!bellContainer.contains(event.target) && dd.style.display === 'block') {
        dd.style.display = 'none';
    }
});



function submitAction(status) {
    const remarks = document.getElementById('action-remarks').value;
    if (!remarks.trim()) {
        showErrorToast("Please provide remarks/reason for this action.");
        return;
    }

    const title = status === 'APPROVED' ? 'Approve Request?' : 'Reject Request?';
    const text = `Are you sure you want to ${status.toLowerCase()} this request? This action cannot be undone.`;

    showConfirmationModal(title, text, 'Confirm', () => {
        API.put(`/requests/${ApproverDashboard.currentReqId}/status`, {
            status: status,
            remarks: remarks
        }).then(resp => {
            showSuccessToast(`Request ${status.toLowerCase()} successfully`);
            closeModal();
            ApproverDashboard.loadData();
        }).catch(err => {
            showErrorToast("Error: " + err.message);
        });
    });
}

function closeModal() {
    document.getElementById('action-modal').classList.remove('show');
    ApproverDashboard.currentReqId = null;
}

document.addEventListener('DOMContentLoaded', () => {
    ApproverDashboard.init();
});
