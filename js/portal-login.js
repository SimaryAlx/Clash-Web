/* Clash Esports member portal: the login page (portal/login.html).
   Talks only to ClashAPI. English first; Arabic after the visitor switches (ClashSite, 'clash-language'). */
(() => {
  const API = window.ClashAPI;
  const REMEMBER_KEY = 'clash-remember-user';

  const EN = {
    skip: 'Skip to content', navLabel: 'Menu', navSections: 'Sections', navPc: 'PC rooms', navPlaystation: 'PlayStation',
    navContact: 'Contact us', menu: 'Menu',
    title: 'Log in',
    hint: 'Same username and password you use on the lounge PCs.',
    demoNote: 'Demo version: sign in with any username and password. All numbers are sample data.',
    user: 'Username', pass: 'Password', remember: 'Remember me on this device',
    forgot: 'Forgot password?', create: 'Create an account', soon: 'soon', soon2: 'soon',
    help: 'Need help? Message us on WhatsApp', back: 'Back to the site',
  };
  const W = {
    en: {
      login: 'Log in', busy: 'Checking…', show: 'Show', hide: 'Hide',
      needUser: 'Enter your username.', needPass: 'Enter your password.', badUser: 'Use English letters, numbers, dot, dash or underscore only.',
      BAD_LOGIN: 'Wrong username or password',
      RATE_LIMITED: (n) => `Too many tries. Try again in ${n} ${n === 1 ? 'second' : 'seconds'}`,
      DOWN: "The service isn't available right now, try again in a bit",
    },
    ar: {
      login: 'دخول', busy: 'لحظة…', show: 'إظهار', hide: 'إخفاء',
      needUser: 'اكتب اسم المستخدم.', needPass: 'اكتب الباسورد.', badUser: 'استخدم حروف إنجليزي وأرقام و . - _ بس.',
      BAD_LOGIN: 'اسم المستخدم أو الباسورد غلط',
      RATE_LIMITED: (n) => `محاولات كتير. جرّب تاني بعد ${n} ثانية`,
      DOWN: 'الخدمة مش شغالة دلوقتي، جرّب تاني بعد شوية',
    },
  };
  const w = () => W[window.ClashSite && window.ClashSite.lang === 'ar' ? 'ar' : 'en'];

  const $ = (id) => document.getElementById(id);
  const box = $('pl-box'), form = $('pl-form');
  const user = $('pl-user'), pass = $('pl-pass'), eye = $('pl-eye'), remember = $('pl-remember');
  const msg = $('pl-msg'), submit = $('pl-submit'), label = $('pl-submit-label');
  const userErr = $('pl-user-err'), passErr = $('pl-pass-err');

  /* where to go after login: index.html, or ?next= when it is a plain page in this folder */
  function target() {
    try {
      const next = new URLSearchParams(location.search).get('next') || '';
      if (/^[A-Za-z0-9_-]+\.html(\?[A-Za-z0-9_=&.%-]*)?(#[A-Za-z0-9_-]*)?$/.test(next)) return next;
    } catch (e) { /* default */ }
    return 'index.html';
  }
  const go = () => { location.replace(target()); };

  /* ---------- state -> screen ---------- */
  const st = { busy: false, error: '', wait: 0, timer: 0, fieldErr: { user: '', pass: '' } };

  function render() {
    const t = w();
    label.textContent = st.busy ? t.busy : t.login;
    submit.classList.toggle('is-busy', st.busy);
    submit.disabled = st.busy || st.wait > 0;
    submit.setAttribute('aria-busy', String(st.busy));
    eye.textContent = pass.type === 'password' ? t.show : t.hide;
    eye.setAttribute('aria-pressed', String(pass.type !== 'password'));

    let text = '';
    if (st.wait > 0) text = t.RATE_LIMITED(st.wait);
    else if (st.error) text = t[st.error] || t.DOWN;
    msg.textContent = text;
    msg.hidden = !text;
    /* the countdown ticks quietly; only a new message is announced */
    if (st.wait > 0) msg.removeAttribute('role'); else msg.setAttribute('role', 'alert');

    [[user, userErr, st.fieldErr.user], [pass, passErr, st.fieldErr.pass]].forEach(([input, out, key]) => {
      out.textContent = key ? t[key] : '';
      out.hidden = !key;
      if (key) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    });
  }

  function startCountdown(seconds) {
    clearInterval(st.timer);
    st.wait = Math.max(1, Math.ceil(Number(seconds) || 1));
    st.error = '';
    render();
    st.timer = setInterval(() => {
      st.wait -= 1;
      if (st.wait <= 0) { clearInterval(st.timer); st.wait = 0; }
      render();
    }, 1000);
  }

  /* ---------- checks before sending ---------- */
  function check() {
    const u = user.value.trim();
    st.fieldErr.user = !u ? 'needUser' : /^[A-Za-z0-9._-]+$/.test(u) ? '' : 'badUser';
    st.fieldErr.pass = pass.value ? '' : 'needPass';
    render();
    if (st.fieldErr.user) { user.focus(); return false; }
    if (st.fieldErr.pass) { pass.focus(); return false; }
    return true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (st.busy || st.wait > 0) return;
    st.error = '';
    if (!check()) return;
    st.busy = true;
    render();
    try {
      await API.login(user.value.trim(), pass.value);
      try {
        if (remember.checked) localStorage.setItem(REMEMBER_KEY, user.value.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch (err) { /* storage unavailable */ }
      go();
      return; /* keep the busy state while the next page opens */
    } catch (err) {
      st.busy = false;
      const code = err && err.code;
      if (code === 'RATE_LIMITED') { startCountdown(err.retryAfter); return; }
      st.error = code === 'BAD_LOGIN' ? 'BAD_LOGIN' : 'DOWN';
      if (code === 'BAD_LOGIN') { pass.value = ''; pass.focus(); }
      render();
    }
  });

  [user, pass].forEach((input) => input.addEventListener('input', () => {
    const k = input === user ? 'user' : 'pass';
    if (st.fieldErr[k]) { st.fieldErr[k] = ''; render(); }
  }));

  eye.addEventListener('click', () => {
    pass.type = pass.type === 'password' ? 'text' : 'password';
    render();
    pass.focus();
  });

  /* ---------- start ---------- */
  function reveal() { box.classList.remove('is-checking'); }

  function init() {
    window.ClashSite.initLang({ en: EN, titleEn: 'Log in | Clash Esports', onChange: render });
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) { user.value = saved; remember.checked = true; }
    } catch (e) { /* storage unavailable */ }
    render();

    /* already signed in: straight to the portal. Show the form after a short wait if the check is slow. */
    const late = setTimeout(reveal, 1200);
    API.me.dashboard().then(go, () => { clearTimeout(late); reveal(); });
  }

  if (window.ClashSite && API) init(); else reveal();
})();
