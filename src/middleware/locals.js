function attachLocals(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  res.locals.currentPath = req.path;
  delete req.session.flash;
  next();
}

module.exports = attachLocals;
