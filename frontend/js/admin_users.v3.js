/* Admin Users Panel - v3 (cache-busted) */

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const USERS_PER_PAGE = 10;
const API_BASE = window.API_BASE_URL || 'https://streaming.ecolens.me/api';

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function isAdmin() {
    const user = getCurrentUser();
    return !!(user && user.role === 'admin');
}

function showAdminPanel() {
    const panel = document.getElementById('adminPanelContainer');
    const login = document.getElementById('adminLoginContainer');
    if (panel) panel.style.display = 'block';
    if (login) login.style.display = 'none';
}

function showLoginForm() {
    const panel = document.getElementById('adminPanelContainer');
    const login = document.getElementById('adminLoginContainer');
    if (panel) panel.style.display = 'none';
    if (login) login.style.display = 'block';
}

async function checkAdminAccess() {
    try {
        const res = await fetch(`${API_BASE}/user/profile`, { credentials: 'include' });
        if (!res.ok) throw new Error('Not authenticated');
        const profile = await res.json();
        localStorage.setItem('user', JSON.stringify(profile));
        if (profile.role !== 'admin') throw new Error('Not admin');
        showAdminPanel();
        loadUsers();
    } catch (_) {
        showLoginForm();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    const form = document.getElementById('adminLoginForm');
    if (form) form.addEventListener('submit', onAdminLoginSubmit);
});

async function onAdminLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('adminLoginEmail').value;
    const password = document.getElementById('adminLoginPassword').value;
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) throw new Error('Login failed');
        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role !== 'admin') throw new Error('You are not an admin.');
        const errorBox = document.getElementById('adminLoginError');
        if (errorBox) errorBox.style.display = 'none';
        showAdminPanel();
        loadUsers();
    } catch (err) {
        const errorBox = document.getElementById('adminLoginError');
        if (errorBox) {
            errorBox.textContent = err.message;
            errorBox.style.display = 'block';
        }
    }
}

async function loadUsers() {
    try {
        showMessage('Loading users...', 'info');
        const response = await fetch(`${API_BASE}/admin/users`, {
            credentials: 'include',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allUsers = await response.json();
        filteredUsers = allUsers;
        currentPage = 1;
        displayUsers(getPageUsers());
        updateStats(allUsers);
        showMessage(`Successfully loaded ${allUsers.length} users`, 'success');
        renderPagination();
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage(`Error loading users: ${error.message}`, 'error');
        const c = document.getElementById('usersContainer');
        if (c) c.innerHTML = '<div class="error">Failed to load users.</div>';
    }
}

function getPageUsers() {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
}

function displayUsers(users) {
    const container = document.getElementById('usersContainer');
    if (!container) return;
    if (users.length === 0) {
        container.innerHTML = '<div class="loading">No users found</div>';
        return;
    }
    const table = `
        <table class="users-table">
            <thead>
                <tr>
                    <th><input type="checkbox" id="selectAll" onchange="toggleSelectAll()"></th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>My List</th>
                    <th>Keep Watching</th>
                    <th>Watch History</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users
                    .map(
                        (user) => `
                    <tr>
                        <td><input type="checkbox" value="${user._id}" class="user-checkbox"></td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="user-avatar">${user.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
                                <div class="user-info">
                                    <h4>${user.username || 'N/A'}</h4>
                                    <p>ID: ${user._id}</p>
                                </div>
                            </div>
                        </td>
                        <td>${user.email || 'N/A'}</td>
                        <td><span class="stat-badge ${user.role === 'admin' ? 'admin-badge' : ''}">${user.role || 'user'}</span></td>
                        <td><span class="stat-badge">${user.myList ? user.myList.length : 0} items</span></td>
                        <td><span class="stat-badge">${user.keepWatching ? user.keepWatching.length : 0} items</span></td>
                        <td><span class="stat-badge">${user.watchHistory ? user.watchHistory.length : 0} items</span></td>
                        <td>${formatDate(user.createdAt)}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="viewUser('${user._id}')">View</button>
                            <button class="btn btn-primary" onclick="editUser('${user._id}')">Edit</button>
                            <button class="btn btn-secondary" onclick="resetPassword('${user._id}')">Reset PW</button>
                            <button class="btn btn-secondary" onclick="changeRole('${user._id}')">Role</button>
                            <button class="btn btn-secondary" style="background:#e74c3c;" onclick="deleteUser('${user._id}')">Delete</button>
                        </td>
                    </tr>
                `
                    )
                    .join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = table;
}

function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    const container = document.getElementById('usersContainer');
    if (!container) return;
    if (totalPages <= 1) return;
    let html = '<div style="display:flex;justify-content:center;gap:8px;margin:20px 0;">';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="gotoPage(${i})">${i}</button>`;
    }
    html += '</div>';
    container.insertAdjacentHTML('beforeend', html);
}

function gotoPage(page) {
    currentPage = page;
    displayUsers(getPageUsers());
    renderPagination();
}

function filterUsers() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    filteredUsers = allUsers.filter((user) => {
        const matchesSearch =
            (user.username && user.username.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm)) ||
            (user._id && String(user._id).toLowerCase().includes(searchTerm));
        if (roleFilter === 'user') return matchesSearch && user.role === 'user';
        if (roleFilter === 'admin') return matchesSearch && user.role === 'admin';
        return matchesSearch;
    });
    currentPage = 1;
    displayUsers(getPageUsers());
    renderPagination();
}

