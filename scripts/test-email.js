// ============================================================
// ApexTesting — Test Email (Gửi thử 1 email qua Microsoft 365)
// Chạy: node test-email.js
// ============================================================

const nodemailer = require('nodemailer');

const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_APP_PASSWORD = process.env.SMTP_APP_PASSWORD;
const TEST_TO = process.env.TEST_TO || SMTP_EMAIL; // Gửi cho chính mình nếu ko chỉ định

if (!SMTP_EMAIL || !SMTP_APP_PASSWORD) {
  console.error('❌ Thiếu biến môi trường. Cần: SMTP_EMAIL, SMTP_APP_PASSWORD');
  console.log('Cách chạy:');
  console.log('  $env:SMTP_EMAIL="your@email.com"');
  console.log('  $env:SMTP_APP_PASSWORD="your-app-password"');
  console.log('  node test-email.js');
  process.exit(1);
}

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

async function main() {
  console.log('🔌 Đang kiểm tra kết nối SMTP...');
  
  try {
    await transporter.verify();
    console.log('✅ Kết nối SMTP thành công!');
  } catch (err) {
    console.error(`❌ Lỗi SMTP: ${err.message}`);
    console.log('\n💡 Kiểm tra:');
    console.log('  1. Email và App Password có đúng không?');
    console.log('  2. Đã bật 2-Step Verification chưa?');
    console.log('  3. App Password: https://mysignins.microsoft.com/security-info');
    process.exit(1);
  }

  console.log(`\n📧 Gửi email test đến: ${TEST_TO}`);

  try {
    const info = await transporter.sendMail({
      from: `"ApexTesting" <${SMTP_EMAIL}>`,
      to: TEST_TO,
      subject: '✅ Test Email từ ApexTesting — Microsoft 365 SMTP',
      html: `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#1e3a5f,#0d2137);padding:30px 20px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">✅ Email Test Thành Công!</h1>
    </div>
    <div style="padding:30px 25px;">
      <p style="font-size:16px;color:#333;">Xin chào,</p>
      <p style="font-size:15px;color:#555;line-height:1.6;">
        Đây là email thử nghiệm từ hệ thống <strong>ApexTesting</strong>.<br>
        Nếu bạn nhận được email này, hệ thống gửi mail qua <strong>Microsoft 365 SMTP</strong> đã hoạt động chính xác!
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#166534;">🎉 <strong>SMTP:</strong> smtp.office365.com:587</p>
        <p style="margin:8px 0 0;font-size:14px;color:#166534;">📧 <strong>Sender:</strong> ${SMTP_EMAIL}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#166534;">⏰ <strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">APEX Southern Cross Engineering</p>
    </div>
  </div>
</body>
</html>`
    });

    console.log(`\n🎉 GỬI THÀNH CÔNG!`);
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  Kiểm tra hòm thư ${TEST_TO} để xác nhận.`);
  } catch (err) {
    console.error(`\n❌ Gửi thất bại: ${err.message}`);
    process.exit(1);
  }
}

main();
