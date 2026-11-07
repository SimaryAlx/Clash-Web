/* Clash Esports member portal: the one door the portal pages use for PCs, time and the waiting list (window.ClashAPI).
   CLASH_API_MODE in js/config.js picks the adapter: 'mock' runs on made-up Zayed data inside this browser,
   'http' talks to the Clash API (/v1, CLASH_API_URL; localhost only, ?api=http), 'staging' talks to CLASH_API_STAGING_URL (any host, ?api=staging; stays mock while that is empty). ?api=http|staging is remembered, ?api=mock clears it.
   Both give the same shapes, so the pages never change. me.history(kind, cursor) -> { items, nextCursor } for kind purchases|deposits|sessions|points.
   shopTime(zoneId) -> [{ id, name, minutes, price, zoneIds }] sorted by price (signed in: the member's own prices); me.buyTime(productId, zoneId, price, idemKey) -> { balance, zoneId, usableMinutes }
   (price = the price the member saw; errors NO_BALANCE, PRICE_CHANGED, NOT_FOUND, RATE_LIMITED, GIZMO_DOWN; the mock balance starts at 185 and drops with each buy, per tab).
   Card payments: me.payCheckout({ kind:'time', productId, zoneId, price } | { kind:'topup', amount }, idemKey) -> { intentId, redirectUrl }
   (returnTo = this portal page without query/hash is added here), me.payStatus(intentId) -> { intentId, kind, amount, state, product, zoneId, message, createdAt }
   with state pending | processing | done | credited | failed | review. Mock: the intent walks pending -> processing -> done over about 3 s;
   ?mock=pay_failed|pay_credited|pay_review forces that end state (also for a bare ?pay=<id> link).
   Web Push: push.key() -> VAPID public key (base64url), me.pushSubscribe(subscription.toJSON(), lang), me.pushUnsubscribe(endpoint) (mock keeps them in memory).
   Signup (no member needed): signup(body) -> { status:'pending', hasId }; googleLogin(idToken) -> { user } (signed in) or { needSignup:true, profile:{ firstName, lastName, email }, googleTicket }.
   login(username, ...) accepts a username or a mobile number; it can fail with ACCOUNT_PENDING / ACCOUNT_REJECTED.
   google.enabled / google.render(el, { label, text, locale, onCredential }) draws the Google button (Google Identity Services; in mock mode a plain button that hands back a fake token).
   Mock signup: username taken/admin -> USERNAME_TAKEN, phone 01000000000 -> PHONE_TAKEN, email taken@example.com -> EMAIL_TAKEN, login pending or a name just signed up -> ACCOUNT_PENDING, rejected -> ACCOUNT_REJECTED.
   Every call returns a Promise. Errors are thrown as { code, message, retryAfter? }; the pages translate by code.
   isFinal(code): true when the server gave a final answer, so the next try of a write needs a new Idempotency-Key.
   NETWORK and 5xx (GIZMO_DOWN, INTERNAL, unknown codes) are not final: retry with the SAME key.
   Mock test switches: add ?mock=gizmo_down|network|empty|slow|host_taken|no_time|already_active|offer|offer_expired|host_out|price_changed|gizmo_down_write|network_write to the page URL.
   (host_out: startSession says HOST_OUT. price_changed: the first buy says PRICE_CHANGED and the prices go up 10%.
   *_write: only startSession, endSession, joinWaitlist, leaveWaitlist, acceptOffer, buyTime, addFavorite, removeFavorite fail; reads keep working.)
   Needs js/config.js and js/pc-layout.js loaded first. */
