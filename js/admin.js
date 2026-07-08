/* ============================================
   Admin.js - Quiz Management (Admin Panel)
   Create, edit, delete quizzes and questions
   ============================================ */

const Admin = (() => {

  // ---- Render Admin View ----
  function render() {
    const quizzes = App.getQuizzes();

    const container = document.getElementById('adminQuizList');

    if (quizzes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Chưa có quiz nào</div>
          <div class="empty-state-text">Nhấn nút "Tạo Quiz Mới" để bắt đầu tạo bài test đầu tiên.</div>
        </div>
      `;
    } else {
      container.innerHTML = quizzes.map(quiz => renderQuizCard(quiz)).join('');
    }

    // Create quiz button
    document.getElementById('btnCreateQuiz').onclick = showCreateQuizForm;
  }

  // ---- Render Quiz Card in Admin List ----
  function renderQuizCard(quiz) {
    return `
      <div class="card mb-lg" style="animation: slideUp 0.3s ease;">
        <div class="card-header">
          <div>
            <h3 class="card-title">${App.escapeHtml(quiz.title)}</h3>
            <p class="text-secondary" style="font-size: var(--font-size-sm); margin-top: 4px;">
              ${App.escapeHtml(quiz.description || 'Không có mô tả')}
            </p>
          </div>
          <div class="btn-group">
            <button class="btn btn-success btn-sm" onclick="Admin.addQuestion('${quiz.id}')">
              + Thêm Câu Hỏi
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.editQuiz('${quiz.id}')">
              ✏️ Sửa
            </button>
            <button class="btn btn-danger btn-sm" onclick="Admin.deleteQuiz('${quiz.id}')">
              🗑️ Xóa
            </button>
          </div>
        </div>

        <div class="flex gap-lg mb-lg" style="flex-wrap: wrap;">
          <span class="badge badge-purple">📝 ${quiz.questions.length} câu hỏi</span>
          <span class="badge badge-cyan">⏱️ ${quiz.timeLimit} phút</span>
          <span class="badge badge-green">📅 ${App.formatDate(quiz.createdAt)}</span>
        </div>

        ${quiz.questions.length > 0 ? `
          <div>
            ${quiz.questions.map((q, i) => renderQuestionItem(quiz.id, q, i)).join('')}
          </div>
        ` : `
          <div class="text-center text-muted" style="padding: var(--spacing-xl);">
            Chưa có câu hỏi nào. Nhấn "Thêm Câu Hỏi" để bắt đầu.
          </div>
        `}
      </div>
    `;
  }

  // ---- Render Question Item ----
  function renderQuestionItem(quizId, question, index) {
    const letters = ['A', 'B', 'C', 'D'];
    return `
      <div class="question-item">
        <div class="question-item-header">
          <span class="question-item-number">Câu ${index + 1}</span>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Admin.editQuestion('${quizId}', '${question.id}')">✏️</button>
            <button class="btn btn-ghost btn-sm text-red" onclick="Admin.deleteQuestion('${quizId}', '${question.id}')">🗑️</button>
          </div>
        </div>
        <div class="question-item-text">${App.escapeHtml(question.text)}</div>
        <div class="question-item-options">
          ${question.options.map((opt, i) => `
            <div class="question-item-option ${i === question.correctIndex ? 'correct' : ''}">
              <strong>${letters[i]}.</strong> ${App.escapeHtml(opt)}
              ${i === question.correctIndex ? ' ✅' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ---- Create Quiz Form ----
  function showCreateQuizForm() {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Tên bài test *</label>
        <input type="text" class="form-input" id="quizTitle" placeholder="VD: Kiến Thức Lịch Sử Việt Nam" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả</label>
        <textarea class="form-textarea" id="quizDescription" placeholder="Mô tả ngắn về bài test..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Thời gian giới hạn (phút) *</label>
        <input type="number" class="form-input" id="quizTimeLimit" value="15" min="1" max="180" placeholder="15">
        <p class="form-hint">Thời gian tối đa để hoàn thành bài test</p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="Admin.saveNewQuiz()">✨ Tạo Quiz</button>
    `;

    App.openModal('Tạo Quiz Mới', bodyHtml, footerHtml);

    // Focus on title input
    setTimeout(() => {
      const input = document.getElementById('quizTitle');
      if (input) input.focus();
    }, 100);
  }

  // ---- Save New Quiz ----
  function saveNewQuiz() {
    const title = document.getElementById('quizTitle').value.trim();
    const description = document.getElementById('quizDescription').value.trim();
    const timeLimit = parseInt(document.getElementById('quizTimeLimit').value) || 15;

    if (!title) {
      alert('Vui lòng nhập tên bài test!');
      document.getElementById('quizTitle').focus();
      return;
    }

    const quiz = {
      id: App.generateId(),
      title,
      description,
      timeLimit: Math.max(1, Math.min(180, timeLimit)),
      questions: [],
      createdAt: new Date().toISOString()
    };

    const quizzes = App.getQuizzes();
    quizzes.push(quiz);
    App.saveQuizzes(quizzes);

    App.closeModal();
    render();

    // Immediately open add question dialog
    setTimeout(() => addQuestion(quiz.id), 300);
  }

  // ---- Edit Quiz ----
  function editQuiz(quizId) {
    const quizzes = App.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Tên bài test *</label>
        <input type="text" class="form-input" id="editQuizTitle" value="${App.escapeHtml(quiz.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">Mô tả</label>
        <textarea class="form-textarea" id="editQuizDescription">${App.escapeHtml(quiz.description)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Thời gian giới hạn (phút) *</label>
        <input type="number" class="form-input" id="editQuizTimeLimit" value="${quiz.timeLimit}" min="1" max="180">
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="Admin.saveEditQuiz('${quizId}')">💾 Lưu Thay Đổi</button>
    `;

    App.openModal('Chỉnh Sửa Quiz', bodyHtml, footerHtml);
  }

  function saveEditQuiz(quizId) {
    const title = document.getElementById('editQuizTitle').value.trim();
    const description = document.getElementById('editQuizDescription').value.trim();
    const timeLimit = parseInt(document.getElementById('editQuizTimeLimit').value) || 15;

    if (!title) {
      alert('Vui lòng nhập tên bài test!');
      return;
    }

    const quizzes = App.getQuizzes();
    const idx = quizzes.findIndex(q => q.id === quizId);
    if (idx === -1) return;

    quizzes[idx].title = title;
    quizzes[idx].description = description;
    quizzes[idx].timeLimit = Math.max(1, Math.min(180, timeLimit));

    App.saveQuizzes(quizzes);
    App.closeModal();
    render();
  }

  // ---- Delete Quiz ----
  function deleteQuiz(quizId) {
    const quizzes = App.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const bodyHtml = `
      <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
        Bạn có chắc chắn muốn xóa quiz <strong style="color: var(--text-primary);">"${App.escapeHtml(quiz.title)}"</strong>?
      </p>
      <p style="color: var(--accent-red); font-size: var(--font-size-sm);">
        ⚠️ Hành động này không thể hoàn tác. Tất cả câu hỏi trong quiz sẽ bị xóa.
      </p>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-danger" onclick="Admin.confirmDeleteQuiz('${quizId}')">🗑️ Xóa Quiz</button>
    `;

    App.openModal('Xác Nhận Xóa', bodyHtml, footerHtml);
  }

  function confirmDeleteQuiz(quizId) {
    let quizzes = App.getQuizzes();
    quizzes = quizzes.filter(q => q.id !== quizId);
    App.saveQuizzes(quizzes);

    // Also remove related results
    let results = App.getResults();
    results = results.filter(r => r.quizId !== quizId);
    App.saveResults(results);

    App.closeModal();
    render();
  }

  // ---- Add Question ----
  function addQuestion(quizId) {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Nội dung câu hỏi *</label>
        <textarea class="form-textarea" id="questionText" placeholder="Nhập câu hỏi trắc nghiệm..." rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án A *</label>
        <input type="text" class="form-input" id="optionA" placeholder="Nhập đáp án A">
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án B *</label>
        <input type="text" class="form-input" id="optionB" placeholder="Nhập đáp án B">
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án C *</label>
        <input type="text" class="form-input" id="optionC" placeholder="Nhập đáp án C">
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án D *</label>
        <input type="text" class="form-input" id="optionD" placeholder="Nhập đáp án D">
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án đúng *</label>
        <select class="form-select" id="correctAnswer">
          <option value="0">A</option>
          <option value="1">B</option>
          <option value="2">C</option>
          <option value="3">D</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-secondary" onclick="Admin.saveQuestion('${quizId}', true)">💾 Lưu & Thêm Tiếp</button>
      <button class="btn btn-primary" onclick="Admin.saveQuestion('${quizId}', false)">💾 Lưu & Đóng</button>
    `;

    App.openModal('Thêm Câu Hỏi', bodyHtml, footerHtml);

    setTimeout(() => {
      const textarea = document.getElementById('questionText');
      if (textarea) textarea.focus();
    }, 100);
  }

  // ---- Save Question ----
  function saveQuestion(quizId, addMore) {
    const text = document.getElementById('questionText').value.trim();
    const optA = document.getElementById('optionA').value.trim();
    const optB = document.getElementById('optionB').value.trim();
    const optC = document.getElementById('optionC').value.trim();
    const optD = document.getElementById('optionD').value.trim();
    const correct = parseInt(document.getElementById('correctAnswer').value);

    if (!text || !optA || !optB || !optC || !optD) {
      alert('Vui lòng điền đầy đủ câu hỏi và tất cả đáp án!');
      return;
    }

    const question = {
      id: App.generateId(),
      text,
      options: [optA, optB, optC, optD],
      correctIndex: correct
    };

    const quizzes = App.getQuizzes();
    const idx = quizzes.findIndex(q => q.id === quizId);
    if (idx === -1) return;

    quizzes[idx].questions.push(question);
    App.saveQuizzes(quizzes);

    if (addMore) {
      // Clear form for next question
      document.getElementById('questionText').value = '';
      document.getElementById('optionA').value = '';
      document.getElementById('optionB').value = '';
      document.getElementById('optionC').value = '';
      document.getElementById('optionD').value = '';
      document.getElementById('correctAnswer').value = '0';
      document.getElementById('questionText').focus();
      render(); // Update background
    } else {
      App.closeModal();
      render();
    }
  }

  // ---- Edit Question ----
  function editQuestion(quizId, questionId) {
    const quizzes = App.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return;

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Nội dung câu hỏi *</label>
        <textarea class="form-textarea" id="editQuestionText" rows="3">${App.escapeHtml(question.text)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án A *</label>
        <input type="text" class="form-input" id="editOptionA" value="${App.escapeHtml(question.options[0])}">
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án B *</label>
        <input type="text" class="form-input" id="editOptionB" value="${App.escapeHtml(question.options[1])}">
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án C *</label>
        <input type="text" class="form-input" id="editOptionC" value="${App.escapeHtml(question.options[2])}">
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án D *</label>
        <input type="text" class="form-input" id="editOptionD" value="${App.escapeHtml(question.options[3])}">
      </div>
      <div class="form-group">
        <label class="form-label">Đáp án đúng *</label>
        <select class="form-select" id="editCorrectAnswer">
          <option value="0" ${question.correctIndex === 0 ? 'selected' : ''}>A</option>
          <option value="1" ${question.correctIndex === 1 ? 'selected' : ''}>B</option>
          <option value="2" ${question.correctIndex === 2 ? 'selected' : ''}>C</option>
          <option value="3" ${question.correctIndex === 3 ? 'selected' : ''}>D</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="Admin.saveEditQuestion('${quizId}', '${questionId}')">💾 Lưu Thay Đổi</button>
    `;

    App.openModal('Chỉnh Sửa Câu Hỏi', bodyHtml, footerHtml);
  }

  function saveEditQuestion(quizId, questionId) {
    const text = document.getElementById('editQuestionText').value.trim();
    const optA = document.getElementById('editOptionA').value.trim();
    const optB = document.getElementById('editOptionB').value.trim();
    const optC = document.getElementById('editOptionC').value.trim();
    const optD = document.getElementById('editOptionD').value.trim();
    const correct = parseInt(document.getElementById('editCorrectAnswer').value);

    if (!text || !optA || !optB || !optC || !optD) {
      alert('Vui lòng điền đầy đủ câu hỏi và tất cả đáp án!');
      return;
    }

    const quizzes = App.getQuizzes();
    const quizIdx = quizzes.findIndex(q => q.id === quizId);
    if (quizIdx === -1) return;

    const qIdx = quizzes[quizIdx].questions.findIndex(q => q.id === questionId);
    if (qIdx === -1) return;

    quizzes[quizIdx].questions[qIdx] = {
      id: questionId,
      text,
      options: [optA, optB, optC, optD],
      correctIndex: correct
    };

    App.saveQuizzes(quizzes);
    App.closeModal();
    render();
  }

  // ---- Delete Question ----
  function deleteQuestion(quizId, questionId) {
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;

    const quizzes = App.getQuizzes();
    const quizIdx = quizzes.findIndex(q => q.id === quizId);
    if (quizIdx === -1) return;

    quizzes[quizIdx].questions = quizzes[quizIdx].questions.filter(q => q.id !== questionId);
    App.saveQuizzes(quizzes);
    render();
  }

  // Public API
  return {
    render,
    saveNewQuiz,
    editQuiz,
    saveEditQuiz,
    deleteQuiz,
    confirmDeleteQuiz,
    addQuestion,
    saveQuestion,
    editQuestion,
    saveEditQuestion,
    deleteQuestion
  };
})();
