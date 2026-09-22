# APEX Southern Cross Engineering — Danh Sách Tài Khoản & Hệ Thống Auth (ACCOUNTS.md)

Tài liệu chi tiết về toàn bộ danh sách tài khoản nhân sự, phân quyền (Role), phòng ban (Team), vị trí làm việc (Location) và cơ chế đăng nhập trong hệ thống.

---

## 1. THÔNG TIN KẾT NỐI DATABASE (SUPABASE)

- **Database Host:** Supabase Cloud
- **Project URL:** `https://ejyirnfxuezipogweybo.supabase.co`
- **Anon Public Key:** `sb_publishable_r1DKG_nf_nyivQgbe6D7YA_zow13__G`
- **Bảng dữ liệu người dùng:** `NMK_User`

### Cấu trúc Schema bảng `NMK_User`:
| Cột (Column) | Kiểu (Type) | Mô tả |
| :--- | :--- | :--- |
| `id` | `UUID` / `text` | Primary Key định danh user |
| `email` | `text` | Email công ty đăng nhập (Unique, Lowercase) |
| `password` | `text` | Mật khẩu mã hóa SHA-256 (null nếu chưa login lần nào) |
| `name` | `text` | Tên hiển thị ngắn gọn |
| `full_name` | `text` | Họ và tên đầy đủ |
| `user_role` | `text` | Quyền hạn: `Admin`, `Leader`, `User` |
| `team` | `text` | Phòng ban: `MODELLING`, `ENGINEER`, `PT&REO`, `MANAGER` |
| `location` | `text` | Văn phòng: `VietNam`, `Australia` |
| `position` | `text` | Chức vụ công việc |
| `image` | `text` | Ảnh đại diện Avatar (base64 compressed) |

---

## 2. QUY CHẾ ĐĂNG NHẬP & MẬT KHẨU

1. **Đăng nhập lần đầu (First Login):**
   - Nếu tài khoản trên Database cột `password` đang để trống (`null`), **mật khẩu bất kỳ mà user nhập vào lần đầu tiên** sẽ tự động được hệ thống băm bằng chuẩn SHA-256 và lưu lại làm mật khẩu chính thức.
2. **Thuật toán băm mật khẩu (SHA-256):**
   - Băm trực tiếp ở Client trước khi gửi hoặc so sánh:
   ```javascript
   export const hashPassword = async (password) => {
       const msgBuffer = new TextEncoder().encode(password);
       const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
       const hashArray = Array.from(new Uint8Array(hashBuffer));
       return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
   };
   ```
3. **Cơ chế ghi nhớ phiên (Auto-login Session):**
   - `localStorage.setItem('last_login_email', email)` tự động khôi phục đăng nhập cho các lần mở app tiếp theo.

---

## 3. DANH SÁCH TÀI KHOẢN NHÂN SỰ APEX

### 👑 Nhóm Quản Trị Hệ Thống (Admins)
| Họ và Tên | Email | Team | Văn phòng | Quyền |
| :--- | :--- | :--- | :--- | :--- |
| **Nhân Nguyễn (Johnny)** | `johnny.nguyen@apexscengineering.com` | MODELLING | VietNam | **Admin** |
| **Vũ Đỗ** | `vu@apexscengineering.com` | MANAGER | VietNam | **Admin** |
| **Vu Do** | `vu.donguyen@apexscengineering.com` | MANAGER | VietNam | **Admin** |
| **Jason Le** | `jason@apexscengineering.com` | MANAGER | VietNam | **Admin** |
| **System Admin** | `96FCEF00-994D-4BA9-ADAE-EA948702F606@admin.com.au` | MODELLING | VietNam | **AdminApp** |

---

### 🇻🇳 Nhóm Kỹ Sư & Mô Hình Hóa Việt Nam (Vietnam Team)
| Họ và Tên | Email | Team | Vị trí | Quyền |
| :--- | :--- | :--- | :--- | :--- |
| **Quân Nguyễn** | `quan.nguyen@apexscengineering.com` | MODELLING | VietNam | User |
| **Khang Trịnh** | `khang.trinh@apexscengineering.com` | MODELLING | VietNam | User |
| **Nam Lê** | `nam.le@apexscengineering.com` | PT&REO | VietNam | User |
| **Lộc Phạm** | `loc.pham@apexscengineering.com` | PT&REO | VietNam | User |
| **Ánh Nguyễn** | `anh.nguyen@apexscengineering.com` | PT&REO | VietNam | User |
| **Dũng Đỗ** | `dung.do@apexscengineering.com` | ENGINEER | VietNam | User |
| **Nhân Phạm** | `nhan.pham@apexscengineering.com` | ENGINEER | VietNam | User |
| **Kỳ Phan** | `ky.phan@apexscengineering.com` | ENGINEER | VietNam | User |
| **Ngân Trần (Annie)** | `annie.tran@apexscengineering.com` | ENGINEER | VietNam | User |

