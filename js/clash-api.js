/* Clash Esports member portal: the one door the portal pages use for PCs, time and the waiting list (window.ClashAPI).
   CLASH_API_MODE in js/config.js picks the adapter: 'mock' runs on made-up Zayed data inside this browser,
   'http' will talk to the Clash API (/v1) once it is built. Both give the same shapes, so the pages never change.
   Every call returns a Promise. Errors are thrown as { code, message, retryAfter? }; the pages translate by code.
   Mock test switches: add ?mock=gizmo_down|network|empty|slow|host_taken|no_time|already_active|offer|offer_expired|host_out|gizmo_down_write|network_write to the page URL.
   (host_out: startSession says HOST_OUT. *_write: only startSession, endSession, joinWaitlist, leaveWaitlist, acceptOffer, addFavorite, removeFavorite fail; reads keep working.)
   Needs js/config.js and js/pc-layout.js loaded first. */
window.ClashAPI = (() => {
  const cfg = window.CLASH_CONFIG || {};
  const MODE = cfg.CLASH_API_MODE === 'http' ? 'http' : 'mock';
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
  };
  const fail = (code, extra) => Object.assign({ code, message: MESSAGES[code] || code }, extra);

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

    const blank = () => ({ user: null, active: null, used: {}, favorites: [], wait: null, idem: {}, fails: [] });
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

    /* ---------- time ---------- */
    function usable(zoneId) {
      let m = (TIME[zoneId] || 0) - (st.used[zoneId] || 0);
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


      me: {
        dashboard: () => call((s) => {
          need();
          const zones = s === 'empty' ? [] : ZONES.map((z) => ({
            zoneId: z.id,
            usableMinutes: s === 'no_time' ? 0 : usable(z.id),
            expiresAt: EXPIRES[z.id] ? new Date(EXPIRES[z.id]).toISOString() : null,
          }));
          return {
            user: Object.assign({}, st.user),
            balance: s === 'empty' ? 0 : 185,
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

  /* ---------- http: the Clash API (next phase). Every call fails with NOT_WIRED until it exists. ---------- */
  function httpAdapter() {
    const no = (path) => () => Promise.reject(fail('NOT_WIRED', { path }));
    // watchers never throw: hand back an unsubscribe and report the error through the callback
    const notWired = (cb, path) => {
      let stopped = false;
      setTimeout(() => { if (!stopped && typeof cb === 'function') cb(null, fail('NOT_WIRED', { path })); }, 0);
      return () => { stopped = true; };
    };
    return {
      login: no('POST /v1/auth/login'),
      logout: no('POST /v1/auth/logout'),
      zones: no('GET /v1/zones?branch={branch}'),
      zoneHosts: no('GET /v1/zones/{id}/hosts'),
      // later: a push stream (SSE) with the same callback shape
      watchZone: (zoneId, cb) => notWired(cb, 'GET /v1/zones/{id}/hosts (every 10 s), later a push stream'),
      // later: a push stream (SSE) GET /v1/me/stream, same callback shape
      watchWaitlist: (cb) => notWired(cb, 'GET /v1/me/waitlist (poll), later GET /v1/me/stream (SSE)'),
      me: {
        dashboard: no('GET /v1/me/dashboard'),
        startSession: no('POST /v1/me/sessions/start'),        // Idempotency-Key header
        endSession: no('POST /v1/me/sessions/end'),
        favorites: no('GET /v1/me/favorites'),
        addFavorite: no('PUT /v1/me/favorites/{hostId}'),
        removeFavorite: no('DELETE /v1/me/favorites/{hostId}'),
        waitlist: no('GET /v1/me/waitlist'),
        joinWaitlist: no('POST /v1/me/waitlist'),             // { zoneId }, Idempotency-Key header
        leaveWaitlist: no('DELETE /v1/me/waitlist'),
        acceptOffer: no('POST /v1/me/waitlist/accept'),     // Idempotency-Key header
      },
    };
  }

  const api = MODE === 'http' ? httpAdapter() : mockAdapter();

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

  return Object.assign({ mode: MODE }, api, { places });
})();
