# Hướng Dẫn Cấu Hình Tên Miền Riêng Cho ApexTesting

Tài liệu này hướng dẫn cách chuyển đổi địa chỉ website từ mặc định của GitHub:
`https://john-cpu25.github.io/Testing/` sang tên miền riêng chuyên nghiệp.

---

## 📌 Phương án 1: Dùng tên miền con của công ty (Khuyên dùng)
> **Ví dụ:** `testing.apexscengineering.com` hoặc `quiz.apexscengineering.com`  
> *Ưu điểm:* Hoàn toàn miễn phí, mang tính nhận diện thương hiệu công ty cao.

### 1. Nhờ IT thêm bản ghi DNS
Gửi thông tin sau cho bộ phận quản trị tên miền công ty (`apexscengineering.com`):
* **Loại bản ghi (Type):** `CNAME`
* **Tên / Host:** `testing` *(hoặc `quiz` tùy chọn)*
* **Giá trị trỏ đến (Value / Target):** `john-cpu25.github.io`
* **TTL:** `Auto` (hoặc `3600`)

---

## 📌 Phương án 2: Mua và dùng một tên miền mới hoàn toàn
> **Ví dụ:** `apextest.vn`, `apextesting.com`, v.v. (mua tại Mắt Bão, PA Việt Nam, Namecheap, Cloudflare...)

### 1. Cấu hình DNS trên trang quản lý tên miền đã mua
Thêm các bản ghi sau:
1. **4 bản ghi A** (trỏ tên miền gốc về máy chủ GitHub Pages):
   * Type: `A` | Host: `@` | Value: `185.199.108.153`
   * Type: `A` | Host: `@` | Value: `185.199.109.153`
   * Type: `A` | Host: `@` | Value: `185.199.110.153`
   * Type: `A` | Host: `@` | Value: `185.199.111.153`
2. **1 bản ghi CNAME** (hỗ trợ truy cập dạng www):
   * Type: `CNAME` | Host: `www` | Value: `john-cpu25.github.io`

---

## ⚙️ Cài đặt trên GitHub Repository

Sau khi đã tạo bản ghi DNS (theo Phương án 1 hoặc 2):

1. Truy cập vào GitHub: [https://github.com/john-cpu25/Testing](https://github.com/john-cpu25/Testing)
2. Vào **Settings** (biểu tượng bánh răng ở thanh menu trên cùng).
3. Ở cột bên trái, chọn mục **Pages**.
4. Kéo xuống phần **Custom domain**:
   * Nhập tên miền muốn dùng (Ví dụ: `testing.apexscengineering.com`).
   * Bấm nút **Save**.
5. Chờ vài phút để GitHub xác thực DNS và cấp chứng chỉ bảo mật SSL miễn phí.
6. Tích chọn vào ô **Enforce HTTPS** (bắt buộc để kích hoạt ổ khóa xanh bảo mật).

---

## ⚠️ Lưu ý sau khi đổi tên miền

1. **Đường dẫn bài test:** Website sẽ có đường dẫn gốc là `https://testing.apexscengineering.com/` (không còn đuôi `/Testing/` phía sau nữa).
2. **Nội dung email thông báo:** Nếu sau này đổi domain xong, cần cập nhật đường dẫn URL trong hàm gửi email `send_testing_email()` trên Supabase để link gửi cho nhân viên trỏ đúng về domain mới.

---

## 💡 Phương án dự phòng: Tự viết code gửi email (Nếu không verify được domain Resend)

Nếu IT công ty không thể hỗ trợ cấu hình DNS cho Resend, ta có thể đổi sang cơ chế:
* **Gửi qua Gmail / Microsoft 365 SMTP:** Dùng một email phụ (hoặc email công ty) tạo *Mật khẩu ứng dụng (App Password)*.
* **Tự động hóa:** Viết script chạy định kỳ qua **GitHub Actions** (chạy trên mây miễn phí 100%, không cần mở máy tính).
* **Lợi ích:** Gửi được ngay lập tức cho bất kỳ email nào (cả nội bộ lẫn bên ngoài) mà không cần xác thực DNS.
