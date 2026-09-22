/* ============================================
   Admin.js - Quiz Management (Admin Panel)
   Create, edit, delete quizzes and questions
   ============================================ */

const Admin = (() => {

  // ---- Render Admin View ----
  async function render() {
    const quizzes = await App.getQuizzes();

    const container = document.getElementById('adminQuizList');

    if (quizzes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No quizzes yet</div>
          <div class="empty-state-text">Click "Create New Quiz" to create your first test.</div>
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
              ${App.escapeHtml(quiz.description || 'No description')}
            </p>
          </div>
          <div class="btn-group">
            <button class="btn btn-success btn-sm" onclick="Admin.addQuestion('${quiz.id}')">
              + Add Question
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Admin.editQuiz('${quiz.id}')">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="Admin.deleteQuiz('${quiz.id}')">
              🗑️ Delete
            </button>
          </div>
        </div>

        <div class="flex gap-lg mb-lg" style="flex-wrap: wrap;">
          <span class="badge badge-purple">📝 ${quiz.questions.length} questions</span>
          <span class="badge badge-cyan">⏱️ ${quiz.timeLimit} mins</span>
          <span class="badge badge-green">📅 ${App.formatDate(quiz.createdAt)}</span>
        </div>

        ${quiz.questions.length > 0 ? `
          <div>
            ${quiz.questions.map((q, i) => renderQuestionItem(quiz.id, q, i)).join('')}
          </div>
        ` : `
          <div class="text-center text-muted" style="padding: var(--spacing-xl);">
            No questions yet. Click "+ Add Question" to get started.
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
          <span class="question-item-number">Question ${index + 1}</span>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Admin.editQuestion('${quizId}', '${question.id}')">✏️</button>
            <button class="btn btn-ghost btn-sm text-red" onclick="Admin.deleteQuestion('${quizId}', '${question.id}')">🗑️</button>
          </div>
        </div>
        <div class="question-item-text">${App.escapeHtml(question.text)}</div>
        <div class="question-item-options">
          ${question.options.map((opt, i) => `
            <div class="question-item-option ${opt === question.correctAnswer ? 'correct' : ''}">
              <strong>${letters[i]}.</strong> ${App.escapeHtml(opt)}
              ${opt === question.correctAnswer ? ' ✅' : ''}
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
        <label class="form-label">Quiz Title *</label>
        <input type="text" class="form-input" id="quizTitle" placeholder="e.g. Workplace Safety & Standards" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="quizDescription" placeholder="Brief description of the quiz..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Time Limit (minutes) *</label>
        <input type="number" class="form-input" id="quizTimeLimit" value="15" min="1" max="180" placeholder="15">
        <p class="form-hint">Maximum time allowed to complete the quiz</p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Admin.saveNewQuiz()">✨ Create Quiz</button>
    `;

    App.openModal('Create New Quiz', bodyHtml, footerHtml);

    // Focus on title input
    setTimeout(() => {
      const input = document.getElementById('quizTitle');
      if (input) input.focus();
    }, 100);
  }

  // ---- Save New Quiz ----
  async function saveNewQuiz() {
    const title = document.getElementById('quizTitle').value.trim();
    const description = document.getElementById('quizDescription').value.trim();
    const timeLimit = parseInt(document.getElementById('quizTimeLimit').value) || 15;

    if (!title) {
      alert('Please enter a quiz title!');
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

    await App.saveQuiz(quiz);

    App.closeModal();
    await render();

    // Immediately open add question dialog
    setTimeout(() => addQuestion(quiz.id), 300);
  }

  // ---- Edit Quiz ----
  async function editQuiz(quizId) {
    const quizzes = await App.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Quiz Title *</label>
        <input type="text" class="form-input" id="editQuizTitle" value="${App.escapeHtml(quiz.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="editQuizDescription">${App.escapeHtml(quiz.description)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Time Limit (minutes) *</label>
        <input type="number" class="form-input" id="editQuizTimeLimit" value="${quiz.timeLimit}" min="1" max="180">
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Admin.saveEditQuiz('${quizId}')">💾 Save Changes</button>
    `;

    App.openModal('Edit Quiz', bodyHtml, footerHtml);
  }

  async function saveEditQuiz(quizId) {
    const title = document.getElementById('editQuizTitle').value.trim();
    const description = document.getElementById('editQuizDescription').value.trim();
    const timeLimit = parseInt(document.getElementById('editQuizTimeLimit').value) || 15;

    if (!title) {
      alert('Please enter a quiz title!');
      return;
    }

    const quizzes = await App.getQuizzes();
    const idx = quizzes.findIndex(q => q.id === quizId);
    if (idx === -1) return;

    quizzes[idx].title = title;
    quizzes[idx].description = description;
    quizzes[idx].timeLimit = Math.max(1, Math.min(180, timeLimit));

    await App.saveQuiz(quizzes[idx]);
    App.closeModal();
    await render();
  }

  // ---- Delete Quiz ----
  async function deleteQuiz(quizId) {
    const quizzes = await App.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const bodyHtml = `
      <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
        Are you sure you want to delete quiz <strong style="color: var(--text-primary);">"${App.escapeHtml(quiz.title)}"</strong>?
      </p>
      <p style="color: var(--accent-red); font-size: var(--font-size-sm);">
        ⚠️ This action cannot be undone. All questions within this quiz will be deleted.
      </p>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="Admin.confirmDeleteQuiz('${quizId}')">🗑️ Delete Quiz</button>
    `;

    App.openModal('Confirm Deletion', bodyHtml, footerHtml);
  }

  async function confirmDeleteQuiz(quizId) {
    await App.deleteQuiz(quizId);
    
    // Note: results will be deleted via ON DELETE CASCADE in Supabase
    
    App.closeModal();
    await render();
  }

  // ---- Add Question ----
  function addQuestion(quizId) {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Question Text *</label>
        <textarea class="form-textarea" id="questionText" placeholder="Enter question text..." rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Option A *</label>
        <input type="text" class="form-input" id="optionA" placeholder="Enter option A">
      </div>
      <div class="form-group">
        <label class="form-label">Option B *</label>
        <input type="text" class="form-input" id="optionB" placeholder="Enter option B">
      </div>
      <div class="form-group">
        <label class="form-label">Option C *</label>
        <input type="text" class="form-input" id="optionC" placeholder="Enter option C">
      </div>
      <div class="form-group">
        <label class="form-label">Option D *</label>
        <input type="text" class="form-input" id="optionD" placeholder="Enter option D">
      </div>
      <div class="form-group">
        <label class="form-label">Correct Answer *</label>
        <select class="form-select" id="correctAnswer">
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-secondary" onclick="Admin.saveQuestion('${quizId}', true)">💾 Save & Add Another</button>
      <button class="btn btn-primary" onclick="Admin.saveQuestion('${quizId}', false)">💾 Save & Close</button>
    `;

    App.openModal('Add Question', bodyHtml, footerHtml);

    setTimeout(() => {
      const textarea = document.getElementById('questionText');
      if (textarea) textarea.focus();
    }, 100);
  }

  // ---- Save Question ----
  async function saveQuestion(quizId, addMore) {
    const text = document.getElementById('questionText').value.trim();
    const optA = document.getElementById('optionA').value.trim();
    const optB = document.getElementById('optionB').value.trim();
    const optC = document.getElementById('optionC').value.trim();
    const optD = document.getElementById('optionD').value.trim();
    const correctLetter = document.getElementById('correctAnswer').value;
    let correctAnswer = '';
    if (correctLetter === 'A') correctAnswer = optA;
    else if (correctLetter === 'B') correctAnswer = optB;
    else if (correctLetter === 'C') correctAnswer = optC;
    else if (correctLetter === 'D') correctAnswer = optD;

    if (!text || !optA || !optB || !optC || !optD) {
      alert('Please fill in the question and all four options!');
      return;
    }

    const question = {
      id: App.generateId(),
      text,
      options: [optA, optB, optC, optD],
      correctAnswer: correctAnswer
    };

    const quizzes = await App.getQuizzes();
    const idx = quizzes.findIndex(q => q.id === quizId);
    if (idx === -1) return;

    quizzes[idx].questions.push(question);
    await App.saveQuiz(quizzes[idx]);

    if (addMore) {
      // Clear form for next question
      document.getElementById('questionText').value = '';
      document.getElementById('optionA').value = '';
      document.getElementById('optionB').value = '';
      document.getElementById('optionC').value = '';
      document.getElementById('optionD').value = '';
      document.getElementById('correctAnswer').value = 'A';
      document.getElementById('questionText').focus();
      await render(); // Update background
    } else {
      App.closeModal();
      await render();
    }
  }

  // ---- Edit Question ----
  async function editQuestion(quizId, questionId) {
    const quizzes = await App.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return;

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Question Text *</label>
        <textarea class="form-textarea" id="editQuestionText" rows="3">${App.escapeHtml(question.text)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Option A *</label>
        <input type="text" class="form-input" id="editOptionA" value="${App.escapeHtml(question.options[0])}">
      </div>
      <div class="form-group">
        <label class="form-label">Option B *</label>
        <input type="text" class="form-input" id="editOptionB" value="${App.escapeHtml(question.options[1])}">
      </div>
      <div class="form-group">
        <label class="form-label">Option C *</label>
        <input type="text" class="form-input" id="editOptionC" value="${App.escapeHtml(question.options[2])}">
      </div>
      <div class="form-group">
        <label class="form-label">Option D *</label>
        <input type="text" class="form-input" id="editOptionD" value="${App.escapeHtml(question.options[3])}">
      </div>
      <div class="form-group">
        <label class="form-label">Correct Answer *</label>
        <select class="form-select" id="editCorrectAnswer">
          <option value="A" ${question.correctAnswer === question.options[0] ? 'selected' : ''}>A</option>
          <option value="B" ${question.correctAnswer === question.options[1] ? 'selected' : ''}>B</option>
          <option value="C" ${question.correctAnswer === question.options[2] ? 'selected' : ''}>C</option>
          <option value="D" ${question.correctAnswer === question.options[3] ? 'selected' : ''}>D</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Admin.saveEditQuestion('${quizId}', '${questionId}')">💾 Save Changes</button>
    `;

    App.openModal('Edit Question', bodyHtml, footerHtml);
  }

  async function saveEditQuestion(quizId, questionId) {
    const text = document.getElementById('editQuestionText').value.trim();
    const optA = document.getElementById('editOptionA').value.trim();
    const optB = document.getElementById('editOptionB').value.trim();
    const optC = document.getElementById('editOptionC').value.trim();
    const optD = document.getElementById('editOptionD').value.trim();
    const correctLetter = document.getElementById('editCorrectAnswer').value;
    let correctAnswer = '';
    if (correctLetter === 'A') correctAnswer = optA;
    else if (correctLetter === 'B') correctAnswer = optB;
    else if (correctLetter === 'C') correctAnswer = optC;
    else if (correctLetter === 'D') correctAnswer = optD;

    if (!text || !optA || !optB || !optC || !optD) {
      alert('Please fill in the question and all four options!');
      return;
    }

    const quizzes = await App.getQuizzes();
    const quizIdx = quizzes.findIndex(q => q.id === quizId);
    if (quizIdx === -1) return;

    const qIdx = quizzes[quizIdx].questions.findIndex(q => q.id === questionId);
    if (qIdx === -1) return;

    quizzes[quizIdx].questions[qIdx] = {
      id: questionId,
      text,
      options: [optA, optB, optC, optD],
      correctAnswer: correctAnswer
    };

    await App.saveQuiz(quizzes[quizIdx]);
    App.closeModal();
    await render();
  }

  // ---- Delete Question ----
  async function deleteQuestion(quizId, questionId) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    const quizzes = await App.getQuizzes();
    const quizIdx = quizzes.findIndex(q => q.id === quizId);
    if (quizIdx === -1) return;

    quizzes[quizIdx].questions = quizzes[quizIdx].questions.filter(q => q.id !== questionId);
    await App.saveQuiz(quizzes[quizIdx]);
    await render();
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
