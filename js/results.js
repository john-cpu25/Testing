/* ============================================
   Results.js - Results Summary & Analytics
   Filter, sort, statistics, export
   ============================================ */

const Results = (() => {

  let currentFilter = 'all';
  let currentSort = 'date';
  let sortDirection = 'desc';
  let searchQuery = '';

  // ---- Get filtered results based on role ----
  async function getFilteredResults() {
    let results = await App.getResults();
    const user = App.getCurrentUser();
    // Non-admin users only see their own results
    if (user && user.role !== 'admin') {
      results = results.filter(r => r.userName === user.displayName);
    }
    return results;
  }

  // ---- Render Results View ----
  async function render() {
    const user = App.getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    // Update page title based on role
    const titleEl = document.getElementById('resultsPageTitle');
    const subtitleEl = document.getElementById('resultsPageSubtitle');
    if (titleEl) titleEl.textContent = isAdmin ? 'Tổng Hợp Kết Quả' : 'Kết Quả Của Bạn';
    if (subtitleEl) subtitleEl.textContent = isAdmin
      ? 'Xem và phân tích kết quả tất cả bài test'
      : 'Xem lại các bài test bạn đã làm';

    await renderStats();
    await renderFilterBar();
    await renderTable();
  }

  // ---- Stats ----
  async function renderStats() {
    const results = await getFilteredResults();

    if (results.length === 0) {
      document.getElementById('resultsStats').innerHTML = '';
      return;
    }

    const totalAttempts = results.length;
    const avgScore = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length);
    const highestScore = Math.max(...results.map(r => r.percentage));
    const passRate = Math.round((results.filter(r => r.percentage >= 60).length / results.length) * 100);
    const avgTime = Math.round(results.reduce((sum, r) => sum + (r.timeTaken || 0), 0) / results.length);

    document.getElementById('resultsStats').innerHTML = `
      <div class="stat-card purple">
        <div class="stat-icon">📝</div>
        <div class="stat-value">${totalAttempts}</div>
        <div class="stat-label">Tổng Lượt Làm</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${avgScore}%</div>
        <div class="stat-label">Điểm Trung Bình</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">${highestScore}%</div>
        <div class="stat-label">Điểm Cao Nhất</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">${App.formatTime(avgTime)}</div>
        <div class="stat-label">Thời Gian TB</div>
      </div>
      <div class="stat-card pink">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${passRate}%</div>
        <div class="stat-label">Tỉ Lệ Đạt (≥60%)</div>
      </div>
    `;
  }

  // ---- Filter Bar ----
  async function renderFilterBar() {
    const quizzes = await App.getQuizzes();

    const isAdmin = App.isAdmin();

    document.getElementById('resultsFilterBar').innerHTML = `
      <select class="form-select" id="filterQuiz" onchange="Results.setFilter(this.value)">
        <option value="all">📋 Tất cả bài test</option>
        ${quizzes.map(q => `
          <option value="${q.id}" ${currentFilter === q.id ? 'selected' : ''}>${App.escapeHtml(q.title)}</option>
        `).join('')}
      </select>
      ${isAdmin ? `
        <input type="text" class="form-input" id="searchInput" placeholder="🔍 Tìm theo tên người làm..."
               value="${App.escapeHtml(searchQuery)}" oninput="Results.setSearch(this.value)">
      ` : ''}
    `;
  }

  // ---- Render User Summary Table ----
  function renderUserSummaryTable(filteredResults) {
    const accounts = App.getAccounts().filter(a => a.role !== 'admin');
    
    const summaryList = accounts.map(acc => {
      const userResults = filteredResults.filter(r => r.userName === acc.displayName);
      const attempts = userResults.length;
      let highestScore = 0;
      let bestTime = 0;
      
      if (attempts > 0) {
        highestScore = Math.max(...userResults.map(r => r.percentage));
        const bestResults = userResults.filter(r => r.percentage === highestScore);
        bestTime = Math.min(...bestResults.map(r => r.timeTaken));
      }

      return {
        name: acc.displayName,
        email: acc.username,
        attempts,
        highestScore,
        bestTime
      };
    });

    let displayList = summaryList;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      displayList = displayList.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }

    if (displayList.length === 0) return '';

    return `
      <h3 style="margin-top: 1rem; margin-bottom: 1rem; color: var(--primary);">Tiến Độ Làm Bài (Danh sách theo Email)</h3>
      <div class="table-container" style="margin-bottom: 2rem;">
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Họ Tên</th>
              <th>Email</th>
              <th>Trạng Thái</th>
              <th>Lượt Làm</th>
              <th>Điểm Cao Nhất</th>
              <th>Thời Gian Tốt Nhất</th>
            </tr>
          </thead>
          <tbody>
            ${displayList.map((s, i) => {
              const hasTaken = s.attempts > 0;
              const statusBadge = hasTaken ? '<span class="badge badge-green">Đã Làm</span>' : '<span class="badge badge-red">Chưa Làm</span>';
              
              const scoreBadge = hasTaken ? \`<span class="badge badge-\${s.highestScore >= 80 ? 'green' : s.highestScore >= 60 ? 'cyan' : s.highestScore >= 40 ? 'yellow' : 'red'}">\${s.highestScore}%</span>\` : '-';
              
              return \`
                <tr>
                  <td>\${i + 1}</td>
                  <td style="font-weight: 600;">\${App.escapeHtml(s.name)}</td>
                  <td>\${App.escapeHtml(s.email)}</td>
                  <td>\${statusBadge}</td>
                  <td>\${s.attempts}</td>
                  <td>\${scoreBadge}</td>
                  <td>\${hasTaken ? App.formatTime(s.bestTime) : '-'}</td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---- Render Table ----
  async function renderTable() {
    let results = await getFilteredResults();

    // Filter
    if (currentFilter !== 'all') {
      results = results.filter(r => r.quizId === currentFilter);
    }

    // Unfiltered by search results for the summary table
    const summaryResults = results;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(r =>
        r.userName.toLowerCase().includes(q) ||
        r.quizTitle.toLowerCase().includes(q)
      );
    }

    // Sort
    results = [...results].sort((a, b) => {
      let valA, valB;
      switch (currentSort) {
        case 'name':
          valA = a.userName.toLowerCase();
          valB = b.userName.toLowerCase();
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        case 'score':
          valA = a.percentage;
          valB = b.percentage;
          break;
        case 'time':
          valA = a.timeTaken;
          valB = b.timeTaken;
          break;
        case 'date':
        default:
          valA = new Date(a.completedAt).getTime();
          valB = new Date(b.completedAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    const container = document.getElementById('resultsTableContainer');

    let summaryHtml = '';
    if (App.isAdmin()) {
      summaryHtml = renderUserSummaryTable(summaryResults);
    }

    let detailedHtml = '';
    if (results.length === 0) {
      detailedHtml = `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-title">Chưa có kết quả chi tiết nào</div>
          <div class="empty-state-text">Kết quả sẽ hiển thị khi có người hoàn thành bài test.</div>
        </div>
      `;
    } else {
      const sortIcon = (field) => {
        if (currentSort !== field) return '↕️';
        return sortDirection === 'asc' ? '↑' : '↓';
      };

      const sortClass = (field) => currentSort === field ? 'sorted' : '';

      detailedHtml = `
        <h3 style="margin-top: 1rem; margin-bottom: 1rem; color: var(--primary);">Chi Tiết Lịch Sử Làm Bài</h3>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th class="${sortClass('name')}" onclick="Results.setSort('name')">Người Làm ${sortIcon('name')}</th>
                <th class="${sortClass('quiz')}" onclick="Results.setSort('quiz')">Bài Test</th>
                <th class="${sortClass('score')}" onclick="Results.setSort('score')">Điểm ${sortIcon('score')}</th>
                <th>Kết Quả</th>
                <th class="${sortClass('time')}" onclick="Results.setSort('time')">Thời Gian ${sortIcon('time')}</th>
                <th class="${sortClass('date')}" onclick="Results.setSort('date')">Ngày ${sortIcon('date')}</th>
                <th>Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              ${results.map((r, i) => {
                const scoreClass = r.percentage >= 80 ? 'excellent' : r.percentage >= 60 ? 'good' : r.percentage >= 40 ? 'average' : 'poor';
                const badgeClass = r.percentage >= 80 ? 'green' : r.percentage >= 60 ? 'cyan' : r.percentage >= 40 ? 'yellow' : 'red';

                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td style="font-weight: 600; color: var(--text-primary);">${App.escapeHtml(r.userName)}</td>
                    <td>${App.escapeHtml(r.quizTitle)}</td>
                    <td>
                      <span class="badge badge-${badgeClass}">${r.score}/${r.totalQuestions} (${r.percentage}%)</span>
                    </td>
                    <td>
                      <div class="score-bar-container" style="min-width: 80px;">
                        <div class="score-bar ${scoreClass}" style="width: ${r.percentage}%"></div>
                      </div>
                    </td>
                    <td>${App.formatTime(r.timeTaken)}</td>
                    <td>${App.formatDate(r.completedAt)}</td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick="Results.showDetail('${r.id}')">
                        👁️ Xem
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = summaryHtml + detailedHtml;
  }

  // ---- Sort ----
  async function setSort(field) {
    if (currentSort === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort = field;
      sortDirection = 'desc';
    }
    await renderTable();
  }

  // ---- Filter ----
  async function setFilter(value) {
    currentFilter = value;
    await renderTable();
  }

  // ---- Search ----
  async function setSearch(value) {
    searchQuery = value;
    await renderTable();
  }

  // ---- Show Detail ----
  async function showDetail(resultId) {
    const results = await App.getResults();
    const result = results.find(r => r.id === resultId);
    if (!result) return;

    let scoreClass;
    if (result.percentage >= 80) scoreClass = 'excellent';
    else if (result.percentage >= 60) scoreClass = 'good';
    else if (result.percentage >= 40) scoreClass = 'average';
    else scoreClass = 'poor';

    const letters = ['A', 'B', 'C', 'D'];

    const bodyHtml = `
      <div class="text-center mb-xl">
        <div class="score-circle ${scoreClass}" style="width: 120px; height: 120px; margin: 0 auto var(--spacing-md);">
          <div class="score-value" style="font-size: var(--font-size-3xl);">${result.percentage}%</div>
        </div>
        <p style="font-weight: 600;">${App.escapeHtml(result.userName)}</p>
        <p class="text-secondary" style="font-size: var(--font-size-sm);">${App.escapeHtml(result.quizTitle)}</p>
      </div>

      <div class="result-stats mb-xl">
        <div class="result-stat">
          <div class="result-stat-value text-green">${result.score}</div>
          <div class="result-stat-label">Đúng</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-value text-red">${result.totalQuestions - result.score}</div>
          <div class="result-stat-label">Sai</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-value text-cyan">${App.formatTime(result.timeTaken)}</div>
          <div class="result-stat-label">Thời gian</div>
        </div>
      </div>

      <h4 style="margin-bottom: var(--spacing-md);">📋 Chi Tiết Từng Câu</h4>
      <div class="review-list">
        ${result.answers.map((a, i) => `
          <div class="review-item ${a.isCorrect ? 'correct-answer' : 'wrong-answer'}">
            <div class="review-question">
              <span class="review-status">${a.isCorrect ? '✅' : '❌'}</span>
              <span style="font-size: var(--font-size-sm);"><strong>Câu ${i + 1}:</strong> ${App.escapeHtml(a.questionText)}</span>
            </div>
            <div class="review-options">
              ${a.options.map((opt, j) => {
                let cls = '';
                if (j === a.correctIndex) cls += 'correct-option ';
                if (j === a.selectedIndex && !a.isCorrect) cls += 'user-selected ';
                if (j === a.selectedIndex && a.isCorrect) cls += 'correct-option ';

                return `
                  <div class="review-option ${cls}" style="font-size: var(--font-size-xs);">
                    <strong>${letters[j]}.</strong> ${App.escapeHtml(opt)}
                    ${j === a.correctIndex ? ' ✅' : ''}
                    ${j === a.selectedIndex && !a.isCorrect ? ' ❌' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Đóng</button>
    `;

    App.openModal('Chi Tiết Kết Quả', bodyHtml, footerHtml);
  }

  // ---- Clear All Results ----
  async function clearAllResults() {
    alert("Tính năng này đã bị vô hiệu hóa.");
  }

  async function confirmClearAll() {
    App.closeModal();
    await render();
  }

  // Public API
  return {
    render,
    setSort,
    setFilter,
    setSearch,
    showDetail,
    clearAllResults,
    confirmClearAll
  };
})();
