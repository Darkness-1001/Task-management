# Hướng dẫn triển khai TaskFlow lên Render

Tài liệu này mô tả cách đưa ứng dụng Node.js và PostgreSQL lên Render bằng file `render.yaml` có sẵn trong dự án.

## Mô hình triển khai

```text
GitHub repository
       |
       v
Render Web Service (Node.js/Express)
       |
       v
Render PostgreSQL
```

Database trên Render tách biệt với PostgreSQL trên máy. Tài khoản và công việc đang có ở máy không tự chuyển lên Render. Sau khi triển khai, có thể đăng ký tài khoản mới để kiểm thử.

## 1. Đưa dự án lên GitHub

Đảm bảo `.env` không xuất hiện trong danh sách file chuẩn bị commit. File này đã được khai báo trong `.gitignore`.

Tạo một repository mới trên GitHub, sau đó kết nối và đẩy nhánh `main`:

```powershell
git remote add origin https://github.com/TEN_GITHUB/taskflow-node-postgres.git
git push -u origin main
```

Không đưa mật khẩu PostgreSQL hoặc nội dung `.env` lên GitHub.

## 2. Tạo Blueprint trên Render

1. Đăng nhập [Render Dashboard](https://dashboard.render.com/).
2. Chọn **New** → **Blueprint**.
3. Kết nối tài khoản GitHub nếu được yêu cầu.
4. Chọn repository vừa tạo.
5. Render tự đọc file `render.yaml` ở thư mục gốc.
6. Kiểm tra hai tài nguyên chuẩn bị tạo:
   - `taskflow-node-postgres`: Web Service chạy Node.js.
   - `taskflow-postgres`: PostgreSQL database.
7. Xác nhận tạo Blueprint và chờ quá trình triển khai hoàn tất.

File Blueprint tự cấu hình:

- Node.js runtime.
- Region Singapore.
- `npm ci` để cài thư viện.
- `npm run db:init && npm start` để tạo bảng rồi khởi động website.
- `DATABASE_URL` lấy trực tiếp từ PostgreSQL trên Render.
- `SESSION_SECRET` được Render sinh ngẫu nhiên.
- `/health` dùng để kiểm tra website và database.

## 3. Kiểm tra sau triển khai

Khi trạng thái Web Service là **Live**, mở URL dạng:

```text
https://taskflow-node-postgres.onrender.com
```

Kiểm tra trang trạng thái:

```text
https://taskflow-node-postgres.onrender.com/health
```

Kết quả đúng:

```json
{"status":"ok","database":"connected"}
```

Sau đó:

1. Đăng ký một tài khoản mới.
2. Tạo ít nhất hai công việc.
3. Sửa trạng thái một công việc.
4. Đăng xuất và đăng nhập lại để xác nhận dữ liệu vẫn còn.

## 4. Cách tự động triển khai bản mới

Blueprint đang đặt `autoDeployTrigger: commit`. Mỗi lần đẩy commit mới lên nhánh được Render theo dõi, Render sẽ tự cài đặt và triển khai phiên bản mới.

## 5. Xử lý lỗi thường gặp

### Build thất bại tại `npm ci`

Kiểm tra `package-lock.json` đã được commit và phiên bản Node.js đáp ứng trường `engines` trong `package.json`.

### Website chạy nhưng database chưa có bảng

Mở log của Web Service và tìm thông báo:

```text
Đã khởi tạo các bảng users và tasks thành công.
```

Kiểm tra `DATABASE_URL` trong phần Environment của Web Service phải được liên kết từ `taskflow-postgres`.

### `/health` trả về trạng thái 503

Database chưa sẵn sàng hoặc `DATABASE_URL` sai. Kiểm tra trạng thái PostgreSQL trên Render và log của Web Service.

### Website mất vài giây để mở

Một số gói dịch vụ có thể tạm ngừng khi không có truy cập. Lần mở đầu tiên có thể cần thời gian khởi động lại.

## Tài liệu chính thức

- [Deploy Node.js Express trên Render](https://render.com/docs/deploy-node-express-app)
- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
- [Environment variables và secrets](https://render.com/docs/configure-environment-variables)
