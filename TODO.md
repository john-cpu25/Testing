# ApexTesting — Trạng Thái Dự Án & Các Việc Cần Làm Tiếp

> Cập nhật: 22/09/2026 (13:55)

---

## ✅ Đã Hoàn Thành Gần Nhất

1. **Nâng cấp tài khoản Admin:**
   - Đã cập nhật `staff@apexscengineering.com` (Bao Pham) lên quyền **Admin** trực tiếp trên database Supabase (`Testing_users`).
   - Đã đồng bộ tài liệu danh sách tài khoản [accounts.md](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/TESTING/Testing/accounts.md).

2. **Hệ thống gửi Email tự động qua Microsoft 365 SMTP + GitHub Actions:**
   - Script gửi nhắc nhở / thông báo hết hạn: [`scripts/send-reminders.js`](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/TESTING/Testing/scripts/send-reminders.js)
   - Script tự động tạo bài kiểm tra từ lịch định kỳ: [`scripts/generate-assignments.js`](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/TESTING/Testing/scripts/generate-assignments.js)
   - Script test gửi email: [`scripts/test-email.js`](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/TESTING/Testing/scripts/test-email.js)
   - Workflow GitHub Actions hẹn giờ tự động: [`.github/workflows/email-scheduler.yml`](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/TESTING/Testing/.github/workflows/email-scheduler.yml)
   - Toàn bộ code đã được push lên GitHub repo (`origin/main`).

---

## ⏳ CÁC VIỆC CHƯA LÀM (CẦN UPDATE KHI QUAY LẠI)

### 🔴 1. Cấu hình GitHub Secrets (Ưu tiên số 1 để kích hoạt Email)
Hệ thống script và GitHub Actions đã sẵn sàng, chỉ chờ điền 4 Secrets trên GitHub:
> Truy cập: **https://github.com/john-cpu25/Testing/settings/secrets/actions**

| # | Secret Name | Giá trị cần điền | Tình trạng |
|---|---|---|---|
| 1 | `SMTP_EMAIL` | `staff@apexscengineering.com` | ⏳ Chờ nhập |
| 2 | `SMTP_APP_PASSWORD` | *(Mã 16 ký tự tạo từ tài khoản staff)* | ⏳ Cần tạo App Password |
| 3 | `SUPABASE_URL` | `https://ejyirnfxuezipogweybo.supabase.co` | ⏳ Chờ nhập |
| 4 | `SUPABASE_KEY` | `sb_publishable_r1DKG_nf_nyivQgbe6D7YA_zow13__G` | ⏳ Chờ nhập |

> **Cách lấy `SMTP_APP_PASSWORD` từ tài khoản `staff@apexscengineering.com`:**
> 1. Đăng nhập tài khoản `staff@apexscengineering.com` tại [mysignins.microsoft.com/security-info](https://mysignins.microsoft.com/security-info).
> 2. Đảm bảo tài khoản đã bật **2-Step Verification** (Xác minh 2 bước).
> 3. Chọn **Add sign-in method** → chọn **App password** → đặt tên `ApexTesting` → Copy mã 16 ký tự (viết liền hoặc có dấu cách đều được).

---

### 🟡 2. Chạy thử nghiệm Test Email trên GitHub Actions
Sau khi thêm xong 4 Secrets:
1. Vào tab **Actions** trên repo GitHub: `https://github.com/john-cpu25/Testing/actions`
2. Chọn workflow **"ApexTesting Email Scheduler"**
3. Nhấn **Run workflow** → Chọn tác vụ:
   - **`test-email`** *(Khuyên dùng trước: Gửi ngay 1 email test đến `staff@apexscengineering.com` để kiểm tra kết nối SMTP)*
   - Hoặc các tác vụ chính thức: `generate-assignments`, `send-reminders`, `both`.
4. Nhấn nút xanh **Run workflow** và kiểm tra hộp thư đến xem email nhận được chưa.

---

### 🟡 3. Dọn dẹp / Tắt Cron Job cũ trên Supabase (Tránh gửi trùng)
Nếu quyết định sử dụng Microsoft 365 SMTP qua GitHub Actions làm luồng chính:
- Chạy SQL sau trên Supabase SQL Editor để bỏ kích hoạt cron cũ của Resend (tránh xung đột):
  ```sql
  SELECT cron.unschedule('daily-quiz-assignments');
  SELECT cron.unschedule('daily-quiz-reminders');
  SELECT cron.unschedule('daily-quiz-due-soon');
  ```

---

### 🟢 4. Các hạng mục nâng cấp hệ thống tiếp theo (Backlog)
- [x] **Giao diện Đăng nhập APEX chuẩn (v3):** Video nền (`intro_login.mp4`), glassmorphic card, pulse glow, vi mạch SVG, typography Rajdhani/Inter, ẩn/hiện mật khẩu.
- [x] **Màn hình Preloader:** Video intro đồng bộ loading %, logo99 pulse nhịp thở, nút Skip, phím tắt Space/Esc.
- [x] **Bảo mật mật khẩu:** Mã hóa SHA-256 client-side, tự động băm (auto-upgrade) khi đăng nhập lần đầu từ mật khẩu cũ.
- [x] **Hệ thống Quản lý Tài khoản (Admin):** Tab "👥 Quản Lý Tài Khoản" cho phép xem danh sách, đổi vai trò (Admin/User), cấp lại mật khẩu mới, tạo người dùng mới.
- [x] **Tính năng Đổi mật khẩu:** Modal đổi mật khẩu bảo mật cho nhân viên.
- [ ] **Bảo mật RLS:** Thiết lập Row Level Security chặt chẽ hơn dựa trên quyền role (admin / user) trong Supabase.
- [ ] **Tên miền riêng:** Cấu hình custom domain (tham khảo [domain_setup.md](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/TESTING/Testing/domain_setup.md)).

