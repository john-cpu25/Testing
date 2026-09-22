/* ============================================
   App.js - Core Application Logic
   Auth, Router, utilities, dashboard
   ============================================ */

const App = (() => {
  // ---- Utilities ----
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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

  // ---- Supabase Initialization ----
  const supabaseUrl = 'https://ejyirnfxuezipogweybo.supabase.co';
  const supabaseKey = 'sb_publishable_r1DKG_nf_nyivQgbe6D7YA_zow13__G';
  const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

  // ---- Data Access ----
  async function getQuizzes() {
    if (!supabase) return [];
    const { data: quizzes, error } = await supabase
      .from('Testing_quizzes')
      .select(`*, Testing_questions (*)`)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching quizzes:', error);
      return [];
    }
    return quizzes.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      timeLimit: q.time_limit,
      createdAt: q.created_at,
      questions: (q.Testing_questions || []).map(question => ({
        id: question.id,
        quizId: question.quiz_id,
        text: question.text,
        options: question.options,
        correctIndex: question.correct_index,
        createdAt: question.created_at
      }))
    }));
  }

  async function saveQuiz(quiz) {
    if (!supabase) return;
    const { data: newQuiz, error: qErr } = await supabase
      .from('Testing_quizzes')
      .upsert({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        time_limit: quiz.timeLimit,
        created_at: quiz.createdAt || new Date().toISOString()
      })
      .select()
      .single();
    
    if (qErr) {
       console.error('Error saving quiz:', qErr);
       return;
    }

    if (quiz.questions && quiz.questions.length > 0) {
      await supabase.from('Testing_questions').delete().eq('quiz_id', quiz.id);
      const questionsToInsert = quiz.questions.map(q => ({
        id: q.id,
        quiz_id: quiz.id,
        text: q.text,
        options: q.options,
        correct_index: q.correctIndex
      }));
      await supabase.from('Testing_questions').insert(questionsToInsert);
    }
  }

  async function deleteQuiz(id) {
      if(!supabase) return;
      await supabase.from('Testing_quizzes').delete().eq('id', id);
  }

  async function getResults() {
    if (!supabase) return [];
    const { data: results, error } = await supabase
      .from('Testing_results')
      .select(`
        *,
        Testing_users ( display_name, email ),
        Testing_quizzes ( title )
      `)
      .order('submitted_at', { ascending: false });
    if (error) {
      console.error('Error fetching results:', error);
      return [];
    }
    
    return results.map(r => ({
      id: r.id,
      quizId: r.quiz_id,
      userId: r.user_id,
      userName: r.Testing_users ? r.Testing_users.display_name : 'Unknown User',
      quizTitle: r.Testing_quizzes ? r.Testing_quizzes.title : 'Unknown Quiz',
      score: r.score,
      totalQuestions: r.total_questions,
      percentage: parseFloat(r.percentage),
      timeTaken: r.time_taken || 0,
      answers: r.answers,
      completedAt: r.submitted_at
    }));
  }

  async function saveResult(result) {
    if (!supabase) return;
    const { error } = await supabase
      .from('Testing_results')
      .insert([
        { 
          id: result.id,
          quiz_id: result.quizId,
          user_id: result.userId, 
          score: result.score,
          total_questions: result.totalQuestions,
          percentage: result.percentage,
          answers: result.answers,
          time_taken: result.timeTaken,
          submitted_at: result.completedAt || new Date().toISOString()
        }
      ]);
    if (error) console.error('Error saving result:', error);
  }

  // ============================================
  // AUTH SYSTEM
  // ============================================
  async function getAccounts() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('Testing_users').select('*');
    if (error) {
       console.error('Error fetching accounts:', error);
       return [];
    }
    return data.map(u => ({
      id: u.id,
      username: u.email,
      displayName: u.display_name,
      role: u.role,
      password: u.password // We added password column to users table
    }));
  }

  async function initDefaultAccounts() {
    // We assume accounts are already created in Supabase users table via SQL script.
  }

  function getCurrentUser() {
    const session = sessionStorage.getItem('ApexTesting_session');
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

  // ---- Password Hashing (SHA-256) ----
  async function hashPassword(password) {
    if (!password) return '';
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function login(username, password) {
    if (!supabase) return { success: false, error: 'Chưa kết nối cơ sở dữ liệu' };
    const u = (username || '').trim().toLowerCase();
    const pwd = (password || '').trim();
    if (!u || !pwd) return { success: false, error: 'Vui lòng nhập đầy đủ thông tin' };

    let query = supabase
      .from('Testing_users')
      .select('*');

    if (u.includes('@')) {
      query = query.ilike('email', u);
    } else {
      query = query.or(`email.ilike.${u},email.ilike.${u}@%`);
    }

    const { data: users, error } = await query;

    if (error || !users || users.length === 0) {
      return { success: false, error: 'Tài khoản không tồn tại trong hệ thống' };
    }

    const account = users[0];
    const hashedInput = await hashPassword(pwd);

    // Kiểm tra mật khẩu: Hỗ trợ cả mật khẩu đã băm SHA-256 và mật khẩu plain-text cũ
    let isValid = false;
    let needsUpgrade = false;

    if (account.password === hashedInput) {
      isValid = true;
    } else if (account.password === pwd) {
      isValid = true;
      needsUpgrade = true; // Mật khẩu khớp dạng plain-text -> Cần tự động nâng cấp sang SHA-256
    }

    if (!isValid) {
      return { success: false, error: 'Sai mật khẩu. Vui lòng thử lại!' };
    }

    // Tự động nâng cấp mật khẩu sang SHA-256 trên Supabase nếu vẫn là plain-text
    if (needsUpgrade) {
      try {
        await supabase
          .from('Testing_users')
          .update({ password: hashedInput })
          .eq('id', account.id);
        console.log('[ApexTesting] Đã nâng cấp mật khẩu sang SHA-256 thành công cho:', account.email);
      } catch (e) {
        console.error('[ApexTesting] Lỗi nâng cấp mật khẩu:', e);
      }
    }

    const session = {
      id: account.id,
      username: account.email,
      displayName: account.display_name,
      role: (account.role || 'user').toLowerCase()
    };

    sessionStorage.setItem('ApexTesting_session', JSON.stringify(session));
    localStorage.setItem('ApexTesting_last_email', account.email);
    return { success: true };
  }

  function logout() {
    sessionStorage.removeItem('ApexTesting_session');
    showLoginPage();
  }

  function fillLogin(username, password) {
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');
    if (uInput) uInput.value = username;
    if (pInput) pInput.value = password;
    if (uInput) uInput.focus();
  }

  let toastTimer = null;
  function showLoginToast(msg) {
    const toast = document.getElementById('loginToast');
    const toastMsg = document.getElementById('loginToastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  function showLoginPage() {
    const loginPage = document.getElementById('loginPage');
    const appLayout = document.getElementById('appLayout');
    const toast = document.getElementById('loginToast');
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');

    if (loginPage) loginPage.classList.remove('hidden');
    if (appLayout) appLayout.classList.add('hidden');
    if (toast) toast.classList.remove('show');
    if (uInput) uInput.value = '';
    if (pInput) pInput.value = '';

    setTimeout(() => {
      if (uInput) uInput.focus();
    }, 150);
  }

  function showApp() {
    const loginPage = document.getElementById('loginPage');
    const appLayout = document.getElementById('appLayout');
    if (loginPage) loginPage.classList.add('hidden');
    if (appLayout) appLayout.classList.remove('hidden');
    updateUIForRole();
    renderDashboard();
  }

  function updateUIForRole() {
    const user = getCurrentUser();
    if (!user) return;

    // Render user profile in topbar (top-right corner)
    const profileEl = document.getElementById('userProfile');
    if (profileEl) {
      const avatarClass = user.role === 'admin' ? 'admin-avatar' : 'user-avatar-style';
      const badgeClass = user.role === 'admin' ? 'role-admin' : 'role-user';
      const roleName = user.role === 'admin' ? '👑 Admin' : '👤 User';
      const initial = (user.displayName || 'U').charAt(0).toUpperCase();

      profileEl.innerHTML = `
        <div class="user-avatar ${avatarClass}" title="${escapeHtml(user.displayName)}">${initial}</div>
        <div class="user-info">
          <div class="user-name">${escapeHtml(user.displayName)}</div>
          <div class="user-role-badge ${badgeClass}">${roleName}</div>
        </div>
        <div class="user-actions">
          <button class="btn-topbar-action" onclick="App.showChangePasswordModal()" title="Change Password" aria-label="Change Password">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
          </button>
          <button class="btn-topbar-action btn-logout-action" onclick="App.logout()" title="Logout" aria-label="Logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      `;
    }

    // Show/hide admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = user.role === 'admin' ? '' : 'none';
    });
  }

  // Preloader runner (Intro Video & Progress Sync)
  function runPreloader(callback) {
    const preloader = document.getElementById('preloaderScreen');
    const video = document.getElementById('preloaderVideo');
    const text = document.getElementById('preloaderLoadingText');
    const bar = document.getElementById('preloaderProgressBar');
    const skipBtn = document.getElementById('btnPreloaderSkip');

    if (!preloader) {
      if (callback) callback();
      return;
    }

    preloader.classList.remove('hidden');
    preloader.classList.remove('fade-out');

    let isCompleted = false;
    let currentProgress = 0;

    const setProgress = (p) => {
      currentProgress = Math.min(Math.max(p, 0), 100);
      if (text) text.textContent = `LOADING : ${Math.round(currentProgress)}%`;
      if (bar) bar.style.width = `${currentProgress}%`;
    };

    const finish = () => {
      if (isCompleted) return;
      isCompleted = true;
      setProgress(100);
      if (video) {
        try { video.pause(); } catch (e) {}
      }
      setTimeout(() => {
        preloader.classList.add('fade-out');
        setTimeout(() => {
          preloader.classList.add('hidden');
          preloader.classList.remove('fade-out');
          if (callback) callback();
        }, 450);
      }, 300);
    };

    // Skip Button Click
    if (skipBtn) {
      skipBtn.onclick = finish;
    }

    // Keyboard shortcut (Space / Esc)
    const handleKey = (e) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        window.removeEventListener('keydown', handleKey);
        finish();
      }
    };
    window.addEventListener('keydown', handleKey);

    // Video Event Listeners
    if (video) {
      try {
        video.currentTime = 0;
        video.ontimeupdate = () => {
          if (video.duration && video.duration > 0) {
            const pct = (video.currentTime / video.duration) * 100;
            setProgress(pct);
          }
        };
        video.onended = () => {
          window.removeEventListener('keydown', handleKey);
          finish();
        };

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('[Preloader] Video play error or blocked, activating fallback timer.', err);
          });
        }
      } catch (err) {
        console.warn('[Preloader] Error setting up video:', err);
      }
    }

    // Fallback simulation in case video doesn't run
    let simProgress = 0;
    const simInterval = setInterval(() => {
      if (isCompleted) {
        clearInterval(simInterval);
        return;
      }
      simProgress += Math.random() * 8 + 3;
      if (simProgress >= 100) {
        clearInterval(simInterval);
        window.removeEventListener('keydown', handleKey);
        finish();
      } else {
        if (currentProgress < simProgress) {
          setProgress(simProgress);
        }
      }
    }, 120);
  }

  async function handleLogin() {
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');
    const username = uInput ? uInput.value.trim() : '';
    const password = pInput ? pInput.value.trim() : '';

    const btn = document.getElementById('btnLogin');
    const btnText = document.getElementById('loginBtnText');
    const btnArrow = document.getElementById('loginBtnArrow');
    const btnSpinner = document.getElementById('loginBtnSpinner');

    if (!username || !password) {
      showLoginToast('Please enter both email and password!');
      return;
    }

    // Loading State
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'SIGNING IN...';
    if (btnArrow) btnArrow.classList.add('hidden');
    if (btnSpinner) btnSpinner.classList.remove('hidden');

    const result = await login(username, password);

    // Reset button state
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'SIGN IN';
    if (btnArrow) btnArrow.classList.remove('hidden');
    if (btnSpinner) btnSpinner.classList.add('hidden');

    if (result.success) {
      document.getElementById('loginPage').classList.add('hidden');
      runPreloader(() => {
        showApp();
      });
    } else {
      showLoginToast(result.error || 'Invalid email or password!');
      if (pInput) {
        pInput.value = '';
        pInput.focus();
      }
    }
  }

  // ---- Navigation / Router ----
  let currentView = 'dashboard';

  async function navigate(view) {
    // Block admin views for regular users
    if ((view === 'admin' || view === 'schedule' || view === 'accounts') && !isAdmin()) {
      await navigate('quiz');
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

    // Update Topbar page title (no subtitle)
    const viewMetadata = {
      dashboard: { title: 'Dashboard' },
      admin: { title: 'Quiz Management' },
      quiz: { title: 'Take Quiz' },
      results: { title: 'Results Overview' },
      schedule: { title: 'Recurring Schedules' },
      accounts: { title: 'Account Management' }
    };

    const meta = viewMetadata[view] || { title: 'Dashboard' };
    const titleEl = document.getElementById('topbarMainTitle');
    if (titleEl) titleEl.textContent = meta.title;

    // Close mobile menu
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('active');

    // Render view content
    switch (view) {
      case 'dashboard':
        await renderDashboard();
        break;
      case 'admin':
        if (typeof Admin !== 'undefined') await Admin.render();
        break;
      case 'quiz':
        if (typeof Quiz !== 'undefined') await Quiz.renderSelection();
        break;
      case 'results':
        if (typeof Results !== 'undefined') await Results.render();
        break;
      case 'schedule':
        if (typeof Schedule !== 'undefined') await Schedule.render();
        break;
      case 'accounts':
        if (typeof Accounts !== 'undefined') await Accounts.render();
        break;
    }
  }

  // ---- Dashboard ----
  async function renderDashboard() {
    const quizzes = await getQuizzes();
    const user = getCurrentUser();
    let results = await getResults();

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
    const avgTime = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.timeTaken || 0), 0) / results.length)
      : 0;

    // Stats grid
    document.getElementById('dashboardStats').innerHTML = `
      <div class="stat-card purple">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${totalQuizzes}</div>
        <div class="stat-label">Quizzes</div>
      </div>
      <div class="stat-card pink">
        <div class="stat-icon">📝</div>
        <div class="stat-value">${totalResults}</div>
        <div class="stat-label">${user && user.role !== 'admin' ? 'Your Submissions' : 'Total Submissions'}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">📈</div>
        <div class="stat-value">${avgScore}%</div>
        <div class="stat-label">${user && user.role !== 'admin' ? 'Your Avg Score' : 'Average Score'}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">${App.formatTime(avgTime)}</div>
        <div class="stat-label">${user && user.role !== 'admin' ? 'Your Avg Time' : 'Average Time'}</div>
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
          <div class="empty-state-title">No quizzes yet</div>
          <div class="empty-state-text">${isAdmin() ? 'Create your first quiz to get started!' : 'No quizzes have been created yet.'}</div>
          ${isAdmin() ? '<button class="btn btn-primary" onclick="App.navigate(\'admin\')">✨ Create New Quiz</button>' : ''}
        </div>
      `;
    } else {
      document.getElementById('recentQuizzes').innerHTML = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Quiz Title</th>
                <th>Questions</th>
                <th>Time Limit</th>
                <th>Created Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${recentQuizzes.map(q => `
                <tr>
                  <td style="font-weight:600; color: var(--text-primary);">${escapeHtml(q.title)}</td>
                  <td><span class="badge badge-purple">${q.questions.length} questions</span></td>
                  <td><span class="badge badge-cyan">${q.timeLimit} mins</span></td>
                  <td>${formatDate(q.createdAt)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="App.navigate('quiz'); setTimeout(() => Quiz.startEntry('${q.id}'), 100);">
                      Take Quiz →
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
          <div class="empty-state-title">No results yet</div>
          <div class="empty-state-text">${user && user.role !== 'admin' ? 'You have not taken any quizzes yet.' : 'Results will appear once users complete a quiz.'}</div>
        </div>
      `;
    } else {
      document.getElementById('recentResults').innerHTML = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Quiz</th>
                <th>Score</th>
                <th>Time Taken</th>
                <th>Date</th>
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

  // ---- Change Password ----
  function showChangePasswordModal() {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Current Password</label>
        <input type="password" class="form-input" id="oldPassword" placeholder="Enter current password...">
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input type="password" class="form-input" id="newPassword" placeholder="Enter new password...">
      </div>
      <div class="form-group">
        <label class="form-label">Confirm New Password</label>
        <input type="password" class="form-input" id="confirmPassword" placeholder="Re-enter new password...">
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App.submitChangePassword()">💾 Update Password</button>
    `;

    openModal('Change Password', bodyHtml, footerHtml);
  }

  async function submitChangePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all fields!');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match!');
      return;
    }

    const user = getCurrentUser();
    if (!user) return;

    if (!supabase) return;

    // Verify old password (supports SHA-256 hash and plain-text fallback)
    const { data: users, error: selectError } = await supabase
      .from('Testing_users')
      .select('id, password')
      .eq('email', user.username);

    if (selectError || !users || users.length === 0) {
      alert('Account not found!');
      return;
    }

    const hashedOld = await hashPassword(oldPassword);
    const currentDbPassword = users[0].password;

    if (currentDbPassword !== hashedOld && currentDbPassword !== oldPassword) {
      alert('Current password is incorrect!');
      return;
    }

    const hashedNew = await hashPassword(newPassword);

    // Update new password with SHA-256 hash
    const { error: updateError } = await supabase
      .from('Testing_users')
      .update({ password: hashedNew })
      .eq('email', user.username);

    if (updateError) {
      alert('Failed to update password!');
      console.error(updateError);
      return;
    }

    alert('Password updated successfully! Your account is now secured.');
    closeModal();
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
  async function initSampleData() {
    let quizzes = await getQuizzes();

    // Loại bỏ bài test mẫu "Kiến Thức Tổng Hợp" nếu có
    // quizzes = quizzes.filter(q => q.title !== 'Kiến Thức Tổng Hợp'); // Currently not implemented for Supabase to delete this way without an ID

    // Đảm bảo bài test Rincovitch luôn tồn tại
    const hasRincovitch = quizzes.some(q => q.title === 'Nội Quy Lao Động - Công Ty Rincovitch');
    if (!hasRincovitch) {
      const rincovitchQuiz = _createRincovitchQuiz();
      await saveQuiz(rincovitchQuiz);
    }
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



  async function init() {
    await initDefaultAccounts();
    await initSampleData();

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

    // Sidebar Collapse / Expand (YouTube style)
    const btnSidebarToggle = document.getElementById('btnSidebarToggle');
    const sidebarHeader = document.getElementById('sidebarHeader');
    const appLayout = document.getElementById('appLayout');

    const toggleSidebarCollapse = () => {
      if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('open');
        if (mobileOverlay) mobileOverlay.classList.toggle('active');
      } else {
        if (appLayout) {
          appLayout.classList.toggle('sidebar-collapsed');
          const isCollapsed = appLayout.classList.contains('sidebar-collapsed');
          localStorage.setItem('apex_sidebar_collapsed', isCollapsed ? '1' : '0');
        }
      }
    };

    if (btnSidebarToggle) {
      btnSidebarToggle.addEventListener('click', toggleSidebarCollapse);
    }
    if (sidebarHeader) {
      sidebarHeader.addEventListener('click', () => {
        if (window.innerWidth > 768) {
          toggleSidebarCollapse();
        }
      });
      sidebarHeader.style.cursor = 'pointer';
      sidebarHeader.title = 'Collapse / Expand Sidebar';
    }

    // Restore saved sidebar collapsed state
    if (localStorage.getItem('apex_sidebar_collapsed') === '1' && window.innerWidth > 768) {
      if (appLayout) appLayout.classList.add('sidebar-collapsed');
    }

    // Toggle password visibility
    const togglePassBtn = document.getElementById('btnTogglePassword');
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        const passInput = document.getElementById('loginPassword');
        const eyeIcon = document.getElementById('eyeIcon');
        const eyeOffIcon = document.getElementById('eyeOffIcon');
        if (!passInput) return;
        if (passInput.type === 'password') {
          passInput.type = 'text';
          if (eyeIcon) eyeIcon.classList.add('hidden');
          if (eyeOffIcon) eyeOffIcon.classList.remove('hidden');
        } else {
          passInput.type = 'password';
          if (eyeIcon) eyeIcon.classList.remove('hidden');
          if (eyeOffIcon) eyeOffIcon.classList.add('hidden');
        }
      });
    }

    // Forgot password handler
    const forgotPassBtn = document.getElementById('btnForgotPass');
    if (forgotPassBtn) {
      forgotPassBtn.addEventListener('click', () => {
        alert('Please contact the ApexTesting System Administrator (johnny.nguyen@apexscengineering.com) to reset your password.');
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
    saveQuiz,
    deleteQuiz,
    getResults,
    saveResult,
    getAccounts,
    navigate,
    openModal,
    closeModal,
    launchConfetti,
    renderDashboard,
    // Auth & Security
    hashPassword,
    supabase,
    getCurrentUser,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    fillLogin,
    handleLogin,
    showChangePasswordModal,
    submitChangePassword,
    get currentView() { return currentView; }
  };
})();
