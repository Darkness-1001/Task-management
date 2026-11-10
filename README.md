# TaskFlow — Quản lý công việc cá nhân

Ứng dụng web dùng Node.js, Express, EJS và PostgreSQL. Người dùng có thể đăng ký, đăng nhập và quản lý các công việc của riêng mình.

## Chức năng

- Đăng ký, đăng nhập và đăng xuất.
- Mật khẩu được mã hóa bằng bcrypt.
- Tạo, xem, sửa và xóa công việc.
- Chuyển trạng thái: Chưa làm, Đang làm, Hoàn thành.
- Mức ưu tiên: Thấp, Trung bình, Cao.
- Tìm kiếm và lọc công việc.
- Dashboard thống kê và đánh dấu công việc quá hạn.
- Phân quyền: người dùng chỉ truy cập được công việc của mình.
- Session được lưu trong PostgreSQL.

## Yêu cầu

- Node.js 20 trở lên.
- PostgreSQL đang chạy trên máy.
- Database có tên `task_management`.

## Cài đặt

### 1. Tạo database

Mở Query Tool trong pgAdmin và chạy:

```sql
CREATE DATABASE task_management;
```

### 2. Cấu hình môi trường

Sao chép `.env.example` thành `.env`, sau đó điền mật khẩu PostgreSQL:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:MAT_KHAU@localhost:5432/task_management
SESSION_SECRET=mot-chuoi-bi-mat-dai-va-ngau-nhien
```

Không đưa file `.env` lên GitHub.

### 3. Cài thư viện và tạo bảng

```powershell
npm install
npm run db:init
```

### 4. Chạy ứng dụng

```powershell
npm run dev
```

Mở `http://localhost:3000` trong trình duyệt.

Nếu vừa tạo database trong pgAdmin mà chưa thấy nó trong cây thư mục, nhấp phải vào `Databases` và chọn **Refresh**.

## Kiểm thử

Khi ứng dụng đang chạy, mở một cửa sổ Terminal khác tại thư mục dự án và chạy:

```powershell
npm test
```

Bài kiểm thử tự động kiểm tra đăng ký, đăng nhập và toàn bộ CRUD. Tài khoản cùng công việc thử được tự động xóa sau khi hoàn thành.

Có thể kiểm tra trạng thái ứng dụng và database tại `http://localhost:3000/health`.

## Cấu trúc chính

```text
src/
├── db/             # Kết nối và khởi tạo PostgreSQL
├── middleware/     # Kiểm tra đăng nhập và biến dùng trong giao diện
├── routes/         # Chức năng tài khoản và công việc
└── app.js          # Điểm khởi chạy ứng dụng
views/              # Giao diện EJS
public/css/         # CSS
```

## Scripts

- `npm run dev`: chạy ứng dụng và tự khởi động lại khi sửa code.
- `npm start`: chạy ứng dụng ở chế độ thông thường/production.
- `npm run db:init`: tạo các bảng cần thiết trong PostgreSQL.
- `npm test`: kiểm thử toàn bộ luồng chính trên ứng dụng đang chạy.

## Triển khai Render

Dự án có sẵn `render.yaml` để tạo đồng thời Web Service và PostgreSQL trên Render. Xem hướng dẫn từng bước tại [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md).
