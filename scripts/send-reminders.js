// ============================================================
// ApexTesting — Gửi Email Nhắc Nhở Tự Động
// Chạy qua GitHub Actions hoặc thủ công: node send-reminders.js
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

// ---- Kiểm tra biến môi trường ----
if (!SMTP_EMAIL || !SMTP_APP_PASSWORD || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu biến môi trường. Cần: SMTP_EMAIL, SMTP_APP_PASSWORD, SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

// ---- Khởi tạo ----
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_APP_PASSWORD
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

// ---- Email Templates ----
function buildEmailHTML({ title, color, heading, userName, body, deadline }) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,${color},${adjustColor(color, -30)});padding:30px 20px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">${heading}</h1>
    </div>

    <!-- Body -->
    <div style="padding:30px 25px;">
      <p style="font-size:16px;color:#333;">Xin chào <strong>${userName}</strong>,</p>
      <p style="font-size:15px;color:#555;line-height:1.6;">${body}</p>
      
      <div style="background:#f8f9fa;border-left:4px solid ${color};padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#666;">📝 <strong>Bài kiểm tra:</strong> ${title}</p>
        ${deadline ? `<p style="margin:8px 0 0;font-size:14px;color:#666;">⏰ <strong>Hạn nộp:</strong> ${deadline}</p>` : ''}
      </div>

      <div style="text-align:center;margin:25px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,${color},${adjustColor(color, -30)});color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          🔗 Vào Làm Bài Test
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">APEX Southern Cross Engineering</p>
      <p style="margin:4px 0 0;color:#bbb;font-size:11px;">Email tự động từ hệ thống ApexTesting — Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body>