window.ClashAPI = (() => {
  const cfg = window.CLASH_CONFIG || {};
  const MODE_KEY = 'clash-api-mode';
  let WARNED = false;
  function pickMode() {
    if (cfg.CLASH_API_MODE === 'http') return 'http';
    try {
      const host = window.location.hostname;
      const local = host === 'localhost' || host === '127.0.0.1';
      const q = new URLSearchParams(window.location.search).get('api');
      const store = (v) => { try { window.localStorage.setItem(MODE_KEY, v); } catch (e) { /* no storage */ } };
      if (q === 'mock') { try { window.localStorage.removeItem(MODE_KEY); } catch (e) { /* no storage */ } return 'mock'; }
      let want = q === 'http' || q === 'staging' ? q : null;
      if (want === 'http' && !local) want = null;
      if (want) store(want);
      else { const saved = window.localStorage.getItem(MODE_KEY); want = saved === 'staging' || (saved === 'http' && local) ? saved : 'mock'; }
      if (want === 'staging' && !cfg.CLASH_API_STAGING_URL) {
        if (!WARNED) { WARNED = true; console.warn('Clash API: staging mode asked for, but CLASH_API_STAGING_URL is empty. Staying in mock mode.'); }
        return 'mock';
      }
      return want;
    } catch (e) { return 'mock'; }
  }
  const MODE = pickMode();
  const LAYOUT = window.CLASH_LAYOUT || {};

  const MESSAGES = {
    BAD_LOGIN: 'Wrong username or password.',
    RATE_LIMITED: 'Too many tries. Wait a little and try again.',
    NO_TIME: 'You have no time left in this zone.',
    HOST_TAKEN: 'Someone took this PC just before you.',
    ALREADY_ACTIVE: 'You are already on another PC.',
    HOST_OUT: 'This PC is out of order.',
    GIZMO_DOWN: 'The lounge system is not answering right now.',
    NETWORK: 'No connection. Check your internet and try again.',
    NOT_FULL: 'This zone still has a free PC. Open one now.',
    ALREADY_WAITING: 'You are already on a waiting list.',
    OFFER_EXPIRED: 'The offer ran out and the PC went back.',
    NOT_SIGNED_IN: 'Please log in first.',
    NOT_FOUND: 'Not found.',
    NOT_WIRED: 'The Clash API is not connected yet.',
    NO_BALANCE: 'Not enough balance for this.',
    BAD_REQUEST: 'Something was wrong with that request.',
    INTERNAL: 'Something went wrong. Try again.',
    PRICE_CHANGED: 'The price changed. Check it and try again.',
    BAD_AMOUNT: 'Enter a whole amount from 20 to 5000 EGP.',
    USERNAME_TAKEN: 'This username is taken.',
    PHONE_TAKEN: 'This mobile number already has an account.',
    EMAIL_TAKEN: 'This email already has an account.',
    TOO_YOUNG: 'Under 16? Come to the branch with a parent to sign up.',
    CAPTCHA: 'The security check did not pass. Try again.',
    ACCOUNT_PENDING: 'Your account is waiting for approval.',
    ACCOUNT_REJECTED: 'Your signup was not accepted. Contact us on WhatsApp.',
  };
  // where the provider sends the member back: this portal page, no query or hash (works under a sub-path such as /Clash-Web/portal/)
  function returnTo() {
    try { const u = new URL(window.location.href); u.search = ''; u.hash = ''; return u.href; } catch (e) { return `${window.location.origin}/portal/index.html`; }
  }
  const fail = (code, extra) => Object.assign({ code, message: MESSAGES[code] || code }, extra);

  // 4xx-type answers: the server decided, so a retry is a new attempt with a new Idempotency-Key
  const FINAL = ['BAD_REQUEST', 'NOT_FOUND', 'HOST_TAKEN', 'ALREADY_ACTIVE', 'HOST_OUT', 'NO_TIME', 'NOT_FULL',
    'ALREADY_WAITING', 'OFFER_EXPIRED', 'NO_BALANCE', 'PRICE_CHANGED', 'RATE_LIMITED',
    'USERNAME_TAKEN', 'PHONE_TAKEN', 'EMAIL_TAKEN', 'TOO_YOUNG', 'CAPTCHA', 'ACCOUNT_PENDING', 'ACCOUNT_REJECTED'];
  const isFinal = (code) => FINAL.includes(code);

  /* ---------- mock: made-up Zayed lounge, kept in this tab ---------- */
  function mockAdapter() {
    const KEY = 'clash-api-mock-v1';
    const MIN = 60000, DAY = 86400000;
    const T0 = Date.now();

    // Gizmo host groups at Zayed (data/clash-zayed.md); prices from js/rooms.js
    const ZONES = [
      { id: 'normal', name: { en: 'Normal', ar: 'عادي' }, side: 'blue', price: 30, age21: false, from: 55, to: 70 },
      { id: 'normal21', name: { en: 'Normal +21', ar: 'عادي +21' }, side: 'blue', price: 30, age21: true, from: 71, to: 90 },
      { id: 'vip', name: { en: 'VIP', ar: 'VIP' }, side: 'red', price: 40, age21: false, from: 21, to: 36 },
      { id: 'vip21', name: { en: 'VIP +21', ar: 'VIP +21' }, side: 'red', price: 40, age21: true, from: 37, to: 51 },
      { id: 'team', name: { en: 'Team Room', ar: 'أوضة التيم' }, side: 'both', price: 60, age21: false, from: 1, to: 10 },
      { id: 'cave', name: { en: 'Cave Room', ar: 'أوضة الكهف' }, side: 'red', price: 60, age21: false, from: 16, to: 20 },
      { id: 'elite', name: { en: 'Elite Room', ar: 'أوضة الإيليت' }, side: 'yellow', price: 70, age21: false, from: 11, to: 15 },
      { id: 'stream', name: { en: 'Stream Room', ar: 'أوضة الستريم' }, side: null, price: 100, age21: false, from: 91, to: 92 },
      { id: 'duo', name: { en: 'Duo Stream Room', ar: 'أوضة الستريم دو' }, side: null, price: 100, age21: false, from: 93, to: 94 },
    ];
    const ZONE = {};
    const zoneOf = {};
    ZONES.forEach((z) => {
      ZONE[z.id] = z;
      z.numbers = [];
      for (let n = z.from; n <= z.to; n++) { z.numbers.push(n); zoneOf[n] = z.id; }
    });
    const hostIdOf = (n) => `zayed-${n}`;
    const numberOf = (id) => { const n = Number(String(id).replace('zayed-', '')); return zoneOf[n] ? n : 0; };

    // the member's time per zone, in minutes
    const TIME = { normal: 420, normal21: 420, vip: 180, vip21: 180, team: 120, cave: 90, elite: 0, stream: 60, duo: 45 };
    const EXPIRES = { normal: T0 + 30 * DAY, vip: T0 + 12 * DAY };

    function seeded(seed) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const flipRng = seeded(91);

    // the same lounge every time: about 55% busy, a few reserved, 2 out of order
    const OUT = [48, 77];
    const hosts = {};
    const start = seeded(2026);
    Object.keys(zoneOf).map(Number).sort((a, b) => a - b).forEach((n) => {
      const r = start();
      const m = 10 + Math.floor(start() * 230);
      let state = r < 0.55 ? 'busy' : r < 0.62 ? 'reserved' : 'free';
      if (OUT.includes(n)) state = 'out';
      hosts[n] = { state, until: state === 'busy' ? T0 + m * MIN : state === 'reserved' ? T0 + (5 + (m % 55)) * MIN : null };
    });
    // the Team Rooms are full from the start, so the waiting list can be tried
    ZONE.team.numbers.forEach((n, i) => { hosts[n] = { state: 'busy', until: T0 + (25 + i * 9) * MIN }; });

    const blank = () => ({ user: null, active: null, used: {}, favorites: [], wait: null, idem: {}, fails: [], spent: 0, topped: 0, bought: {}, pays: {} });
    function load() {
      try {
        const v = JSON.parse(window.sessionStorage.getItem(KEY));
        if (v && typeof v === 'object') return Object.assign(blank(), v);
      } catch (e) { /* no storage: start fresh */ }
      return blank();
    }
    const st = load();
    function save() { try { window.sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* tab memory only */ } }

    const scenario = () => {
      try { return new URLSearchParams(window.location.search).get('mock') || ''; } catch (e) { return ''; }
    };
    const wait = (s) => new Promise((r) => setTimeout(r, s === 'slow' ? 2500 + Math.random() * 1500 : 150 + Math.random() * 450));
    async function call(fn) {
      const s = scenario();
      await wait(s);
      if (s === 'gizmo_down') throw fail('GIZMO_DOWN');
      if (s === 'network') throw fail('NETWORK');
      return fn(s);
    }
    // write calls: the same, plus the *_write switches
    const callW = (fn) => call((s) => {
      if (s === 'gizmo_down_write') throw fail('GIZMO_DOWN');
      if (s === 'network_write') throw fail('NETWORK');
      return fn(s);
    });
    function need() { if (!st.user) throw fail('NOT_SIGNED_IN'); }

    /* ---------- shop: 1 hour = zone price, 3 hours, 5 hours with 10% off ---------- */
    const balanceNow = () => Math.round((185 - (st.spent || 0) + (st.topped || 0)) * 100) / 100;
    function productsFor(zoneId) {
      const z = ZONE[zoneId];
      if (!z) throw fail('NOT_FOUND');
      const up = scenario() === 'price_changed' && st.priceUp ? 1.1 : 1; // ?mock=price_changed: +10% after the first buy try
      return [[1, 'Hour', 1], [3, '3 Hours', 1], [5, '5 Hours', 0.9]].map(([h, label, k]) => ({
        id: `${z.id}-${h}h`, name: `${z.name.en} ${label}`, minutes: h * 60, price: Math.round(z.price * h * k * up * 100) / 100, zoneIds: [z.id],
      }));
    }

    /* ---------- time ---------- */
    function usable(zoneId) {
      let m = (TIME[zoneId] || 0) + (st.bought[zoneId] || 0) - (st.used[zoneId] || 0);
      if (st.active && st.active.zoneId === zoneId) m -= Math.floor((Date.now() - Date.parse(st.active.startedAt)) / MIN);
      return Math.max(0, m);
    }
    function stopActive() {
      const a = st.active;
      if (!a) return;
      st.used[a.zoneId] = (st.used[a.zoneId] || 0) + Math.floor((Date.now() - Date.parse(a.startedAt)) / MIN);
      hosts[a.hostNumber] = { state: 'free', until: null };
      st.active = null;
      save();
    }
    function activeView() {
      if (!st.active) return null;
      const left = usable(st.active.zoneId);
      if (left <= 0) { stopActive(); return null; }
      return Object.assign({}, st.active, { minutesLeft: left });
    }
    const fakeActive = () => ({ hostId: hostIdOf(60), hostNumber: 60, zoneId: 'normal', startedAt: new Date(T0 - 25 * MIN).toISOString(), minutesLeft: 95 });

    /* ---------- hosts ---------- */
    function hostState(n) {
      if (st.wait) advance();
      if (st.active && st.active.hostNumber === n) return { state: 'busy', minutesLeft: usable(st.active.zoneId) || 1 };
      const h = hosts[n];
      const now = Date.now();
      if (st.wait && st.wait.offer && st.wait.offer.hostNumber === n) {
        return { state: 'reserved', minutesLeft: Math.max(1, Math.ceil((Date.parse(st.wait.offer.expiresAt) - now) / MIN)) };
      }
      if (h.until && h.until <= now) {
        if (h.state === 'reserved') { h.state = 'busy'; h.until = now + 90 * MIN; } else { h.state = 'free'; h.until = null; }
      }
      return { state: h.state, minutesLeft: h.until ? Math.max(1, Math.ceil((h.until - now) / MIN)) : null };
    }
    function zoneHostsNow(zoneId, s) {
      const z = ZONE[zoneId];
      if (!z) throw fail('NOT_FOUND');
      const list = s === 'empty' ? [] : z.numbers.map((n) => Object.assign({ id: hostIdOf(n), number: n }, hostState(n)));
      return { updatedAt: new Date().toISOString(), hosts: list };
    }
    // someone else sits down or gets up, now and then
    function maybeFlip(zoneId) {
      if (flipRng() > 0.4) return;
      const z = ZONE[zoneId];
      const pool = z.numbers.filter((n) => !(st.active && st.active.hostNumber === n) && ['free', 'busy'].includes(hostState(n).state));
      if (!pool.length) return;
      const n = pool[Math.floor(flipRng() * pool.length)];
      hosts[n] = hosts[n].state === 'free'
        ? { state: 'busy', until: Date.now() + (30 + Math.floor(flipRng() * 150)) * MIN }
        : { state: 'free', until: null };
    }

    /* ---------- waiting list: one entry per member; position drops every WAIT_STEP, then the PC is held ---------- */
    const WAIT_STEP = 20000, HOLD = 5 * MIN;
    let pushKey = null, pushSubs = []; // push subscriptions: memory only (mock)
    const holdMs = () => (scenario() === 'offer_expired' ? 10000 : HOLD);
    function makeOffer(at) {
      const w = st.wait;
      const pool = ZONE[w.zoneId].numbers.filter((n) => !(st.active && st.active.hostNumber === n) && hosts[n].state !== 'out');
      pool.sort((a, b) => (hosts[a].until || 0) - (hosts[b].until || 0));
      const n = pool[0];
      w.status = 'offered';
      w.position = 1;
      w.offer = { hostId: hostIdOf(n), hostNumber: n, expiresAt: new Date(at + holdMs()).toISOString() };
    }
    // bring the entry up to date with the clock (also after a page refresh)
    function advance() {
      const w = st.wait;
      if (!w) return;
      const now = Date.now();
      if (w.status === 'waiting') {
        const steps = Math.floor((now - Date.parse(w.joinedAt)) / WAIT_STEP);
        if (steps >= 2) makeOffer(Date.parse(w.joinedAt) + 2 * WAIT_STEP);
        else w.position = 3 - steps;
      }
      if (w.status === 'offered' && Date.parse(w.offer.expiresAt) <= now) {
        const h = hosts[w.offer.hostNumber];
        if (!(h.until && h.until > now)) hosts[w.offer.hostNumber] = { state: 'free', until: null };
        st.wait = null;
        st.expired = true;
      }
      save();
    }
    const waitView = () => {
      advance();
      return st.wait ? JSON.parse(JSON.stringify(st.wait)) : null;
    };
    const favList = () => st.favorites.filter(numberOf).map((id) => { const n = numberOf(id); return { hostId: id, hostNumber: n, zoneId: zoneOf[n] }; });

    const zoneHosts = (zoneId) => call((s) => zoneHostsNow(zoneId, s));

    function watchZone(zoneId, cb) {
      let stopped = false;
      const hidden = () => typeof document !== 'undefined' && document.hidden;
      const tick = (flip) => {
        if (stopped || hidden()) return;
        if (flip && ZONE[zoneId]) maybeFlip(zoneId);
        zoneHosts(zoneId).then((r) => { if (!stopped) cb(r); }, (e) => { if (!stopped) cb(null, e); });
      };
      const onShow = () => { if (!hidden()) tick(false); };
      tick(false);
      const timer = setInterval(() => tick(true), 10000);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onShow);
      return () => {
        stopped = true;
        clearInterval(timer);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onShow);
      };
    }

    // cb(entry|null, err) now and whenever the entry changes (position, offer, gone); pauses while the tab is hidden
    function watchWaitlist(cb) {
      let stopped = false, last;
      const hidden = () => typeof document !== 'undefined' && document.hidden;
      const tick = (force) => {
        if (stopped || hidden()) return;
        call(() => { need(); return waitView(); }).then((r) => {
          const j = JSON.stringify(r);
          if (stopped || (!force && j === last)) return;
          last = j;
          cb(r);
        }, (e) => { if (!stopped) cb(null, e); });
      };
      const onShow = () => { if (!hidden()) tick(true); };
      tick(true);
      const timer = setInterval(() => tick(false), 2000);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onShow);
      return () => {
        stopped = true;
        clearInterval(timer);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onShow);
      };
    }

    return {
      login: (username, password) => call(() => {
        const now = Date.now();
        st.fails = st.fails.filter((t) => now - t < MIN);
        if (st.fails.length >= 5) {
          throw fail('RATE_LIMITED', { retryAfter: Math.max(1, Math.ceil((st.fails[0] + MIN - now) / 1000)) });
        }
        const name = String(username || '').trim();
        if (name.toLowerCase() === 'pending' || (st.signedUp || []).includes(name.toLowerCase())) throw fail('ACCOUNT_PENDING');
        if (name.toLowerCase() === 'rejected') throw fail('ACCOUNT_REJECTED');
        if (!name || !password || password === 'wrong') {
          st.fails.push(now);
          save();
          throw fail('BAD_LOGIN');
        }
        st.fails = [];
        st.user = { id: 'u-1001', username: name, firstName: 'Simary', lastName: '' };
        save();
        return { user: Object.assign({}, st.user) };
      }),

      // public signup; the mock checks the same things the server does (photos and password are never kept)
      signup: (body) => call(() => {
        const b = body || {};
        const name = String(b.username || '').trim().toLowerCase();
        if (!/^[a-z0-9_.]{3,20}$/.test(name) || String(b.password || '').length < 6 || !b.firstName || !b.lastName
          || !/^01[0125]\d{8}$/.test(String(b.phone || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(b.birthDate || ''))
          || !!b.idFront !== !!b.idBack || !b.turnstile) throw fail('BAD_REQUEST');
        const born = new Date(`${b.birthDate}T00:00:00`);
        const now = new Date();
        let age = now.getFullYear() - born.getFullYear();
        if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1;
        if (age < 16) throw fail('TOO_YOUNG');
        if (['taken', 'admin'].includes(name) || (st.signedUp || []).includes(name)) throw fail('USERNAME_TAKEN');
        if (b.phone === '01000000000') throw fail('PHONE_TAKEN');
        if (String(b.email || '').toLowerCase() === 'taken@example.com') throw fail('EMAIL_TAKEN');
        st.signedUp = (st.signedUp || []).concat(name);
        save();
        return { status: 'pending', hasId: !!(b.idFront && b.idBack) };
      }),
      // mock Google: any token is a new member with a sample profile; 'mock-google-linked' signs in
      googleLogin: (idToken) => call(() => {
        if (!idToken) throw fail('BAD_REQUEST');
        if (idToken === 'mock-google-linked') {
          st.user = { id: 'u-1001', username: 'simary', firstName: 'Simary', lastName: '' };
          save();
          return { user: Object.assign({}, st.user) };
        }
        return { needSignup: true, profile: { firstName: 'Sample', lastName: 'Player', email: 'sample.player@example.com' }, googleTicket: 'mock-ticket' };
      }),

      // works even when Gizmo is down: it only forgets the member in this tab
      logout: async () => {
        await wait('');
        const fails = st.fails;
        Object.keys(st).forEach((k) => { delete st[k]; });
        Object.assign(st, blank(), { fails });
        try { window.sessionStorage.removeItem(KEY); } catch (e) { /* tab memory only */ }
        if (fails.length) save();
      },

      zones: (branch) => call((s) => {
        if (branch !== 'zayed' || s === 'empty') return [];
        return ZONES.map((z) => ({
          id: z.id, name: z.name, side: z.side, price: z.price, age21: z.age21,
          total: z.numbers.length, free: z.numbers.filter((n) => hostState(n).state === 'free').length,
        }));
      }),

      zoneHosts,
      watchZone,
      watchWaitlist,

      // Web Push: a real, valid P-256 public key (made once per tab) so a browser push service accepts it
      push: {
        key: async () => {
          if (!pushKey) {
            const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
            const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
            pushKey = btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          }
          return pushKey;
        },
      },

      shopTime: (zoneId) => call(() => productsFor(zoneId)),

      me: {
        pushSubscribe: (subscription, lang) => call(() => {
          need();
          if (!subscription || !subscription.endpoint || !subscription.keys) throw fail('BAD_REQUEST');
          pushSubs = pushSubs.filter((x) => x.subscription.endpoint !== subscription.endpoint);
          pushSubs.push({ subscription, lang: lang === 'ar' ? 'ar' : 'en' });
          pushSubs = pushSubs.slice(-5);
        }),
        pushUnsubscribe: (endpoint) => call(() => {
          need();
          pushSubs = pushSubs.filter((x) => x.subscription.endpoint !== endpoint);
        }),
        dashboard: () => call((s) => {
          need();
          const zones = s === 'empty' ? [] : ZONES.map((z) => ({
            zoneId: z.id,
            usableMinutes: s === 'no_time' ? 0 : usable(z.id),
            expiresAt: EXPIRES[z.id] ? new Date(EXPIRES[z.id]).toISOString() : null,
          }));
          return {
            user: Object.assign({}, st.user),
            balance: s === 'empty' ? 0 : balanceNow(),
            points: s === 'empty' ? 0 : 340,
            totalMinutes: zones.reduce((a, z) => a + z.usableMinutes, 0),
            zones,
            activeSession: s === 'already_active' ? fakeActive() : activeView(),
          };
        }),

        startSession: (hostId, idemKey) => callW((s) => {
          need();
          const key = idemKey ? `start:${idemKey}` : '';
          if (key && st.idem[key]) return Object.assign({}, st.idem[key]);
          const n = numberOf(hostId);
          if (!n) throw fail('NOT_FOUND');
          if (s === 'already_active' || activeView()) throw fail('ALREADY_ACTIVE');
          const h = hostState(n);
          if (s === 'host_out' || h.state === 'out') throw fail('HOST_OUT');
          if (s === 'no_time' || usable(zoneOf[n]) <= 0) throw fail('NO_TIME');
          if (s === 'host_taken' || h.state !== 'free') throw fail('HOST_TAKEN');
          st.active = { hostId: hostIdOf(n), hostNumber: n, zoneId: zoneOf[n], startedAt: new Date().toISOString() };
          st.wait = null; // being on a PC ends any waiting-list entry
          st.expired = false;
          const result = activeView();
          if (key) st.idem[key] = result;
          save();
          return Object.assign({}, result);
        }),

        endSession: () => callW(() => {
          need();
          stopActive();
        }),

        waitlist: () => call(() => { need(); return waitView(); }),

        joinWaitlist: (zoneId, idemKey) => callW((s) => {
          need();
          const key = idemKey ? `join:${idemKey}` : '';
          if (key && st.idem[key]) return JSON.parse(JSON.stringify(st.idem[key]));
          const z = ZONE[zoneId];
          if (!z) throw fail('NOT_FOUND');
          if (waitView()) throw fail('ALREADY_WAITING');
          if (activeView()) throw fail('ALREADY_ACTIVE');
          if (s === 'no_time' || usable(zoneId) <= 0) throw fail('NO_TIME');
          const states = z.numbers.map((n) => hostState(n));
          if (states.some((h) => h.state === 'free')) throw fail('NOT_FULL');
          const busy = states.filter((h) => h.state === 'busy' && h.minutesLeft);
          const eta = busy.length ? Math.min(...busy.map((h) => h.minutesLeft)) : 15;
          const now = Date.now();
          st.wait = { zoneId, position: 3, etaMinutes: eta, joinedAt: new Date(now).toISOString(), status: 'waiting', offer: null };
          st.expired = false;
          if (s === 'offer' || s === 'offer_expired') makeOffer(now);
          save();
          const result = JSON.parse(JSON.stringify(st.wait));
          if (key) st.idem[key] = result;
          return result;
        }),

        leaveWaitlist: () => callW(() => {
          need();
          advance();
          if (st.wait && st.wait.offer) {
            const n = st.wait.offer.hostNumber;
            if (!(hosts[n].until && hosts[n].until > Date.now())) hosts[n] = { state: 'free', until: null };
          }
          st.wait = null;
          st.expired = false;
          save();
        }),

        acceptOffer: (idemKey) => callW(() => {
          need();
          const key = idemKey ? `accept:${idemKey}` : '';
          if (key && st.idem[key]) return Object.assign({}, st.idem[key]);
          advance();
          const w = st.wait;
          if (!w || w.status !== 'offered') {
            if (st.expired) { st.expired = false; save(); throw fail('OFFER_EXPIRED'); }
            throw fail('NOT_FOUND');
          }
          const n = w.offer.hostNumber;
          if (activeView()) throw fail('ALREADY_ACTIVE');
          if (usable(zoneOf[n]) <= 0) throw fail('NO_TIME');
          st.wait = null;
          st.active = { hostId: hostIdOf(n), hostNumber: n, zoneId: zoneOf[n], startedAt: new Date().toISOString() };
          const result = activeView();
          if (key) st.idem[key] = result;
          save();
          return Object.assign({}, result);
        }),

        buyTime: (productId, zoneId, price, idemKey) => callW((s) => {
          need();
          const key = idemKey ? `buy:${idemKey}` : '';
          if (key && st.idem[key]) return Object.assign({}, st.idem[key]);
          if (s === 'price_changed' && !st.priceUp) { st.priceUp = true; save(); throw fail('PRICE_CHANGED'); }
          const p = productsFor(zoneId).find((x) => x.id === productId);
          if (!p) throw fail('NOT_FOUND');
          if (Number(price) !== p.price) throw fail('PRICE_CHANGED');
          if (p.price > balanceNow()) throw fail('NO_BALANCE');
          st.spent = (st.spent || 0) + p.price;
          st.bought[zoneId] = (st.bought[zoneId] || 0) + p.minutes;
          const result = { balance: balanceNow(), zoneId, usableMinutes: usable(zoneId) };
          if (key) st.idem[key] = result;
          save();
          return Object.assign({}, result);
        }),

        // card payment: the intent is kept in this tab; effects land once, when it first reaches a final state
        payCheckout: (body, idemKey) => callW(() => {
          need();
          const key = idemKey ? `pay:${idemKey}` : '';
          if (key && st.idem[key]) return Object.assign({}, st.idem[key]);
          const b = body || {};
          const p = { id: `pi_${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-4)}`, kind: b.kind, amount: 0, at: Date.now(), applied: false, productId: null, zoneId: null };
          if (b.kind === 'time') {
            const prod = productsFor(b.zoneId).find((x) => x.id === b.productId);
            if (!prod) throw fail('NOT_FOUND');
            if (Number(b.price) !== prod.price) throw fail('PRICE_CHANGED');
            Object.assign(p, { amount: prod.price, productId: prod.id, zoneId: b.zoneId, minutes: prod.minutes, name: prod.name });
          } else if (b.kind === 'topup') {
            const a = Number(b.amount);
            if (!Number.isInteger(a) || a < 20 || a > 5000) throw fail('BAD_REQUEST');
            p.amount = a;
          } else throw fail('BAD_REQUEST');
          st.pays[p.id] = p;
          const back = String(b.returnTo || returnTo());
          const result = { intentId: p.id, redirectUrl: `${back}${back.includes('?') ? '&' : '?'}pay=${encodeURIComponent(p.id)}` };
          if (key) st.idem[key] = result;
          save();
          return Object.assign({}, result);
        }),

        payStatus: (intentId) => call((s) => {
          need();
          let p = st.pays[intentId];
          if (!p) {
            if (!/^[\w-]{3,64}$/.test(String(intentId))) throw fail('NOT_FOUND');
            p = { id: intentId, kind: 'topup', amount: 100, at: Date.now(), applied: false, productId: null, zoneId: null }; // bare ?pay=<id> link for testing
            st.pays[intentId] = p;
          }
          const age = Date.now() - p.at;
          const end = { pay_failed: 'failed', pay_credited: 'credited', pay_review: 'review' }[s] || 'done';
          const now = age < 1000 ? 'pending' : (age < 2500 && end !== 'failed') ? 'processing' : end; // a failing payment never shows the paid/processing wording
          if (!p.applied && (now === 'done' || now === 'credited')) {
            p.applied = true;
            if (now === 'credited' || p.kind === 'topup') st.topped = (st.topped || 0) + p.amount;
            else st.bought[p.zoneId] = (st.bought[p.zoneId] || 0) + p.minutes;
          }
          save();
          return {
            intentId: p.id, kind: p.kind, amount: p.amount, state: now,
            product: p.productId ? { id: p.productId, name: p.name, minutes: p.minutes } : null,
            zoneId: p.zoneId, message: null, createdAt: new Date(p.at).toISOString(),
          };
        }),

        // made-up, stable rows; 20 per page, cursor = page number
        // points kind: '0' earned, '1' used, '2' added by staff, '3' removed by staff, '4' expired
        history: (kind, cursor) => call((s) => {
          need();
          const pages = { purchases: 3, sessions: 3, deposits: 1, points: 1 }[kind];
          if (pages === undefined) throw fail('BAD_REQUEST');
          const page = Math.max(1, parseInt(cursor, 10) || 1);
          if (page > pages || s === 'empty') return { items: [], nextCursor: null };
          const rng = seeded(500 + kind.length * 7 + page);
          const base = Date.UTC(2026, 9, 30) - (page - 1) * 20 * DAY;
          const items = [];
          for (let i = 0; i < 20; i++) {
            const id = `${kind === 'points' ? 'pt' : kind[0]}${(page - 1) * 20 + i + 1}`;
            const at = new Date(base - i * DAY - Math.floor(rng() * 40000000)).toISOString();
            if (kind === 'purchases') {
              const t = ['Normal 3 hours', 'VIP 2 hours', 'Energy drink', 'Team Room 1 hour', 'Chips'][Math.floor(rng() * 5)];
              const q = 1 + Math.floor(rng() * 3), amount = (1 + Math.floor(rng() * 12)) * 10;
              items.push({ id, at, title: t, quantity: q, amount, paid: i % 7 !== 3 }); // a few still open at the desk
            } else if (kind === 'deposits') {
              items.push({ id, at, amount: (1 + Math.floor(rng() * 10)) * 50, method: rng() < 0.7 ? 'Cash' : null });
            } else if (kind === 'points') {
              const k = i < 5 ? i : [0, 0, 0, 1, 2, 3, 4][Math.floor(rng() * 7)];
              const n = (1 + Math.floor(rng() * 20)) * 5;
              items.push({ id, at, amount: k === 0 || k === 2 ? n : -n, kind: String(k) });
            } else {
              const m = 20 + Math.floor(rng() * 200), z = ZONES[Math.floor(rng() * 5)];
              const n = z.numbers[Math.floor(rng() * z.numbers.length)];
              items.push({ id, start: at, end: new Date(Date.parse(at) + m * MIN).toISOString(), minutes: m, hostNumber: n, zoneId: z.id });
            }
          }
          return { items, nextCursor: page < pages ? String(page + 1) : null };
        }),

        favorites: () => call((s) => { need(); return s === 'empty' ? [] : favList(); }),
        addFavorite: (hostId) => callW(() => {
          need();
          const n = numberOf(hostId);
          if (!n) throw fail('NOT_FOUND');
          if (!st.favorites.includes(hostIdOf(n))) st.favorites.push(hostIdOf(n));
          save();
          return favList();
        }),
        removeFavorite: (hostId) => callW(() => {
          need();
          st.favorites = st.favorites.filter((id) => id !== hostIdOf(numberOf(hostId)));
          save();
          return favList();
        }),

      },
    };
  }

  /* ---------- http: the Clash API (/v1). Tokens live in sessionStorage (localStorage if login(..., remember=true)). ---------- */
  function httpAdapter() {
    const BASE = String((MODE === 'staging' ? cfg.CLASH_API_STAGING_URL : cfg.CLASH_API_URL) || 'http://127.0.0.1:8787').replace(/\/+$/, '');
    const SKEY = 'clash-api-session';
    const TIMEOUT = 12000;

    const store = (kind) => { try { return window[kind]; } catch (e) { return null; } };
    const parse = (s) => { try { const v = JSON.parse(s); return v && v.token ? v : null; } catch (e) { return null; } };
    const stored = (kind) => { try { return parse(store(kind).getItem(SKEY)); } catch (e) { return null; } };
    let sess = null;
    let where = 'sessionStorage';
    ['sessionStorage', 'localStorage'].forEach((k) => {
      if (sess) return;
      const v = stored(k);
      if (v) { sess = v; where = k; }
    });
    function setSession(v, kind) {
      sess = v;
      if (kind) where = kind;
      try { store(where).setItem(SKEY, JSON.stringify(v)); } catch (e) { /* kept in memory */ }
    }
    function clearSession() {
      sess = null;
      ['sessionStorage', 'localStorage'].forEach((k) => { try { store(k).removeItem(SKEY); } catch (e) { /* ignore */ } });
    }
    // forget only the session that holds this refresh token (another tab may have stored a newer one)
    function clearIfSame(rt) {
      if (sess && sess.refreshToken === rt) sess = null;
      ['sessionStorage', 'localStorage'].forEach((k) => {
        const v = stored(k);
        if (!v || v.refreshToken === rt) { try { store(k).removeItem(SKEY); } catch (e) { /* ignore */ } }
      });
    }
    // a newer session written by another tab ("remember me" shares localStorage), or null
    function newerStored() {
      const v = stored(where);
      return v && v.refreshToken && (!sess || v.refreshToken !== sess.refreshToken) ? v : null;
    }
    // another tab logged in, refreshed or logged out: follow it when this tab uses localStorage (or has no session yet)
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (e) => {
        if (e.key !== SKEY || e.storageArea !== store('localStorage')) return;
        if (sess && where !== 'localStorage') return;
        const v = parse(e.newValue);
        if (v) { sess = v; where = 'localStorage'; } else if (sess) sess = null;
      });
    }

    // one fetch with a timeout; no response = NETWORK
    async function raw(method, path, body, headers) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT);
      let res;
      try {
        res = await fetch(BASE + path, {
          method,
          headers: Object.assign(body !== undefined ? { 'Content-Type': 'application/json' } : {}, headers),
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: ctl.signal,
        });
      } catch (e) {
        throw fail('NETWORK');
      } finally { clearTimeout(timer); }
      if (res.status === 204) return undefined;
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (!res.ok) {
        const extra = data && data.retryAfter ? { retryAfter: data.retryAfter } : undefined;
        throw fail((data && data.code) || (res.status >= 500 ? 'INTERNAL' : 'BAD_REQUEST'), extra);
      }
      return data;
    }

    // used = the session the failed call sent. Resolves when a fresh session is ready (refreshed, or adopted from another tab).
    let refreshing = null;
    function refresh(used) {
      if (sess && used && sess.refreshToken !== used.refreshToken) return Promise.resolve(); // this tab already has a newer one
      const other = newerStored();
      if (other) { sess = other; return Promise.resolve(); } // another tab refreshed: use its tokens, no refresh call
      if (refreshing) return refreshing;
      const s = sess;
      if (!s || !s.refreshToken) return Promise.reject(fail('NOT_SIGNED_IN'));
      refreshing = raw('POST', '/v1/auth/refresh', { refreshToken: s.refreshToken })
        .then((r) => {
          if (sess !== s && sess) return; // a newer session arrived meanwhile (storage event): keep it
          setSession(Object.assign({}, s, { token: r.token, refreshToken: r.refreshToken || s.refreshToken }));
        })
        .catch((e) => {
          if (e.code === 'NETWORK') throw e;
          // two tabs may have refreshed with the same token: if the other one won, carry on with its session
          const won = newerStored();
          if (won && won.refreshToken !== s.refreshToken) { sess = won; return; }
          clearIfSame(s.refreshToken);
          throw fail('NOT_SIGNED_IN');
        })
        .finally(() => { refreshing = null; });
      return refreshing;
    }

    // authed call: on 401 NOT_SIGNED_IN refresh once (or adopt another tab's newer session) and retry once
    async function req(method, path, body, idemKey) {
      let used = null;
      const go = () => {
        const h = {};
        used = sess;
        if (sess) h.Authorization = `Bearer ${sess.token}`;
        if (idemKey) h['Idempotency-Key'] = idemKey;
        return raw(method, path, body, h);
      };
      try {
        return await go();
      } catch (e) {
        if (e.code !== 'NOT_SIGNED_IN') throw e;
        await refresh(used);
        try { return await go(); } catch (e2) {
          if (e2.code === 'NOT_SIGNED_IN' && used) clearIfSame(used.refreshToken);
          throw e2;
        }
      }
    }

    // poll fetcher() every ms; pauses while the tab is hidden; onlyChanges: call cb only when the JSON changed (or forced on show)
    function poll(ms, fetcher, cb, onlyChanges) {
      let stopped = false, last;
      const hidden = () => typeof document !== 'undefined' && document.hidden;
      const tick = (force) => {
        if (stopped || hidden()) return;
        fetcher().then((r) => {
          if (stopped) return;
          if (onlyChanges) {
            const j = JSON.stringify(r);
            if (!force && j === last) return;
            last = j;
          }
          cb(r);
        }, (e) => { if (!stopped) cb(null, e); });
      };
      const onShow = () => { if (!hidden()) tick(true); };
      tick(true);
      const timer = setInterval(() => tick(false), ms);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onShow);
      return () => {
        stopped = true;
        clearInterval(timer);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onShow);
      };
    }

    const enc = encodeURIComponent;
    const zoneHosts = (id) => req('GET', `/v1/zones/${enc(id)}/hosts`);
    const waitlist = () => req('GET', '/v1/me/waitlist');

    return {
      login: async (username, password, remember) => {
        const r = await raw('POST', '/v1/auth/login', { username, password });
        clearSession();
        setSession({ token: r.token, refreshToken: r.refreshToken, user: r.user }, remember ? 'localStorage' : 'sessionStorage');
        return { user: r.user };
      },
      signup: (body) => raw('POST', '/v1/auth/signup', body),
      googleLogin: async (idToken) => {
        const r = await raw('POST', '/v1/auth/google', { idToken });
        if (r && r.token) {
          clearSession();
          setSession({ token: r.token, refreshToken: r.refreshToken, user: r.user }, 'sessionStorage');
          return { user: r.user };
        }
        return r;
      },
      // always forgets the member locally, even if the server call fails
      logout: async () => {
        const s = sess;
        try { if (s && s.refreshToken) await raw('POST', '/v1/auth/logout', { refreshToken: s.refreshToken }); } catch (e) { /* ignore */ }
        clearSession();
      },
      zones: (branch) => req('GET', `/v1/zones?branch=${enc(branch)}`),
      zoneHosts,
      // later: a push stream (SSE) with the same callback shape
      watchZone: (zoneId, cb) => poll(5000, () => zoneHosts(zoneId), cb, false),
      // later: a push stream (SSE) GET /v1/me/stream, same callback shape
      watchWaitlist: (cb) => poll(3000, waitlist, cb, true),
      // signed in: the member's own prices (group price, denied products left out); else the base prices
      shopTime: (zoneId) => req('GET', `/v1/${sess ? 'me/' : ''}shop/time?zoneId=${enc(zoneId)}`),
      push: { key: () => req('GET', '/v1/push/key').then((r) => r.publicKey) },
      me: {
        pushSubscribe: (subscription, lang) => req('POST', '/v1/me/push', { subscription, lang }),
        pushUnsubscribe: (endpoint) => req('DELETE', '/v1/me/push', { endpoint }),
        dashboard: () => req('GET', '/v1/me/dashboard'),
        startSession: (hostId, idemKey) => req('POST', '/v1/me/sessions/start', { hostId }, idemKey),
        endSession: () => req('POST', '/v1/me/sessions/end'),
        history: (kind, cursor) => req('GET', `/v1/me/history?kind=${enc(kind)}${cursor ? `&cursor=${enc(cursor)}` : ''}`),
        favorites: () => req('GET', '/v1/me/favorites'),
        addFavorite: (hostId) => req('PUT', `/v1/me/favorites/${enc(hostId)}`),
        removeFavorite: (hostId) => req('DELETE', `/v1/me/favorites/${enc(hostId)}`),
        waitlist,
        joinWaitlist: (zoneId, idemKey) => req('POST', '/v1/me/waitlist', { zoneId }, idemKey),
        leaveWaitlist: () => req('DELETE', '/v1/me/waitlist'),
        acceptOffer: (idemKey) => req('POST', '/v1/me/waitlist/accept', undefined, idemKey),
        buyTime: (productId, zoneId, price, idemKey) => req('POST', '/v1/me/time/buy', { productId, zoneId, price }, idemKey),
        payCheckout: (body, idemKey) => req('POST', '/v1/me/pay/checkout', Object.assign({ returnTo: returnTo() }, body), idemKey),
        payStatus: (intentId) => req('GET', `/v1/me/pay/${enc(intentId)}`),
      },
    };
  }

  const api = MODE === 'http' || MODE === 'staging' ? httpAdapter() : mockAdapter();

  /* the floor (js/pc-layout.js) with each seat's live state: { updatedAt, places: [{ ...place, seats: [{ host, x, y, id, number, state, minutesLeft, zoneId }] }] } */
  async function places(branch) {
    const list = LAYOUT[branch] || [];
    const zoneIds = [...new Set(list.flatMap((p) => p.zones))];
    const results = await Promise.all(zoneIds.map((id) => api.zoneHosts(id)));
    const byNumber = {};
    let updatedAt = null;
    results.forEach((r, i) => {
      if (!updatedAt || r.updatedAt < updatedAt) updatedAt = r.updatedAt;
      r.hosts.forEach((h) => { byNumber[h.number] = Object.assign({}, h, { zoneId: zoneIds[i] }); });
    });
    const out = list
      .map((p) => Object.assign({}, p, { seats: p.seats.filter((s) => byNumber[s.host]).map((s) => Object.assign({}, s, byNumber[s.host])) }))
      .filter((p) => p.seats.length);
    return { updatedAt, places: out };
  }

  /* real (http / staging) modes: no demo wording; staging shows a TEST SERVER tag in the DEMO tag's place */
  function envTags() {
    if (MODE === 'mock') return;
    const paint = () => {
      const ar = window.ClashSite ? window.ClashSite.lang === 'ar' : (document.documentElement.lang || '').toLowerCase().indexOf('ar') === 0;
      document.querySelectorAll('.demo-tag, .demo-note').forEach((el) => {
        if (MODE === 'staging' && el.classList.contains('demo-tag')) {
          el.textContent = ar ? 'سيرفر تجريبي' : 'TEST SERVER';
          el.title = ar ? 'سيرفر تجريبي، مش البيانات الحقيقية' : 'Test server, not live data';
          el.hidden = false; el.style.display = '';
        } else { el.hidden = true; el.style.display = 'none'; }
      });
    };
    paint();
    if (MODE === 'staging' && window.MutationObserver) new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
  }

  /* Google sign-in button (Google Identity Services). Client id from js/config.js; empty = not available (the page shows "Soon"). */
  const GOOGLE_ID = String(cfg.GOOGLE_CLIENT_ID || '');
  let gsi = null;
  const google = {
    enabled: !!GOOGLE_ID,
    render(el, o) {
      el.textContent = '';
      if (!GOOGLE_ID) return Promise.resolve(false);
      if (MODE === 'mock') { // no Google in the demo: a plain button that hands back a fake token
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'sg-social-btn'; b.textContent = o.label;
        b.addEventListener('click', () => o.onCredential('mock-google-token'));
        el.appendChild(b);
        return Promise.resolve(true);
      }
      gsi = gsi || new Promise((resolve, reject) => {
        if (window.google && window.google.accounts) return resolve();
        const sc = document.createElement('script');
        sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.defer = true;
        sc.onload = () => resolve(); sc.onerror = () => { gsi = null; reject(new Error('gsi')); };
        document.head.appendChild(sc);
      });
      return gsi.then(() => {
        window.google.accounts.id.initialize({ client_id: GOOGLE_ID, callback: (r) => o.onCredential(r && r.credential), ux_mode: 'popup' });
        window.google.accounts.id.renderButton(el, { type: 'standard', theme: 'filled_black', size: 'large', shape: 'rectangular', text: o.text || 'signin_with', locale: o.locale, width: Math.min(400, Math.max(200, el.clientWidth || 320)) });
        return true;
      }, () => false);
    },
  };

  return Object.assign({ mode: MODE, envTags }, api, { places, isFinal, google });
})();
