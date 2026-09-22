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
        .from('Testing_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Accounts] Lỗi tải danh sách người dùng:', error);
        return [];
      }

      // Sort: Admin on top, then by display_name
      allUsers = (data || []).sort((a, b) => {
        const aAdmin = (a.role || '').toLowerCase() === 'admin' ? 1 : 0;
        const bAdmin = (b.role || '').toLowerCase() === 'admin' ? 1 : 0;
        if (aAdmin !== bAdmin) return bAdmin - aAdmin;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

      return allUsers;
    } catch (err) {
      console.error('[Accounts] Exception khi tải users:', err);
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
        <div>Đang tải danh sách tài khoản...</div>
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
          <div class="empty-state-title">Không tìm thấy tài khoản nào</div>
          <div class="empty-state-text">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</div>
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
              <th>Người Dùng</th>
              <th>Vai Trò</th>
              <th>Bảo Mật Mật Khẩu</th>
              <th>Ngày Tạo</th>
              <th style="text-align: right;">Thao Tác</th>
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
    const isAdminRole = (u.role || '').toLowerCase() === 'admin';
    const isSelf = currentUser && (currentUser.id === u.id || currentUser.username === u.email);
    const initial = (u.display_name || 'U').charAt(0).toUpperCase();

    // Check if password is SHA-256 (64 hex characters)
    const isHashed = u.password && u.password.length === 64 && /^[0-9a-f]+$/i.test(u.password);

    return `
      <tr>
        <td>
          <div class="user-display-cell">
            <div class="user-avatar-sm ${isAdminRole ? 'avatar-admin-color' : 'avatar-user-color'}">
              ${initial}
            </div>
            <div class="user-cell-meta">
              <div class="user-cell-name">
                ${App.escapeHtml(u.display_name || 'Chưa đặt tên')}
                ${isSelf ? '<span style="font-size: 11px; color: var(--accent-cyan); font-weight: normal; margin-left: 6px;">(Bạn)</span>' : ''}
              </div>
              <div class="user-cell-email">${App.escapeHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${isAdminRole ? 'badge-role-admin' : 'badge-role-user'}">
            ${isAdminRole ? '👑 Admin' : '👤 Nhân viên'}
          </span>
        </td>
        <td>
          ${isHashed
            ? '<span class="pw-status-secure" title="Mật khẩu đã được mã hóa bằng chuẩn SHA-256 an toàn">🛡️ SHA-256 An toàn</span>'
            : '<span class="pw-status-plain" title="Mật khẩu đang dạng nguyên bản. Hệ thống sẽ tự động băm SHA-256 khi người dùng đăng nhập">⚡ Tự băm khi Login</span>'
          }
        </td>
        <td style="color: var(--text-muted); font-size: 12px;">
          ${App.formatDate(u.created_at)}
        </td>
        <td style="text-align: right;">
          <div class="btn-group" style="justify-content: flex-end;">
            <button class="btn btn-ghost btn-sm" onclick="Accounts.showRoleModal('${u.id}', '${App.escapeHtml(u.display_name)}', '${u.role}')" title="Phân quyền Admin / User">
              🎖️ Đổi quyền
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Accounts.showResetModal('${u.id}', '${App.escapeHtml(u.display_name)}', '${u.email}')" title="Cấp lại mật khẩu mới cho tài khoản">
              🔑 Reset Pass
            </button>
            ${!isSelf ? `
              <button class="btn btn-ghost btn-sm text-red" onclick="Accounts.deleteAccount('${u.id}', '${App.escapeHtml(u.display_name)}', '${u.email}')" title="Xóa tài khoản">
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
        <label class="form-label">Họ và Tên *</label>
        <input type="text" class="form-input" id="newAccName" placeholder="VD: Nguyễn Văn A..." autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Email Công Ty (@apexscengineering.com) *</label>
        <input type="email" class="form-input" id="newAccEmail" placeholder="VD: a.nguyen@apexscengineering.com...">
      </div>
      <div class="form-group">
        <label class="form-label">Mật Khẩu Khởi Tạo *</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" class="form-input" id="newAccPass" placeholder="Nhập hoặc tạo ngẫu nhiên...">
          <button type="button" class="btn btn-secondary btn-sm" onclick="Accounts.generateRandomPassToInput('newAccPass')">🎲 Tạo ngẫu nhiên</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Vai Trò Hệ Thống</label>
        <select class="form-select" id="newAccRole">
          <option value="user" selected>👤 Nhân viên (Làm bài kiểm tra)</option>
          <option value="admin">👑 Admin (Quản trị toàn quyền)</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="Accounts.submitCreateAccount()">💾 Tạo Tài Khoản</button>
    `;

    App.openModal('➕ Thêm Người Dùng Mới', bodyHtml, footerHtml);
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
      alert('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!');
      return;
    }

    if (!email.includes('@')) {
      alert('Email không hợp lệ!');
      return;
    }

    // Check duplicate
    const existing = allUsers.find(u => (u.email || '').toLowerCase() === email);
    if (existing) {
      alert(`Email "${email}" đã tồn tại trong hệ thống!`);
      return;
    }

    // Hash password with SHA-256
    const hashedPassword = await App.hashPassword(pass);

    const newId = App.generateId();
    const { error } = await supabase
      .from('Testing_users')
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
      console.error('[Accounts] Lỗi tạo tài khoản:', error);
      alert('Lỗi tạo tài khoản: ' + error.message);
      return;
    }

    alert(`Tạo tài khoản thành công!\n\nEmail: ${email}\nMật khẩu: ${pass}\n\n(Vui lòng gửi thông tin này cho nhân viên).`);
    App.closeModal();
    await render();
  }

  // ---- Modal: Edit Role ----
  function showRoleModal(userId, userName, currentRole) {
    const currentIsAdmin = (currentRole || '').toLowerCase() === 'admin';

    const bodyHtml = `
      <p style="margin-bottom: 16px; color: var(--text-secondary);">
        Phân quyền hệ thống cho tài khoản <strong>${App.escapeHtml(userName)}</strong>:
      </p>
      <div class="form-group">
        <label class="form-label">Chọn vai trò mới</label>
        <select class="form-select" id="changeRoleSelect">
          <option value="user" ${!currentIsAdmin ? 'selected' : ''}>👤 Nhân viên (Chỉ làm quiz và xem kết quả bản thân)</option>
          <option value="admin" ${currentIsAdmin ? 'selected' : ''}>👑 Admin (Quản trị quiz, lịch định kỳ, xem tất cả kết quả & tài khoản)</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="Accounts.submitChangeRole('${userId}')">💾 Lưu Thay Đổi</button>
    `;

    App.openModal('🎖️ Đổi Quyền Tài Khoản', bodyHtml, footerHtml);
  }

  async function submitChangeRole(userId) {
    const select = document.getElementById('changeRoleSelect');
    if (!select) return;

    const newRole = select.value;
    const { error } = await supabase
      .from('Testing_users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('[Accounts] Lỗi cập nhật role:', error);
      alert('Lỗi: ' + error.message);
      return;
    }

    alert('Cập nhật vai trò thành công!');
    App.closeModal();
    await render();
  }

  // ---- Modal: Reset Password ----
  function showResetModal(userId, userName, userEmail) {
    const bodyHtml = `
      <p style="margin-bottom: 12px; color: var(--text-secondary);">
        Cấp lại mật khẩu mới cho tài khoản: <strong>${App.escapeHtml(userName)}</strong> (<code>${App.escapeHtml(userEmail)}</code>).
      </p>
      <div class="form-group">
        <label class="form-label">Mật khẩu mới *</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" class="form-input" id="resetPassInput" placeholder="Nhập mật khẩu mới...">
          <button type="button" class="btn btn-secondary btn-sm" onclick="Accounts.generateRandomPassToInput('resetPassInput')">🎲 Random</button>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
          Mật khẩu mới sẽ tự động được mã hóa bảo mật chuẩn SHA-256.
        </p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-danger" onclick="Accounts.submitResetPassword('${userId}', '${App.escapeHtml(userEmail)}')">🔑 Xác Nhận Đặt Lại</button>
    `;

    App.openModal('🔑 Reset Mật Khẩu Nhân Viên', bodyHtml, footerHtml);
    generateRandomPassToInput('resetPassInput');
  }

  async function submitResetPassword(userId, userEmail) {
    const passInput = document.getElementById('resetPassInput');
    const newPass = passInput ? passInput.value.trim() : '';

    if (!newPass) {
      alert('Vui lòng nhập hoặc tạo mật khẩu mới!');
      return;
    }

    const hashed = await App.hashPassword(newPass);

    const { error } = await supabase
      .from('Testing_users')
      .update({ password: hashed })
      .eq('id', userId);

    if (error) {
      console.error('[Accounts] Lỗi reset mật khẩu:', error);
      alert('Lỗi cập nhật mật khẩu: ' + error.message);
      return;
    }

    alert(`Reset mật khẩu thành công!\n\nTài khoản: ${userEmail}\nMật khẩu mới: ${newPass}\n\n(Hãy gửi mật khẩu mới này cho nhân viên để đăng nhập).`);
    App.closeModal();
    await render();
  }

  // ---- Delete Account ----
  async function deleteAccount(userId, userName, userEmail) {
    const confirm = window.confirm(`Bạn có chắc chắn muốn xóa tài khoản của:\n\n${userName} (${userEmail})?\n\nHành động này không thể hoàn tác!`);
    if (!confirm) return;

    const { error } = await supabase
      .from('Testing_users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('[Accounts] Lỗi xóa tài khoản:', error);
      alert('Lỗi khi xóa tài khoản: ' + error.message);
      return;
    }

    alert('Đã xóa tài khoản thành công!');
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