</html>`;
}

function adjustColor(hex, amount) {
  // Simple color darkener for gradient
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  // Vietnam timezone (UTC+7)
  const options = {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  };
  return d.toLocaleString('vi-VN', options);
}

// ---- Ghi log email vào Supabase ----
async function logEmail(userId, quizId, assignmentId, email, type, subject, status, errorMsg = null) {
  const { error } = await supabase.from('Apex_Testing_email_logs').insert({
    user_id: userId,
    quiz_id: quizId,
    assignment_id: assignmentId,
    email: email,
    type: type,
    subject: subject,
    status: status,
    error_message: errorMsg,
    sent_at: status === 'sent' ? new Date().toISOString() : null
  });
  if (error) console.error(`  ⚠️ Lỗi ghi log email: ${error.message}`);
}

// ---- Kiểm tra đã gửi chưa (tránh spam) ----
async function alreadySent(assignmentId, type, hoursAgo) {
  const cutoff = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('Apex_Testing_email_logs')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('type', type)
    .eq('status', 'sent')
    .gte('created_at', cutoff)
    .limit(1);

  if (error) {
    console.error(`  ⚠️ Lỗi kiểm tra log: ${error.message}`);
    return true; // Lỗi thì skip (an toàn)
  }
  return data && data.length > 0;
}

// ---- Gửi email ----
async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"ApexTesting" <${SMTP_EMAIL}>`,
      to: to,
      subject: subject,
      html: html
    });
    console.log(`  ✅ Gửi thành công → ${to} (ID: ${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`  ❌ Gửi thất bại → ${to}: ${err.message}`);
    return false;
  }
}

// ============================================================
// MAIN: Kiểm tra và gửi nhắc nhở
// ============================================================
async function main() {
  console.log('='.repeat(60));
  console.log('📧 ApexTesting Email Scheduler — Microsoft 365 SMTP');
  console.log(`⏰ ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log('='.repeat(60));

  // Verify SMTP connection
  try {
    await transporter.verify();
    console.log('✅ Kết nối SMTP thành công');
  } catch (err) {
    console.error(`❌ Không kết nối được SMTP: ${err.message}`);
    process.exit(1);
  }

  // Lấy tất cả assignments đang pending/in_progress có deadline
  const { data: assignments, error } = await supabase
    .from('Apex_Testing_quiz_assignments')
    .select(`
      id,
      quiz_id,
      user_id,
      deadline,
      status,
      Apex_Testing_users ( id, email, display_name ),
      Apex_Testing_quizzes ( id, title )
    `)
    .in('status', ['pending', 'in_progress'])
    .not('deadline', 'is', null);

  if (error) {
    console.error(`❌ Lỗi truy vấn assignments: ${error.message}`);
    process.exit(1);
  }

  if (!assignments || assignments.length === 0) {
    console.log('ℹ️  Không có bài test nào cần nhắc nhở.');
    console.log('✅ Hoàn tất.');
    return;
  }

  console.log(`📋 Tìm thấy ${assignments.length} assignment(s) đang chờ xử lý\n`);

  const stats = { reminders: 0, deadlines: 0, overdues: 0, skipped: 0, errors: 0 };

  for (const a of assignments) {
    const user = a.Apex_Testing_users || a.Testing_users;
    const quiz = a.Apex_Testing_quizzes || a.Testing_quizzes;

    if (!user || !quiz) {
      console.log(`⚠️ Bỏ qua assignment ${a.id} (thiếu user/quiz)`);
      stats.skipped++;
      continue;
    }

    const now = new Date();
    const deadline = new Date(a.deadline);
    const hoursLeft = (deadline - now) / (1000 * 3600);
    const deadlineStr = formatDate(a.deadline);

    console.log(`📌 ${user.display_name} | ${quiz.title} | Hạn: ${deadlineStr} | Còn: ${hoursLeft.toFixed(1)}h`);

    // ---- QUÁ HẠN ----
    if (hoursLeft < 0) {
      // Cập nhật status thành overdue
      await supabase
        .from('Apex_Testing_quiz_assignments')
        .update({ status: 'overdue' })
        .eq('id', a.id);

      if (await alreadySent(a.id, 'overdue', 48)) {
        console.log('  ⏭️  Đã gửi email quá hạn trong 48h qua → bỏ qua');
        stats.skipped++;
        continue;
      }

      const subject = `⚠️ Quá hạn: ${quiz.title}`;
      const html = buildEmailHTML({
        title: quiz.title,
        color: '#dc2626',
        heading: '🚨 Bài Test Đã Quá Hạn!',
        userName: user.display_name,
        body: `Bài kiểm tra <strong>${quiz.title}</strong> đã <span style="color:#dc2626;font-weight:bold;">quá hạn nộp</span>. Vui lòng hoàn thành sớm nhất có thể.`,
        deadline: deadlineStr
      });

      const ok = await sendEmail(user.email, subject, html);
      await logEmail(user.id, quiz.id, a.id, user.email, 'overdue', subject, ok ? 'sent' : 'failed', ok ? null : 'SMTP error');
      ok ? stats.overdues++ : stats.errors++;

    // ---- SẮP HẾT HẠN (≤ 24h) ----
    } else if (hoursLeft <= 24) {
      if (await alreadySent(a.id, 'deadline', 24)) {
        console.log('  ⏭️  Đã gửi email sắp hết hạn trong 24h qua → bỏ qua');
        stats.skipped++;
        continue;
      }

      const subject = `⏰ Sắp hết hạn: ${quiz.title}`;
      const html = buildEmailHTML({
        title: quiz.title,
        color: '#f59e0b',
        heading: '⏰ Sắp Hết Hạn Nộp Bài!',
        userName: user.display_name,
        body: `Bài kiểm tra <strong>${quiz.title}</strong> sẽ hết hạn trong <span style="color:#f59e0b;font-weight:bold;">chưa đầy 24 giờ</span>. Hãy hoàn thành ngay!`,
        deadline: deadlineStr
      });

      const ok = await sendEmail(user.email, subject, html);
      await logEmail(user.id, quiz.id, a.id, user.email, 'deadline', subject, ok ? 'sent' : 'failed', ok ? null : 'SMTP error');
      ok ? stats.deadlines++ : stats.errors++;

    // ---- NHẮC NHỞ (≤ 72h) ----
    } else if (hoursLeft <= 72) {
      if (await alreadySent(a.id, 'reminder', 48)) {
        console.log('  ⏭️  Đã gửi nhắc nhở trong 48h qua → bỏ qua');
        stats.skipped++;
        continue;
      }

      const subject = `📝 Nhắc nhở: ${quiz.title}`;
      const html = buildEmailHTML({
        title: quiz.title,
        color: '#8b5cf6',
        heading: '📝 Nhắc Nhở Làm Bài Test',
        userName: user.display_name,
        body: `Bạn có bài kiểm tra <strong>${quiz.title}</strong> cần hoàn thành. Còn khoảng <strong>${Math.ceil(hoursLeft)} giờ</strong> nữa là hết hạn.`,
        deadline: deadlineStr
      });

      const ok = await sendEmail(user.email, subject, html);
      await logEmail(user.id, quiz.id, a.id, user.email, 'reminder', subject, ok ? 'sent' : 'failed', ok ? null : 'SMTP error');
      ok ? stats.reminders++ : stats.errors++;

    } else {
      console.log('  ✨ Còn nhiều thời gian → chưa cần nhắc');
      stats.skipped++;
    }
  }

  // ---- Kết quả ----
  console.log('\n' + '='.repeat(60));
  console.log('📊 KẾT QUẢ:');
  console.log(`  💜 Nhắc nhở:     ${stats.reminders}`);
  console.log(`  🟡 Sắp hết hạn:  ${stats.deadlines}`);
  console.log(`  🔴 Quá hạn:      ${stats.overdues}`);
  console.log(`  ⏭️  Bỏ qua:       ${stats.skipped}`);
  console.log(`  ❌ Lỗi:          ${stats.errors}`);
  console.log('='.repeat(60));
  console.log('✅ Hoàn tất.');
}

main().catch(err => {
  console.error('❌ Lỗi không xử lý được:', err);
  process.exit(1);
});
