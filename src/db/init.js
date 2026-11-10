require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Đã khởi tạo các bảng users và tasks thành công.');
  } catch (error) {
    console.error('Không thể khởi tạo cơ sở dữ liệu:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initializeDatabase();
