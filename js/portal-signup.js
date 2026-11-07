/* Clash Esports member portal: the signup page (portal/signup.html).
   Talks only to ClashAPI (signup, googleLogin). English first; Arabic after the visitor switches (ClashSite, 'clash-language').
   Privacy: the ID photos and the password live only in this page's memory/fields until they are sent. Nothing of them goes to storage or the console. */
(() => {
  const API = window.ClashAPI;
  const CFG = window.CLASH_CONFIG || {};
  const TICKET_KEY = 'clash-google-signup'; /* { profile, ticket } handed over by the login page (no photos, no password) */
  const MAX_SIDE = 1600, MAX_BYTES = 650 * 1024, MIN_AGE = 16; /* 650 KB of JPEG = about 870 KB as base64, two fit the 1.8 MB body cap */
  const WA = 'https://wa.me/201099584833';

  const EN = {
    skip: 'Skip to content', navLabel: 'Menu', navSections: 'Sections', navPc: 'PC rooms', navPlaystation: 'PlayStation',
    navContact: 'Contact us', menu: 'Menu', help: 'Need help? Message us on WhatsApp', back: 'Back to the site',
  };

  /* all the words of this page, by language */
  const T = {
    en: {
      title: 'Create an account',
      hint: 'One account for this site and the lounge PCs. It takes about two minutes.',
      demoNote: 'Demo version: nothing is really created.',
      google: 'Sign up with Google', apple: 'Sign up with Apple', soon: 'Soon', or: 'or',
      gnote: (n) => `Signed in with Google${n ? ` as ${n}` : ''}. Now choose a username and a password: you will use them on the lounge PCs too.`,
      s1: 'Your details', first: 'First name', last: 'Last name', user: 'Username',
      userHint: 'You will use it on the lounge PCs too. 3 to 20 characters: English letters, numbers, dot (.) and underscore (_).',
      pass: 'Password', passHint: 'At least 6 characters. This is also your password on the lounge PCs.',
      phone: 'Mobile number', email: 'Email', optional: '(optional)', birth: 'Birth date',
      show: 'Show', hide: 'Hide',
      s2: 'National ID photos',
      idWhy: 'Our team checks your ID before the account opens. The photos are kept private and used only for this check.',
      idAdd: 'Add photos of my national ID', idSkip: "I don't have my ID with me: skip",
      skipNote: 'No problem. Your account will be created, but it stays locked until you visit Clash Zayed with your national ID.',
      idFront: 'ID front', idBack: 'ID back', take: 'Take photo', choose: 'Choose file', remove: 'Remove', working: 'Preparing the photo…',
      ready: (kb) => `Ready (${kb} KB)`,
      submit: 'Create my account', busy: 'Sending…',
      privacy: 'By signing up you accept our terms and privacy policy.',
      haveAccount: 'I already have an account',
      doneTitle: 'Request received',
      doneId: 'We got your request. Our team will check your ID and message you on WhatsApp when your account is active.',
      doneNoId: 'Your account is created. Visit Clash Zayed with your national ID to activate it.',
      backSite: 'Back to the site', goLogin: 'Log in',
      needFirst: 'Enter your first name.', needLast: 'Enter your last name.',
      badUser: 'Use 3 to 20 English letters, numbers, dot or underscore.',
      shortPass: 'Use at least 6 characters.', longPass: 'Use at most 24 characters.',
      badPhone: 'Enter an Egyptian mobile number like 01012345678.',
      badEmail: 'This email does not look right.', needBirth: 'Choose your birth date.',
      TOO_YOUNG: 'Under 16? Come to the branch with a parent to sign up.',
      USERNAME_TAKEN: 'This username is taken. Try another one.',
      PHONE_TAKEN: 'This mobile number already has an account. Log in instead.',
      EMAIL_TAKEN: 'This email already has an account. Log in instead.',
      idBoth: 'Add both sides of the ID, or choose to skip.',
      idBad: 'We could not read this photo. Try another one.',
      CAPTCHA: 'The security check did not pass. Try it again.',
      needCaptcha: 'Complete the security check first.',
      BAD_REQUEST: 'Some details are not right. Check the form and try again.',
      RATE_LIMITED: (n) => `Too many tries. Try again in ${n} ${n === 1 ? 'second' : 'seconds'}`,
      GIZMO_DOWN: "The lounge system isn't answering right now. Try again in a bit.",
      NETWORK: 'No connection. Check your internet and try again.',
      DOWN: 'Something went wrong. Try again in a bit.',
      GOOGLE_FAIL: 'Google sign-in did not work. Try again or use the form.',
      ACCOUNT_PENDING: 'Your account is waiting for approval. We will message you on WhatsApp when it is active.',
      ACCOUNT_REJECTED: 'We could not accept this signup. Contact us on WhatsApp.',
      waText: 'Message us on WhatsApp',
    },
    ar: {
      title: 'اعمل حساب',
      hint: 'حساب واحد للموقع وأجهزة الـ PC في الصالة. بياخد دقيقتين.',
      demoNote: 'نسخة تجريبية: مفيش حساب بيتعمل بجد.',
      google: 'سجّل بجوجل', apple: 'سجّل بأبل', soon: 'قريباً', or: 'أو',
      gnote: (n) => `دخلت بجوجل${n ? ` باسم ${n}` : ''}. دلوقتي اختار اسم مستخدم وباسورد: هتستخدمهم على أجهزة الـ PC في الصالة كمان.`,
      s1: 'بياناتك', first: 'الاسم الأول', last: 'اسم العيلة', user: 'اسم المستخدم',
      userHint: 'هتستخدمه على أجهزة الـ PC في الصالة كمان. من 3 لـ 20 حرف: حروف إنجليزي وأرقام ونقطة (.) وشرطة سفلية (_).',
      pass: 'الباسورد', passHint: '6 حروف على الأقل. ده نفس الباسورد بتاعك على أجهزة الـ PC في الصالة.',
      phone: 'رقم الموبايل', email: 'الإيميل', optional: '(اختياري)', birth: 'تاريخ الميلاد',
      show: 'إظهار', hide: 'إخفاء',
      s2: 'صور البطاقة',
      idWhy: 'فريقنا بيراجع البطاقة قبل ما الحساب يتفتح. الصور بتفضل سرية وبتتستخدم للمراجعة دي بس.',
      idAdd: 'هضيف صور البطاقة', idSkip: 'البطاقة مش معايا دلوقتي: تخطّي',
      skipNote: 'ولا يهمك. هنعمل الحساب، لكن هيفضل مقفول لحد ما تيجي كلاش زايد ومعاك البطاقة.',
      idFront: 'وش البطاقة', idBack: 'ضهر البطاقة', take: 'صوّر', choose: 'اختار ملف', remove: 'شيل', working: 'بنجهّز الصورة…',
      ready: (kb) => `جاهزة (${kb} ك.ب)`,
      submit: 'اعمل الحساب', busy: 'بنبعت…',
      privacy: 'بالتسجيل إنت موافق على الشروط وسياسة الخصوصية.',
      haveAccount: 'عندي حساب بالفعل',
      doneTitle: 'وصلنا طلبك',
      doneId: 'وصلنا طلبك. فريقنا هيراجع البطاقة ويبعتلك على واتساب أول ما الحساب يشتغل.',
      doneNoId: 'الحساب اتعمل. تعالى كلاش زايد ومعاك البطاقة عشان نفعّله.',
      backSite: 'ارجع للموقع', goLogin: 'تسجيل الدخول',
      needFirst: 'اكتب الاسم الأول.', needLast: 'اكتب اسم العيلة.',
      badUser: 'استخدم من 3 لـ 20 حرف إنجليزي أو رقم أو نقطة أو شرطة سفلية.',
      shortPass: 'استخدم 6 حروف على الأقل.', longPass: 'استخدم 24 حرف على الأكتر.',
      badPhone: 'اكتب رقم موبايل مصري زي 01012345678.',
      badEmail: 'الإيميل شكله مش مظبوط.', needBirth: 'اختار تاريخ ميلادك.',
      TOO_YOUNG: 'أقل من 16 سنة؟ تعالى الفرع ومعاك ولي أمرك عشان تسجّل.',
      USERNAME_TAKEN: 'اسم المستخدم ده محجوز. جرّب اسم تاني.',
      PHONE_TAKEN: 'الرقم ده عليه حساب بالفعل. سجّل دخول.',
      EMAIL_TAKEN: 'الإيميل ده عليه حساب بالفعل. سجّل دخول.',
      idBoth: 'ضيف وش وضهر البطاقة، أو اختار التخطّي.',
      idBad: 'مقدرناش نقرأ الصورة دي. جرّب صورة تانية.',
      CAPTCHA: 'فحص الأمان ماعدّاش. جرّبه تاني.',
      needCaptcha: 'كمّل فحص الأمان الأول.',
      BAD_REQUEST: 'في بيانات مش مظبوطة. راجع الفورم وجرّب تاني.',
      RATE_LIMITED: (n) => `محاولات كتير. جرّب تاني بعد ${n === 1 ? 'ثانية' : n === 2 ? 'ثانيتين' : n >= 3 && n <= 10 ? `${n} ثواني` : `${n} ثانية`}`,
      GIZMO_DOWN: 'نظام الصالة مش بيرد دلوقتي. جرّب تاني بعد شوية.',
      NETWORK: 'مفيش اتصال. اتأكد من النت وجرّب تاني.',
      DOWN: 'حصلت مشكلة. جرّب تاني بعد شوية.',
      GOOGLE_FAIL: 'الدخول بجوجل ماشتغلش. جرّب تاني أو استخدم الفورم.',
      ACCOUNT_PENDING: 'حسابك مستني الموافقة. هنبعتلك على واتساب أول ما يشتغل.',
      ACCOUNT_REJECTED: 'مقدرناش نقبل التسجيل ده. كلمنا على واتساب.',
      waText: 'كلمنا على واتساب',
    },
  };
  const lang = () => (window.ClashSite && window.ClashSite.lang === 'ar' ? 'ar' : 'en');
  const w = () => T[lang()];

  const $ = (id) => document.getElementById(id);
  const form = $('sg-form'), msg = $('sg-msg'), submit = $('sg-submit'), label = $('sg-submit-label');
  const F = {
    first: $('sg-first'), last: $('sg-last'), user: $('sg-user'), pass: $('sg-pass'),
    phone: $('sg-phone'), email: $('sg-email'), birth: $('sg-birth'),
  };
  const errEl = { first: $('sg-first-err'), last: $('sg-last-err'), user: $('sg-user-err'), pass: $('sg-pass-err'), phone: $('sg-phone-err'), email: $('sg-email-err'), birth: $('sg-birth-err') };
  const eye = $('sg-eye');

  /* ---------- state ---------- */
  const st = {
    busy: false, msgKey: '', wait: 0, timer: 0, fieldErr: {}, idErr: { front: '', back: '', both: '' },
    skip: false, ticket: '', gname: '', done: '', pending: 0, tsToken: '', tsWidget: null, gmsgKey: '',
    ids: { front: null, back: null }, /* data:image/jpeg;base64 strings, memory only */
    idState: { front: '', back: '' },
  };
  const useTurnstile = () => API.mode !== 'mock' && !!CFG.TURNSTILE_SITE_KEY;

  /* ---------- text ---------- */
  function paint() {
    const t = w();
    document.querySelectorAll('[data-k]').forEach((el) => { const v = t[el.dataset.k]; if (typeof v === 'string') el.textContent = v; });
    label.textContent = st.busy ? t.busy : t.submit;
    eye.textContent = F.pass.type === 'password' ? t.show : t.hide;
    eye.setAttribute('aria-pressed', String(F.pass.type !== 'password'));
    submit.classList.toggle('is-busy', st.busy);
    submit.disabled = st.busy || st.wait > 0 || st.pending > 0 || !!st.tooYoung;
    submit.setAttribute('aria-busy', String(st.busy));

    let text = '';
    if (st.wait > 0) text = t.RATE_LIMITED(st.wait);
    else if (st.msgKey) text = t[st.msgKey] || t.DOWN;
    msg.textContent = text;
    msg.hidden = !text;
    if (st.wait > 0) msg.removeAttribute('role'); else msg.setAttribute('role', 'alert');

    Object.keys(F).forEach((k) => {
      const key = st.fieldErr[k];
      errEl[k].textContent = key ? t[key] : '';
      errEl[k].hidden = !key;
      if (key) F[k].setAttribute('aria-invalid', 'true'); else F[k].removeAttribute('aria-invalid');
    });
    ['front', 'back'].forEach((s) => {
      const e = $(`sg-id-${s}-err`), k = st.idErr[s];
      e.textContent = k ? t[k] : ''; e.hidden = !k;
      const state = $(`sg-id-${s}-state`);
      state.textContent = st.idState[s] === 'working' ? t.working : st.idState[s] === 'ready' && st.ids[s] ? t.ready(Math.round(st.ids[s].length * 0.75 / 1024)) : '';
    });
    const both = $('sg-ids-err');
    both.textContent = st.idErr.both ? t[st.idErr.both] : ''; both.hidden = !st.idErr.both;

    const gm = $('sg-gmsg');
    gm.textContent = st.gmsgKey ? (t[st.gmsgKey] || t.DOWN) : '';
    gm.hidden = !st.gmsgKey;
    const gn = $('sg-gnote');
    gn.textContent = st.ticket ? t.gnote(st.gname) : '';
    gn.hidden = !st.ticket;
    $('sg-social').hidden = !!st.ticket;
    $('sg-or').hidden = !!st.ticket;
    $('sg-id-add').hidden = st.skip;
    $('sg-id-skip').hidden = !st.skip;
    $('sg-done-text').textContent = st.done ? t[st.done] : '';
    /* under 16: the message sits under the birth date and the button stays off */
    if (st.tooYoung) { errEl.birth.textContent = t.TOO_YOUNG; errEl.birth.hidden = false; F.birth.setAttribute('aria-invalid', 'true'); }
    document.title = lang() === 'en' ? (st.done ? 'Request received | Clash Esports' : 'Create an account | Clash Esports') : (st.done ? 'وصلنا طلبك | Clash Esports' : 'إنشاء حساب | Clash Esports');
    paintGoogle();
    if (st.msgKey === 'ACCOUNT_PENDING' || st.msgKey === 'ACCOUNT_REJECTED') addWa(msg, t.waText);
  }

  function addWa(el, text) {
    if (!el.hidden && !el.querySelector('a')) {
      el.appendChild(document.createTextNode(' '));
      const a = document.createElement('a');
      a.href = WA; a.target = '_blank'; a.rel = 'noopener'; a.textContent = text;
      el.appendChild(a);
    }
  }

  /* ---------- Google ---------- */
  let gLang = '';
  function paintGoogle() {
    const slot = $('sg-google');
    if (st.ticket) return;
    const soonBtn = () => { /* our own disabled Google-styled button, same size as the real one */
      slot.textContent = '';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sg-social-btn is-soon'; b.disabled = true; b.setAttribute('aria-disabled', 'true');
      b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.800 2.400 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.200 5.500-4.700 7.200l7.600 5.900c4.400-4.100 6.900-10.100 6.900-17.600z"/><path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>');
      const s = document.createElement('span'); s.dataset.k = 'google'; b.appendChild(s);
      const em = document.createElement('em'); em.className = 'sg-badge'; em.dataset.k = 'soon'; b.appendChild(em);
      slot.appendChild(b);
      const t = w(); s.textContent = t.google; em.textContent = t.soon;
    };
    if (!API.google.enabled) { if (!slot.querySelector('.is-soon')) soonBtn(); return; }
    if (gLang === lang() && slot.firstChild) return;
    gLang = lang();
    const t = w();
    API.google.render(slot, { label: t.google, text: 'signup_with', locale: lang() === 'ar' ? 'ar' : 'en', onCredential: onGoogle }).then((ok) => {
      if (!ok) soonBtn();
    });
  }
  function paintMsgOnly() { const gm = $('sg-gmsg'); const t = w(); gm.textContent = st.gmsgKey ? t[st.gmsgKey] : ''; gm.hidden = !st.gmsgKey; }
  function gIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('fill', 'currentColor');
    p.setAttribute('d', 'M21.35 11.1H12v3.2h5.35c-.5 2.4-2.5 3.8-5.35 3.8a5.9 5.9 0 0 1 0-11.8c1.4 0 2.6.5 3.55 1.35l2.3-2.3A9.1 9.1 0 0 0 12 3a9 9 0 1 0 0 18c5.2 0 8.6-3.65 8.6-8.8 0-.4-.05-.75-.1-1.1z');
    svg.appendChild(p);
    return svg;
  }

  async function onGoogle(idToken) {
    if (!idToken || st.busy) return;
    st.gmsgKey = ''; st.busy = true; paint();
    try {
      const r = await API.googleLogin(idToken);
      if (r && r.needSignup) {
        const p = r.profile || {};
        st.ticket = String(r.googleTicket || '');
        st.gname = [p.firstName, p.lastName].filter(Boolean).join(' ');
        if (p.firstName && !F.first.value) F.first.value = p.firstName;
        if (p.lastName && !F.last.value) F.last.value = p.lastName;
        if (p.email && !F.email.value) F.email.value = p.email;
        st.busy = false; paint();
        F.user.focus();
        return;
      }
      location.replace('index.html');
    } catch (e) {
      st.busy = false;
      const c = e && e.code;
      st.gmsgKey = c === 'ACCOUNT_PENDING' || c === 'ACCOUNT_REJECTED' || c === 'NETWORK' || c === 'GIZMO_DOWN' ? c : 'GOOGLE_FAIL';
      paint();
      if (c === 'ACCOUNT_PENDING' || c === 'ACCOUNT_REJECTED') addWa($('sg-gmsg'), w().waText);
    }
  }

  /* ---------- checks ---------- */
  const digits = (s) => String(s).replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x6F0);
  function normPhone(v) {
    let p = digits(v).replace(/[\s\-().]/g, '');
    if (p.startsWith('+20')) p = '0' + p.slice(3); else if (p.startsWith('0020')) p = '0' + p.slice(4); else if (/^20\d{10}$/.test(p)) p = '0' + p.slice(2);
    return p;
  }
  function ageOf(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    const now = new Date();
    let a = now.getFullYear() - Number(m[1]);
    if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) a -= 1;
    return a;
  }
  const rules = {
    first: () => (F.first.value.trim() ? '' : 'needFirst'),
    last: () => (F.last.value.trim() ? '' : 'needLast'),
    user: () => (/^[A-Za-z0-9_.]{3,20}$/.test(F.user.value.trim()) ? '' : 'badUser'),
    pass: () => (F.pass.value.length < 6 ? 'shortPass' : F.pass.value.length > 24 ? 'longPass' : ''),
    phone: () => (/^01[0125]\d{8}$/.test(normPhone(F.phone.value)) ? '' : 'badPhone'),
    email: () => { const v = F.email.value.trim(); return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'badEmail'; },
    birth: () => { const a = ageOf(F.birth.value); return a === null || a > 110 ? 'needBirth' : ''; },
  };
  function checkBirth() {
    const a = ageOf(F.birth.value);
    st.tooYoung = a !== null && a < MIN_AGE;
    if (st.tooYoung) st.fieldErr.birth = 'TOO_YOUNG'; else if (st.fieldErr.birth === 'TOO_YOUNG') st.fieldErr.birth = '';
  }
  function checkAll() {
    let first = null;
    Object.keys(rules).forEach((k) => {
      st.fieldErr[k] = rules[k]();
      if (st.fieldErr[k] && !first) first = k;
    });
    checkBirth();
    if (st.tooYoung && !first) first = 'birth';
    st.idErr = { front: '', back: '', both: '' };
    if (!st.skip && !(st.ids.front && st.ids.back)) { st.idErr.both = 'idBoth'; if (!first) first = 'ids'; }
    if (!useTurnstile() ? false : !st.tsToken) { st.msgKey = 'needCaptcha'; if (!first) first = 'ts'; } else if (st.msgKey === 'needCaptcha') st.msgKey = '';
    paint();
    if (first && F[first]) F[first].focus();
    else if (first === 'ids') $('sg-id-add').scrollIntoView({ block: 'center' });
    return !first;
  }

  /* ---------- ID photos: resize in a canvas, JPEG until it fits ---------- */
  function loadBitmap(file) {
    if (window.createImageBitmap) return createImageBitmap(file).catch(() => viaImg(file));
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }
  const toBlob = (cv, q) => new Promise((res) => cv.toBlob(res, 'image/jpeg', q));
  async function compress(file) {
    const bmp = await loadBitmap(file);
    const bw = bmp.width || bmp.naturalWidth, bh = bmp.height || bmp.naturalHeight;
    if (!bw || !bh) throw new Error('size');
    let scale = Math.min(1, MAX_SIDE / Math.max(bw, bh));
    for (let round = 0; round < 8; round++) {
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(bw * scale)); cv.height = Math.max(1, Math.round(bh * scale));
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
      for (let q = 0.8; q >= 0.45; q -= 0.1) {
        const b = await toBlob(cv, q);
        if (b && b.size <= MAX_BYTES) { if (bmp.close) bmp.close(); return b; }
      }
      scale *= 0.8;
    }
    throw new Error('big');
  }
  const toDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });

  async function takeFile(side, file) {
    if (!file) return;
    st.idErr[side] = ''; st.idErr.both = '';
    if (!/^image\//.test(file.type || '')) { st.idErr[side] = 'idBad'; paint(); return; }
    st.idState[side] = 'working'; st.pending += 1; paint();
    try {
      const blob = await compress(file);
      st.ids[side] = await toDataUrl(blob);
      const img = $(`sg-img-${side}`);
      img.src = st.ids[side];
      $(`sg-prev-${side}`).hidden = false;
      $(`sg-btns-${side}`).hidden = true;
      st.idState[side] = 'ready';
    } catch (e) {
      st.ids[side] = null; st.idState[side] = ''; st.idErr[side] = 'idBad';
    }
    st.pending -= 1; paint();
  }
  function removeSide(side) {
    st.ids[side] = null; st.idState[side] = ''; st.idErr[side] = '';
    $(`sg-img-${side}`).removeAttribute('src');
    $(`sg-prev-${side}`).hidden = true;
    $(`sg-btns-${side}`).hidden = false;
    paint();
  }
  document.querySelectorAll('.sg-file').forEach((inp) => inp.addEventListener('change', () => {
    const f = inp.files && inp.files[0];
    inp.value = ''; /* the same file can be picked again */
    takeFile(inp.dataset.side, f);
  }));
  document.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => removeSide(b.dataset.remove)));
  document.querySelectorAll('input[name="idmode"]').forEach((r) => r.addEventListener('change', () => {
    st.skip = r.value === 'skip' && r.checked;
    st.idErr = { front: '', back: '', both: '' };
    paint();
  }));

  /* ---------- Turnstile ---------- */
  function loadTurnstile() {
    if (!useTurnstile()) return;
    const box = $('sg-ts');
    box.hidden = false;
    const draw = () => {
      st.tsWidget = window.turnstile.render(box, {
        sitekey: CFG.TURNSTILE_SITE_KEY, theme: 'dark', language: lang() === 'ar' ? 'ar' : 'en',
        callback: (tok) => { st.tsToken = tok; if (st.msgKey === 'needCaptcha') st.msgKey = ''; paint(); },
        'expired-callback': () => { st.tsToken = ''; },
        'error-callback': () => { st.tsToken = ''; },
      });
    };
    if (window.turnstile) { draw(); return; }
    const sc = document.createElement('script');
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    sc.async = true; sc.defer = true;
    sc.onload = draw;
    sc.onerror = () => { st.msgKey = 'NETWORK'; paint(); };
    document.head.appendChild(sc);
  }
  function resetTurnstile() {
    st.tsToken = '';
    try { if (st.tsWidget !== null && window.turnstile) window.turnstile.reset(st.tsWidget); } catch (e) { /* widget gone */ }
  }

  /* ---------- send ---------- */
  function countdown(seconds) {
    clearInterval(st.timer);
    st.wait = Math.max(1, Math.ceil(Number(seconds) || 1));
    paint();
    st.timer = setInterval(() => {
      st.wait -= 1;
      if (st.wait <= 0) { clearInterval(st.timer); st.wait = 0; }
      paint();
    }, 1000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (st.busy || st.wait > 0 || st.pending > 0) return;
    st.msgKey = '';
    if (!checkAll()) return;
    const body = {
      username: F.user.value.trim(), password: F.pass.value,
      firstName: F.first.value.trim(), lastName: F.last.value.trim(),
      phone: normPhone(F.phone.value), birthDate: F.birth.value,
      turnstile: useTurnstile() ? st.tsToken : 'mock', lang: lang(),
    };
    if (F.email.value.trim()) body.email = F.email.value.trim();
    if (!st.skip) { body.idFront = st.ids.front; body.idBack = st.ids.back; }
    if (st.ticket) body.googleTicket = st.ticket;
    st.busy = true; paint();
    try {
      const r = await API.signup(body);
      finish(!!(r && r.hasId));
    } catch (err) {
      st.busy = false;
      const c = err && err.code;
      if (useTurnstile()) resetTurnstile();
      if (c === 'USERNAME_TAKEN') { st.fieldErr.user = 'USERNAME_TAKEN'; paint(); F.user.focus(); return; }
      if (c === 'PHONE_TAKEN') { st.fieldErr.phone = 'PHONE_TAKEN'; paint(); F.phone.focus(); return; }
      if (c === 'EMAIL_TAKEN') { st.fieldErr.email = 'EMAIL_TAKEN'; paint(); F.email.focus(); return; }
      if (c === 'TOO_YOUNG') { st.fieldErr.birth = 'TOO_YOUNG'; st.tooYoung = true; paint(); F.birth.focus(); return; }
      if (c === 'RATE_LIMITED') { countdown(err.retryAfter); return; }
      st.msgKey = ['CAPTCHA', 'BAD_REQUEST', 'GIZMO_DOWN', 'NETWORK'].includes(c) ? c : 'DOWN';
      paint();
    }
  });

  /* success: wipe the photos and the password from memory, show the screen */
  function finish(hasId) {
    st.ids.front = null; st.ids.back = null;
    ['front', 'back'].forEach((s) => $(`sg-img-${s}`).removeAttribute('src'));
    form.reset();
    st.busy = false; st.ticket = ''; st.done = hasId ? 'doneId' : 'doneNoId';
    try { sessionStorage.removeItem(TICKET_KEY); } catch (e) { /* storage unavailable */ }
    $('sg-start').hidden = true; form.hidden = true; $('sg-links').hidden = true; $('sg-done').hidden = false;
    $('sg-title').hidden = true;
    paint();
    $('sg-done-title').focus();
    window.scrollTo(0, 0);
  }

  /* ---------- small wiring ---------- */
  Object.keys(F).forEach((k) => F[k].addEventListener('input', () => {
    if (k === 'birth') { checkBirth(); }
    if (st.fieldErr[k] && !(k === 'birth' && st.tooYoung)) { st.fieldErr[k] = ''; }
    paint();
  }));
  F.birth.addEventListener('change', () => { checkBirth(); paint(); });
  eye.addEventListener('click', () => { F.pass.type = F.pass.type === 'password' ? 'text' : 'password'; paint(); F.pass.focus(); });
  F.birth.max = new Date().toISOString().slice(0, 10);

  function init() {
    window.ClashSite.initLang({ en: EN, titleEn: 'Create an account | Clash Esports', onChange: paint });
    try {
      const raw = sessionStorage.getItem(TICKET_KEY);
      if (raw) {
        sessionStorage.removeItem(TICKET_KEY);
        const d = JSON.parse(raw), p = d.profile || {};
        if (d.ticket) {
          st.ticket = String(d.ticket);
          st.gname = [p.firstName, p.lastName].filter(Boolean).join(' ');
          F.first.value = p.firstName || ''; F.last.value = p.lastName || ''; F.email.value = p.email || '';
        }
      }
    } catch (e) { /* no hand-over */ }
    paint();
    API.envTags();
    loadTurnstile();
  }

  if (window.ClashSite && API) init();
})();
