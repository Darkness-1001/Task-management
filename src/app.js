require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const methodOverride = require('method-override');
const pool = require('./db');
const attachLocals = require('./middleware/locals');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PgSession = connectPgSimple(session);
const port = Number(process.env.PORT) || 3000;

if (!process.env.SESSION_SECRET) {
  throw new Error('Thiếu SESSION_SECRET. Hãy tạo file .env từ .env.example.');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  name: 'task.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(attachLocals);

app.get('/', (req, res) => {
  res.redirect(req.session.user ? '/tasks' : '/login');
});
app.use(authRoutes);
app.use('/tasks', taskRoutes);

app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).render('errors/500', {
    title: 'Đã xảy ra lỗi',
    error: process.env.NODE_ENV === 'development' ? error : null,
  });
});

app.listen(port, () => {
  console.log(`Task Management đang chạy tại http://localhost:${port}`);
});