function exportUsers() {
    const csvContent =
        'data:text/csv;charset=utf-8,' +
        'Username,Email,Role,MyList Items,Keep Watching Items,Watch History Items,Joined\n' +
        allUsers
            .map(
                (user) =>
                    `"${user.username || 'N/A'}","${user.email || 'N/A'}","${user.role || 'user'}",${user.myList ? user.myList.length : 0},${user.keepWatching ? user.keepWatching.length : 0},${user.watchHistory ? user.watchHistory.length : 0},"${formatDate(user.createdAt)}"`
            )
            .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'users_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('User data exported successfully!', 'success');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
    if (type !== 'info')
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 5000);
}

function updateStats(users) {
    document.getElementById('totalUsers').textContent = users.length;
    const activeUsers = users.filter(
        (user) =>
            (user.myList && user.myList.length > 0) ||
            (user.keepWatching && user.keepWatching.length > 0) ||
            (user.watchHistory && user.watchHistory.length > 0)
    ).length;
    document.getElementById('activeUsers').textContent = activeUsers;
    const avgMyList =
        users.length > 0
            ? Math.round(
                  users.reduce((sum, user) => sum + (user.myList ? user.myList.length : 0), 0) /
                      users.length
              )
            : 0;
    document.getElementById('avgMyList').textContent = avgMyList;
    const avgWatchHistory =
        users.length > 0
            ? Math.round(
                  users.reduce(
                      (sum, user) => sum + (user.watchHistory ? user.watchHistory.length : 0),
                      0
                  ) / users.length
              )
            : 0;
    document.getElementById('avgWatchHistory').textContent = avgWatchHistory;
}

function openModal(html) {
    const body = document.getElementById('modalBody');
    const modal = document.getElementById('modal');
    if (!body || !modal) return;
    body.innerHTML = html;
    modal.style.display = 'flex';
}
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
}

function viewUser(id) {
    const user = allUsers.find((u) => String(u._id) === String(id));
    if (!user) return;
    openModal(`
        <h2>User Details</h2>
        <div><b>ID:</b> ${user._id}</div>
        <div><b>Username:</b> ${user.username}</div>
        <div><b>Email:</b> ${user.email}</div>
        <div><b>Role:</b> ${user.role || 'user'}</div>
        <div><b>My List:</b> ${user.myList ? user.myList.length : 0} items</div>
        <div><b>Keep Watching:</b> ${user.keepWatching ? user.keepWatching.length : 0} items</div>
        <div><b>Watch History:</b> ${user.watchHistory ? user.watchHistory.length : 0} items</div>
        <div><b>Joined:</b> ${formatDate(user.createdAt)}</div>
        <div style="margin-top:20px;"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
    `);
}

function editUser(id) {
    const user = allUsers.find((u) => String(u._id) === String(id));
    if (!user) return;
    openModal(`
        <h2>Edit User</h2>
        <form id="editUserForm">
            <label>Username:<br><input type="text" id="editUsername" value="${user.username || ''}" required></label><br><br>
            <label>Email:<br><input type="email" id="editEmail" value="${user.email || ''}" required></label><br><br>
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </form>
    `);
    const form = document.getElementById('editUserForm');
    if (form)
        form.onsubmit = async function (e) {
            e.preventDefault();
            const username = document.getElementById('editUsername').value;
            const email = document.getElementById('editEmail').value;
            try {
                const res = await fetch(`${API_BASE}/admin/users/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, email }),
                });
                if (!res.ok) throw new Error('Failed to update user');
                showMessage('User updated successfully', 'success');
                closeModal();
                loadUsers();
            } catch (err) {
                showMessage('Error updating user: ' + err.message, 'error');
            }
        };
}

function resetPassword(id) {
    openModal(`
        <h2>Reset Password</h2>
        <form id="resetPwForm">
            <label>New Password:<br><input type="password" id="newPassword" required></label><br><br>
            <button type="submit" class="btn btn-primary">Reset</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </form>
    `);
    const form = document.getElementById('resetPwForm');
    if (form)
        form.onsubmit = async function (e) {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            try {
                const res = await fetch(`${API_BASE}/admin/users/${id}/reset-password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ newPassword }),
                });
                if (!res.ok) throw new Error('Failed to reset password');
                showMessage('Password reset successfully', 'success');
                closeModal();
            } catch (err) {
                showMessage('Error resetting password: ' + err.message, 'error');
            }
        };
}

