/* ============================================
   Schedule.js - Recurring Quiz Schedule Management
   Admin only: create, edit, toggle, delete schedules
   ============================================ */

const Schedule = (() => {
  const supabaseUrl = 'https://ejyirnfxuezipogweybo.supabase.co';
  const supabaseKey = 'sb_publishable_r1DKG_nf_nyivQgbe6D7YA_zow13__G';
  const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

  const FREQUENCY_LABELS = {
    monthly: '📅 Monthly',
    quarterly: '📆 Quarterly (3 mos)',
    biannual: '🗓️ Biannual (6 mos)',
    annual: '📅 Annual',
    custom: '⚙️ Custom'
  };

  // ---- Fetch Schedules ----
  async function getSchedules() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('Testing_quiz_schedules')
      .select(`
        *,
        Testing_quizzes ( title ),
        Testing_users!Testing_quiz_schedules_created_by_fkey ( display_name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
    return data || [];
  }

  // ---- Render Schedule List ----
  async function render() {
    const schedules = await getSchedules();
    const container = document.getElementById('scheduleList');

    document.getElementById('btnCreateSchedule').onclick = showCreateForm;

    if (schedules.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">No recurring schedules yet</div>
          <div class="empty-state-text">Create a schedule to automate quiz assignments and email notifications.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = schedules.map(s => renderScheduleCard(s)).join('');
  }

  function renderScheduleCard(schedule) {
    const quizTitle = schedule.Testing_quizzes ? schedule.Testing_quizzes.title : 'Deleted Quiz';
    const createdBy = schedule.Testing_users ? schedule.Testing_users.display_name : 'Unknown';
    const freqLabel = FREQUENCY_LABELS[schedule.frequency] || schedule.frequency;
    const nextRun = schedule.next_run_at ? App.formatDate(schedule.next_run_at) : '—';
    const lastRun = schedule.last_run_at ? App.formatDate(schedule.last_run_at) : 'Never run';
    const statusClass = schedule.active ? 'badge-green' : 'badge-red';
    const statusLabel = schedule.active ? '🟢 Active' : '🔴 Paused';

    const targetLabel = schedule.target_role === 'all' ? 'All Roles' 
      : schedule.target_role === 'user' ? 'Employees' 
      : 'Managers';

    return `
      <div class="card mb-lg" style="animation: slideUp 0.3s ease; border-left: 4px solid ${schedule.active ? 'var(--accent-green)' : 'var(--accent-red)'};">
        <div class="card-header">
          <div>
            <h3 class="card-title">${App.escapeHtml(quizTitle)}</h3>
            <p class="text-secondary" style="font-size: var(--font-size-sm); margin-top: 4px;">
              Created by ${App.escapeHtml(createdBy)}
            </p>
          </div>
          <div class="btn-group">
            <button class="btn ${schedule.active ? 'btn-warning' : 'btn-success'} btn-sm" 
              onclick="Schedule.toggleActive('${schedule.id}', ${!schedule.active})">
              ${schedule.active ? '⏸️ Pause' : '▶️ Resume'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Schedule.editSchedule('${schedule.id}')">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="Schedule.deleteSchedule('${schedule.id}')">
              🗑️ Delete
            </button>
          </div>
        </div>

        <div class="flex gap-lg mb-lg" style="flex-wrap: wrap;">
          <span class="badge ${statusClass}">${statusLabel}</span>
          <span class="badge badge-purple">${freqLabel}</span>
          <span class="badge badge-cyan">⏱️ ${schedule.deadline_days} days to complete</span>
          <span class="badge badge-orange">🔔 Remind ${schedule.remind_before_days} days before</span>
          <span class="badge badge-pink">👥 ${targetLabel}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); padding: var(--spacing-md); background: var(--bg-main); border-radius: var(--radius-md);">
          <div>
            <div class="text-secondary" style="font-size: var(--font-size-xs); margin-bottom: 4px;">📅 Next Scheduled Run</div>
            <div style="font-weight: 600; color: var(--text-primary);">${nextRun}</div>
          </div>
          <div>
            <div class="text-secondary" style="font-size: var(--font-size-xs); margin-bottom: 4px;">🕐 Last Run</div>
            <div style="font-weight: 600; color: var(--text-primary);">${lastRun}</div>
          </div>
          ${schedule.frequency === 'custom' ? `
          <div>
            <div class="text-secondary" style="font-size: var(--font-size-xs); margin-bottom: 4px;">🔄 Interval</div>
            <div style="font-weight: 600; color: var(--text-primary);">Every ${schedule.interval_days} days</div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ---- Create Schedule Form ----
  async function showCreateForm() {
    const quizzes = await App.getQuizzes();

    if (quizzes.length === 0) {
      alert('No quizzes available! Please create a quiz first.');
      return;
    }

    const quizOptions = quizzes.map(q => 
      `<option value="${q.id}">${App.escapeHtml(q.title)} (${q.questions.length} questions)</option>`
    ).join('');

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Select Quiz *</label>
        <select class="form-select" id="schedQuizId">
          ${quizOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Repeat Frequency *</label>
        <select class="form-select" id="schedFrequency" onchange="Schedule.onFrequencyChange()">
          <option value="monthly">Monthly (every month)</option>
          <option value="quarterly" selected>Quarterly (every 3 months)</option>
          <option value="biannual">Biannual (every 6 months)</option>
          <option value="annual">Annual (every year)</option>
          <option value="custom">Custom interval</option>
        </select>
      </div>
      <div class="form-group hidden" id="customIntervalGroup">
        <label class="form-label">Days between runs</label>
        <input type="number" class="form-input" id="schedIntervalDays" value="30" min="1" max="365">
      </div>
      <div class="form-group">
        <label class="form-label">Days to Complete (Deadline) *</label>
        <input type="number" class="form-input" id="schedDeadlineDays" value="7" min="1" max="60">
        <p class="form-hint">Number of days users have to complete the test after assignment</p>
      </div>
      <div class="form-group">
        <label class="form-label">Reminder before deadline (days) *</label>
        <input type="number" class="form-input" id="schedRemindDays" value="3" min="1" max="30">
        <p class="form-hint">Send reminder notification email X days before deadline</p>
      </div>
      <div class="form-group">
        <label class="form-label">Assign To *</label>
        <select class="form-select" id="schedTargetRole">
          <option value="all">All Roles (Users + Managers)</option>
          <option value="user" selected>Employees Only (Role: user)</option>
          <option value="manager">Managers Only</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">First Run Date *</label>
        <input type="date" class="form-input" id="schedStartDate" value="${getDefaultStartDate()}">
        <p class="form-hint">The first batch of assignments will be dispatched on this date</p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Schedule.saveNewSchedule()">📅 Create Schedule</button>
    `;

    App.openModal('Create Recurring Test Schedule', bodyHtml, footerHtml);
  }

  function getDefaultStartDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  function onFrequencyChange() {
    const freq = document.getElementById('schedFrequency').value;
    const custom = document.getElementById('customIntervalGroup');
    if (freq === 'custom') {
      custom.classList.remove('hidden');
    } else {
      custom.classList.add('hidden');
    }
  }

  // ---- Save New Schedule ----
  async function saveNewSchedule() {
    const quizId = document.getElementById('schedQuizId').value;
    const frequency = document.getElementById('schedFrequency').value;
    const intervalDays = parseInt(document.getElementById('schedIntervalDays').value) || 30;
    const deadlineDays = parseInt(document.getElementById('schedDeadlineDays').value) || 7;
    const remindDays = parseInt(document.getElementById('schedRemindDays').value) || 3;
    const targetRole = document.getElementById('schedTargetRole').value;
    const startDate = document.getElementById('schedStartDate').value;

    if (!quizId || !startDate) {
      alert('Please fill in all required fields!');
      return;
    }

    if (remindDays >= deadlineDays) {
      alert('Reminder days must be less than deadline days!');
      return;
    }

    const user = App.getCurrentUser();

    const { error } = await supabase
      .from('Testing_quiz_schedules')
      .insert({
        quiz_id: quizId,
        created_by: user ? user.id : null,
        frequency,
        interval_days: frequency === 'custom' ? intervalDays : getDefaultInterval(frequency),
        deadline_days: deadlineDays,
        remind_before_days: remindDays,
        target_role: targetRole,
        next_run_at: new Date(startDate + 'T00:00:00+07:00').toISOString(),
        active: true
      });

    if (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule: ' + error.message);
      return;
    }

    App.closeModal();
    await render();
  }

  function getDefaultInterval(frequency) {
    switch (frequency) {
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'biannual': return 180;
      case 'annual': return 365;
      default: return 30;
    }
  }

  // ---- Edit Schedule ----
  async function editSchedule(scheduleId) {
    const schedules = await getSchedules();
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const quizzes = await App.getQuizzes();
    const quizOptions = quizzes.map(q =>
      `<option value="${q.id}" ${q.id === schedule.quiz_id ? 'selected' : ''}>${App.escapeHtml(q.title)}</option>`
    ).join('');

    const nextRunDate = schedule.next_run_at ? schedule.next_run_at.split('T')[0] : '';

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Quiz</label>
        <select class="form-select" id="editSchedQuizId">${quizOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Frequency</label>
        <select class="form-select" id="editSchedFrequency" onchange="Schedule.onFrequencyChange()">
          <option value="monthly" ${schedule.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
          <option value="quarterly" ${schedule.frequency === 'quarterly' ? 'selected' : ''}>Quarterly (3 months)</option>
          <option value="biannual" ${schedule.frequency === 'biannual' ? 'selected' : ''}>Biannual (6 months)</option>
          <option value="annual" ${schedule.frequency === 'annual' ? 'selected' : ''}>Annual</option>
          <option value="custom" ${schedule.frequency === 'custom' ? 'selected' : ''}>Custom</option>
        </select>
      </div>
      <div class="form-group ${schedule.frequency !== 'custom' ? 'hidden' : ''}" id="customIntervalGroup">
        <label class="form-label">Days between runs</label>
        <input type="number" class="form-input" id="editSchedIntervalDays" value="${schedule.interval_days}" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Deadline (days)</label>
        <input type="number" class="form-input" id="editSchedDeadlineDays" value="${schedule.deadline_days}" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Remind before (days)</label>
        <input type="number" class="form-input" id="editSchedRemindDays" value="${schedule.remind_before_days}" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Assign To</label>
        <select class="form-select" id="editSchedTargetRole">
          <option value="all" ${schedule.target_role === 'all' ? 'selected' : ''}>All Roles</option>
          <option value="user" ${schedule.target_role === 'user' ? 'selected' : ''}>Employees</option>
          <option value="manager" ${schedule.target_role === 'manager' ? 'selected' : ''}>Managers</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Next Scheduled Run</label>
        <input type="date" class="form-input" id="editSchedNextRun" value="${nextRunDate}">
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Schedule.saveEditSchedule('${scheduleId}')">💾 Save</button>
    `;

    App.openModal('Edit Recurring Schedule', bodyHtml, footerHtml);
  }

  async function saveEditSchedule(scheduleId) {
    const quizId = document.getElementById('editSchedQuizId').value;
    const frequency = document.getElementById('editSchedFrequency').value;
    const intervalDays = parseInt(document.getElementById('editSchedIntervalDays').value) || 30;
    const deadlineDays = parseInt(document.getElementById('editSchedDeadlineDays').value) || 7;
    const remindDays = parseInt(document.getElementById('editSchedRemindDays').value) || 3;
    const targetRole = document.getElementById('editSchedTargetRole').value;
    const nextRunDate = document.getElementById('editSchedNextRun').value;

    if (remindDays >= deadlineDays) {
      alert('Reminder days must be less than deadline days!');
      return;
    }

    const updateData = {
      quiz_id: quizId,
      frequency,
      interval_days: frequency === 'custom' ? intervalDays : getDefaultInterval(frequency),
      deadline_days: deadlineDays,
      remind_before_days: remindDays,
      target_role: targetRole,
    };

    if (nextRunDate) {
      updateData.next_run_at = new Date(nextRunDate + 'T00:00:00+07:00').toISOString();
    }

    const { error } = await supabase
      .from('Testing_quiz_schedules')
      .update(updateData)
      .eq('id', scheduleId);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    App.closeModal();
    await render();
  }

  // ---- Toggle Active ----
  async function toggleActive(scheduleId, newActive) {
    const { error } = await supabase
      .from('Testing_quiz_schedules')
      .update({ active: newActive })
      .eq('id', scheduleId);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    await render();
  }

  // ---- Delete Schedule ----
  async function deleteSchedule(scheduleId) {
    const bodyHtml = `
      <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
        Are you sure you want to delete this recurring schedule?
      </p>
      <p style="color: var(--accent-red); font-size: var(--font-size-sm);">
        ⚠️ This action cannot be undone. Previously dispatched assignments will not be affected.
      </p>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="Schedule.confirmDelete('${scheduleId}')">🗑️ Delete</button>
    `;

    App.openModal('Confirm Deletion', bodyHtml, footerHtml);
  }

  async function confirmDelete(scheduleId) {
    const { error } = await supabase
      .from('Testing_quiz_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    App.closeModal();
    await render();
  }

  // Public API
  return {
    render,
    showCreateForm,
    saveNewSchedule,
    editSchedule,
    saveEditSchedule,
    toggleActive,
    deleteSchedule,
    confirmDelete,
    onFrequencyChange
  };
})();
