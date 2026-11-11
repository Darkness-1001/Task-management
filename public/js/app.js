(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'taskflow-theme';

  /* ---------- Dark / Light theme ---------- */
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var next = theme === 'dark' ? 'sáng' : 'tối';
      btn.setAttribute('aria-label', 'Chuyển sang giao diện ' + next);
      btn.setAttribute('title', 'Chuyển sang giao diện ' + next);
    });
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* bỏ qua khi bị chặn storage */ }
    });
  });

  // Theo hệ điều hành nếu người dùng chưa tự chọn.
  if (window.matchMedia) {
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (event) {
      var saved = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
      if (!saved) applyTheme(event.matches ? 'dark' : 'light');
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
  }

  /* ---------- User menu ---------- */
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      setMenu(menu.hidden);
    });
    document.addEventListener('click', function (event) {
      if (!menu.contains(event.target)) setMenu(false);
    });
  }

  /* ---------- Mobile sidebar ---------- */
  var sidebarBtn = document.querySelector('[data-sidebar-toggle]');
  var sidebar = document.querySelector('[data-sidebar]');
  var backdrop = document.querySelector('[data-sidebar-backdrop]');
  function setSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    if (backdrop) backdrop.hidden = !open;
    if (sidebarBtn) sidebarBtn.setAttribute('aria-expanded', String(open));
  }
  if (sidebarBtn) sidebarBtn.addEventListener('click', function () { setSidebar(!sidebar.classList.contains('open')); });
  if (backdrop) backdrop.addEventListener('click', function () { setSidebar(false); });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { setMenu(false); setSidebar(false); }
  });

  /* ---------- Flash message ---------- */
  document.querySelectorAll('[data-flag]').forEach(function (flag) {
    var close = function () { flag.classList.add('is-leaving'); setTimeout(function () { flag.remove(); }, 200); };
    var btn = flag.querySelector('[data-flag-close]');
    if (btn) btn.addEventListener('click', close);
    setTimeout(close, 5000);
  });

  /* ---------- Auto-submit selects ---------- */
  document.querySelectorAll('select[data-autosubmit]').forEach(function (select) {
    select.addEventListener('change', function () {
      var card = select.closest('.card');
      if (card && select.hasAttribute('data-card-status')) {
        // Trên bảng: chuyển thẻ ngay, không tải lại trang.
        moveCard(card, select.value);
        return;
      }
      if (select.form.requestSubmit) select.form.requestSubmit(); else select.form.submit();
    });
  });

  /* ---------- Board drag & drop ---------- */
  var board = document.querySelector('[data-board]');

  function refreshColumns() {
    if (!board) return;
    board.querySelectorAll('.column').forEach(function (column) {
      var body = column.querySelector('[data-dropzone]');
      var count = body.querySelectorAll('.card').length;
      column.querySelector('[data-count]').textContent = count;
      var empty = body.querySelector('[data-empty]');
      if (!count && !empty) {
        empty = document.createElement('p');
        empty.className = 'column-empty';
        empty.setAttribute('data-empty', '');
        empty.textContent = 'Không có công việc';
        body.appendChild(empty);
      } else if (count && empty) {
        empty.remove();
      }
    });
  }

  function showError(message) {
    var flag = document.createElement('div');
    flag.className = 'flag flag-danger';
    flag.setAttribute('role', 'alert');
    flag.innerHTML = '<span class="flag-icon" aria-hidden="true">!</span><p></p>';
    flag.querySelector('p').textContent = message;
    document.querySelector('.content').prepend(flag);
    setTimeout(function () { flag.remove(); }, 5000);
  }

  function moveCard(card, status, beforeEl) {
    if (!board) return;
    var fromBody = card.parentElement;
    var fromNext = card.nextElementSibling;
    var column = board.querySelector('.column[data-status="' + status + '"]');
    if (!column) return;
    var body = column.querySelector('[data-dropzone]');
    var changed = card.closest('.column') !== column;

    if (beforeEl) body.insertBefore(card, beforeEl); else body.appendChild(card);
    var select = card.querySelector('[data-card-status]');
    if (select) select.value = status;
    refreshColumns();
    if (!changed) return;

    card.classList.add('is-saving');
    fetch('/tasks/' + card.dataset.id + '/status?_method=PATCH', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'status=' + encodeURIComponent(status),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok || !data.ok) throw new Error(data.message || 'Không thể cập nhật trạng thái.');
        });
      })
      .catch(function (error) {
        // Hoàn tác vị trí khi lưu thất bại.
        fromBody.insertBefore(card, fromNext && fromNext.parentElement === fromBody ? fromNext : null);
        var prev = fromBody.closest('.column').dataset.status;
        if (select) select.value = prev;
        refreshColumns();
        showError(error.message);
      })
      .finally(function () { card.classList.remove('is-saving'); });
  }

  if (board) {
    var dragged = null;

    board.addEventListener('dragstart', function (event) {
      var card = event.target.closest && event.target.closest('.card');
      if (!card) return;
      dragged = card;
      card.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.dataset.id);
    });

    board.addEventListener('dragend', function () {
      if (dragged) dragged.classList.remove('is-dragging');
      dragged = null;
      board.querySelectorAll('.column.is-over').forEach(function (c) { c.classList.remove('is-over'); });
    });

    function cardAfter(body, y) {
      var cards = Array.prototype.filter.call(body.querySelectorAll('.card'), function (c) { return c !== dragged; });
      for (var i = 0; i < cards.length; i += 1) {
        var box = cards[i].getBoundingClientRect();
        if (y < box.top + box.height / 2) return cards[i];
      }
      return null;
    }

    board.querySelectorAll('.column').forEach(function (column) {
      column.addEventListener('dragover', function (event) {
        if (!dragged) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        board.querySelectorAll('.column.is-over').forEach(function (c) { if (c !== column) c.classList.remove('is-over'); });
        column.classList.add('is-over');
      });
      column.addEventListener('dragleave', function (event) {
        if (!column.contains(event.relatedTarget)) column.classList.remove('is-over');
      });
      column.addEventListener('drop', function (event) {
        if (!dragged) return;
        event.preventDefault();
        column.classList.remove('is-over');
        var body = column.querySelector('[data-dropzone]');
        moveCard(dragged, column.dataset.status, cardAfter(body, event.clientY));
      });
    });
  }
})();
