function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    req.session.flash = { type: 'warning', message: 'Vui lòng đăng nhập để tiếp tục.' };
    return res.redirect('/login');
  }
  next();
}

function requireGuest(req, res, next) {
  if (req.session.user) {
    return res.redirect('/tasks');
  }
  next();
}

module.exports = { requireAuth, requireGuest };