---

### 🇦🇺 Nhóm Văn Phòng Úc (Australia Team)
| Họ và Tên | Email | Văn phòng | Quyền |
| :--- | :--- | :--- | :--- |
| **Malinda Dharmakeerthi** | `malinda@apexscengineering.com` | Australia | User |
| **Phú Nguyễn** | `phu@apexscengineering.com` | Australia | User |
| **Rocco Carinci** | `rocco@apexscengineering.com` | Australia | User |
| **Steven Peka** | `steven@apexscengineering.com` | Australia | User |
| **Yung Li** | `yung@apexscengineering.com` | Australia | User |
| **Sean Ngo** | `sean@apexscengineering.com` | Australia | User |
| **Glenn Boyd** | `glenn@apexscengineering.com` | Australia | User |
| **Rayan Jayatilake** | `rayan@apexscengineering.com` | Australia | User |
| **Charbel Nasr** | `charbel@apexscengineering.com` | Australia | User |
| **Spiros Konnas** | `spiros@apexscengineering.com` | Australia | User |
| **Harry Lambis** | `harry@apexscengineering.com` | Australia | User |
| **Chris Iannuzzi** | `chris@apexscengineering.com` | Australia | User |
| **Jessica Mitchell** | `jessica@apexscengineering.com` | Australia | User |
| **Jin Liang** | `jin@apexscengineering.com` | Australia | User |
| **Joseph Presti** | `joseph@apexscengineering.com` | Australia | User |
| **Amalan Thavarajah** | `amalan@apexscengineering.com` | Australia | User |
| **Matthew Willis** | `matthew@apexscengineering.com` | Australia | User |
| **Ellen Jessop** | `accounts@apexscengineering.com` | Australia | User |
| **Mervin Huynh** | `mervin@apexscengineering.com` | Australia | User |
| **Danial Malekian** | `danial@apexscengineering.com` | Australia | User |
| **Michael Rogers-Frassoni** | `michael.rogers@apexscengineering.com` | Australia | User |
| **Stephen Ye** | `stephen@apexscengineering.com` | Australia | User |

---

### 🔑 Danh Sách Mật Khẩu Khởi Tạo Test / Dev (Rincovitch Core)
> **Ghi chú:** Đây là danh sách mật khẩu tạm thời được khởi tạo tự động trong đợt test:

| Email | Mật khẩu mẫu ban đầu (Plain-text) | Trạng thái SHA-256 trên DB |
| :--- | :--- | :--- |
| `cuong.pham@rincovitch.com.au` | `mpsa3ili` | `105bb6a52cc355e897a3af00faa91561a85e...` |
| `dang.nguyen@rincovitch.com.au` | `4kxy4fq8` | `37f041161f0064588e26086e82f90f3ce537...` |
| `trung.nguyen@rincovitch.com.au` | `ep3948wa` | `fd27284f24cbc9ed4d53152e1278491d23d2...` |
| `khanh.nguyen@rincovitch.com.au` | `3v0upatb` | `f3678eb07d350ff378cb1700c75f6a1e11ea...` |
| `tien.tran@rincovitch.com.au` | `uo3ap2dh` | `6851ecb353ebf07c93db1827094cb8032a34...` |
| `Hoang.Pham@rincovitch.com.au` | `udfsf56a` | `e27e0785fcd12d19ba7a610abccab69c5edf...` |
| `bao.pham@rincovitch.com.au` | `cfijbqs3` | `a5a90039495ffa08617c4183b48112fa54a3...` |
| `son.lam@rincovitch.com.au` | `4c7yiynq` | `22e23219235ad6a4df960a08427c6cc02b63...` |
| `ngan.tran@rincovitch.com.au` | `jze52bg7` | `cf10e33c14ddddcc36f08e096578e5108ced...` |
| `khiem.nguyen@rincovitch.com.au` | `6ujgrh0m` | `1170923dd9a468c1672fa826927c893c5b90...` |
| `quan.nguyen@rincovitch.com.au` | `kbjrkgrs` | `a6e207f0b34b97ce244491b01d123d8bf94a...` |
| `nguyen.ly@rincovitch.com.au` | `387dsfsh` | `c2e1ac3e201c6a8d365013132e2197e3da8f...` |
| `tam.phan@rincovitch.com.au` | `vvd224og` | `049bf60e47c35167a2535c7829c13e915a96...` |
| `quang.nguyen@rincovitch.com.au` | `s9gf6xtp` | `e604e7bd8d9f770920acb01e76bd27c4f530...` |
| `vu.donguyen@rincovitch.com.au` | `VuDo@2026` | `f0712bc695e66dbfce777ca6abc748a238ec...` |
