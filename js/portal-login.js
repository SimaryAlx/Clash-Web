/* Clash Esports member portal: the login page (portal/login.html).
   Talks only to ClashAPI. English first; Arabic after the visitor switches (ClashSite, 'clash-language'). */
(() => {
  const API = window.ClashAPI;
  /* Egyptian plural for seconds (this page has no PortalFmt): ثانية / ثانيتين / 3-10 ثواني / 11+ ثانية */
  const arCount = (n) => (n === 1 ? 'ثانية' : n === 2 ? 'ثانيتين' : n >= 3 && n <= 10 ? `${n} ثواني` : `${n} ثانية`);
  const REMEMBER_KEY = 'clash-remember-user';

  const EN = {
    skip: 'Skip to content', navLabel: 'Menu', navSections: 'Sections', navPc: 'PC rooms', navPlaystation: 'PlayStation',
    navContact: 'Contact us', menu: 'Menu',
    title: 'Log in',
    hint: 'Same username and password you use on the lounge PCs.',
    demoNote: 'Demo version: sign in with any username and password. All numbers are sample data.',
    user: 'Username or mobile number', or: 'or', pass: 'Password', remember: 'Remember me on this device',
    forgot: 'Forgot password?', create: 'Create an account', soon: 'soon', soon2: 'soon',
    help: 'Need help? Message us on WhatsApp', back: 'Back to the site',
  };
  const W = {
    en: {
      login: 'Log in', busy: 'Checking…', show: 'Show', hide: 'Hide',
      needUser: 'Enter your username or mobile number.', needPass: 'Enter your password.', badUser: 'Use English letters, numbers, dot, dash or underscore only.',
      BAD_LOGIN: 'Wrong username or password',
      google: 'Sign in with Google', apple: 'Sign in with Apple', soon: 'Soon', GOOGLE_FAIL: 'Google sign-in did not work. Try again or use your username.',
      ACCOUNT_PENDING: 'Your account is waiting for approval. We will message you on WhatsApp when it is active.',
      ACCOUNT_REJECTED: 'We could not accept your signup. Contact us on WhatsApp.', waText: 'Message us on WhatsApp',
      NETWORK: 'No connection. Check your internet and try again.',
      RATE_LIMITED: (n) => `Too many tries. Try again in ${n} ${n === 1 ? 'second' : 'seconds'}`,
      DOWN: "The service isn't available right now, try again in a bit",
    },
    ar: {
      login: 'دخول', busy: 'بنتأكد…', show: 'إظهار', hide: 'إخفاء',
      /* the symbols sit in a left-to-right isolate (LRI…PDI) so they keep their order inside the Arabic sentence */
      needUser: 'اكتب اسم المستخدم أو رقم الموبايل.', needPass: 'اكتب الباسورد.', badUser: 'استخدم حروف إنجليزي وأرقام بس، والرموز \u2066. - _\u2069 مسموحة.',
      BAD_LOGIN: 'اسم المستخدم أو الباسورد غلط',
      google: 'ادخل بجوجل', apple: 'ادخل بأبل', soon: 'قريباً', GOOGLE_FAIL: 'الدخول بجوجل ماشتغلش. جرّب تاني أو استخدم اسم المستخدم.',
      ACCOUNT_PENDING: 'حسابك مستني الموافقة. هنبعتلك على واتساب أول ما يشتغل.',
      ACCOUNT_REJECTED: 'مقدرناش نقبل التسجيل بتاعك. كلمنا على واتساب.', waText: 'كلمنا على واتساب',
      NETWORK: 'مفيش اتصال. اتأكد من النت وجرّب تاني.',
      RATE_LIMITED: (n) => `محاولات كتير. جرّب تاني بعد ${arCount(n)}`,
      DOWN: 'الخدمة مش متاحة دلوقتي، جرّب تاني بعد شوية',
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

  const WA = 'https://wa.me/201099584833';
  function waLink(el, text) {
    if (el.querySelector('a')) return;
    el.appendChild(document.createTextNode(' '));
    const a = document.createElement('a');
    a.href = WA; a.target = '_blank'; a.rel = 'noopener'; a.textContent = text;
    el.appendChild(a);
  }

  function render() {
    const t = w();
    label.textContent = st.busy ? t.busy : t.login;
    submit.classList.toggle('is-busy', st.busy);
    submit.disabled = st.busy || st.wait > 0;
    submit.setAttribute('aria-busy', String(st.busy));
    eye.textContent = pass.type === 'password' ? t.show : t.hide;
    eye.setAttribute('aria-pressed', String(pass.type !== 'password'));
    if (window.ClashSite.langReady) paintGoogle();

    let text = '';
    if (st.wait > 0) text = t.RATE_LIMITED(st.wait);
    else if (st.error) text = t[st.error] || t.DOWN;
    msg.textContent = text;
    msg.hidden = !text;
    if (text && (st.error === 'ACCOUNT_REJECTED' || st.error === 'ACCOUNT_PENDING')) waLink(msg, t.waText);
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

  /* a mobile number may come with spaces, +20 or Arabic digits: send it as 01XXXXXXXXX. A username goes as typed. */
  function ident() {
    const v = user.value.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));
    if (!/^[+\d\s-]+$/.test(v)) return v;
    const p = v.replace(/[\s-]/g, '');
    return p.startsWith('+20') ? `0${p.slice(3)}` : p.startsWith('0020') ? `0${p.slice(4)}` : p;
  }

  /* ---------- checks before sending ---------- */
  function check() {
    const u = ident();
    st.fieldErr.user = !u ? 'needUser' : /^[A-Za-z0-9._+-]+$/.test(u) ? '' : 'badUser';
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
      await API.login(ident(), pass.value, remember.checked);
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
      st.error = ['BAD_LOGIN', 'ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'NETWORK'].includes(code) ? code : 'DOWN';
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

  /* ---------- Google ---------- */
  const gSlot = $('pl-google'), gMsg = $('pl-gmsg'), TICKET_KEY = 'clash-google-signup';
  let gKey = '', gLang = '';
  function paintGoogle() {
    const t = w(), l = window.ClashSite.lang;
    gMsg.textContent = gKey ? t[gKey] || t.DOWN : '';
    gMsg.hidden = !gKey;
    if (gKey === 'ACCOUNT_PENDING' || gKey === 'ACCOUNT_REJECTED') waLink(gMsg, t.waText);
    $('pl-apple-label').textContent = t.apple;
    $('pl-apple-soon').textContent = t.soon;
    const soonBtn = () => { /* our own disabled Google-styled button, same size as the real one */
      gSlot.textContent = '';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sg-social-btn is-soon'; b.disabled = true; b.setAttribute('aria-disabled', 'true');
      b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.800 2.400 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.200 5.500-4.700 7.200l7.600 5.900c4.400-4.100 6.900-10.100 6.900-17.600z"/><path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>');
      const s = document.createElement('span'); s.textContent = t.google;
      const em = document.createElement('em'); em.className = 'sg-badge'; em.textContent = t.soon;
      b.append(s, em);
      gSlot.appendChild(b);
    };
    if (!API.google.enabled) { soonBtn(); return; }
    if (gLang === l && gSlot.firstChild) return;
    gLang = l;
    API.google.render(gSlot, { label: t.google, text: 'signin_with', locale: l === 'ar' ? 'ar' : 'en', onCredential: onGoogle })
      .then((ok) => { if (!ok) soonBtn(); });
  }
  async function onGoogle(idToken) {
    if (!idToken || st.busy) return;
    gKey = ''; st.busy = true; render();
    try {
      const r = await API.googleLogin(idToken);
      if (r && r.needSignup) {
        /* a new member: carry the profile and the ticket (no password, no photos) to the signup page */
        try { sessionStorage.setItem(TICKET_KEY, JSON.stringify({ profile: r.profile || {}, ticket: r.googleTicket })); } catch (e) { /* storage unavailable */ }
        location.href = 'signup.html';
        return;
      }
      go();
    } catch (err) {
      st.busy = false;
      const c = err && err.code;
      gKey = ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'NETWORK'].includes(c) ? c : 'GOOGLE_FAIL';
      render();
    }
  }

  /* ---------- start ---------- */
  function reveal() { box.classList.remove('is-checking'); }

  function init() {
    window.ClashSite.initLang({ en: EN, titleEn: 'Log in | Clash Esports', onChange: render });
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) { user.value = saved; remember.checked = true; }
    } catch (e) { /* storage unavailable */ }
    render();
    /* real (http) mode: no demo wording, same rule as the dashboard (portal.js) */
    API.envTags();

    /* already signed in: straight to the portal. Show the form after a short wait if the check is slow. */
    const late = setTimeout(reveal, 1200);
    API.me.dashboard().then(go, () => { clearTimeout(late); reveal(); });
  }

  if (window.ClashSite && API) init(); else reveal();
})();
