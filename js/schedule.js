/* ============================================
   Schedule.js - Recurring Quiz Schedule Management
   Admin only: create, edit, toggle, delete schedules
   ============================================ */

const Schedule = (() => {
  const supabaseUrl = 'https://ejyirnfxuezipogweybo.supabase.co';
  const supabaseKey = 'sb_publishable_r1DKG_nf_nyivQgbe6D7YA_zow13__G';
  const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

  const FREQUENCY_LABELS = {
    monthly: '📅 Hàng tháng',
    quarterly: '📆 3 tháng / lần',
    biannual: '🗓️ 6 tháng / lần',
    annual: '📅 Hàng năm',
    custom: '⚙️ Tùy chỉnh'
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
          <div class="empty-state-title">Chưa có lịch định kỳ nào</div>
          <div class="empty-state-text">Tạo lịch để tự động giao bài test cho nhân viên theo chu kỳ.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = schedules.map(s => renderScheduleCard(s)).join('');
  }

  function renderScheduleCard(schedule) {
    const quizTitle = schedule.Testing_quizzes ? schedule.Testing_quizzes.title : 'Quiz đã xóa';
    const createdBy = schedule.Testing_users ? schedule.Testing_users.display_name : 'Unknown';
    const freqLabel = FREQUENCY_LABELS[schedule.frequency] || schedule.frequency;
    const nextRun = schedule.next_run_at ? App.formatDate(schedule.next_run_at) : '—';
    const lastRun = schedule.last_run_at ? App.formatDate(schedule.last_run_at) : 'Chưa chạy';
    const statusClass = schedule.active ? 'badge-green' : 'badge-red';
    const statusLabel = schedule.active ? '🟢 Đang hoạt động' : '🔴 Tạm dừng';

    const targetLabel = schedule.target_role === 'all' ? 'Tất cả' 
      : schedule.target_role === 'user' ? 'Nhân viên' 
      : 'Manager';

    return `
      <div class="card mb-lg" style="animation: slideUp 0.3s ease; border-left: 4px solid ${schedule.active ? 'var(--accent-green)' : 'var(--accent-red)'};">
        <div class="card-header">
          <div>
            <h3 class="card-title">${App.escapeHtml(quizTitle)}</h3>
            <p class="text-secondary" style="font-size: var(--font-size-sm); margin-top: 4px;">
              Tạo bởi ${App.escapeHtml(createdBy)}
            </p>
          </div>
          <div class="btn-group">
            <button class="btn ${schedule.active ? 'btn-warning' : 'btn-success'} btn-sm" 
              onclick="Schedule.toggleActive('${schedule.id}', ${!schedule.active})">
              ${schedule.active ? '⏸️ Tạm dừng' : '▶️ Bật lại'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Schedule.editSchedule('${schedule.id}')">
              ✏️ Sửa
            </button>
            <button class="btn btn-danger btn-sm" onclick="Schedule.deleteSchedule('${schedule.id}')">
              🗑️ Xóa
            </button>
          </div>
        </div>

        <div class="flex gap-lg mb-lg" style="flex-wrap: wrap;">
          <span class="badge ${statusClass}">${statusLabel}</span>
          <span class="badge badge-purple">${freqLabel}</span>
          <span class="badge badge-cyan">⏱️ ${schedule.deadline_days} ngày để hoàn thành</span>
          <span class="badge badge-orange">🔔 Nhắc trước ${schedule.remind_before_days} ngày</span>
          <span class="badge badge-pink">👥 ${targetLabel}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md); padding: var(--spacing-md); background: var(--bg-main); border-radius: var(--radius-md);">
          <div>
            <div class="text-secondary" style="font-size: var(--font-size-xs); margin-bottom: 4px;">📅 Lần giao tiếp theo</div>
            <div style="font-weight: 600; color: var(--text-primary);">${nextRun}</div>
          </div>
          <div>
            <div class="text-secondary" style="font-size: var(--font-size-xs); margin-bottom: 4px;">🕐 Lần giao gần nhất</div>
            <div style="font-weight: 600; color: var(--text-primary);">${lastRun}</div>
          </div>
          ${schedule.frequency === 'custom' ? `
          <div>
            <div class="text-secondary" style="font-size: var(--font-size-xs); margin-bottom: 4px;">🔄 Chu kỳ</div>
            <div style="font-weight: 600; color: var(--text-primary);">Mỗi ${schedule.interval_days} ngày</div>
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
      alert('Chưa có quiz nào! Hãy tạo quiz trước.');
      return;
    }

    const quizOptions = quizzes.map(q => 
      `<option value="${q.id}">${App.escapeHtml(q.title)} (${q.questions.length} câu)</option>`
    ).join('');

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Chọn bài test *</label>
        <select class="form-select" id="schedQuizId">
          ${quizOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tần suất lặp lại *</label>
        <select class="form-select" id="schedFrequency" onchange="Schedule.onFrequencyChange()">
          <option value="monthly">Hàng tháng (1 tháng)</option>
          <option value="quarterly" selected>3 tháng / lần</option>
          <option value="biannual">6 tháng / lần</option>
          <option value="annual">Hàng năm</option>
          <option value="custom">Tùy chỉnh</option>
        </select>
      </div>
      <div class="form-group hidden" id="customIntervalGroup">
        <label class="form-label">Số ngày giữa các lần</label>
        <input type="number" class="form-input" id="schedIntervalDays" value="30" min="1" max="365">
      </div>
      <div class="form-group">
        <label class="form-label">Số ngày để hoàn thành (deadline) *</label>
        <input type="number" class="form-input" id="schedDeadlineDays" value="7" min="1" max="60">
        <p class="form-hint">Sau khi giao bài, user có bao nhiêu ngày để nộp</p>
      </div>
      <div class="form-group">
        <label class="form-label">Nhắc nhở trước deadline (ngày) *</label>
        <input type="number" class="form-input" id="schedRemindDays" value="3" min="1" max="30">
        <p class="form-hint">Gửi email nhắc khi còn X ngày trước hạn nộp</p>
      </div>
      <div class="form-group">
        <label class="form-label">Giao cho ai *</label>
        <select class="form-select" id="schedTargetRole">
          <option value="all">Tất cả (user + manager)</option>
          <option value="user" selected>Chỉ nhân viên (role: user)</option>
          <option value="manager">Chỉ manager</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ngày bắt đầu lần đầu *</label>
        <input type="date" class="form-input" id="schedStartDate" value="${getDefaultStartDate()}">
        <p class="form-hint">Lần giao bài đầu tiên sẽ diễn ra vào ngày này</p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="Schedule.saveNewSchedule()">📅 Tạo Lịch</button>
    `;

    App.openModal('Tạo Lịch Test Định Kỳ', bodyHtml, footerHtml);
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
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (remindDays >= deadlineDays) {
      alert('Số ngày nhắc nhở phải nhỏ hơn số ngày deadline!');
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
      alert('Lỗi khi tạo lịch: ' + error.message);
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
        <label class="form-label">Bài test</label>
        <select class="form-select" id="editSchedQuizId">${quizOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Tần suất</label>
        <select class="form-select" id="editSchedFrequency" onchange="Schedule.onFrequencyChange()">
          <option value="monthly" ${schedule.frequency === 'monthly' ? 'selected' : ''}>Hàng tháng</option>
          <option value="quarterly" ${schedule.frequency === 'quarterly' ? 'selected' : ''}>3 tháng / lần</option>
          <option value="biannual" ${schedule.frequency === 'biannual' ? 'selected' : ''}>6 tháng / lần</option>
          <option value="annual" ${schedule.frequency === 'annual' ? 'selected' : ''}>Hàng năm</option>
          <option value="custom" ${schedule.frequency === 'custom' ? 'selected' : ''}>Tùy chỉnh</option>
        </select>
      </div>
      <div class="form-group ${schedule.frequency !== 'custom' ? 'hidden' : ''}" id="customIntervalGroup">
        <label class="form-label">Số ngày giữa các lần</label>
        <input type="number" class="form-input" id="editSchedIntervalDays" value="${schedule.interval_days}" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Deadline (ngày)</label>
        <input type="number" class="form-input" id="editSchedDeadlineDays" value="${schedule.deadline_days}" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Nhắc trước (ngày)</label>
        <input type="number" class="form-input" id="editSchedRemindDays" value="${schedule.remind_before_days}" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">Giao cho</label>
        <select class="form-select" id="editSchedTargetRole">
          <option value="all" ${schedule.target_role === 'all' ? 'selected' : ''}>Tất cả</option>
          <option value="user" ${schedule.target_role === 'user' ? 'selected' : ''}>Nhân viên</option>
          <option value="manager" ${schedule.target_role === 'manager' ? 'selected' : ''}>Manager</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Lần giao tiếp theo</label>
        <input type="date" class="form-input" id="editSchedNextRun" value="${nextRunDate}">
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="Schedule.saveEditSchedule('${scheduleId}')">💾 Lưu</button>
    `;

    App.openModal('Chỉnh Sửa Lịch Định Kỳ', bodyHtml, footerHtml);
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
      alert('Số ngày nhắc nhở phải nhỏ hơn deadline!');
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
      alert('Lỗi: ' + error.message);
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
      alert('Lỗi: ' + error.message);
      return;
    }
    await render();
  }

  // ---- Delete Schedule ----
  async function deleteSchedule(scheduleId) {
    const bodyHtml = `
      <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
        Bạn có chắc muốn xóa lịch định kỳ này?
      </p>
      <p style="color: var(--accent-red); font-size: var(--font-size-sm);">
        ⚠️ Hành động này không thể hoàn tác. Các assignments đã giao sẽ không bị ảnh hưởng.
      </p>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Hủy</button>
      <button class="btn btn-danger" onclick="Schedule.confirmDelete('${scheduleId}')">🗑️ Xóa</button>
    `;

    App.openModal('Xác Nhận Xóa Lịch', bodyHtml, footerHtml);
  }

  async function confirmDelete(scheduleId) {
    const { error } = await supabase
      .from('Testing_quiz_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      alert('Lỗi: ' + error.message);
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
