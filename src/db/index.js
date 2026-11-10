const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('Thiếu biến môi trường DATABASE_URL. Hãy tạo file .env từ .env.example.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (error) => {
  console.error('Kết nối PostgreSQL gặp lỗi:', error);
});

module.exports = pool;
