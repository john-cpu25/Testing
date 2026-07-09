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

    // If no quizzes at all, create both sample and Rincovitch quiz
    if (quizzes.length === 0) {
      const sampleQuiz = _createSampleQuiz();
      const rincovitchQuiz = _createRincovitchQuiz();
      saveQuizzes([sampleQuiz, rincovitchQuiz]);
      return;
    }

    // If quizzes exist but Rincovitch quiz is missing, inject it
    const hasRincovitch = quizzes.some(q => q.title === 'Nội Quy Lao Động - Công Ty Rincovitch');
    if (!hasRincovitch) {
      const rincovitchQuiz = _createRincovitchQuiz();
      quizzes.push(rincovitchQuiz);
      saveQuizzes(quizzes);
    }
  }

  function _createSampleQuiz() {
    return {
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
  }

  function _createRincovitchQuiz() {
    return {
      id: generateId(),
      title: 'Nội Quy Lao Động - Công Ty Rincovitch',
      description: 'Bài test về nội quy lao động của Công ty Rincovitch bao gồm các quy định về thời gian làm việc, hiệu suất, tài sản, chế độ nghỉ phép, phúc lợi và kỷ luật lao động.',
      timeLimit: 30,
      questions: [
        {
          id: generateId(),
          text: 'Nội quy lao động của Công ty Rincovitch áp dụng đối với đối tượng nào?',
          options: [
            'Tất cả người lao động, bao gồm cả người đang trong thời gian thử việc.',
            'Người lao động đã làm việc tại công ty trên 01 năm.',
            'Chỉ dành cho khối kỹ sư và thiết kế (Engineers/Drafters).',
            'Chỉ dành cho nhân viên chính thức có hợp đồng không xác định thời hạn.'
          ],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Thời gian làm việc tiêu chuẩn trong một tuần của nhân viên là bao nhiêu giờ?',
          options: [
            '48 giờ/tuần.',
            '35 giờ/tuần.',
            '44 giờ/tuần.',
            '40 giờ/tuần.'
          ],
          correctIndex: 3
        },
        {
          id: generateId(),
          text: 'Thời hạn cuối cùng để cập nhật Timesheet lên hệ thống Total Energy hàng tuần là khi nào?',
          options: [
            'Trước 08:30 Thứ Hai tuần kế tiếp.',
            'Trước 13:30 Thứ Sáu hàng tuần.',
            'Trước 17:30 Thứ Sáu hàng tuần.',
            'Bất cứ lúc nào trong ngày Thứ Bảy.'
          ],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Mục tiêu hiệu suất tối thiểu đối với nhân sự thuộc bộ phận Engineers và Drafters là bao nhiêu?',
          options: [
            '100% hiệu suất.',
            '85% hiệu suất.',
            '50% hiệu suất.',
            '75% hiệu suất.'
          ],
          correctIndex: 1
        },
        {
          id: generateId(),
          text: 'Tại sao mục tiêu hiệu suất của Senior Structural Engineer lại thấp hơn so với Engineers thông thường?',
          options: [
            'Do họ phải phụ trách kiểm tra chất lượng và hỗ trợ đào tạo kỹ thuật.',
            'Vì họ có quyền nghỉ ngơi nhiều hơn trong giờ làm việc.',
            'Do khối lượng dự án của cấp Senior luôn ít hơn cấp Junior.',
            'Vì họ được phép làm việc ít giờ hơn trong tuần.'
          ],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Trường hợp nhân viên có hiệu suất dưới mức quy định trong 02 tuần liên tiếp, hình thức xử lý đầu tiên là gì?',
          options: [
            'Chuyển sang bộ phận khác làm việc.',
            'Trừ lương tháng đó.',
            'Nhắc nhở và yêu cầu lập kế hoạch cải thiện.',
            'Sa thải ngay lập tức mà không báo trước.'
          ],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Ai là người có thẩm quyền phê duyệt việc mang tài sản của Công ty ra ngoài?',
          options: [
            'Thư ký hoặc Trợ lý văn phòng.',
            'Mr. Vu Do - Engineer Team Leader.',
            'Nhân viên tự quyết định nếu phục vụ công việc tại nhà.',
            'Bất kỳ nhân sự cấp Senior nào.'
          ],
          correctIndex: 1
        },
        {
          id: generateId(),
          text: 'Hành vi nào sau đây bị nghiêm cấm tuyệt đối liên quan đến tài khoản Công ty?',
          options: [
            'Sử dụng tài khoản để trao đổi chuyên môn với đồng nghiệp.',
            'Thay đổi mật khẩu định kỳ 3 tháng một lần.',
            'Đăng nhập tài khoản vào thiết bị không thuộc Công ty quản lý.',
            'Đăng nhập tài khoản trên nhiều trình duyệt khác nhau.'
          ],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Hình thức kỷ luật nào có thể áp dụng ngay lập tức khi phát hiện nhân viên sử dụng phần mềm crack cho công việc của Công ty?',
          options: [
            'Khiển trách bằng miệng.',
            'Kỷ luật sa thải và chấm dứt hợp đồng lao động ngay lập tức.',
            'Tạm đình chỉ công tác 01 tuần để kiểm điểm.',
            'Yêu cầu nhân viên tự mua bản quyền bằng tiền cá nhân và tiếp tục làm việc.'
          ],
          correctIndex: 1
        },
        {
          id: generateId(),
          text: 'Theo quy định về khu vực cây xanh, nhân viên không được làm điều gì?',
          options: [
            'Ngồi làm việc gần khu vực có nhiều cây xanh.',
            'Tưới thêm nước sạch cho cây vào mỗi buổi sáng.',
            'Chụp ảnh khu vực cây xanh để đăng mạng xã hội.',
            'Tự ý di chuyển vị trí hoặc đổ nước thừa, rác vào chậu cây.'
          ],
          correctIndex: 3
        },
        {
          id: generateId(),
          text: 'Nhân viên nên làm gì khi phát hiện tủ thuốc y tế bị thiếu thuốc hoặc vật tư?',
          options: [
            'Báo ngay cho thư ký hoặc trợ lý để xử lý.',
            'Lấy thuốc từ tủ cá nhân thay thế vào tủ chung.',
            'Chờ đến kỳ kiểm kê tài sản hàng năm mới thông báo.',
            'Tự bỏ tiền túi mua bổ sung để đồng nghiệp sử dụng.'
          ],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Quy định nào sau đây là đúng khi sử dụng lò vi sóng tại khu vực bếp?',
          options: [
            'Có thể để lò hoạt động và đi ra ngoài làm việc khác.',
            'Cho phép sử dụng các hộp nhựa dùng một lần không chịu nhiệt.',
            'Có thể hâm nóng trứng nguyên vỏ nếu để công suất thấp.',
            'Không để vật dụng kim loại, giấy bạc vào lò vi sóng.'
          ],
          correctIndex: 3
        },
        {
          id: generateId(),
          text: 'Loại thực phẩm nào sau đây được khuyến cáo hạn chế mang vào văn phòng để kiểm soát mùi?',
          options: [
            'Sầu riêng, mắm tôm, cá khô.',
            'Cơm trắng và thịt kho thông thường.',
            'Bánh mì, sữa tươi.',
            'Trái cây tươi như táo, cam.'
          ],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Nhân viên có thời gian làm việc chính thức bao lâu thì bắt đầu được tính hưởng lương tháng 13 (theo tỷ lệ)?',
          options: [
            'Sau 06 tháng làm việc.',
            'Sau khi làm việc chính thức trên 30 ngày.',
            'Phải đủ 365 ngày làm việc chính thức.',
            'Ngay từ ngày đầu tiên thử việc.'
          ],
          correctIndex: 1
        },
        {
          id: generateId(),
          text: 'Công thức tính lương tháng 13 cho nhân viên làm việc chưa đủ 365 ngày là gì?',
          options: [
            'Lương tháng 13 = Lương tháng × 0.5.',
            'Lương tháng 13 = (Số ngày làm việc chính thức / 365) × Lương tháng.',
            'Lương tháng 13 = (Số tháng làm việc / 12) × Lương cơ bản.',
            'Lương tháng 13 = Tổng thu nhập năm / 12.'
          ],
          correctIndex: 1
        },
        {
          id: generateId(),
          text: 'Ngày lễ nào sau đây nhân viên được nghỉ hưởng nguyên lương theo quy định riêng của công ty (khác với quy định chung của Nhà nước)?',
          options: [
            'Ngày thành lập công ty.',
            'Ngày sinh nhật sếp.',
            'Ngày Lễ Giáng sinh (25/12).',
            'Ngày Quốc tế Phụ nữ (08/03).'
          ],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Nhân viên có đủ 12 tháng làm việc tại công ty sẽ có bao nhiêu ngày phép năm?',
          options: [
            '20 ngày.',
            '14 ngày.',
            '12 ngày.',
            '15 ngày.'
          ],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Quy định về việc cộng dồn ngày phép năm tại Rincovitch như thế nào?',
          options: [
            'Chỉ được cộng dồn tối đa 05 ngày mỗi năm.',
            'Phép năm không được cộng dồn, sẽ mất nếu không sử dụng hết trong năm.',
            'Chỉ được cộng dồn nếu có sự đồng ý bằng văn bản của Giám đốc.',
            'Được cộng dồn ngày phép chưa sử dụng sang năm kế tiếp.'
          ],
          correctIndex: 3
        },
        {
          id: generateId(),
          text: 'Khi muốn nghỉ phép từ 03 ngày trở lên, nhân viên phải báo trước bao lâu?',
          options: [
            'Trước 01 tuần.',
            'Trước ít nhất 01 tháng.',
            'Trước 02 tuần.',
            'Trước 03 ngày làm việc.'
          ],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Lao động nữ sinh đôi được nghỉ thai sản tổng cộng bao nhiêu tháng?',
          options: [
            '06 tháng.',
            '08 tháng.',
            '12 tháng.',
            '07 tháng.'
          ],
          correctIndex: 3
        },
        {
          id: generateId(),
          text: 'Trong trường hợp sinh thường, lao động nam được nghỉ hưởng chế độ thai sản bao nhiêu ngày?',
          options: [
            '07 ngày làm việc.',
            '10 ngày làm việc.',
            '03 ngày làm việc.',
            '05 ngày làm việc.'
          ],
          correctIndex: 3
        },
        {
          id: generateId(),
          text: 'Nhân viên được nghỉ bao nhiêu ngày hưởng đủ lương khi bản thân kết hôn?',
          options: [
            '03 ngày.',
            '01 ngày.',
            '02 ngày.',
            '05 ngày.'
          ],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Khi muốn ra ngoài vì mục đích cá nhân trong giờ làm việc, nhân viên cần làm gì?',
          options: [
            'Tự đi và sẽ làm bù thời gian đó vào cuối ngày.',
            'Nhờ đồng nghiệp ngồi cạnh báo lại với quản lý nếu có ai hỏi.',
            'Phải được sự chấp thuận trước của Engineer Team Leader.',
            'Chỉ cần ghi chú lại vào Timesheet cuối tuần là được.'
          ],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Hình thức thông báo nào là bắt buộc khi nhân viên đến trễ hoặc vắng mặt đột xuất do bệnh?',
          options: [
            'Chờ đến khi khỏe lại rồi mới đến công ty giải thích lý do.',
            'Gửi email cho bộ phận kế toán.',
            'Gửi tin nhắn qua mạng xã hội cho bất kỳ đồng nghiệp nào.',
            'Thông báo ngay cho Engineer Team Leader qua điện thoại.'
          ],
          correctIndex: 3
        },
        {
          id: generateId(),
          text: 'Công ty có quyền chấm dứt hợp đồng lao động ngay lập tức mà không cần báo trước 30-45 ngày trong trường hợp nào?',
          options: [
            'Khi nhân viên không cải thiện sau cảnh cáo chính thức lần 1.',
            'Khi nhân viên đi trễ quá 03 lần trong một tháng.',
            'Khi nhân viên từ chối làm thêm giờ vào ngày nghỉ tuần.',
            'Khi nhân viên có ý kiến bất đồng với quản lý trong cuộc họp.'
          ],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Ai chịu trách nhiệm quản lý nhân sự bên dưới và phân công công việc trực tiếp cho các Senior Structural Engineer?',
          options: [
            'Giám đốc tài chính.',
            'BIM Manager.',
            'Engineer Team Leader.',
            'Thư ký dự án.'
          ],
          correctIndex: 2
        },
        {
          id: generateId(),
          text: 'Việc dán nhãn thực phẩm trong tủ lạnh chung có mục đích gì?',
          options: [
            'Tránh nhầm lẫn hoặc bị vứt bỏ nhầm khi dọn tủ lạnh cuối tuần.',
            'Để khoe các món ăn ngon với đồng nghiệp.',
            'Theo quy định bắt buộc của Bộ Y tế về an toàn thực phẩm văn phòng.',
            'Để tính phí lưu trữ thực phẩm hàng tháng.'
          ],
          correctIndex: 0
        },
        {
          id: generateId(),
          text: 'Nhân viên nữ trở lại làm việc trước khi hết thời gian nghỉ thai sản cần báo trước bao nhiêu ngày?',
          options: [
            'Báo trước ít nhất 07 ngày.',
            'Báo trước ít nhất 15 ngày.',
            'Báo trước ít nhất 03 ngày.',
            'Không cần báo trước nếu đã hết 04 tháng nghỉ thai sản.'
          ],
          correctIndex: 1
        },
        {
          id: generateId(),
          text: 'Căn cứ nào sau đây KHÔNG phải là cơ sở chính để xem xét mức lương hàng năm?',
          options: [
            'Kết quả hoạt động của công ty.',
            'Số lượng con cái của nhân viên.',
            'Các yếu tố thị trường lao động.',
            'Hiệu quả công việc tổng thể của nhân viên.'
          ],
          correctIndex: 1
        }
      ],
      createdAt: new Date().toISOString()
    };
  }



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
