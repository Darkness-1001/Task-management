const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

router.use(requireAuth);

function cleanTask(body) {
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    status: String(body.status || 'TODO'),
    priority: String(body.priority || 'MEDIUM'),
    dueDate: body.dueDate || null,
  };
}

function validateTask(task) {
  const errors = [];
  if (!task.title || task.title.length > 200) errors.push('Tiêu đề là bắt buộc và không quá 200 ký tự.');
  if (!STATUSES.includes(task.status)) errors.push('Trạng thái không hợp lệ.');
  if (!PRIORITIES.includes(task.priority)) errors.push('Mức ưu tiên không hợp lệ.');
  if (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) errors.push('Ngày hết hạn không hợp lệ.');
  return errors;
}

async function findOwnedTask(id, userId) {
  const result = await pool.query(
    `SELECT id, title, description, status, priority,
            TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
            created_at, updated_at
     FROM tasks WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return result.rows[0];
}

router.get('/', async (req, res, next) => {
  const search = String(req.query.search || '').trim();
  const status = STATUSES.includes(req.query.status) ? req.query.status : '';
  const priority = PRIORITIES.includes(req.query.priority) ? req.query.priority : '';
  const values = [req.session.user.id];
  const conditions = ['user_id = $1'];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (priority) {
    values.push(priority);
    conditions.push(`priority = $${values.length}`);
  }

  try {
    const [tasksResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT id, title, description, status, priority,
                TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
                (due_date < CURRENT_DATE AND status <> 'COMPLETED') AS is_overdue
         FROM tasks
         WHERE ${conditions.join(' AND ')}
         ORDER BY
           CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END,
           due_date ASC NULLS LAST,
           created_at DESC`,
        values,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'TODO')::int AS todo,
                COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
                COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'COMPLETED')::int AS overdue
         FROM tasks WHERE user_id = $1`,
        [req.session.user.id],
      ),
    ]);

    res.render('tasks/index', {
      title: 'Công việc của tôi',
      tasks: tasksResult.rows,
      stats: statsResult.rows[0],
      filters: { search, status, priority },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/new', (req, res) => {
  res.render('tasks/form', {
    title: 'Tạo công việc', task: {}, errors: [], formAction: '/tasks', method: 'POST',
  });
});

router.post('/', async (req, res, next) => {
  const task = cleanTask(req.body);
  const errors = validateTask(task);
  if (errors.length) {
    return res.status(422).render('tasks/form', {
      title: 'Tạo công việc', task, errors, formAction: '/tasks', method: 'POST',
    });
  }

  try {
    await pool.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [task.title, task.description, task.status, task.priority, task.dueDate, req.session.user.id],
    );
    req.session.flash = { type: 'success', message: 'Đã tạo công việc mới.' };
    res.redirect('/tasks');
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await findOwnedTask(req.params.id, req.session.user.id);
    if (!task) return res.status(404).render('errors/404', { title: 'Không tìm thấy' });
    return res.render('tasks/show', { title: task.title, task });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/edit', async (req, res, next) => {
  try {
    const task = await findOwnedTask(req.params.id, req.session.user.id);
    if (!task) return res.status(404).render('errors/404', { title: 'Không tìm thấy' });
    return res.render('tasks/form', {
      title: 'Chỉnh sửa công việc', task, errors: [], formAction: `/tasks/${task.id}`, method: 'PUT',
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  const task = cleanTask(req.body);
  task.id = req.params.id;
  const errors = validateTask(task);
  if (errors.length) {
    return res.status(422).render('tasks/form', {
      title: 'Chỉnh sửa công việc', task, errors,
      formAction: `/tasks/${req.params.id}`, method: 'PUT',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, priority = $4,
           due_date = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id`,
      [task.title, task.description, task.status, task.priority, task.dueDate, req.params.id, req.session.user.id],
    );
    if (!result.rowCount) return res.status(404).render('errors/404', { title: 'Không tìm thấy' });
    req.session.flash = { type: 'success', message: 'Đã cập nhật công việc.' };
    return res.redirect(`/tasks/${req.params.id}`);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  const status = String(req.body.status || '');
  if (!STATUSES.includes(status)) {
    req.session.flash = { type: 'danger', message: 'Trạng thái không hợp lệ.' };
    return res.redirect('/tasks');
  }
  try {
    await pool.query(
      `UPDATE tasks SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [status, req.params.id, req.session.user.id],
    );
    return res.redirect('/tasks');
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.user.id],
    );
    req.session.flash = result.rowCount
      ? { type: 'success', message: 'Đã xóa công việc.' }
      : { type: 'warning', message: 'Không tìm thấy công việc cần xóa.' };
    return res.redirect('/tasks');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
