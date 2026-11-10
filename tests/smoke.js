require('dotenv').config({ quiet: true });

const assert = require('node:assert/strict');
const pool = require('../src/db');

const baseUrl = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const testEmail = `taskflow-test-${Date.now()}@example.com`;
let cookie = '';

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return response;
}

function form(data) {
  return new URLSearchParams(data).toString();
}

async function run() {
  let taskId;
  try {
    let response = await request('/login');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Đăng nhập/);

    response = await request('/register', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({
        name: 'Tài khoản kiểm thử',
        email: testEmail,
        password: 'TestPassword2026',
        confirmPassword: 'TestPassword2026',
      }),
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/tasks');

    response = await request('/tasks');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Công việc của tôi/);

    response = await request('/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({
        title: 'Công việc kiểm thử',
        description: 'Dữ liệu này sẽ được tự động xóa.',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2026-12-31',
      }),
    });
    assert.equal(response.status, 302);

    const taskResult = await pool.query(
      `SELECT tasks.id FROM tasks
       JOIN users ON users.id = tasks.user_id
       WHERE users.email = $1 AND tasks.title = $2`,
      [testEmail, 'Công việc kiểm thử'],
    );
    taskId = taskResult.rows[0]?.id;
    assert.ok(taskId, 'Công việc chưa được ghi vào PostgreSQL');

    response = await request(`/tasks/${taskId}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Công việc kiểm thử/);

    response = await request(`/tasks/${taskId}?_method=PUT`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({
        title: 'Công việc đã cập nhật',
        description: 'Đã kiểm thử chức năng sửa.',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        dueDate: '2026-12-31',
      }),
    });
    assert.equal(response.status, 302);

    response = await request(`/tasks/${taskId}?_method=DELETE`, { method: 'POST' });
    assert.equal(response.status, 302);
    taskId = null;

    response = await request('/logout', { method: 'POST' });
    assert.equal(response.status, 302);

    console.log('Smoke test đạt: đăng ký, đăng nhập, tạo, xem, sửa, xóa và đăng xuất.');
  } finally {
    if (taskId) await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Smoke test thất bại:', error);
  process.exitCode = 1;
});
