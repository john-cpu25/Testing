/* ============================================
   Accounts.js - User & Security Management
   Admin only: Manage users, roles, and reset passwords
   ============================================ */

const Accounts = (() => {
  const supabaseUrl = 'https://ejyirnfxuezipogweybo.supabase.co';
  const supabaseKey = 'sb_publishable_r1DKG_nf_nyivQgbe6D7YA_zow13__G';
  const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

  let allUsers = [];
  let currentSearch = '';
  let currentRoleFilter = 'all';

  // ---- Fetch All Users ----
  async function fetchUsers() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('Apex_Testing_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Accounts] Error loading users:', error);
        return [];
      }

      // Sort: Admin & AdminApp on top, then Leader, Assistant, User, then by display_name
      const roleWeight = { admin_app: 5, admin: 4, leader: 3, assistant: 2, user: 1 };
      allUsers = (data || []).sort((a, b) => {
        const aW = roleWeight[(a.role || '').toLowerCase()] || 0;
        const bW = roleWeight[(b.role || '').toLowerCase()] || 0;
        if (aW !== bW) return bW - aW;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

      return allUsers;
    } catch (err) {
      console.error('[Accounts] Exception loading users:', err);
      return [];
    }
  }

  // ---- Render Accounts View ----
  async function render() {
    const container = document.getElementById('accountsTableContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted);">
        <span class="login-spinner" style="width: 24px; height: 24px; border-width: 3px; border-top-color: var(--login-primary); margin-bottom: 12px;"></span>
        <div>Loading user directory...</div>
      </div>
    `;

    await fetchUsers();
    renderTable();

    // Attach search & filter listeners
    const searchInput = document.getElementById('accountSearchInput');
    const roleFilter = document.getElementById('accountRoleFilter');
    const createBtn = document.getElementById('btnCreateAccount');

    if (searchInput) {
      searchInput.value = currentSearch;
      searchInput.oninput = (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderTable();
      };
    }

    if (roleFilter) {
      roleFilter.value = currentRoleFilter;
      roleFilter.onchange = (e) => {
        currentRoleFilter = e.target.value;
        renderTable();
      };
    }

    if (createBtn) {
      createBtn.onclick = showCreateAccountModal;
    }
  }

  // ---- Filter and Render Table HTML ----
  function renderTable() {
    const container = document.getElementById('accountsTableContainer');
    if (!container) return;

    const filtered = allUsers.filter(u => {
      const name = (u.display_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || 'user').toLowerCase();

      const matchesSearch = !currentSearch || name.includes(currentSearch) || email.includes(currentSearch);
      const matchesRole = currentRoleFilter === 'all' || role === currentRoleFilter;

      return matchesSearch && matchesRole;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">No accounts found</div>
          <div class="empty-state-text">Try searching with different keywords or clearing the filter.</div>
        </div>
      `;
      return;
    }

    const currentUser = App.getCurrentUser();

    container.innerHTML = `
      <div class="table-container">
        <table class="accounts-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Password Security</th>
              <th>Created Date</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(u => renderUserRow(u, currentUser)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---- Render Single User Row ----
  function renderUserRow(u, currentUser) {
    const r = (u.role || 'user').toLowerCase();
    const isSelf = currentUser && (currentUser.id === u.id || currentUser.username === u.email);
    const initial = (u.display_name || 'U').charAt(0).toUpperCase();

    // Check if password is SHA-256 (64 hex characters)
    const isHashed = u.password && u.password.length === 64 && /^[0-9a-f]+$/i.test(u.password);

    let avatarClass = 'avatar-user-color';
    let roleBadge = '<span class="badge badge-role-user">👤 User</span>';

    if (r === 'admin') {
      avatarClass = 'avatar-admin-color';
      roleBadge = '<span class="badge badge-role-admin">👑 Admin</span>';
    } else if (r === 'admin_app') {
      avatarClass = 'avatar-admin-color';
      roleBadge = '<span class="badge badge-role-admin">🛡️ AdminApp</span>';
    } else if (r === 'leader') {
      avatarClass = 'avatar-leader-color';
      roleBadge = '<span class="badge badge-purple">⭐ Leader</span>';
    } else if (r === 'assistant') {
      avatarClass = 'avatar-assistant-color';
      roleBadge = '<span class="badge badge-cyan">📋 Assistant</span>';
    }

    return `
      <tr>
        <td>
          <div class="user-display-cell">
            <div class="user-avatar-sm ${avatarClass}">
              ${initial}
            </div>
            <div class="user-cell-meta">
              <div class="user-cell-name">
                ${App.escapeHtml(u.display_name || 'Unnamed User')}
                ${isSelf ? '<span style="font-size: 11px; color: var(--accent-cyan); font-weight: normal; margin-left: 6px;">(You)</span>' : ''}
              </div>
              <div class="user-cell-email">${App.escapeHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td>
          ${roleBadge}
        </td>
        <td>
          ${isHashed
            ? '<span class="pw-status-secure" title="Password secured with SHA-256 encryption standard">🛡️ SHA-256 Secured</span>'
            : '<span class="pw-status-plain" title="Plaintext password. System will automatically hash with SHA-256 on next login">⚡ Auto-hashes on Login</span>'
          }
        </td>
        <td style="color: var(--text-muted); font-size: 12px;">
          ${App.formatDate(u.created_at)}
        </td>
        <td style="text-align: right;">
          <div class="btn-group" style="justify-content: flex-end;">
            <button class="btn btn-ghost btn-sm" onclick="Accounts.showRoleModal('${u.id}', '${App.escapeHtml(u.display_name)}', '${u.role}')" title="Change Role (Admin / Employee)">
              🎖️ Role
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Accounts.showResetModal('${u.id}', '${App.escapeHtml(u.display_name)}', '${u.email}')" title="Reset user password">
              🔑 Reset Pass
            </button>
            ${!isSelf ? `
              <button class="btn btn-ghost btn-sm text-red" onclick="Accounts.deleteAccount('${u.id}', '${App.escapeHtml(u.display_name)}', '${u.email}')" title="Delete account">
                🗑️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  // ---- Modal: Create Account ----
  function showCreateAccountModal() {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input type="text" class="form-input" id="newAccName" placeholder="e.g. Johnny Nguyen..." autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Company Email (@apexscengineering.com) *</label>
        <input type="email" class="form-input" id="newAccEmail" placeholder="e.g. johnny.nguyen@apexscengineering.com...">
      </div>
      <div class="form-group">
        <label class="form-label">Initial Password *</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" class="form-input" id="newAccPass" placeholder="Enter or generate password...">
          <button type="button" class="btn btn-secondary btn-sm" onclick="Accounts.generateRandomPassToInput('newAccPass')">🎲 Random</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">System Role</label>
        <select class="form-select" id="newAccRole">
          <option value="user" selected>👤 User (Assessment Participant)</option>
          <option value="leader">⭐ Leader (Assign tests & create schedules)</option>
          <option value="assistant">📋 Assistant (View dashboard & results)</option>
          <option value="admin">👑 Admin (Full Assessment Administrator)</option>
          <option value="admin_app">🛡️ AdminApp (System Admin)</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Accounts.submitCreateAccount()">💾 Create Account</button>
    `;

    App.openModal('➕ Add New User', bodyHtml, footerHtml);
  }

  async function submitCreateAccount() {
    const nameInput = document.getElementById('newAccName');
    const emailInput = document.getElementById('newAccEmail');
    const passInput = document.getElementById('newAccPass');
    const roleInput = document.getElementById('newAccRole');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const pass = passInput ? passInput.value.trim() : '';
    const role = roleInput ? roleInput.value : 'user';

    if (!name || !email || !pass) {
      alert('Please fill in Name, Email, and Password!');
      return;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email address!');
      return;
    }

    // Check duplicate
    const existing = allUsers.find(u => (u.email || '').toLowerCase() === email);
    if (existing) {
      alert(`Email "${email}" already exists in the system!`);
      return;
    }

    // Hash password with SHA-256
    const hashedPassword = await App.hashPassword(pass);

    const newId = App.generateId();
    const { error } = await supabase
      .from('Apex_Testing_users')
      .insert([
        {
          id: newId,
          display_name: name,
          email: email,
          password: hashedPassword,
          role: role,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('[Accounts] Error creating account:', error);
      alert('Error creating account: ' + error.message);
      return;
    }

    alert(`Account created successfully!\n\nEmail: ${email}\nPassword: ${pass}\n\n(Please provide these credentials to the user).`);
    App.closeModal();
    await render();
  }

  // ---- Modal: Edit Role ----
  function showRoleModal(userId, userName, currentRole) {
    const cur = (currentRole || 'user').toLowerCase();

    const bodyHtml = `
      <p style="margin-bottom: 16px; color: var(--text-secondary);">
        Select role for user <strong>${App.escapeHtml(userName)}</strong>:
      </p>
      <div class="form-group">
        <label class="form-label">New Role</label>
        <select class="form-select" id="changeRoleSelect">
          <option value="user" ${cur === 'user' ? 'selected' : ''}>👤 User (Take quizzes & view personal results)</option>
          <option value="leader" ${cur === 'leader' ? 'selected' : ''}>⭐ Leader (Create schedules, assign tests & view results)</option>
          <option value="assistant" ${cur === 'assistant' ? 'selected' : ''}>📋 Assistant (View dashboard & all assessment results)</option>
          <option value="admin" ${cur === 'admin' ? 'selected' : ''}>👑 Admin (Manage quizzes, schedules, results & users)</option>
          <option value="admin_app" ${cur === 'admin_app' ? 'selected' : ''}>🛡️ AdminApp (Full System Administrator)</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Accounts.submitChangeRole('${userId}')">💾 Save Changes</button>
    `;

    App.openModal('🎖️ Change User Role', bodyHtml, footerHtml);
  }

  async function submitChangeRole(userId) {
    const select = document.getElementById('changeRoleSelect');
    if (!select) return;

    const newRole = select.value;
    const { error } = await supabase
      .from('Apex_Testing_users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('[Accounts] Error updating role:', error);
      alert('Error: ' + error.message);
      return;
    }

    alert('User role updated successfully!');
    App.closeModal();
    await render();
  }

  // ---- Modal: Reset Password ----
  function showResetModal(userId, userName, userEmail) {
    const bodyHtml = `
      <p style="margin-bottom: 12px; color: var(--text-secondary);">
        Issue new password for: <strong>${App.escapeHtml(userName)}</strong> (<code>${App.escapeHtml(userEmail)}</code>).
      </p>
      <div class="form-group">
        <label class="form-label">New Password *</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" class="form-input" id="resetPassInput" placeholder="Enter new password...">
          <button type="button" class="btn btn-secondary btn-sm" onclick="Accounts.generateRandomPassToInput('resetPassInput')">🎲 Random</button>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
          The new password will be encrypted using SHA-256 standard.
        </p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="Accounts.submitResetPassword('${userId}', '${App.escapeHtml(userEmail)}')">🔑 Confirm Reset</button>
    `;

    App.openModal('🔑 Reset User Password', bodyHtml, footerHtml);
    generateRandomPassToInput('resetPassInput');
  }

  async function submitResetPassword(userId, userEmail) {
    const passInput = document.getElementById('resetPassInput');
    const newPass = passInput ? passInput.value.trim() : '';

    if (!newPass) {
      alert('Please enter or generate a new password!');
      return;
    }

    const hashed = await App.hashPassword(newPass);

    const { error } = await supabase
      .from('Apex_Testing_users')
      .update({ password: hashed })
      .eq('id', userId);

    if (error) {
      console.error('[Accounts] Error resetting password:', error);
      alert('Error resetting password: ' + error.message);
      return;
    }

    alert(`Password reset successfully!\n\nAccount: ${userEmail}\nNew Password: ${newPass}\n\n(Please provide this password to the employee).`);
    App.closeModal();
    await render();
  }

  // ---- Delete Account ----
  async function deleteAccount(userId, userName, userEmail) {
    const confirm = window.confirm(`Are you sure you want to delete the account for:\n\n${userName} (${userEmail})?\n\nThis action cannot be undone!`);
    if (!confirm) return;

    const { error } = await supabase
      .from('Apex_Testing_users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('[Accounts] Error deleting account:', error);
      alert('Error deleting account: ' + error.message);
      return;
    }

    alert('Account deleted successfully!');
    await render();
  }

  // ---- Helper: Generate Random Password ----
  function generateRandomPassToInput(inputId) {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#$%&*!';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const input = document.getElementById(inputId);
    if (input) input.value = pass;
  }

  // Public API
  return {
    render,
    showCreateAccountModal,
    submitCreateAccount,
    showRoleModal,
    submitChangeRole,
    showResetModal,
    submitResetPassword,
    deleteAccount,
    generateRandomPassToInput
  };
})();
