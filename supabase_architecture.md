# Kiến Trúc Cơ Sở Dữ Liệu Supabase

Tài liệu này mô tả cấu trúc các bảng (Schema) và các truy vấn (Queries) tương ứng khi chuyển đổi hệ thống từ LocalStorage sang **Supabase** (PostgreSQL).

## 1. Kiến Trúc Bảng (Database Schema)

Hệ thống gồm 4 bảng chính có quan hệ với nhau (Relational DB):

```sql
-- 1. Bảng Users (Thông tin tài khoản)
-- Lời khuyên: Supabase có sẵn dịch vụ "Supabase Auth" để quản lý mật khẩu an toàn. 
-- Bảng này đóng vai trò là "Profile", link với Auth của Supabase.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Quizzes (Thông tin bài Test)
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  time_limit INTEGER NOT NULL DEFAULT 10, -- Giới hạn thời gian (phút)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Questions (Câu hỏi của bài Test)
-- Dùng foreign key (quiz_id) để liên kết với bảng quizzes.
-- Dùng JSONB để lưu mảng các câu trả lời (options) cho nhẹ và dễ parse bên frontend.
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB NOT NULL,         -- Ví dụ: ["Hà Nội", "HCM", "Đà Nẵng"]
  correct_index INTEGER NOT NULL, -- Vị trí đáp án đúng (0, 1, 2...)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng Results (Lưu kết quả làm bài của User)
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  answers JSONB NOT NULL,         -- Mảng lịch sử chọn đáp án của user
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Các Query thường dùng trên Supabase

Dưới đây là các câu lệnh sử dụng thư viện `@supabase/supabase-js` để truy xuất dữ liệu:

### 2.1. Lấy danh sách Quizzes (Kèm tổng số câu hỏi)
```javascript
// Lấy tất cả bài test và join với bảng questions để đếm số câu hỏi
const { data: quizzes, error } = await supabase
  .from('quizzes')
  .select(`
    *,
    questions ( id )
  `);
```

### 2.2. Lấy chi tiết 1 bài Quiz (Để user làm bài)
```javascript
// Load quiz và load toàn bộ câu hỏi (bao gồm options) của quiz đó
const { data: quiz, error } = await supabase
  .from('quizzes')
  .select(`
    *,
    questions (*)
  `)
  .eq('id', 'ID_CỦA_QUIZ')
  .single();
```

### 2.3. Lưu kết quả bài làm của User (Nộp bài)
```javascript
const { data, error } = await supabase
  .from('results')
  .insert([
    { 
      quiz_id: 'ID_CỦA_QUIZ',
      user_id: 'ID_CỦA_USER', // Lấy từ phiên đăng nhập Supabase Auth
      score: 8,
      total_questions: 10,
      percentage: 80.00,
      answers: [0, 2, 1, 3, 0] // Mảng lưu index đáp án user đã chọn
    }
  ]);
```

### 2.4. Lấy lịch sử kết quả làm bài (Cho Dashboard)
```javascript
// Cho Admin: Lấy toàn bộ kết quả của tất cả mọi người (kèm thông tin user & quiz)
const { data: adminResults, error: adminErr } = await supabase
  .from('results')
  .select(`
    *,
    users ( display_name, email ),
    quizzes ( title )
  `)
  .order('submitted_at', { ascending: false });

// Cho User bình thường: Lấy lịch sử kết quả của chính mình
const { data: myResults, error: myErr } = await supabase
  .from('results')
  .select(`
    *,
    quizzes ( title )
  `)
  .eq('user_id', 'ID_CỦA_USER')
  .order('submitted_at', { ascending: false });
```

### 2.5. Tạo bài Quiz mới (Cho Admin)
```javascript
// Bước 1: Tạo record Quiz trước
const { data: newQuiz, error: qErr } = await supabase
  .from('quizzes')
  .insert([{ title: 'Bài Test Mới', description: '...', time_limit: 15 }])
  .select()
  .single();

// Bước 2: Dùng ID của Quiz vừa tạo, chèn mảng câu hỏi vào
const { data: newQuestions, error: qsErr } = await supabase
  .from('questions')
  .insert([
    { 
      quiz_id: newQuiz.id, 
      text: 'Câu 1?', 
      options: ['A', 'B', 'C', 'D'], 
      correct_index: 0 
    },
    { 
      quiz_id: newQuiz.id, 
      text: 'Câu 2?', 
      options: ['Đúng', 'Sai'], 
      correct_index: 1 
    }
  ]);
```

> **Bảo mật với Supabase RLS (Row Level Security)**
> Bạn có thể bật tính năng RLS trên Supabase để tự động thiết lập quy tắc bảo mật từ Database:
> - `quizzes`: Bất kỳ ai cũng xem được, nhưng chỉ Admin được thêm/sửa/xóa.
> - `results`: User chỉ có quyền `SELECT` các dòng có `user_id` trùng với ID của họ. Admin thì được quyền `SELECT` tất cả.
