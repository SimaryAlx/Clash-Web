/* Clash Esports bookings: one store for the site (a visitor asks for a room) and the staff panel (staff work the
   requests). With js/config.js filled in it talks to Supabase (supabase/schema.sql); left empty it runs in demo
   mode, keeping everything in this browser's storage, so the whole flow can be tried before the database exists.
   Also here: Cairo time, because the lounge's day runs from 10:00 to 10:00 the next morning. */

/* ---------- Cairo time ---------- */
window.ClashTime = (() => {
  const TZ = 'Africa/Cairo';
  const DAY_START = 10;                 // the lounge's day starts at 10:00; 00:00-09:59 belongs to the night before
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function parts(date) {
    const p = {};
    fmt.formatToParts(date).forEach(({ type, value }) => { p[type] = value; });
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, wd: WEEKDAYS[p.weekday] };
  }
  /* the moment that is y-m-d h:mi on a Cairo clock */
  function at(y, m, d, h = 0, mi = 0) {
    const guess = Date.UTC(y, m - 1, d, h, mi);
    const off = (ms) => { const p = parts(new Date(ms)); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - ms; };
    let t = guess - off(guess);
    t = guess - off(t);
    return new Date(t);
  }
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const split = (key) => key.split('-').map(Number);
  function addDays(key, n) {
    const [y, m, d] = split(key);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return keyOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  /* the lounge day a moment belongs to: 02:00 on Friday is Thursday night */
  function loungeDay(date = new Date()) {
    const p = parts(date);
    const key = keyOf(p.y, p.m, p.d);
    return p.h < DAY_START ? addDays(key, -1) : key;
  }
  /* an hour of a lounge day: hours before 10 fall on the next calendar morning */
  function slot(dayKey, h) {
    const key = h < DAY_START ? addDays(dayKey, 1) : dayKey;
    const [y, m, d] = split(key);
    return at(y, m, d, h);
  }
  const dayStart = (dayKey) => slot(dayKey, DAY_START);
  const dayEnd = (dayKey) => slot(addDays(dayKey, 1), DAY_START);
  /* the hours of a lounge day in order: 10:00 … 23:00, then 00:00 … 09:00 */
  const HOURS = Array.from({ length: 24 }, (_, i) => (DAY_START + i) % 24);
  const weekday = (dayKey) => { const [y, m, d] = split(dayKey); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  return { TZ, DAY_START, HOURS, parts, at, addDays, loungeDay, slot, dayStart, dayEnd, weekday, split };
})();

/* ---------- the store ---------- */
window.ClashStore = (() => {
  const cfg = window.CLASH_CONFIG || {};
  const live = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

  class StoreError extends Error {
    constructor(code, message) { super(message || code); this.code = code; }
  }
  const CODES = ['bad_phone', 'bad_name', 'bad_room', 'bad_time', 'too_many', 'room_busy', 'not_signed_in'];
  const toStoreError = (e) => {
    if (e instanceof StoreError) return e;
    const text = `${e && e.message} ${e && e.details}`;
    const code = CODES.find((c) => text.includes(c)) || (e && e.code === '23P01' ? 'room_busy' : null)
      || (/fetch|network|Failed/i.test(text) ? 'network' : 'unknown');
    return new StoreError(code, e && e.message);
  };

  /* an Egyptian mobile as 11 digits, or null */
  function cleanPhone(raw) {
    let p = String(raw || '').replace(/[^0-9]/g, '');
    if (p.startsWith('20') && p.length === 12) p = `0${p.slice(2)}`;
    return /^01[0125][0-9]{8}$/.test(p) ? p : null;
  }

  /* ================================================================ Supabase */
  function liveDriver() {
    let client = null;
    const sb = async () => {
      if (!client) {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
        client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      }
      return client;
    };
    const run = async (q) => { const { data, error } = await q; if (error) throw toStoreError(error); return data; };

    return {
      async rooms() { const c = await sb(); return run(c.from('rooms').select('*').eq('branch', 'zayed').eq('kind', 'ps').order('sort')); },
      async busy(from, to) { const c = await sb(); return run(c.rpc('room_busy', { p_from: from.toISOString(), p_to: to.toISOString() })); },
      async requestBooking(p) {
        const c = await sb();
        const rows = await run(c.rpc('request_booking', {
          p_room_type: p.room_type, p_room: p.room_id || null, p_starts_at: p.starts_at.toISOString(),
          p_name: p.name, p_phone: p.phone, p_note: p.note || null,
        }));
        return { ref: rows && rows[0] ? rows[0].ref : null };
      },

      async session() {
        const c = await sb();
        const { data } = await c.auth.getSession();
        const user = data.session && data.session.user;
        if (!user) return null;
        let staff = (await run(c.from('staff').select('*').eq('user_id', user.id)))[0] || null;
        /* someone who signed up (and confirmed their email) asks for access the first time they come in */
        if (!staff && user.user_metadata && user.user_metadata.name) {
          await run(c.rpc('request_staff_access', { p_name: user.user_metadata.name }));
          staff = (await run(c.from('staff').select('*').eq('user_id', user.id)))[0] || null;
        }
        return { user: { id: user.id, email: user.email }, staff };
      },
      async signIn(email, password) {
        const c = await sb();
        const { error } = await c.auth.signInWithPassword({ email, password });
        if (error) throw new StoreError(/confirm/i.test(error.message) ? 'unconfirmed' : 'bad_login', error.message);
        return this.session();
      },
      async signUp(name, email, password) {
        const c = await sb();
        const { data, error } = await c.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw new StoreError(/registered/i.test(error.message) ? 'exists' : 'bad_signup', error.message);
        if (!data.session) return { needsConfirm: true };
        return this.session();
      },
      async signOut() { const c = await sb(); await c.auth.signOut(); },

      async bookings(from, to) {
        const c = await sb();
        return run(c.from('bookings').select('*').gte('starts_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at'));
      },
      async addBooking(p) {
        const c = await sb();
        return run(c.from('bookings').insert({ ...p, source: 'staff' }).select().single());
      },
      async updateBooking(id, patch) {
        const c = await sb();
        return run(c.from('bookings').update(patch).eq('id', id).select().single());
      },
      async events(id) { const c = await sb(); return run(c.from('booking_events').select('*').eq('booking_id', id).order('at')); },
      async staffList() { const c = await sb(); return run(c.from('staff').select('*').order('created_at')); },
      async updateStaff(userId, patch) { const c = await sb(); return run(c.from('staff').update(patch).eq('user_id', userId)); },
      async removeStaff(userId) { const c = await sb(); return run(c.from('staff').delete().eq('user_id', userId)); },
      async updateRoom(id, patch) { const c = await sb(); return run(c.from('rooms').update(patch).eq('id', id)); },
      subscribe(cb) {
        let channel = null;
        sb().then((c) => {
          channel = c.channel('clash-bookings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (e) => cb(e))
            .subscribe();
        });
        return () => { if (channel) channel.unsubscribe(); };
      },
    };
  }

  /* ================================================================ demo: this browser only */
  function demoDriver() {
    const KEY = 'clash-demo-bookings-v1';
    const SESSION = 'clash-demo-session';
    const listeners = new Set();
    const T = window.ClashTime;
    const ROOMS = [
      ['normal', 8, 'Normal', 'blue', 10], ['vip', 2, 'VIP', 'red', 20], ['pool', 1, 'Pool', 'blue', 30], ['cinema', 1, 'Cinema', 'red', 40],
    ].flatMap(([type, n, label, side, base]) => Array.from({ length: n }, (_, i) => ({
      id: `zayed-ps-${type}-${i + 1}`, branch: 'zayed', kind: 'ps', type, number: i + 1,
      name: n > 1 ? `${label} ${i + 1}` : label, side, in_service: true, note: null, sort: base + i + 1,
    })));

    /* sample bookings around today, so the panel has something real-looking to work on */
    function seed() {
      const today = T.loungeDay();
      const now = Date.now();
      const ago = (min) => new Date(now - min * 60000).toISOString();
      const top = Math.ceil(now / 3600000) * 3600000;
      const inH = (n) => new Date(top + n * 3600000);
      let ref = 1001;
      const rows = [];
      const add = (b) => rows.push({
        id: `demo-${ref}`, ref: ref++, branch: 'zayed', kind: 'ps', requested_room: null, room_id: null, minutes: null,
        customer_note: null, source: 'web', staff_note: null, updated_by: null, ...b,
        starts_at: b.starts_at.toISOString(), updated_at: b.created_at,
      });
      const yesterday = T.addDays(today, -1);
      add({ room_type: 'vip', requested_room: 'zayed-ps-vip-1', room_id: 'zayed-ps-vip-1', minutes: 180, starts_at: T.slot(yesterday, 20), customer_name: 'Mostafa Reda', customer_phone: '01112408753', status: 'done', created_at: ago(60 * 30) });
      add({ room_type: 'normal', room_id: 'zayed-ps-normal-4', minutes: 120, starts_at: T.slot(yesterday, 22), customer_name: 'Hana Magdy', customer_phone: '01226619084', status: 'no_show', created_at: ago(60 * 29) });
      add({ room_type: 'normal', requested_room: 'zayed-ps-normal-2', room_id: 'zayed-ps-normal-2', minutes: 180, starts_at: inH(-2), customer_name: 'Omar Khaled', customer_phone: '01003581246', status: 'confirmed', created_at: ago(60 * 20) });
      add({ room_type: 'pool', room_id: 'zayed-ps-pool-1', minutes: 240, starts_at: inH(4), customer_name: 'Karim Fathy', customer_phone: '01550927316', customer_note: 'Birthday, 12 of us', status: 'confirmed', created_at: ago(60 * 26) });
      add({ room_type: 'vip', requested_room: 'zayed-ps-vip-2', room_id: 'zayed-ps-vip-2', minutes: 180, starts_at: inH(2), customer_name: 'Nour Ehab', customer_phone: '01098734512', status: 'confirmed', created_at: ago(60 * 7) });
      add({ room_type: 'normal', room_id: 'zayed-ps-normal-5', minutes: 120, starts_at: inH(1), customer_name: 'Ziad Sherif', customer_phone: '01147710265', status: 'confirmed', created_at: ago(60 * 3) });
      add({ room_type: 'cinema', room_id: 'zayed-ps-cinema-1', minutes: 180, starts_at: inH(7), customer_name: 'Youssef Adel', customer_phone: '01283306619', status: 'confirmed', created_at: ago(60 * 5) });
      add({ room_type: 'normal', requested_room: 'zayed-ps-normal-3', starts_at: inH(3), customer_name: 'Ahmed Samir', customer_phone: '01014526873', status: 'pending', created_at: ago(42) });
      add({ room_type: 'vip', starts_at: inH(5), customer_name: 'Mariam Hany', customer_phone: '01229047731', customer_note: 'We are 8', status: 'pending', created_at: ago(18) });
      add({ room_type: 'normal', starts_at: inH(20), customer_name: 'Seif Tarek', customer_phone: '01556180492', status: 'pending', created_at: ago(6) });
      add({ room_type: 'pool', requested_room: 'zayed-ps-pool-1', starts_at: inH(26), customer_name: 'Ali Mahmoud', customer_phone: '01061937208', status: 'cancelled', staff_note: 'Called, moved to next week', created_at: ago(60 * 10) });
      const events = rows.flatMap((b) => {
        const list = [{ booking_id: b.id, at: b.created_at, by_name: null, action: 'requested', detail: null }];
        if (b.status !== 'pending') list.push({ booking_id: b.id, at: new Date(Date.parse(b.created_at) + 9 * 60000).toISOString(), by_name: 'Karim Fathy', action: b.status === 'confirmed' || b.status === 'done' || b.status === 'no_show' ? 'confirmed' : b.status, detail: null });
        if (b.status === 'done' || b.status === 'no_show') list.push({ booking_id: b.id, at: new Date(Date.parse(b.starts_at) + 30 * 60000).toISOString(), by_name: 'Omar Hany', action: b.status, detail: null });
        return list;
      });
      const staff = [
        { user_id: 'demo-owner', email: 'owner@clash.demo', name: 'Owner', role: 'owner', status: 'active', created_at: ago(60 * 24 * 40) },
        { user_id: 'demo-karim', email: 'karim@clash.demo', name: 'Karim Fathy', role: 'manager', status: 'active', created_at: ago(60 * 24 * 30) },
        { user_id: 'demo-omar', email: 'omar@clash.demo', name: 'Omar Hany', role: 'shift', status: 'active', created_at: ago(60 * 24 * 12) },
        { user_id: 'demo-salma', email: 'salma@clash.demo', name: 'Salma Ashraf', role: 'shift', status: 'pending', created_at: ago(60 * 5) },
      ];
      return { v: 1, ref, rooms: ROOMS, bookings: rows, events, staff };
    }

    const load = () => {
      try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) { /* storage unavailable */ }
      const s = seed();
      save(s, false);
      return s;
    };
    const save = (s, notify = true) => {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ }
      if (notify) listeners.forEach((cb) => cb({}));
    };
    addEventListener('storage', (e) => { if (e.key === KEY) listeners.forEach((cb) => cb({})); });
    const pause = () => new Promise((r) => setTimeout(r, 120));
    const me = () => { try { return JSON.parse(localStorage.getItem(SESSION)); } catch (e) { return null; } };
    const log = (s, id, action, detail = null) => {
      const who = me();
      s.events.push({ booking_id: id, at: new Date().toISOString(), by_name: who ? who.staff.name : null, action, detail });
    };
    const busyRows = (s, from, to) => s.bookings.flatMap((b) => {
      const start = Date.parse(b.starts_at);
      if (b.status === 'confirmed' && b.room_id) {
        const end = start + b.minutes * 60000;
        return start < to && end > from ? [{ room_id: b.room_id, starts_at: b.starts_at, ends_at: new Date(end).toISOString(), status: b.status }] : [];
      }
      if (b.status === 'pending' && b.requested_room) {
        const end = start + 120 * 60000;
        return start < to && end > from ? [{ room_id: b.requested_room, starts_at: b.starts_at, ends_at: new Date(end).toISOString(), status: b.status }] : [];
      }
      return [];
    });
    const overlaps = (s, b, skipId) => s.bookings.some((o) => o.id !== skipId && o.status === 'confirmed' && o.room_id === b.room_id
      && Date.parse(o.starts_at) < Date.parse(b.starts_at) + b.minutes * 60000
      && Date.parse(o.starts_at) + o.minutes * 60000 > Date.parse(b.starts_at));

    return {
      async rooms() { await pause(); return load().rooms.slice().sort((a, b) => a.sort - b.sort); },
      async busy(from, to) { await pause(); return busyRows(load(), +from, +to); },
      async requestBooking(p) {
        await pause();
        const s = load();
        const phone = cleanPhone(p.phone);
        if (!phone) throw new StoreError('bad_phone');
        if (!p.name || p.name.trim().length < 2) throw new StoreError('bad_name');
        if (+p.starts_at < Date.now() + 20 * 60000) throw new StoreError('bad_time');
        if (s.bookings.filter((b) => b.customer_phone === phone && ['pending', 'confirmed'].includes(b.status) && Date.parse(b.starts_at) > Date.now()).length >= 3) throw new StoreError('too_many');
        if (p.room_id && busyRows(s, +p.starts_at, +p.starts_at + 3600000).some((r) => r.room_id === p.room_id)) throw new StoreError('room_busy');
        const now = new Date().toISOString();
        const b = {
          id: `demo-${s.ref}`, ref: s.ref++, branch: 'zayed', kind: 'ps', room_type: p.room_type, requested_room: p.room_id || null, room_id: null,
          starts_at: p.starts_at.toISOString(), minutes: null, customer_name: p.name.trim(), customer_phone: phone, customer_note: p.note || null,
          source: 'web', status: 'pending', staff_note: null, created_at: now, updated_at: now, updated_by: null,
        };
        s.bookings.push(b);
        s.events.push({ booking_id: b.id, at: now, by_name: null, action: 'requested', detail: null });
        save(s);
        return { ref: b.ref };
      },

      async session() { await pause(); const m = me(); if (!m) return null; const st = load().staff.find((x) => x.user_id === m.staff.user_id); return st ? { user: m.user, staff: st } : null; },
      /* demo: any password; a known demo email signs in as that person, anything else as the owner */
      async signIn(email) {
        await pause();
        const s = load();
        const st = s.staff.find((x) => x.email === String(email).trim().toLowerCase()) || s.staff.find((x) => x.role === 'owner');
        localStorage.setItem(SESSION, JSON.stringify({ user: { id: st.user_id, email: st.email }, staff: st }));
        return this.session();
      },
      async signUp(name, email) {
        await pause();
        const s = load();
        const id = `demo-${Date.now()}`;
        s.staff.push({ user_id: id, email: email.trim().toLowerCase(), name: name.trim(), role: 'shift', status: 'pending', created_at: new Date().toISOString() });
        save(s);
        localStorage.setItem(SESSION, JSON.stringify({ user: { id, email }, staff: s.staff[s.staff.length - 1] }));
        return this.session();
      },
      async signOut() { localStorage.removeItem(SESSION); },

      async bookings(from, to) { await pause(); return load().bookings.filter((b) => Date.parse(b.starts_at) >= +from && Date.parse(b.starts_at) < +to).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)); },
      async addBooking(p) {
        await pause();
        const s = load();
        const now = new Date().toISOString();
        const b = { id: `demo-${s.ref}`, ref: s.ref++, branch: 'zayed', kind: 'ps', requested_room: null, customer_note: null, staff_note: null, ...p, source: 'staff', created_at: now, updated_at: now };
        if (b.status === 'confirmed' && overlaps(s, b)) throw new StoreError('room_busy');
        s.bookings.push(b);
        log(s, b.id, 'added');
        if (b.status === 'confirmed') log(s, b.id, 'confirmed');
        save(s);
        return b;
      },
      async updateBooking(id, patch) {
        await pause();
        const s = load();
        const b = s.bookings.find((x) => x.id === id);
        const next = { ...b, ...patch, updated_at: new Date().toISOString() };
        if (next.status === 'confirmed' && (!next.room_id || !next.minutes)) throw new StoreError('incomplete');
        if (next.status === 'confirmed' && overlaps(s, next, id)) throw new StoreError('room_busy');
        const action = patch.status && patch.status !== b.status ? (patch.status === 'pending' ? 'reopened' : patch.status) : 'edited';
        Object.assign(b, next);
        log(s, id, action);
        save(s);
        return b;
      },
      async events(id) { await pause(); return load().events.filter((e) => e.booking_id === id).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)); },
      async staffList() { await pause(); return load().staff; },
      async updateStaff(userId, patch) { await pause(); const s = load(); Object.assign(s.staff.find((x) => x.user_id === userId), patch); save(s); },
      async removeStaff(userId) { await pause(); const s = load(); s.staff = s.staff.filter((x) => x.user_id !== userId); save(s); },
      async updateRoom(id, patch) { await pause(); const s = load(); Object.assign(s.rooms.find((x) => x.id === id), patch); save(s); },
      subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); },
      reset() { localStorage.removeItem(KEY); listeners.forEach((cb) => cb({})); },
    };
  }

  const driver = live ? liveDriver() : demoDriver();
  return { live, cleanPhone, StoreError, ...driver };
})();