function changeRole(id) {
    const user = allUsers.find((u) => String(u._id) === String(id));
    if (!user) return;
    openModal(`
        <h2>Change Role</h2>
        <form id="roleForm">
            <label>Role:<br>
                <select id="roleSelect">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </label><br><br>
            <button type="submit" class="btn btn-primary">Update</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </form>
    `);
    const form = document.getElementById('roleForm');
    if (form)
        form.onsubmit = async function (e) {
            e.preventDefault();
            const role = document.getElementById('roleSelect').value;
            try {
                const res = await fetch(`${API_BASE}/admin/users/${id}/role`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ role }),
                });
                if (!res.ok) throw new Error('Failed to update role');
                showMessage('Role updated successfully', 'success');
                closeModal();
                loadUsers();
            } catch (err) {
                showMessage('Error updating role: ' + err.message, 'error');
            }
        };
}

function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    const btn = typeof event !== 'undefined' && event && event.target ? event.target : null;
    if (btn) btn.disabled = true;
    fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    })
        .then((res) => {
            if (!res.ok) throw new Error('Failed to delete user');
            showMessage('User deleted successfully', 'success');
            loadUsers();
        })
        .catch((err) => showMessage('Error deleting user: ' + err.message, 'error'))
        .finally(() => {
            if (btn) btn.disabled = false;
        });
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    userCheckboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox && selectAllCheckbox.checked;
    });
}

window.filterUsers = filterUsers;
window.gotoPage = gotoPage;
window.viewUser = viewUser;
window.editUser = editUser;
window.resetPassword = resetPassword;
window.changeRole = changeRole;
window.deleteUser = deleteUser;
window.addUserModal = addUserModal;
window.bulkDeleteModal = bulkDeleteModal;
window.toggleSelectAll = toggleSelectAll;
window.loadUsers = loadUsers;
window.updateStats = updateStats;

function addUserModal() {
    openModal(`
        <h2>Add New User</h2>
        <form id="addUserForm">
            <label>Username:<br><input type="text" id="newUsername" required></label><br><br>
            <label>Email:<br><input type="email" id="newEmail" required></label><br><br>
            <label>Password:<br><input type="password" id="newPassword" required></label><br><br>
            <label>Role:<br>
                <select id="newRole">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
            </label><br><br>
            <button type="submit" class="btn btn-primary">Create</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </form>
    `);
    const form = document.getElementById('addUserForm');
    if (form)
        form.onsubmit = async function (e) {
            e.preventDefault();
            const username = document.getElementById('newUsername').value;
            const email = document.getElementById('newEmail').value;
            const password = document.getElementById('newPassword').value;
            const role = document.getElementById('newRole').value;
            try {
                const res = await fetch(`${API_BASE}/admin/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, email, password, role }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to create user');
                }
                showMessage('User created successfully', 'success');
                closeModal();
                loadUsers();
            } catch (err) {
                showMessage('Error creating user: ' + err.message, 'error');
            }
        };
}

function bulkDeleteModal() {
    openModal(`
        <h2>Bulk Delete Users</h2>
        <p>Are you sure you want to delete all selected users? This action cannot be undone.</p>
        <button class="btn btn-danger" onclick="bulkDeleteConfirmed()">Yes, Delete All</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    `);
}

async function bulkDeleteConfirmed() {
    const selectedUserIds = Array.from(document.querySelectorAll('.users-table tbody tr'))
        .map((row) => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            return checkbox ? checkbox.value : null;
        })
        .filter((id) => id);

    if (selectedUserIds.length === 0) {
        showMessage('No users selected for deletion.', 'info');
        closeModal();
        return;
    }

    if (
        !confirm(
            `Are you sure you want to delete ${selectedUserIds.length} users? This action cannot be undone.`
        )
    ) {
        closeModal();
        return;
    }

    try {
        showMessage('Deleting users...', 'info');
        const deletePromises = selectedUserIds.map((id) =>
            fetch(`${API_BASE}/admin/users/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
        );
        await Promise.all(deletePromises);
        showMessage(`Successfully deleted ${selectedUserIds.length} users.`, 'success');
        loadUsers();
    } catch (error) {
        console.error('Error bulk deleting users:', error);
        showMessage(`Error deleting users: ${error.message}`, 'error');
    }
    closeModal();
}
