// ============================================================
// ApexTesting — Tạo Assignments Tự Động Từ Lịch Định Kỳ
// Chạy qua GitHub Actions hoặc thủ công: node generate-assignments.js
// Sử dụng Microsoft 365 SMTP (smtp.office365.com)
// ============================================================

const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// ---- Config từ ENV ----
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_APP_PASSWORD = process.env.SMTP_APP_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SITE_URL = process.env.SITE_URL || 'https://john-cpu25.github.io/Testing/';

if (!SMTP_EMAIL || !SMTP_APP_PASSWORD || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu biến môi trường. Cần: SMTP_EMAIL, SMTP_APP_PASSWORD, SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_APP_PASSWORD
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function buildAssignmentEmail(userName, quizTitle, deadlineStr) {
  const color = '#1e3a5f';
  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,${color},${adjustColor(color, -30)});padding:30px 20px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">📋 Bạn Có Bài Test Mới!</h1>
    </div>
    <div style="padding:30px 25px;">
      <p style="font-size:16px;color:#333;">Xin chào <strong>${userName}</strong>,</p>
      <p style="font-size:15px;color:#555;line-height:1.6;">Bạn vừa được giao bài kiểm tra mới. Vui lòng hoàn thành trước hạn nộp.</p>
      <div style="background:#f8f9fa;border-left:4px solid ${color};padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#666;">📝 <strong>Bài kiểm tra:</strong> ${quizTitle}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#666;">⏰ <strong>Hạn nộp:</strong> ${deadlineStr}</p>
      </div>
      <div style="text-align:center;margin:25px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,${color},${adjustColor(color, -30)});color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          🔗 Vào Làm Bài Test
        </a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">APEX Southern Cross Engineering</p>
      <p style="margin:4px 0 0;color:#bbb;font-size:11px;">Email tự động từ hệ thống ApexTesting — Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body>
</html>`;
}

// ---- Tính next_run_at mới ----
function calculateNextRun(schedule) {
  const now = new Date();
  switch (schedule.frequency) {
    case 'monthly':   return new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    case 'quarterly': return new Date(now.getTime() + 90 * 24 * 3600 * 1000);
    case 'biannual':  return new Date(now.getTime() + 180 * 24 * 3600 * 1000);
    case 'annual':    return new Date(now.getTime() + 365 * 24 * 3600 * 1000);
    case 'custom':    return new Date(now.getTime() + (schedule.interval_days || 30) * 24 * 3600 * 1000);
    default:          return new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  }
}

// ============================================================
// MAIN: Tạo assignments từ schedules
// ============================================================
async function main() {
  console.log('='.repeat(60));
  console.log('📅 ApexTesting Assignment Generator — Microsoft 365 SMTP');
  console.log(`⏰ ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log('='.repeat(60));

  // Verify SMTP
  try {
    await transporter.verify();
    console.log('✅ Kết nối SMTP thành công');
  } catch (err) {
    console.error(`❌ Không kết nối được SMTP: ${err.message}`);
    process.exit(1);
  }

  // Lấy schedules đến hạn chạy
  const now = new Date().toISOString();
  const { data: schedules, error: schErr } = await supabase
    .from('Apex_Testing_quiz_schedules')
    .select('*, Apex_Testing_quizzes ( id, title )')
    .eq('active', true)
    .lte('next_run_at', now);

  if (schErr) {
    console.error(`❌ Lỗi truy vấn schedules: ${schErr.message}`);
    process.exit(1);
  }

  if (!schedules || schedules.length === 0) {
    console.log('ℹ️  Không có lịch nào đến hạn tạo assignment.');
    console.log('✅ Hoàn tất.');
    return;
  }

  console.log(`📋 Tìm thấy ${schedules.length} schedule(s) cần xử lý\n`);
  let totalCreated = 0;

  for (const sch of schedules) {
    const quiz = sch.Apex_Testing_quizzes || sch.Testing_quizzes;
    if (!quiz) {
      console.log(`⚠️ Bỏ qua schedule ${sch.id} — không tìm thấy quiz`);
      continue;
    }

    console.log(`\n📌 Schedule: ${quiz.title} (${sch.frequency})`);

    // Tính deadline
    const deadline = new Date(Date.now() + (sch.deadline_days || 7) * 24 * 3600 * 1000);
    const deadlineStr = formatDate(deadline.toISOString());

    // Lấy danh sách users phù hợp
    let userQuery = supabase.from('Apex_Testing_users').select('id, email, display_name, role');

    if (sch.target_user_ids && sch.target_user_ids.length > 0) {
      userQuery = userQuery.in('id', sch.target_user_ids);
    } else if (sch.target_role === 'all') {
      userQuery = userQuery.in('role', ['user', 'leader', 'manager']);
    } else if (sch.target_role) {
      userQuery = userQuery.eq('role', sch.target_role);
    } else {
      console.log('  ⚠️ Không xác định được target → bỏ qua');
      continue;
    }

    const { data: users, error: uErr } = await userQuery;
    if (uErr) {
      console.error(`  ❌ Lỗi truy vấn users: ${uErr.message}`);
      continue;
    }

    console.log(`  👥 ${users.length} user(s) phù hợp`);
    let created = 0;

    for (const user of users) {
      // Kiểm tra đã có assignment pending/in_progress chưa
      const { data: existing } = await supabase
        .from('Apex_Testing_quiz_assignments')
        .select('id')
        .eq('user_id', user.id)
        .eq('quiz_id', sch.quiz_id)
        .in('status', ['pending', 'in_progress'])
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  ⏭️  ${user.display_name} — đã có assignment → bỏ qua`);
        continue;
      }

      // Tạo assignment mới
      const { error: insertErr } = await supabase
        .from('Apex_Testing_quiz_assignments')
        .insert({
          quiz_id: sch.quiz_id,
          user_id: user.id,
          assigned_by: sch.created_by,
          deadline: deadline.toISOString(),
          status: 'pending'
        });

      if (insertErr) {
        console.error(`  ❌ Lỗi tạo assignment cho ${user.display_name}: ${insertErr.message}`);
        continue;
      }

      // Gửi email thông báo
      const subject = `📋 Bài test mới: ${quiz.title}`;
      const html = buildAssignmentEmail(user.display_name, quiz.title, deadlineStr);

      try {
        await transporter.sendMail({
          from: `"ApexTesting" <${SMTP_EMAIL}>`,
          to: user.email,
          subject: subject,
          html: html
        });
        console.log(`  ✅ ${user.display_name} → assignment + email OK`);

        // Log email
        await supabase.from('Apex_Testing_email_logs').insert({
          user_id: user.id,
          quiz_id: sch.quiz_id,
          email: user.email,
          type: 'assignment',
          subject: subject,
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      } catch (emailErr) {
        console.error(`  ⚠️ ${user.display_name} → assignment OK, email THẤT BẠI: ${emailErr.message}`);
        await supabase.from('Apex_Testing_email_logs').insert({
          user_id: user.id,
          quiz_id: sch.quiz_id,
          email: user.email,
          type: 'assignment',
          subject: subject,
          status: 'failed',
          error_message: emailErr.message
        });
      }

      created++;
    }

    totalCreated += created;

    // Cập nhật schedule: last_run_at + next_run_at
    const nextRun = calculateNextRun(sch);
    await supabase
      .from('Apex_Testing_quiz_schedules')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRun.toISOString()
      })
      .eq('id', sch.id);

    console.log(`  📊 Tạo ${created} assignment(s) mới | Next run: ${formatDate(nextRun.toISOString())}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 TỔNG KẾT: Tạo ${totalCreated} assignment(s) mới`);
  console.log('='.repeat(60));
  console.log('✅ Hoàn tất.');
}

main().catch(err => {
  console.error('❌ Lỗi không xử lý được:', err);
  process.exit(1);
});
