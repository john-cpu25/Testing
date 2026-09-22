/* ============================================
   Quiz.js - Test Taking Engine
   Selection, shuffle, timer, scoring
   ============================================ */

const Quiz = (() => {

  // State
  let currentQuiz = null;       // The quiz being taken
  let shuffledQuestions = [];    // Questions after shuffle (with shuffled options)
  let currentQuestionIndex = 0;
  let userAnswers = [];          // Array of selected option indices (mapped back to original)
  let timerInterval = null;
  let timeRemaining = 0;
  let totalTime = 0;
  let userName = '';
  let quizStartTime = 0;

  // ---- Render Quiz Selection ----
  async function renderSelection() {
    const quizzes = await App.getQuizzes();
    const container = document.getElementById('quizContent');

    const availableQuizzes = quizzes.filter(q => q.questions.length > 0);

    if (availableQuizzes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">No quizzes available</div>
          <div class="empty-state-text">An administrator needs to create a quiz and add questions first.</div>
          ${App.isAdmin() ? '<button class="btn btn-primary" onclick="App.navigate(\'admin\')">⚙️ Go to Quiz Management</button>' : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="quiz-grid">
        ${availableQuizzes.map(quiz => `
          <div class="quiz-card" onclick="Quiz.startEntry('${quiz.id}')">
            <h3 class="quiz-card-title">${App.escapeHtml(quiz.title)}</h3>
            <p class="quiz-card-desc">${App.escapeHtml(quiz.description || 'No description')}</p>
            <div class="quiz-card-meta">
              <span>📝 ${quiz.questions.length} questions</span>
              <span>⏱️ ${quiz.timeLimit} mins</span>
              <span>📅 ${App.formatDate(quiz.createdAt)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ---- Start Entry (name input) ----
  async function startEntry(quizId) {
    const quizzes = await App.getQuizzes();
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    currentQuiz = quiz;

    const currentUser = App.getCurrentUser();
    const autoName = currentUser ? currentUser.displayName : '';

    const container = document.getElementById('quizContent');
    container.innerHTML = `
      <div class="enter-name-container">
        <div class="card">
          <h2>${App.escapeHtml(quiz.title)}</h2>
          <p>${App.escapeHtml(quiz.description || '')}</p>

          <div class="result-stats mb-xl">
            <div class="result-stat">
              <div class="result-stat-value">${quiz.questions.length}</div>
              <div class="result-stat-label">Questions</div>
            </div>
            <div class="result-stat">
              <div class="result-stat-value">${quiz.timeLimit}</div>
              <div class="result-stat-label">Minutes</div>
            </div>
          </div>

          <div class="form-group" style="text-align: left;">
            <label class="form-label">Full Name</label>
            <input type="text" class="form-input" id="playerName" placeholder="Enter your name..."
                   value="${App.escapeHtml(autoName)}" ${currentUser ? 'readonly style="opacity:0.7; cursor:not-allowed;"' : 'autofocus'}>
            ${currentUser ? '<p class="form-hint">Name retrieved from active user account</p>' : ''}
          </div>

          <div class="btn-group justify-center mt-lg">
            <button class="btn btn-secondary" onclick="Quiz.renderSelection()">← Back</button>
            <button class="btn btn-primary btn-lg" onclick="Quiz.beginQuiz()" id="btnStartQuiz">
              🚀 Start Quiz
            </button>
          </div>
        </div>
      </div>
    `;

    // Enter key starts quiz
    setTimeout(() => {
      const input = document.getElementById('playerName');
      if (input && !currentUser) {
        input.focus();
      }
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') beginQuiz();
        });
      }
    }, 100);
  }

  // ---- Begin Quiz ----
  function beginQuiz() {
    const nameInput = document.getElementById('playerName');
    userName = nameInput ? nameInput.value.trim() : '';

    // Fallback to logged-in user's name
    if (!userName) {
      const currentUser = App.getCurrentUser();
      if (currentUser) {
        userName = currentUser.displayName;
      } else {
        alert('Please enter your name!');
        if (nameInput) nameInput.focus();
        return;
      }
    }

    if (!currentQuiz || !currentQuiz.questions.length) return;

    // Shuffle questions
    const questionsCopy = currentQuiz.questions.map(q => {
      // For each question, shuffle the options
      const optionIndices = [0, 1, 2, 3];
      const shuffledIndices = App.shuffleArray(optionIndices);

      return {
        id: q.id,
        text: q.text,
        options: shuffledIndices.map(i => q.options[i]),
        correctAnswer: q.correctAnswer
      };
    });

    // Shuffle question order
    shuffledQuestions = App.shuffleArray(questionsCopy);
    currentQuestionIndex = 0;
    userAnswers = new Array(shuffledQuestions.length).fill(-1);

    // Timer setup
    totalTime = currentQuiz.timeLimit * 60;
    timeRemaining = totalTime;
    quizStartTime = Date.now();

    renderQuizInterface();
    startTimer();
  }

  // ---- Render Quiz Interface ----
  function renderQuizInterface() {
    const container = document.getElementById('quizContent');
    const q = shuffledQuestions[currentQuestionIndex];
    const letters = ['A', 'B', 'C', 'D'];

    const answeredCount = userAnswers.filter(a => a !== -1).length;

    container.innerHTML = `
      <!-- Timer -->
      <div class="timer-container" id="timerContainer">
        <span class="timer-icon">⏱️</span>
        <span class="timer-display" id="timerDisplay">${App.formatTime(timeRemaining)}</span>
        <div class="timer-bar-container">
          <div class="timer-bar" id="timerBar" style="width: ${(timeRemaining / totalTime) * 100}%"></div>
        </div>
        <span class="badge badge-purple">${answeredCount}/${shuffledQuestions.length}</span>
      </div>

      <!-- Question Navigation -->
      <div class="question-nav" id="questionNav">
        ${shuffledQuestions.map((_, i) => `
          <div class="question-dot ${i === currentQuestionIndex ? 'active' : ''} ${userAnswers[i] !== -1 ? 'answered' : ''}"
               onclick="Quiz.goToQuestion(${i})">
            ${i + 1}
          </div>
        `).join('')}
      </div>

      <!-- Question Card -->
      <div class="question-card" id="questionCard">
        <div class="question-number">Question ${currentQuestionIndex + 1} of ${shuffledQuestions.length}</div>
        <div class="question-text">${App.escapeHtml(q.text)}</div>
        <div class="options-list">
          ${q.options.map((opt, i) => `
            <div class="quiz-option ${userAnswers[currentQuestionIndex] === i ? 'selected' : ''}"
                 onclick="Quiz.selectAnswer(${i})" id="option_${i}">
              <span class="option-letter">${letters[i]}</span>
              <span class="option-text">${App.escapeHtml(opt)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex justify-between items-center mt-xl">
        <button class="btn btn-secondary ${currentQuestionIndex === 0 ? 'hidden' : ''}"
                onclick="Quiz.prevQuestion()">
          ← Previous
        </button>
        <div></div>
        ${currentQuestionIndex < shuffledQuestions.length - 1 ? `
          <button class="btn btn-primary" onclick="Quiz.nextQuestion()">
            Next →
          </button>
        ` : `
          <button class="btn btn-success btn-lg" onclick="Quiz.confirmSubmit()">
            ✅ Submit Quiz
          </button>
        `}
      </div>
    `;
  }

  // ---- Select Answer ----
  function selectAnswer(optionIndex) {
    userAnswers[currentQuestionIndex] = optionIndex;
    renderQuizInterface();
  }

  // ---- Navigation ----
  function goToQuestion(index) {
    if (index < 0 || index >= shuffledQuestions.length) return;
    currentQuestionIndex = index;
    renderQuizInterface();
  }

  function nextQuestion() {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      currentQuestionIndex++;
      renderQuizInterface();
    }
  }

  function prevQuestion() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuizInterface();
    }
  }

  // ---- Timer ----
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      timeRemaining--;

      const display = document.getElementById('timerDisplay');
      const bar = document.getElementById('timerBar');

      if (display) {
        display.textContent = App.formatTime(timeRemaining);

        // Warning states
        const percentage = timeRemaining / totalTime;
        display.className = 'timer-display';
        if (bar) bar.className = 'timer-bar';

        if (percentage <= 0.1) {
          display.classList.add('danger');
          if (bar) bar.classList.add('danger');
        } else if (percentage <= 0.25) {
          display.classList.add('warning');
          if (bar) bar.classList.add('warning');
        }
      }

      if (bar) {
        bar.style.width = ((timeRemaining / totalTime) * 100) + '%';
      }

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        submitQuiz();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ---- Submit ----
  function confirmSubmit() {
    const unanswered = userAnswers.filter(a => a === -1).length;

    if (unanswered > 0) {
      const bodyHtml = `
        <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
          You have <strong style="color: var(--accent-yellow);">${unanswered} unanswered question(s)</strong>.
        </p>
        <p style="color: var(--text-secondary);">
          Are you sure you want to submit your quiz now?
        </p>
      `;
      const footerHtml = `
        <button class="btn btn-secondary" onclick="App.closeModal()">Continue Quiz</button>
        <button class="btn btn-success" onclick="App.closeModal(); Quiz.submitQuiz();">✅ Submit Quiz</button>
      `;
      App.openModal('Confirm Submission', bodyHtml, footerHtml);
    } else {
      submitQuiz();
    }
  }

  async function submitQuiz() {
    stopTimer();

    const timeTaken = Math.round((Date.now() - quizStartTime) / 1000);

    // Calculate score
    let score = 0;
    const answerDetails = shuffledQuestions.map((q, i) => {
      const selected = userAnswers[i];
      const selectedAnswerText = selected !== -1 ? q.options[selected] : null;
      const isCorrect = selectedAnswerText === q.correctAnswer;
      if (isCorrect) score++;

      return {
        questionId: q.id,
        questionText: q.text,
        options: q.options,
        selectedAnswer: selectedAnswerText,
        correctAnswer: q.correctAnswer,
        isCorrect
      };
    });

    const percentage = Math.round((score / shuffledQuestions.length) * 100);

    const currentUser = App.getCurrentUser();

    const result = {
      id: App.generateId(),
      quizId: currentQuiz.id,
      quizTitle: currentQuiz.title,
      userId: currentUser ? currentUser.id : null,
      userName,
      score,
      totalQuestions: shuffledQuestions.length,
      percentage,
      timeTaken: Math.min(timeTaken, totalTime),
      answers: answerDetails,
      completedAt: new Date().toISOString()
    };

    // Save result
    await App.saveResult(result);

    // Show results
    showQuizResult(result);
  }

  // ---- Show Result ----
  function showQuizResult(result) {
    const container = document.getElementById('quizContent');

    let scoreClass, message;
    if (result.percentage >= 80) {
      scoreClass = 'excellent';
      message = '🎉 Excellent!';
      App.launchConfetti();
    } else if (result.percentage >= 60) {
      scoreClass = 'good';
      message = '👍 Great Job!';
    } else if (result.percentage >= 40) {
      scoreClass = 'average';
      message = '💪 Keep Practicing!';
    } else {
      scoreClass = 'poor';
      message = '📚 Needs Improvement!';
    }

    container.innerHTML = `
      <div class="score-display">
        <div class="score-circle ${scoreClass}">
          <div class="score-value">${result.percentage}%</div>
          <div class="score-label">Score</div>
        </div>
        <h2 class="score-message">${message}</h2>
        <p class="score-detail">
          ${App.escapeHtml(result.userName)} — ${App.escapeHtml(result.quizTitle)}
        </p>
      </div>

      <div class="result-stats">
        <div class="result-stat">
          <div class="result-stat-value text-green">${result.score}</div>
          <div class="result-stat-label">Correct</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-value text-red">${result.totalQuestions - result.score}</div>
          <div class="result-stat-label">Incorrect</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-value text-purple">${result.totalQuestions}</div>
          <div class="result-stat-label">Total Questions</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-value text-cyan">${App.formatTime(result.timeTaken)}</div>
          <div class="result-stat-label">Time Taken</div>
        </div>
      </div>

      <!-- Answer Review -->
      <div class="card mt-2xl">
        <div class="card-header">
          <h3 class="card-title">📋 Answer Review</h3>
        </div>
        <div class="review-list">
          ${result.answers.map((a, i) => {
            const letters = ['A', 'B', 'C', 'D'];
            return `
              <div class="review-item ${a.isCorrect ? 'correct-answer' : 'wrong-answer'}">
                <div class="review-question">
                  <span class="review-status">${a.isCorrect ? '✅' : '❌'}</span>
                  <span><strong>Question ${i + 1}:</strong> ${App.escapeHtml(a.questionText)}</span>
                </div>
                <div class="review-options">
                  ${a.options.map((opt, j) => {
                    let cls = '';
                    if (opt === a.correctAnswer) cls += 'correct-option ';
                    if (opt === a.selectedAnswer && !a.isCorrect) cls += 'user-selected ';
                    if (opt === a.selectedAnswer && a.isCorrect) cls += 'correct-option ';

                    return `
                      <div class="review-option ${cls}">
                        <strong>${letters[j]}.</strong> ${App.escapeHtml(opt)}
                        ${opt === a.correctAnswer ? ' ✅' : ''}
                        ${opt === a.selectedAnswer && !a.isCorrect ? ' ❌ (Your choice)' : ''}
                        ${opt === a.selectedAnswer && a.isCorrect ? ' (Your choice)' : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="flex justify-center gap-md mt-2xl mb-xl">
        <button class="btn btn-secondary btn-lg" onclick="Quiz.renderSelection()">
          ← Select Another Quiz
        </button>
        <button class="btn btn-primary btn-lg" onclick="Quiz.startEntry('${result.quizId}')">
          🔄 Retake Quiz
        </button>
        <button class="btn btn-success btn-lg" onclick="App.navigate('results')">
          🏆 View Results Overview
        </button>
      </div>
    `;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Public API
  return {
    renderSelection,
    startEntry,
    beginQuiz,
    selectAnswer,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    confirmSubmit,
    submitQuiz,
    showQuizResult
  };
})();
