const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('Thiếu biến môi trường DATABASE_URL. Hãy tạo file .env từ .env.example.');
}

// Render PostgreSQL yêu cầu SSL khi kết nối từ bên ngoài (External Database URL).
// Mặc định bật SSL ở production; có thể ép bật/tắt bằng DATABASE_SSL=true|false.
const sslSetting = process.env.DATABASE_SSL;
const useSsl = sslSetting
  ? sslSetting === 'true'
  : process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('Kết nối PostgreSQL gặp lỗi:', error);
});

module.exports = pool;
