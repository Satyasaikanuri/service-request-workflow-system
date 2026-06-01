const ManagerDashboard = {
    selectedUser: null,
    selectedLaptop: null,

    init() {
        const user = Auth.getUser();
        if (!user || (!user.roles.includes('ROLE_MANAGER') && !user.roles.includes('ROLE_ADMIN'))) {
            window.location.href = 'login.html';
            return;
        }

        document.getElementById('manager-name').textContent = user.username;
        this.loadUsers();
        this.loadLaptops();

        document.getElementById('assign-btn').addEventListener('click', () => this.assignLaptop());
    },

    async loadUsers() {
        try {
            const users = await API.get('/manager/new-users');
            const tbody = document.getElementById('users-tbody');
            tbody.innerHTML = '';

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">No unassigned users found</td></tr>';
                return;
            }

            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.className = 'selectable-row';
                tr.innerHTML = `
                    <td>
                        <div style="font-weight: 600;">${user.username}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${user.id}</div>
                    </td>
                    <td>${user.email}</td>
                    <td style="text-align: center;"><i class="fas fa-circle-notch" style="color: var(--border-color);"></i></td>
                `;
                tr.onclick = () => this.selectUser(user, tr);
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error("Failed to load users", err);
        }
    },

    async loadLaptops() {
        try {
            const laptops = await API.get('/manager/available-laptops');
            const tbody = document.getElementById('laptops-tbody');
            tbody.innerHTML = '';

            if (laptops.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">No available laptops in stock</td></tr>';
                return;
            }

            laptops.forEach(laptop => {
                const tr = document.createElement('tr');
                tr.className = 'selectable-row';
                tr.innerHTML = `
                    <td>
                        <div style="font-weight: 600;">${laptop.brand} ${laptop.model}</div>
                        <div class="badge badge-available">Available</div>
                    </td>
                    <td style="font-family: monospace;">${laptop.serialNumber}</td>
                    <td style="text-align: center;"><i class="fas fa-circle-notch" style="color: var(--border-color);"></i></td>
                `;
                tr.onclick = () => this.selectLaptop(laptop, tr);
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error("Failed to load laptops", err);
        }
    },

    selectUser(user, el) {
        this.selectedUser = user;
        document.querySelectorAll('#users-tbody tr').forEach(tr => tr.classList.remove('selected'));
        el.classList.add('selected');
        this.updateBtnState();
    },

    selectLaptop(laptop, el) {
        this.selectedLaptop = laptop;
        document.querySelectorAll('#laptops-tbody tr').forEach(tr => tr.classList.remove('selected'));
        el.classList.add('selected');
        this.updateBtnState();
    },

    updateBtnState() {
        const btn = document.getElementById('assign-btn');
        if (this.selectedUser && this.selectedLaptop) {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    },

    async assignLaptop() {
        if (!this.selectedUser || !this.selectedLaptop) return;

        const btn = document.getElementById('assign-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true;

        try {
            await API.post('/manager/assign-laptop', {
                userId: this.selectedUser.id,
                laptopId: this.selectedLaptop.id
            });

            showSuccessToast('Request Assigned');
            setTimeout(() => location.reload(), 2000);
        } catch (err) {
            showErrorToast(err.message || "Failed to assign laptop");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => ManagerDashboard.init());
