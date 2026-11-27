(function () {
  function $(id) { return document.getElementById(id); }

  function doLogin() {
    var inputEl = $('pass-input');
    var errEl = $('error-msg');
    if (!inputEl) return;
    var input = inputEl.value;

    if (input === SITE_PASSWORD) {
      sessionStorage.setItem('site_unlocked', 'true');
      sessionStorage.removeItem('is_admin');
      window.location.href = 'index.html';
    } else if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem('site_unlocked', 'true');
      sessionStorage.setItem('is_admin', 'true');
      window.location.href = 'index.html';
    } else if (errEl) {
      errEl.innerText = "Incorrect password.";
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = $('login-btn');
    var input = $('pass-input');
    if (btn) btn.addEventListener('click', doLogin);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doLogin();
      });
      input.focus();
    }

    // already unlocked? skip straight through
    if (sessionStorage.getItem('site_unlocked') === 'true') {
      window.location.href = 'index.html';
    }
  });
})();
