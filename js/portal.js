/* Clash Esports member portal shell (portal/index.html): side menu, member header, balance / points / time cards.
   Data comes only from window.ClashAPI. T4 (zones), T5 (floor) and T6 (session) fill the empty sections below the cards.
   Words: English table below; Arabic is read from the page by ClashSite.initLang (data-i18n) and from the `ar` side of W. */
(() => {
  const api = window.ClashAPI;
  const site = window.ClashSite;

  const EN = {
    skip: 'Skip to content', menu: 'Menu', menuLabel: 'Account menu', cardsLabel: 'Your balance',
    backSite: 'Website', tabDash: 'Dashboard', tabOpen: 'Open a PC', tabWait: 'Waiting list',
    tabSessions: 'Sessions', tabTopup: 'Top up', tabOffers: 'Offers', soon: 'soon', logout: 'Log out',
    footTitle: 'Come play today', footCta: 'Book on WhatsApp', branchZayed: 'Zayed branch', branchOctober: 'October branch',
    map: 'On the map', hours: 'Open 24 hours, every day',
  };

  /* strings the script draws itself */
  const W = {
    en: {
      title: 'My account | Clash Esports',
      balance: 'Balance', egp: 'EGP', points: 'Points', pts: 'pts', time: 'Total time available', hm: 'h:mm',
      ready: 'Ready to play', playing: (n) => `Playing on PC ${n}`, member: 'Member',
      down: "The service isn't available right now, try again in a bit",
      generic: 'Something went wrong. Try again.',
      retry: 'Try again', loading: 'Loading your account',
      soonWord: 'soon',
      map: {
        placesLabel: 'Places', yourTime: 'Your time here', noTimeShort: 'No time', perHour: 'EGP / hour', freeNow: 'Free now',
        freeAll: (n) => `Free in all ${n}s`,
        full: (n, m) => `${n} is full right now, next PC in about ${m} min`,
        fullAll: (n, m) => `All ${n}s are full right now, next PC in about ${m} min`,
        empty: 'No PCs to show right now.',
        mapHall: (n) => `${n} · tap a free PC`, mapRoom: 'Inside the room · tap a free PC', screen: 'Screen wall', door: 'Door',
        updated: (n) => `Updated ${n} s ago`,
        lgFree: 'Free', lgBusy: 'In use', lgHeld: 'Held', lgOut: 'Out of order', lgPick: 'Your pick',
        left: (n) => `${n}m left`, held: 'held', out: 'out',
        pc: (n) => `PC ${n}`, state: { free: 'free', busy: 'in use', reserved: 'held', out: 'out of order' },
        sheetSub: (p, t) => `${p} · your time here ${t}`, change: 'Change', openNow: (n) => `Open PC ${n} now`, opening: 'Opening…',
        buyHours: 'Buy hours', noTimeLine: (z) => `You have no time in ${z}. Buy hours first.`,
        errors: {
          NO_TIME: 'You have no time left in this zone. Buy hours first.',
          HOST_TAKEN: 'This PC was just taken, pick another.',
          HOST_OUT: 'This PC is out of order, pick another.',
          GIZMO_DOWN: "The lounge system isn't answering right now, try again in a bit.",
          NETWORK: "Can't reach the service. Check your connection and try again.",
          NOT_WIRED: "This isn't connected yet.",
          NOT_FOUND: "That PC isn't on the floor any more.",
        },
        rate: (n) => `Too many tries, wait ${n} seconds.`,
        offList: (z) => `Opening this PC takes you off the ${z} waiting list.`,
        errAlready: (n) => `You're already playing on PC ${n}, end that session first.`,
        errAlreadyAny: "You're already playing on another PC, end that session first.",
        sessionStarted: 'Session started', isOn: (n) => `PC ${n} is on`, sessionTitle: 'Playing now',
        doneLine: (n, z) => `Your name is on PC ${n} in ${z}. Sit down and play; the time comes from your ${z} hours.`,
        started: 'Started', timeLeft: 'Time left', endSession: 'End session', ending: 'Ending…', back: 'Back to the floor',
      },
    },
    ar: {
      title: 'حسابي | Clash Esports',
      balance: 'الرصيد', egp: 'ج.م', points: 'النقاط', pts: 'نقطة', time: 'إجمالي الوقت المتاح', hm: 'س:د',
      ready: 'جاهز تلعب', playing: (n) => `بتلعب على PC ${n}`, member: 'عضو',
      down: 'الخدمة مش متاحة دلوقتي، جرّب تاني بعد شوية',
      generic: 'حصلت مشكلة. جرّب تاني.',
      retry: 'جرّب تاني', loading: 'بنحمّل حسابك',
      soonWord: 'قريبًا',
      map: {
        placesLabel: 'الأماكن', yourTime: 'وقتك هنا', noTimeShort: 'مفيش وقت', perHour: 'ج.م / ساعة', freeNow: 'فاضي دلوقتي',
        freeAll: (n) => `فاضي في كل ${n}`,
        full: (n, m) => `${n} مليانة دلوقتي، أقرب PC بعد حوالي ${m} دقيقة`,
        fullAll: (n, m) => `كل ${n} مليانة دلوقتي، أقرب PC بعد حوالي ${m} دقيقة`,
        empty: 'مفيش أجهزة نعرضها دلوقتي.',
        mapHall: (n) => `${n} · اضغط على PC فاضي`, mapRoom: 'جوه الأوضة · اضغط على PC فاضي', screen: 'حيطة الشاشات', door: 'الباب',
        updated: (n) => `اتحدّث من ${n} ث`,
        lgFree: 'فاضي', lgBusy: 'مستخدم', lgHeld: 'محجوز مؤقتًا', lgOut: 'عطلان', lgPick: 'اختيارك',
        left: (n) => `باقي ${n} د`, held: 'محجوز', out: 'عطلان',
        pc: (n) => `PC ${n}`, state: { free: 'فاضي', busy: 'مستخدم', reserved: 'محجوز مؤقتًا', out: 'عطلان' },
        sheetSub: (p, t) => `${p} · وقتك هنا ${t}`, change: 'غيّر', openNow: (n) => `افتح PC ${n} دلوقتي`, opening: 'بنفتح…',
        buyHours: 'اشتري ساعات', noTimeLine: (z) => `مفيش عندك وقت في ${z}. اشتري ساعات الأول.`,
        errors: {
          NO_TIME: 'مفيش عندك وقت في المنطقة دي. اشتري ساعات الأول.',
          HOST_TAKEN: 'الجهاز ده اتاخد حالًا، اختار جهاز تاني.',
          HOST_OUT: 'الجهاز ده عطلان، اختار جهاز تاني.',
          GIZMO_DOWN: 'نظام الصالة مش بيرد دلوقتي، جرّب تاني بعد شوية.',
          NETWORK: 'مش قادرين نوصل للخدمة. اتأكد من النت وجرّب تاني.',
          NOT_WIRED: 'ده لسه مش متوصّل.',
          NOT_FOUND: 'الجهاز ده مش في الصالة دلوقتي.',
        },
        rate: (n) => `محاولات كتير، استنى ${n} ثانية.`,
        offList: (z) => `فتح الجهاز ده هيشيلك من قائمة انتظار ${z}.`,
        errAlready: (n) => `إنت بتلعب أصلًا على PC ${n}، أنهي الجلسة دي الأول.`,
        errAlreadyAny: 'إنت بتلعب أصلًا على جهاز تاني، أنهي الجلسة دي الأول.',
        sessionStarted: 'بدأت الجلسة', isOn: (n) => `PC ${n} اشتغل`, sessionTitle: 'بتلعب دلوقتي',
        doneLine: (n, z) => `اسمك على PC ${n} في ${z}. اقعد والعب؛ الوقت بيتخصم من ساعات ${z}.`,
        started: 'بدأت', timeLeft: 'الوقت المتبقي', endSession: 'إنهاء الجلسة', ending: 'بننهي…', back: 'رجوع للصالة',
      },
    },
  };
  const w = () => W[site.lang === 'ar' ? 'ar' : 'en'];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (mins) => { const m = Math.max(0, Math.round(mins || 0)); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
  const num = (n) => Number(n || 0).toLocaleString('en-US');

  const state = { phase: 'loading', data: null, err: null };
  let token = 0;

  function initials(user) {
    const parts = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || '';
    const bits = parts.split(/\s+/).filter(Boolean);
    if (bits.length > 1) return (bits[0][0] + bits[1][0]).toUpperCase();
    return parts.slice(0, 2).toUpperCase() || '?';
  }
  const fullName = (user) => [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || w().member;

  function memberHtml() {
    if (state.phase === 'loading') {
      return '<div class="pn-skel round"></div><div class="pn-who"><div class="pn-skel line" style="width:9em;margin-bottom:8px"></div><div class="pn-skel line" style="width:6em"></div></div>';
    }
    if (state.phase === 'error') return '';
    const d = state.data;
    const a = d.activeSession;
    const status = a
      ? `<div class="pn-status is-playing"><span class="pn-dot"></span>${esc(w().playing(a.hostNumber))}</div>`
      : `<div class="pn-status is-ready"><span class="pn-dot"></span>${esc(w().ready)}</div>`;
    return `<div class="pn-avatar" aria-hidden="true">${esc(initials(d.user))}</div>
      <div class="pn-who"><h1 class="pn-name">${esc(fullName(d.user))}</h1>${status}</div>`;
  }

  function cardHtml(tone, label, value, unit, skel) {
    if (skel) return `<div class="pn-card is-skel"><dt><span class="pn-skel line"></span></dt><dd><span class="pn-skel big" style="display:block"></span></dd></div>`;
    return `<div class="pn-card t-${tone}"><dt>${esc(label)}</dt><dd>${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ''}</dd></div>`;
  }

  function cardsHtml() {
    const t = w();
    if (state.phase === 'loading') return [0, 1, 2].map(() => cardHtml('', '', '', '', true)).join('');
    if (state.phase === 'error') {
      const down = state.err && (state.err.code === 'GIZMO_DOWN' || state.err.code === 'NETWORK');
      return `<div class="pn-error" role="alert"><p>${esc(down ? t.down : t.generic)}</p><button class="pn-retry" type="button" id="pn-retry">${esc(t.retry)}</button></div>`;
    }
    const d = state.data;
    return cardHtml('red', t.balance, num(d.balance), t.egp)
      + cardHtml('blue', t.points, num(d.points), '')
      + cardHtml('yellow', t.time, hm(d.totalMinutes), t.hm);
  }

  function render() {
    const main = $('main');
    main.setAttribute('aria-busy', state.phase === 'loading' ? 'true' : 'false');
    $('member').innerHTML = memberHtml();
    $('cards').innerHTML = cardsHtml();
    if (state.phase === 'data') { $('member').classList.add('pn-fade'); $('cards').classList.add('pn-fade'); }
    const retry = $('pn-retry');
    if (retry) retry.addEventListener('click', load);
    document.title = w().title;
  }

  /* signed out: go to login and come back to this exact page (place and mock switches kept) */
  function toLogin() {
    location.replace('login.html?next=' + encodeURIComponent('index.html' + location.search));
  }

  function load() {
    const mine = ++token;
    state.phase = 'loading'; state.err = null;
    render();
    api.me.dashboard().then((data) => {
      if (mine !== token) return;
      state.phase = 'data'; state.data = data;
      render();
      window.PortalMap.setDash(data);
    }, (err) => {
      if (mine !== token) return;
      if (err && err.code === 'NOT_SIGNED_IN') { toLogin(); return; }
      state.phase = 'error'; state.err = err;
      render();
    });
  }

  /* quiet re-read of the dashboard (after a session starts or ends): no skeleton, no flash */
  function refreshDash() {
    return api.me.dashboard().then((data) => {
      if (state.phase !== 'data') return;
      state.data = data;
      render();
      window.PortalMap.setDash(data);
    }, () => {});
  }

  function wireMenu() {
    const btn = $('pn-toggle');
    const menu = $('pn-menu');
    const set = (open) => { menu.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    $('main').addEventListener('click', () => set(false));
    $('pn-menu-open').addEventListener('click', () => set(false));
    $('pn-menu-wait').addEventListener('click', () => { set(false); window.PortalWait.openSheet(); });
    $('pn-logout').addEventListener('click', () => {
      const go = () => location.replace('login.html');
      api.logout().then(go, go);
    });
  }

  /* a failure in one part must not stop the rest of the page */
  const safe = (fn) => { try { fn(); } catch (e) { if (window.console) console.warn('portal init', e); } };
  const onEnded = () => { if (state.data) { state.data = Object.assign({}, state.data, { activeSession: null }); if (state.phase === 'data') render(); } };
  safe(() => window.PortalMap.init({ api, site, getW: w, onSession: refreshDash, signedOut: toLogin, onEnded }));
  safe(() => window.PortalWait.init({ api, site, hooks: window.PortalMap.hooks, signedOut: toLogin }));
  safe(() => site.initLang({ en: EN, titleEn: W.en.title, onChange: () => { if (token) { render(); safe(() => window.PortalMap.rerender()); safe(() => window.PortalWait.rerender()); } } }));
  safe(wireMenu);
  load();
})();
