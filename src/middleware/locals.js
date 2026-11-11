const STATUS_LABELS = {
  TODO: 'Chưa làm',
  IN_PROGRESS: 'Đang làm',
  COMPLETED: 'Hoàn thành',
};

const PRIORITY_LABELS = {
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

// "2026-12-31" -> "31/12/2026"
function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.split('-').reverse().join('/');
  }
  return new Date(value).toLocaleDateString('vi-VN');
}

// Mã công việc kiểu Jira: TF-12
function taskKey(id) {
  return `TF-${id}`;
}

// "Nguyễn Văn An" -> "NA"
function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function attachLocals(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  res.locals.currentPath = req.path;
  res.locals.currentQuery = req.query;
  res.locals.STATUS_LABELS = STATUS_LABELS;
  res.locals.PRIORITY_LABELS = PRIORITY_LABELS;
  res.locals.formatDate = formatDate;
  res.locals.taskKey = taskKey;
  res.locals.initials = initials;
  delete req.session.flash;
  next();
}

module.exports = attachLocals;
