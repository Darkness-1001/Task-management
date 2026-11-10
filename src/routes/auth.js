const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireGuest } = require('../middleware/auth');

const router = express.Router();

function renderRegister(res, values = {}, errors = []) {
  return res.status(errors.length ? 422 : 200).render('auth/register', {
    title: 'Đăng ký', values, errors,
  });
}

function renderLogin(res, values = {}, errors = []) {
  return res.status(errors.length ? 422 : 200).render('auth/login', {
    title: 'Đăng nhập', values, errors,
  });
}

router.get('/register', requireGuest, (req, res) => renderRegister(res));

router.post('/register', requireGuest, async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const errors = [];

  if (name.length < 2 || name.length > 100) errors.push('Họ tên phải có từ 2 đến 100 ký tự.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email không hợp lệ.');
  if (password.length < 8) errors.push('Mật khẩu phải có ít nhất 8 ký tự.');
  if (password !== confirmPassword) errors.push('Mật khẩu xác nhận không khớp.');

  if (errors.length) return renderRegister(res, { name, email }, errors);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, passwordHash],
    );

    req.session.user = result.rows[0];
    req.session.flash = { type: 'success', message: 'Tạo tài khoản thành công!' };
    return req.session.save(() => res.redirect('/tasks'));
  } catch (error) {
    if (error.code === '23505') {
      return renderRegister(res, { name, email }, ['Email này đã được sử dụng.']);
    }
    return next(error);
  }
});

router.get('/login', requireGuest, (req, res) => renderLogin(res));

router.post('/login', requireGuest, async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];
    const passwordMatches = user && await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return renderLogin(res, { email }, ['Email hoặc mật khẩu không đúng.']);
    }

    req.session.user = { id: user.id, name: user.name, email: user.email };
    const returnTo = req.session.returnTo || '/tasks';
    delete req.session.returnTo;
    req.session.flash = { type: 'success', message: `Chào mừng ${user.name} quay lại!` };
    return req.session.save(() => res.redirect(returnTo));
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('task.sid');
    return res.redirect('/login');
  });
});

module.exports = router;
