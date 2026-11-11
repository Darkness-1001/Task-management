# Hướng dẫn triển khai TaskFlow (Node.js + PostgreSQL) lên Render

Tài liệu này hướng dẫn từng bước cách đưa website TaskFlow lên Render và kết nối nó với cơ sở dữ liệu PostgreSQL cũng chạy trên Render.

Có hai cách triển khai. Chỉ chọn **một** cách:

| Cách | Mô tả | Khi nào dùng |
|------|-------|--------------|
| **A. Thủ công (Dashboard)** | Tự tạo PostgreSQL, tự tạo Web Service, tự dán `DATABASE_URL` | Muốn hiểu rõ từng bước kết nối web với database |
| **B. Blueprint (`render.yaml`)** | Render đọc file `render.yaml` và tạo cả hai tài nguyên tự động | Muốn triển khai nhanh, cấu hình dạng code |

> Không làm cả hai cách trên cùng một tài khoản với cùng tên dịch vụ, vì sẽ tạo trùng tài nguyên.

## Mô hình triển khai

```text
Trình duyệt người dùng
        │  HTTPS
        ▼
Render Web Service  (Node.js + Express, chạy "npm start")
        │  Internal Database URL (mạng nội bộ Render)
        ▼
Render PostgreSQL   (database task_management)
        ▲
        │  External Database URL (qua Internet, có SSL)
pgAdmin / psql trên máy cá nhân  (xem và quản lý dữ liệu)
```

Database trên Render tách biệt với PostgreSQL trên máy. Dữ liệu ở máy không tự chuyển lên Render; sau khi triển khai cần đăng ký tài khoản mới để dùng.

---

## Bước 0. Chuẩn bị

