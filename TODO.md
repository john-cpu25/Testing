# ApexTesting — Kế Hoạch Còn Lại

> Cập nhật: 21/09/2026

## 🔴 Ưu tiên cao

### 1. Verify Domain Resend (Email gửi được cho nhân viên)
- [ ] Xác định ai quản lý DNS domain `apexscengineering.com`
- [ ] Thêm 3 DNS records:
  - `TXT` → `resend._domainkey` → copy value từ [Resend Dashboard](https://resend.com/domains)
  - `CNAME` → `rsend` → `rsend-apne1.forge.rmta.net`
  - `CNAME` → `send` → `send.forge.rmta.net`
- [ ] Vào Resend Dashboard → nhấn Verify → chờ status ✅
- [ ] Sau khi verify: cập nhật sender trong SQL function `send_testing_email()` từ `onboarding@resend.dev` → `noreply@apexscengineering.com`

## 🟡 Trung bình

### 2. Bảo mật mật khẩu
- [ ] Hash passwords (hiện lưu plaintext trong `Testing_users.password`)
- [ ] Cập nhật login logic trong `app.js` để verify hash

### 3. Bảo mật RLS
- [ ] Thay `USING(true)` bằng policies kiểm tra role
- [ ] Cân nhắc migrate sang Supabase Auth (auth.uid() hoạt động)

### 4. Cấu hình tên miền riêng (Tuỳ chọn)
- [ ] Tham khảo hướng dẫn chi tiết tại [domain_setup.md](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/TESTING/Testing/domain_setup.md)
- [ ] Chọn phương án: subdomain công ty (`testing.apexscengineering.com`) hoặc mua tên miền mới
- [ ] Cấu hình DNS và cập nhật trong GitHub Settings -> Pages

## 🟢 Theo dõi & Dự phòng

### 5. Verify cron jobs
- [ ] Ngày 22/09 kiểm tra `Testing_quiz_assignments` có tự tạo không (cron 07:05 VN)
- [ ] Kiểm tra `Testing_email_logs` có ghi nhận gửi email không
- [ ] Nếu lỗi → check `cron.job_run_details` trong SQL Editor

### 6. Phương án gửi mail thay thế (Nếu Resend bị kẹt DNS)
- [ ] Viết script Node.js/Python gửi qua Gmail SMTP bằng Mật khẩu ứng dụng (App Password)
- [ ] Chạy tự động qua GitHub Actions (không cần IT can thiệp DNS)

### 7. Cải thiện UX (tuỳ chọn)
- [ ] Thêm chức năng đổi mật khẩu cho user
- [ ] Thêm dashboard thống kê cho admin
- [ ] Responsive mobile tốt hơn

