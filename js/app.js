/* ============================================
   App.js - Core Application Logic
   Auth, Router, utilities, dashboard
   ============================================ */

const App = (() => {
  // ---- Utilities ----
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ---- Data Access ----
  function getQuizzes() {
    return JSON.parse(localStorage.getItem('quizmaster_quizzes') || '[]');
  }

  function saveQuizzes(quizzes) {
    localStorage.setItem('quizmaster_quizzes', JSON.stringify(quizzes));
  }

  function getResults() {
    return JSON.parse(localStorage.getItem('quizmaster_results') || '[]');
  }

  function saveResults(results) {
    localStorage.setItem('quizmaster_results', JSON.stringify(results));
  }

  // ============================================
  // AUTH SYSTEM
  // ============================================
  function getAccounts() {
    return JSON.parse(localStorage.getItem('quizmaster_accounts') || '[]');
  }

  function saveAccounts(accounts) {
    localStorage.setItem('quizmaster_accounts', JSON.stringify(accounts));
  }

  function initDefaultAccounts() {
    const accounts = getAccounts();
    if (accounts.length > 0) return;

    const defaultAccounts = [
      {
        id: generateId(),
        username: 'admin',
        password: 'admin123',
        displayName: 'Admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        username: 'user',
        password: 'user123',
        displayName: 'User',
        role: 'user',
        createdAt: new Date().toISOString()
      }
    ];

    saveAccounts(defaultAccounts);
  }

  function getCurrentUser() {
    const session = sessionStorage.getItem('quizmaster_session');
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return getCurrentUser() !== null;
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
  }

  function login(username, password) {
    const accounts = getAccounts();
    const account = accounts.find(a =>
      a.username === username && a.password === password
    );

    if (!account) return false;

    const session = {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      role: account.role
    };

    sessionStorage.setItem('quizmaster_session', JSON.stringify(session));
    return true;
  }

  function logout() {
    sessionStorage.removeItem('quizmaster_session');
    showLoginPage();
  }

  function fillLogin(username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    document.getElementById('loginUsername').focus();
  }

  function showLoginPage() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('appLayout').classList.add('hidden');
    document.getElementById('loginError').classList.remove('show');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';

    setTimeout(() => {
      document.getElementById('loginUsername').focus();
    }, 100);
  }

  function showApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');
    updateUIForRole();
    renderDashboard();
  }

  function updateUIForRole() {
    const user = getCurrentUser();
    if (!user) return;

    // Render user profile in sidebar
    const profileEl = document.getElementById('userProfile');
    const avatarClass = user.role === 'admin' ? 'admin-avatar' : 'user-avatar-style';
    const badgeClass = user.role === 'admin' ? 'role-admin' : 'role-user';
    const roleName = user.role === 'admin' ? '👑 Admin' : '👤 User';
    const initial = user.displayName.charAt(0).toUpperCase();

    profileEl.innerHTML = `
      <div class="user-avatar ${avatarClass}">${initial}</div>
      <div class="user-info">
        <div class="user-name">${escapeHtml(user.displayName)}</div>
        <div class="user-role-badge ${badgeClass}">${roleName}</div>
      </div>
      <button class="btn-logout" onclick="App.logout()" title="Đăng xuất">🚪</button>
    `;

    // Show/hide admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = user.role === 'admin' ? '' : 'none';
    });
  }

  function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
      document.getElementById('loginError').textContent = '❌ Vui lòng nhập đầy đủ thông tin!';
      document.getElementById('loginError').classList.add('show');
      return;
    }

    const success = login(username, password);

    if (success) {
      showApp();
    } else {
      document.getElementById('loginError').textContent = '❌ Sai tên đăng nhập hoặc mật khẩu!';
      document.getElementById('loginError').classList.add('show');
      document.getElementById('loginPassword').value = '';
      document.getElementById('loginPassword').focus();
    }
  }

  // ---- Navigation / Router ----
  let currentView = 'dashboard';

  function navigate(view) {
    // Block admin views for regular users
    if (view === 'admin' && !isAdmin()) {
      navigate('quiz');
      return;
    }

    currentView = view;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
    });
    const viewEl = document.getElementById(view + 'View');
    if (viewEl) viewEl.classList.add('active');

    // Close mobile menu
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('active');

    // Render view content
    switch (view) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'admin':
        if (typeof Admin !== 'undefined') Admin.render();
        break;
      case 'quiz':
        if (typeof Quiz !== 'undefined') Quiz.renderSelection();
        break;
      case 'results':
        if (typeof Results !== 'undefined') Results.render();
        break;
    }
  }

  // ---- Dashboard ----
  function renderDashboard() {
    const quizzes = getQuizzes();
    const user = getCurrentUser();
    let results = getResults();

    // User only sees their own results on dashboard
    if (user && user.role !== 'admin') {
      results = results.filter(r => r.userName === user.displayName);
    }

    const totalQuizzes = quizzes.length;
    const totalResults = results.length;
    const totalQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0);
    const avgScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
      : 0;

    // Stats grid
    document.getElementById('dashboardStats').innerHTML = `
      <div class="stat-card purple">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${totalQuizzes}</div>
        <div class="stat-label">Bài Quiz</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon">❓</div>
        <div class="stat-value">${totalQuestions}</div>
        <div class="stat-label">Câu Hỏi</div>
      </div>
      <div class="stat-card pink">
        <div class="stat-icon">📝</div>
        <div class="stat-value">${totalResults}</div>
        <div class="stat-label">${user && user.role !== 'admin' ? 'Lượt Làm Của Bạn' : 'Lượt Làm Bài'}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">📈</div>
        <div class="stat-value">${avgScore}%</div>
        <div class="stat-label">${user && user.role !== 'admin' ? 'Điểm TB Của Bạn' : 'Điểm TB'}</div>
      </div>
    `;

    // Recent quizzes
    const recentQuizzes = [...quizzes].sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, 5);

    if (recentQuizzes.length === 0) {
      document.getElementById('recentQuizzes').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Chưa có quiz nào</div>
          <div class="empty-state-text">${isAdmin() ? 'Hãy tạo quiz đầu tiên để bắt đầu!' : 'Admin chưa tạo quiz nào.'}</div>
          ${isAdmin() ? '<button class="btn btn-primary" onclick="App.navigate(\'admin\')">✨ Tạo Quiz Mới</button>' : ''}
        </div>
      `;
    } else {
      document.getElementById('recentQuizzes').innerHTML = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Tên Quiz</th>
                <th>Số câu hỏi</th>
                <th>Thời gian</th>
                <th>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${recentQuizzes.map(q => `
                <tr>
                  <td style="font-weight:600; color: var(--text-primary);">${escapeHtml(q.title)}</td>
                  <td><span class="badge badge-purple">${q.questions.length} câu</span></td>
                  <td><span class="badge badge-cyan">${q.timeLimit} phút</span></td>
                  <td>${formatDate(q.createdAt)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="App.navigate('quiz'); setTimeout(() => Quiz.startEntry('${q.id}'), 100);">
                      Làm bài →
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Recent results
    const recentResults = [...results].sort((a, b) =>
      new Date(b.completedAt) - new Date(a.completedAt)
    ).slice(0, 10);

    if (recentResults.length === 0) {
      document.getElementById('recentResults').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-title">Chưa có kết quả nào</div>
          <div class="empty-state-text">${user && user.role !== 'admin' ? 'Bạn chưa làm bài test nào.' : 'Kết quả sẽ hiển thị sau khi có người hoàn thành bài test.'}</div>
        </div>
      `;
    } else {
      document.getElementById('recentResults').innerHTML = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Người làm</th>
                <th>Bài test</th>
                <th>Điểm</th>
                <th>Thời gian</th>
                <th>Ngày</th>
              </tr>
            </thead>
            <tbody>
              ${recentResults.map(r => {
                const scoreClass = r.percentage >= 80 ? 'green' : r.percentage >= 60 ? 'cyan' : r.percentage >= 40 ? 'yellow' : 'red';
                return `
                <tr>
                  <td style="font-weight:600; color: var(--text-primary);">${escapeHtml(r.userName)}</td>
                  <td>${escapeHtml(r.quizTitle)}</td>
                  <td>
                    <span class="badge badge-${scoreClass}">${r.score}/${r.totalQuestions} (${r.percentage}%)</span>
                  </td>
                  <td>${formatTime(r.timeTaken)}</td>
                  <td>${formatDate(r.completedAt)}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // ---- HTML Escape ----
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---- Modal ----
  function openModal(title, bodyHtml, footerHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalFooter').innerHTML = footerHtml || '';
    document.getElementById('modalOverlay').classList.add('active');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
  }

  // ---- Confetti ----
  function launchConfetti() {
    const container = document.getElementById('confettiContainer');
    container.innerHTML = '';
    const colors = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

    for (let i = 0; i < 80; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = (Math.random() * 8 + 5) + 'px';
      confetti.style.height = (Math.random() * 8 + 5) + 'px';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      confetti.style.animationDelay = (Math.random() * 1.5) + 's';
      container.appendChild(confetti);
    }

    setTimeout(() => { container.innerHTML = ''; }, 5000);
  }

  // ---- Sample Data ----
  function initSampleData() {
    const quizzes = getQuizzes();
    if (quizzes.length > 0) return;

    const sampleQuiz = {
      id: generateId(),
      title: 'Kiến Thức Tổng Hợp',
      description: 'Bài test kiến thức tổng hợp gồm các câu hỏi đa dạng về nhiều lĩnh vực khác nhau.',
      timeLimit: 10,
      questions: [
        {
          id: generateId(),
          text: 'Thủ đô của Việt Nam là gì?',
          options: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế'],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Sông nào dài nhất Việt Nam?',
          options: ['Sông Hồng', 'Sông Đồng Nai', 'Sông Mê Kông', 'Sông Đà'],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: '1 + 1 = ?',
          options: ['1', '2', '3', '11'],
          correctIndex: 1
        },
        {
          id: generateId(),
          text: 'Nguyên tố hóa học nào có ký hiệu là "O"?',
          options: ['Vàng', 'Bạc', 'Oxy', 'Osmium'],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Trái Đất cách Mặt Trời khoảng bao nhiêu km?',
          options: ['50 triệu km', '100 triệu km', '150 triệu km', '200 triệu km'],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Ai là người phát minh ra bóng đèn điện?',
          options: ['Nikola Tesla', 'Thomas Edison', 'Albert Einstein', 'Isaac Newton'],
          correctIndex: 1
        },
        {
          id: generateId(),
          text: 'Loại khí nào chiếm tỷ lệ cao nhất trong khí quyển Trái Đất?',
          options: ['Oxy', 'Carbon dioxide', 'Nitơ', 'Hydro'],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Đơn vị đo lường nào dùng để đo cường độ dòng điện?',
          options: ['Volt', 'Watt', 'Ohm', 'Ampe'],
          correctIndex: 3
        }
      ],
      createdAt: new Date().toISOString()
    };

    saveQuizzes([sampleQuiz]);
  }

  // ---- Initialization ----
  function init() {
    initDefaultAccounts();
    initSampleData();

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
      });
    }

    // Navigation click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        navigate(item.dataset.view);
      });
    });

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
        mobileOverlay.classList.toggle('active');
      });
    }

    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        mobileOverlay.classList.remove('active');
      });
    }

    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Check session: auto-login if session exists
    if (isLoggedIn()) {
      showApp();
    } else {
      showLoginPage();
    }
  }

  // Start app when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  // Public API
  return {
    generateId,
    formatDate,
    formatTime,
    shuffleArray,
    escapeHtml,
    getQuizzes,
    saveQuizzes,
    getResults,
    saveResults,
    navigate,
    openModal,
    closeModal,
    launchConfetti,
    renderDashboard,
    // Auth
    getCurrentUser,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    fillLogin,
    handleLogin,
    get currentView() { return currentView; }
  };
})();