1. Tài khoản [GitHub](https://github.com/).
2. Tài khoản [Render](https://render.com/) (có thể đăng nhập bằng GitHub).
3. Đã cài Git và Node.js 20 trở lên trên máy.
4. Ứng dụng chạy được ở máy theo hướng dẫn trong [README.md](../README.md).

Những điểm trong code giúp ứng dụng chạy được trên Render:

| Yêu cầu của Render | Cách dự án đáp ứng |
|--------------------|--------------------|
| Website phải lắng nghe cổng do Render cấp | `src/app.js` dùng `process.env.PORT` |
| Thông tin database không được ghi cứng trong code | `src/db/index.js` đọc `DATABASE_URL` |
| Kết nối PostgreSQL có SSL | Bật SSL khi `NODE_ENV=production` (hoặc `DATABASE_SSL=true`) |
| Cookie đăng nhập hoạt động sau proxy HTTPS | `app.set('trust proxy', 1)` và cookie `secure` ở production |
| Có endpoint kiểm tra sức khỏe | `GET /health` trả về trạng thái database |
| Tạo bảng tự động | `npm run db:init` chạy `src/db/schema.sql` (dùng `CREATE TABLE IF NOT EXISTS`, chạy lại nhiều lần vẫn an toàn) |

## Bước 1. Đưa mã nguồn lên GitHub

1. Kiểm tra `.env` **không** nằm trong danh sách commit (đã khai báo trong `.gitignore`):

   ```powershell
   git status
   ```

2. Tạo repository mới trên GitHub (ví dụ `Task-management`), không tick "Add a README".
3. Kết nối và đẩy code:

   ```powershell
   git remote add origin https://github.com/TEN_GITHUB/Task-management.git
   git branch -M main
   git push -u origin main
   ```

   Nếu đã có `origin`, chỉ cần `git push`.

---

## Cách A — Triển khai thủ công trên Dashboard

### Bước A1. Tạo PostgreSQL trên Render

1. Vào [Render Dashboard](https://dashboard.render.com/) → **New** → **Postgres**.
2. Điền thông tin:

   | Trường | Giá trị |
   |--------|---------|
   | Name | `taskflow-postgres` |
   | Database | `task_management` |
   | User | `taskflow_user` |
   | Region | `Singapore (Southeast Asia)` |
   | PostgreSQL Version | bản mới nhất (ví dụ 18) |
   | Instance Type / Plan | **Free** |

3. Bấm **Create Database** và chờ trạng thái chuyển sang **Available** (khoảng 1–3 phút).
4. Mở database vừa tạo → mục **Connections**. Render cung cấp:

   - **Internal Database URL** — dùng cho Web Service trên Render (nhanh, không ra Internet).
   - **External Database URL** — dùng để kết nối từ máy cá nhân (pgAdmin, psql).
   - **PSQL Command** — lệnh `psql` kết nối sẵn.

   Dạng URL:

   ```text
   postgresql://taskflow_user:MAT_KHAU@dpg-xxxxxxxx-a/task_management                                 (Internal)
   postgresql://taskflow_user:MAT_KHAU@dpg-xxxxxxxx-a.singapore-postgres.render.com/task_management   (External)
   ```

5. Bấm biểu tượng copy cạnh **Internal Database URL**. Giữ URL này bí mật.

### Bước A2. Tạo Web Service

1. **New** → **Web Service** → chọn **Git Provider / GitHub** và chọn repository `Task-management`.
   Nếu không thấy repository, bấm **Configure account** để cấp quyền cho Render.
2. Điền cấu hình:

   | Trường | Giá trị |
   |--------|---------|
   | Name | `taskflow-node-postgres` (tên này quyết định URL website) |
   | Language | `Node` |
   | Branch | `main` |
   | Region | **Singapore** — phải **cùng region** với database thì Internal URL mới dùng được |
   | Root Directory | để trống |
   | Build Command | `npm ci` |
   | Start Command | `npm run db:init && npm start` |
   | Instance Type | **Free** |

3. Ở mục **Environment Variables**, bấm **Add Environment Variable** và thêm:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | dán **Internal Database URL** ở bước A1 |
   | `SESSION_SECRET` | bấm **Generate** hoặc nhập một chuỗi ngẫu nhiên dài |

   Không cần khai báo `PORT`; Render tự cấp.

4. Mở **Advanced** → **Health Check Path**: nhập `/health`.
5. Bấm **Deploy Web Service**.

### Bước A3. Theo dõi quá trình deploy

Mở tab **Logs** của Web Service. Một lần deploy thành công sẽ có các dòng:

```text
==> Running build command 'npm ci'...
added ... packages
==> Build successful 🎉
==> Running 'npm run db:init && npm start'
Đã khởi tạo các bảng users và tasks thành công.
Task Management đang chạy tại http://localhost:10000
==> Your service is live 🎉
```

Dòng `Đã khởi tạo các bảng ...` xác nhận **website đã kết nối được PostgreSQL** và tạo bảng. Khi trạng thái là **Live**, chuyển sang [Bước 2](#bước-2-kiểm-tra-website-sau-khi-deploy).

---

## Cách B — Triển khai bằng Blueprint (`render.yaml`)

File [render.yaml](../render.yaml) ở thư mục gốc mô tả sẵn cả Web Service và PostgreSQL:

```yaml
services:
  - type: web
    name: taskflow-node-postgres
    runtime: node
    region: singapore
    plan: free
    buildCommand: npm ci
    startCommand: npm run db:init && npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: SESSION_SECRET
        generateValue: true          # Render tự sinh chuỗi bí mật
      - key: DATABASE_URL
        fromDatabase:                # Render tự điền Internal URL của database bên dưới
          name: taskflow-postgres
          property: connectionString

databases:
  - name: taskflow-postgres
    databaseName: task_management
    user: taskflow_user
    region: singapore
    plan: free
```

Phần `fromDatabase` chính là bước "kết nối với PostgreSQL": Render tự lấy chuỗi kết nối nội bộ của `taskflow-postgres` và gán vào biến `DATABASE_URL` của website.

Các bước:

1. [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
2. Kết nối GitHub nếu được hỏi, chọn repository `Task-management`, branch `main`.
3. Đặt **Blueprint Name** (ví dụ `taskflow`). Render đọc `render.yaml` và liệt kê hai tài nguyên:
   - `taskflow-node-postgres` — Web Service.
   - `taskflow-postgres` — PostgreSQL.
4. Bấm **Deploy Blueprint** (hoặc **Apply**). Render tạo database trước, sau đó build và chạy website.
5. Theo dõi log như [Bước A3](#bước-a3-theo-dõi-quá-trình-deploy).

---

## Bước 2. Kiểm tra website sau khi deploy

1. Ở trang Web Service, copy URL phía trên cùng, dạng:

   ```text
   https://taskflow-node-postgres.onrender.com
   ```

2. Mở trang kiểm tra sức khỏe `https://taskflow-node-postgres.onrender.com/health`. Kết quả đúng:

   ```json
   {"status":"ok","database":"connected"}
   ```

3. Kiểm tra chức năng:
   1. Đăng ký một tài khoản mới.
   2. Tạo ít nhất hai công việc với mức ưu tiên và hạn khác nhau.
   3. Sửa trạng thái một công việc sang **Hoàn thành**, thử tìm kiếm/lọc.
   4. Đăng xuất rồi đăng nhập lại — dữ liệu vẫn còn chứng tỏ dữ liệu được lưu trong PostgreSQL.

## Bước 3. Kết nối tới PostgreSQL trên Render từ máy cá nhân

Dùng để xem dữ liệu thật mà website đã lưu.

### Bằng pgAdmin

1. Lấy thông tin trong trang database → **Connections** → **External Database URL**. Tách các phần:

   ```text
   postgresql://USER:PASSWORD@HOST/DATABASE
   ```

2. pgAdmin → nhấp phải **Servers** → **Register** → **Server...**
3. Tab **General** → Name: `Render TaskFlow`.
4. Tab **Connection**:

   | Trường | Giá trị |
   |--------|---------|
   | Host name/address | `dpg-xxxxxxxx-a.singapore-postgres.render.com` |
   | Port | `5432` |
   | Maintenance database | `task_management` |
   | Username | `taskflow_user` |
   | Password | mật khẩu trong URL |

5. Tab **Parameters** (hoặc **SSL** ở bản cũ) → **SSL mode** = `require`.
6. **Save**. Mở `task_management` → **Schemas** → **public** → **Tables** sẽ thấy `users`, `tasks`, `session`.
7. Mở Query Tool để xem dữ liệu:

   ```sql
   SELECT id, name, email, created_at FROM users;
   SELECT id, title, status, priority, due_date, user_id FROM tasks ORDER BY id;
   ```

### Bằng psql

Copy **PSQL Command** trong trang database rồi chạy trong Terminal:

```powershell
psql "postgresql://taskflow_user:MAT_KHAU@dpg-xxxxxxxx-a.singapore-postgres.render.com/task_management?sslmode=require"
```

### Chạy ứng dụng ở máy nhưng dùng database của Render (tùy chọn)

Trong `.env`:

```env
DATABASE_URL=<External Database URL>
DATABASE_SSL=true
```

Sau đó `npm run dev`. Cách này cũng cho phép chạy kiểm thử tự động nhắm vào website đã deploy:

```powershell
$env:TEST_BASE_URL = "https://taskflow-node-postgres.onrender.com"
npm test
```

Bài test đăng ký, đăng nhập, chạy toàn bộ CRUD trên website thật và tự xóa dữ liệu thử.

## Bước 4. Cập nhật phiên bản mới

Render tự deploy lại mỗi khi có commit mới trên nhánh `main`:

```powershell
git add .
git commit -m "Mo ta thay doi"
git push
```

Có thể deploy thủ công: Web Service → **Manual Deploy** → **Deploy latest commit**.

## Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân & cách xử lý |
|------------|-------------------------|
| Build lỗi tại `npm ci` | `package-lock.json` chưa được commit hoặc không khớp `package.json`. Chạy `npm install` ở máy, commit lại lock file. |
| Log báo `Thiếu biến môi trường DATABASE_URL` | Chưa thêm `DATABASE_URL` trong **Environment** của Web Service. |
| Log báo `Thiếu SESSION_SECRET` | Thêm biến `SESSION_SECRET`. |
| `getaddrinfo ENOTFOUND dpg-...` | Dùng Internal URL nhưng Web Service và database **khác region**. Tạo lại cùng region hoặc dùng External URL. |
| `password authentication failed` | Copy sai URL. Copy lại từ mục **Connections**. |
| `/health` trả về 503 `disconnected` | Database chưa **Available**, đã hết hạn, hoặc `DATABASE_URL` sai. |
| Đăng nhập xong bị đẩy về trang login | Thiếu `NODE_ENV=production` hoặc truy cập bằng `http://` thay vì `https://`. |
| pgAdmin không kết nối được | Dùng nhầm Internal URL (chỉ dùng được trong Render), hoặc chưa đặt SSL mode = `require`. |
| Lần đầu mở website rất chậm | Gói Free tự ngủ sau khoảng 15 phút không có truy cập, lần mở đầu cần ~30–60 giây để khởi động lại. |

## Lưu ý về gói Free

- Web Service Free tự tạm dừng khi không có truy cập và khởi động lại khi có request.
- PostgreSQL Free có giới hạn dung lượng và **hết hạn sau 30 ngày** kể từ khi tạo; cần nâng cấp hoặc tạo database mới (rồi cập nhật `DATABASE_URL`) nếu dùng lâu dài. Kiểm tra mức giới hạn hiện tại tại [Render Free](https://render.com/docs/free).
- Không bao giờ đưa `DATABASE_URL` hoặc mật khẩu lên GitHub. Chỉ khai báo trong phần **Environment** của Render.

## Tài liệu chính thức

- [Deploy Node.js Express trên Render](https://render.com/docs/deploy-node-express-app)
- [Render PostgreSQL](https://render.com/docs/postgresql-creating-connecting)
- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
- [Environment variables và secrets](https://render.com/docs/configure-environment-variables)
- [Giới hạn gói Free](https://render.com/docs/free)
