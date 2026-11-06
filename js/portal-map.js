/* Clash Esports member portal: place chips, zone box, floor map, open-a-PC sheet, running session (T4, T5, T6).
   Everything it knows comes from window.ClashAPI (places, zones, watchZone, me.startSession, me.endSession).
   Seat positions come from js/pc-layout.js through ClashAPI.places(): nothing is hard-coded here.
   portal.js owns the words (its W table, key `map`) and the dashboard; it calls PortalMap.init() once and PortalMap.setDash() on every
   dashboard load. Waiting list (T7) hooks into the empty .pn-wait-slot inside the zone box. */
(() => {
  const BRANCH = 'zayed';
  const LAST_KEY = 'clash-portal-place';
  /* chip order on screen; any place not listed goes after these, in layout order */
  const ORDER = ['normal', 'vip', 'team1', 'team2', 'cave', 'elite', 'stream1', 'stream2', 'duo'];

  let api, site, getW, onSession, onSignedOut, onEnded, ready = false;
  const S = {
    phase: 'idle', err: null, zones: {}, places: [], placeId: null, upd: {}, firstUpd: null,
    dash: null, dashAt: 0, pick: null, busy: false, sheetErr: '', notice: '', done: null, endBusy: false,
  };
  let unsub = [];
  let token = 0;
  let sheetEl, doneEl, clockTimer, sessTimer;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => (site.lang === 'ar' ? 'ar' : 'en');
  const tr = (v) => (v && typeof v === 'object' ? (v[lang()] || v.en || '') : String(v || ''));
  const M = () => getW().map;
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (mins) => { const m = Math.max(0, Math.round(mins || 0)); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
  const clock = (iso) => {
    try { return new Date(iso).toLocaleTimeString(lang() === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; }
  };
  const SIDES = ['red', 'blue', 'yellow', 'both', 'none'];
  const sideOf = (zoneId) => { const z = S.zones[zoneId]; return z && SIDES.includes(z.side) ? z.side : 'none'; };
  const zn = (id) => (S.zones[id] ? tr(S.zones[id].name) : String(id));
  const place = () => S.places.find((p) => p.id === S.placeId);
  const zoneMins = (zoneId) => {
    const z = S.dash && S.dash.zones.find((x) => x.zoneId === zoneId);
    return z ? z.usableMinutes : 0;
  };
  const allSeats = (zoneId) => S.places.flatMap((p) => p.seats.filter((s) => s.zoneId === zoneId));
  const zoneFree = (zoneId) => allSeats(zoneId).filter((s) => s.state === 'free').length;
  const zoneFull = (zoneId) => allSeats(zoneId).length > 0 && zoneFree(zoneId) === 0;
  const placeSeats = (p) => p.zones.flatMap((z) => allSeats(z));
  const placeFull = (p) => { const s = placeSeats(p); return s.length > 0 && s.every((x) => x.state !== 'free'); };
  const sharedZone = (p) => S.places.filter((q) => q.zones.some((z) => p.zones.includes(z))).length > 1;
  const saveLast = (id) => { try { localStorage.setItem(LAST_KEY, id); } catch (e) { /* fine */ } };
  const readLast = () => { try { return localStorage.getItem(LAST_KEY); } catch (e) { return null; } };
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(16).slice(2)}`);

  /* ---------- load ---------- */
  function load() {
    const mine = ++token;
    S.phase = 'loading';
    renderAll();
    Promise.all([api.zones(BRANCH), api.places(BRANCH)]).then(([zones, pl]) => {
      if (mine !== token) return;
      S.zones = {}; zones.forEach((z) => { S.zones[z.id] = z; });
      const rank = (p) => { const i = ORDER.indexOf(p.id); return i < 0 ? 99 : i; };
      S.places = pl.places.slice().sort((a, b) => rank(a) - rank(b));
      S.firstUpd = pl.updatedAt;
      S.upd = {};
      const last = readLast();
      /* ?place=<id> (from a PC room page) wins over the saved choice */
      const fromUrl = new URLSearchParams(location.search).get('place');
      const known = (id) => S.places.some((p) => p.id === id);
      S.placeId = known(fromUrl) ? fromUrl : known(last) ? last : (S.places[0] && S.places[0].id);
      S.phase = S.places.length ? 'data' : 'empty';
      renderAll();
      subscribe();
      if (window.PortalWait) window.PortalWait.rerender();
    }, (err) => {
      if (mine !== token) return;
      S.phase = 'error'; S.err = err;
      renderAll();
    });
  }

  function subscribe() {
    unsub.forEach((f) => f()); unsub = [];
    const p = place();
    if (!p) return;
    p.zones.forEach((zid) => {
      const on = (res, err) => {
        if (err || !res) {
          if (err && err.code === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
          if (err && err.code === 'NOT_WIRED') watchFailed(err);
          return;
        }
        S.upd[zid] = res.updatedAt;
        S.places.forEach((q) => q.seats.forEach((s) => {
          if (s.zoneId !== zid) return;
          const h = res.hosts.find((x) => x.number === s.number);
          if (h) { s.state = h.state; s.minutesLeft = h.minutesLeft; }
        }));
        if (S.pick && !isFree(S.pick.hostId)) { S.pick = null; }
        patch();
      };
      try {
        const r = api.watchZone(zid, on);
        unsub.push(typeof r === 'function' ? r : () => {});
      } catch (e) { watchFailed(e); }
    });
  }
  function watchFailed(err) {
    if (err && err.code === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
    unsub.forEach((f) => { try { f(); } catch (e) { /* fine */ } }); unsub = [];
    S.phase = 'error'; S.err = err; S.pick = null;
    renderAll(); renderSheet();
  }
  const isFree = (hostId) => S.places.some((p) => p.seats.some((s) => s.id === hostId && s.state === 'free'));
  const findSeat = (hostId) => { for (const p of S.places) { const s = p.seats.find((x) => x.id === hostId); if (s) return s; } return null; };

  function choose(id) {
    if (id === S.placeId || S.busy) return;
    S.placeId = id; S.pick = null; S.notice = ''; S.sheetErr = '';
    saveLast(id);
    renderAll();
    subscribe();
  }

  /* ---------- render: full ---------- */
  function renderAll() {
    const chips = $('places'), zbox = $('zones'), floor = $('floor');
    if (!chips) return;
    if (S.phase === 'idle') return;
    if (S.phase === 'loading') {
      chips.innerHTML = `<div class="pn-chips">${[7, 6, 8, 8].map((n) => `<span class="pn-skel pn-chip-skel" style="width:${n * 12}px"></span>`).join('')}</div>`;
      zbox.innerHTML = '<div class="pn-zone"><div class="pn-skel line" style="width:10em"></div><div class="pn-skel line" style="width:14em;margin-top:14px"></div></div>';
      floor.innerHTML = '<div class="pn-map"><div class="pn-skel" style="height:240px"></div></div>';
      zbox.classList.remove('pn-fade'); return;
    }
    if (S.phase === 'error' || S.phase === 'empty') {
      chips.innerHTML = '';
      zbox.innerHTML = '';
      const down = S.err && (S.err.code === 'GIZMO_DOWN' || S.err.code === 'NETWORK');
      floor.innerHTML = S.phase === 'empty'
        ? `<div class="pn-error"><p>${esc(M().empty)}</p></div>`
        : `<div class="pn-error" role="alert"><p>${esc(down ? getW().down : getW().generic)}</p><button class="pn-retry" type="button" id="pn-map-retry">${esc(getW().retry)}</button></div>`;
      const r = $('pn-map-retry'); if (r) r.addEventListener('click', load);
      return;
    }
    const p = place();
    const m = M();
    chips.innerHTML = `<div class="pn-chips" role="group" aria-label="${esc(m.placesLabel)}">${S.places.map((q) =>
      `<button type="button" class="pn-chip" data-place="${esc(q.id)}"><span>${esc(tr(q.name))}</span><i class="pn-chipdot" aria-hidden="true"></i></button>`).join('')}</div>`;
    chips.querySelectorAll('.pn-chip').forEach((b) => b.addEventListener('click', () => choose(b.dataset.place)));

    const side = sideOf(p.zones[0]);
    zbox.innerHTML = `<div class="pn-zone t-${side}" id="pn-zonebox">
      <div class="pn-zone-top"><h2 class="pn-zone-name">${esc(tr(p.name))}</h2><span class="pn-zone-price" id="pn-price"></span></div>
      <dl class="pn-zone-grid">
        <div><dt>${esc(m.yourTime)}</dt><dd id="pn-ztime"></dd></div>
        <div><dt id="pn-zfreelabel"></dt><dd id="pn-zfree"></dd></div>
      </dl>
      <div class="pn-zone-full" id="pn-zfull" hidden><p id="pn-zfullline"></p></div>
    </div>`;

    floor.innerHTML = `<div class="pn-map t-${side}" id="pn-mapbox">
      <div class="pn-map-top"><span class="pn-map-title">${esc(p.kind === 'hall' ? m.mapHall(tr(p.name)) : m.mapRoom)}</span><span class="pn-upd" id="pn-upd"></span></div>
      <div id="pn-notice" class="pn-notice" role="status" hidden></div>
      ${p.kind === 'room' ? roomHtml(p) : `<div class="pn-hall">${gridHtml(p, false)}</div>`}
      <div class="pn-legend">
        <span><i class="pn-lg is-free"></i>${esc(m.lgFree)}</span><span><i class="pn-lg is-busy"></i>${esc(m.lgBusy)}</span>
        <span><i class="pn-lg is-reserved"></i>${esc(m.lgHeld)}</span><span><i class="pn-lg is-out">&times;</i>${esc(m.lgOut)}</span>
        <span><i class="pn-lg is-pick"></i>${esc(m.lgPick)}</span>
      </div></div>`;
    floor.querySelectorAll('.pn-seat').forEach((b) => b.addEventListener('click', () => tapSeat(b.dataset.host)));
    patch();
  }

  function roomHtml(p) {
    const m = M();
    return `<div class="pn-room"><span class="pn-roomlbl">${esc(m.screen)}</span>${gridHtml(p, true)}<span class="pn-roomlbl">${esc(m.door)}</span></div>`;
  }

  /* the grid is built from each seat's x/y; columns/rows with no seat become narrow aisles */
  function gridHtml(p, room) {
    const cols = Math.max(p.cols || 1, ...p.seats.map((s) => s.x + 1));
    const rows = Math.max(p.rows || 1, ...p.seats.map((s) => s.y + 1));
    const hasCol = Array.from({ length: cols }, (_, c) => p.seats.some((s) => s.x === c));
    const hasRow = Array.from({ length: rows }, (_, r) => p.seats.some((s) => s.y === r));
    const sz = room ? 52 : 36;
    const labels = (p.areas || []).filter((a) => a.y > 0 && !hasRow[a.y - 1] && (p.areas || []).length > 1);
    const labelRow = (r) => labels.some((a) => a.y - 1 === r);
    const tc = hasCol.map((h) => (h ? `minmax(0,${sz}px)` : '14px')).join(' ');
    const tr_ = hasRow.map((h, r) => (h ? 'auto' : (labelRow(r) ? '26px' : '12px'))).join(' ');
    const lbls = labels.map((a) => `<span class="pn-area" style="grid-column:${Number(a.x) + 1} / span ${Number(a.w) || 1};grid-row:${Number(a.y)}">${esc(tr(a.label))}</span>`).join('');
    const seats = p.seats.map((s) => `<div class="pn-seatwrap" style="grid-column:${Number(s.x) + 1};grid-row:${Number(s.y) + 1}">
        <button type="button" class="pn-seat" data-host="${esc(s.id)}">${Number(s.number)}</button>${room ? '<span class="pn-left"></span>' : ''}</div>`).join('');
    return `<div class="pn-grid ${room ? 'is-room' : ''}" style="grid-template-columns:${tc};grid-template-rows:${tr_}">${lbls}${seats}</div>`;
  }

  /* ---------- render: patch (live updates keep elements, so colours fade over 0.6 s) ---------- */
  function patch() {
    if (S.phase !== 'data') return;
    const p = place(); if (!p) return;
    const m = M();
    document.querySelectorAll('.pn-chip').forEach((b) => {
      const q = S.places.find((x) => x.id === b.dataset.place);
      const on = b.dataset.place === S.placeId;
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-full', !!q && placeFull(q));
    });
    const prices = [...new Set(p.zones.map((z) => S.zones[z] && S.zones[z].price).filter((x) => x != null))].sort((a, b) => a - b);
    $('pn-price').textContent = `${prices.length > 1 ? `${prices[0]}-${prices[prices.length - 1]}` : (prices[0] ?? '')} ${m.perHour}`;
    const mins = p.zones.map((z) => zoneMins(z));
    $('pn-ztime').innerHTML = p.zones.length > 1
      ? p.zones.map((z, i) => `<span class="pn-ztime-row"><small>${esc(zn(z))}</small> ${mins[i] > 0 ? hm(mins[i]) : esc(m.noTimeShort)}</span>`).join('')
      : (mins[0] > 0 ? hm(mins[0]) : esc(m.noTimeShort));
    const shared = sharedZone(p);
    const zname = zn(p.zones[0]);
    $('pn-zfreelabel').textContent = shared ? m.freeAll(zname) : m.freeNow;
    const seats = placeSeats(p);
    $('pn-zfree').textContent = `${seats.filter((s) => s.state === 'free').length} / ${seats.length}`;

    const full = seats.length > 0 && seats.every((s) => s.state !== 'free');
    const fb = $('pn-zfull');
    fb.hidden = !full;
    if (full) {
      const busy = seats.filter((s) => s.state === 'busy' && s.minutesLeft);
      const eta = busy.length ? Math.min(...busy.map((s) => s.minutesLeft)) : 15;
      $('pn-zfullline').textContent = shared ? m.fullAll(zname, eta) : m.full(tr(p.name), eta);
      /* T7 hook: the waiting-list button/card mounts into this slot; it exists only while the zone is full */
      if (!fb.querySelector('.pn-wait-slot')) fb.insertAdjacentHTML('beforeend', `<div class="pn-wait-slot" data-zone="${esc(p.zones[0])}"></div>`);
      if (window.PortalWait) window.PortalWait.fillSlot(fb.querySelector('.pn-wait-slot'), p.zones[0]);
    } else {
      const slot = fb.querySelector('.pn-wait-slot'); if (slot) slot.remove();
    }

    document.querySelectorAll('#pn-mapbox .pn-seat').forEach((b) => {
      const s = findSeat(b.dataset.host); if (!s) return;
      const picked = S.pick && S.pick.hostId === s.id;
      b.className = `pn-seat is-${s.state}${picked ? ' is-picked' : ''}`;
      b.setAttribute('aria-label', `${m.pc(s.number)}, ${m.state[s.state]}`);
      b.setAttribute('aria-pressed', String(!!picked));
      if (s.state === 'free') b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true');
      const cap = b.parentNode.querySelector('.pn-left');
      if (cap) cap.textContent = s.state === 'busy' ? (s.minutesLeft ? m.left(s.minutesLeft) : '') : (s.state === 'reserved' ? m.held : (s.state === 'out' ? m.out : ''));
    });
    const nb = $('pn-notice'); nb.hidden = !S.notice; nb.textContent = S.notice;
    tickUpdated();
    renderSheet();
    renderSession();
  }

  function tickUpdated() {
    const el = $('pn-upd'); const p = place();
    if (!el || !p) return;
    const t = p.zones.map((z) => S.upd[z]).filter(Boolean).sort()[0] || S.firstUpd;
    const n = t ? Math.max(0, Math.round((Date.now() - Date.parse(t)) / 1000)) : 0;
    el.textContent = M().updated(n);
  }

  /* ---------- T6: pick a seat, sheet, start ---------- */
  function tapSeat(hostId) {
    const s = findSeat(hostId);
    if (!s || s.state !== 'free' || S.busy) return;
    S.pick = S.pick && S.pick.hostId === hostId ? null : { hostId, idem: uuid() };
    S.sheetErr = ''; S.notice = '';
    if (S.pick && window.PortalWait) window.PortalWait.closeSheet();
    patch();
  }

  function ensureOverlays() {
    if (sheetEl) return;
    sheetEl = document.createElement('div');
    sheetEl.className = 'pn-sheet'; sheetEl.id = 'pn-sheet';
    sheetEl.setAttribute('role', 'dialog'); sheetEl.setAttribute('aria-modal', 'false');
    (document.getElementById('dock') || document.body).appendChild(sheetEl);
    doneEl = document.createElement('div');
    doneEl.className = 'pn-done'; doneEl.id = 'pn-done'; doneEl.setAttribute('role', 'dialog'); doneEl.setAttribute('aria-modal', 'true');
    document.body.appendChild(doneEl);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && S.pick && !S.busy) { S.pick = null; S.sheetErr = ''; patch(); }
    });
  }

  function renderSheet() {
    ensureOverlays();
    const open = !!S.pick && !S.done;
    sheetEl.classList.toggle('is-open', open);
    sheetEl.setAttribute('aria-hidden', String(!open));
    if (!open) { S.sheetKey = ''; return; }
    const s = findSeat(S.pick.hostId); const p = place();
    if (!s || !p) return;
    const m = M();
    const mins = zoneMins(s.zoneId);
    const wz = window.PortalWait ? window.PortalWait.waitingZone() : null;
    const key = `${s.id}|${S.busy}|${S.sheetErr}|${mins}|${lang()}|${S.pick.idem}|${wz}`;
    if (key === S.sheetKey && sheetEl.firstChild) return;
    S.sheetKey = key;
    const side = sideOf(s.zoneId);
    const pname = tr(p.name);
    const time = mins > 0 ? hm(mins) : m.noTimeShort;
    const cta = mins > 0
      ? `<button type="button" class="pn-cta" id="pn-open" ${S.busy ? 'disabled' : ''}>${esc(S.busy ? m.opening : m.openNow(s.number))}</button>`
      : `<span class="pn-cta is-soon" aria-disabled="true">${esc(m.buyHours)} <em>${esc(getW().soonWord)}</em></span>`;
    sheetEl.innerHTML = `<span class="pn-grab" aria-hidden="true"></span>
      <div class="pn-sheet-box t-${side}">
        <div class="pn-sheet-top"><span class="pn-sheet-pc">${esc(m.pc(s.number))}</span><button type="button" class="pn-change" id="pn-change" ${S.busy ? 'disabled' : ''}>${esc(m.change)}</button></div>
        <span class="pn-sheet-sub">${esc(m.sheetSub(pname, time))}</span>
      </div>
      ${mins > 0 ? '' : `<p class="pn-warn">${esc(m.noTimeLine(zn(s.zoneId)))}</p>`}
      ${wz ? `<p class="pn-wtext" id="pn-offlist">${esc(m.offList(zn(wz)))}</p>` : ''}
      ${S.sheetErr ? `<p class="pn-warn" role="alert">${esc(S.sheetErr)}</p>` : ''}
      ${cta}`;
    $('pn-change').addEventListener('click', () => { S.pick = null; S.sheetErr = ''; patch(); });
    const o = $('pn-open'); if (o) o.addEventListener('click', confirmOpen);
  }

  function errText(err) {
    const m = M();
    const c = err && err.code;
    if (c === 'ALREADY_ACTIVE') {
      const a = S.dash && S.dash.activeSession;
      return a ? m.errAlready(a.hostNumber) : m.errAlreadyAny;
    }
    if (c === 'RATE_LIMITED') return m.rate(Math.max(1, Math.ceil(Number(err.retryAfter) || 5)));
    return m.errors[c] || (c === 'NETWORK' ? m.errors.GIZMO_DOWN : getW().generic);
  }

  function confirmOpen() {
    if (S.busy || !S.pick) return;
    const pick = S.pick;
    S.busy = true; S.sheetErr = '';
    patch();
    api.me.startSession(pick.hostId, pick.idem).then((sess) => {
      S.busy = false; S.pick = null; S.done = Object.assign({}, sess, { gotAt: Date.now() });
      onSession();
      if (window.PortalWait) window.PortalWait.refreshEntry();
      renderDone(); patch();
      refreshMap();
    }, (err) => {
      S.busy = false;
      const c = err && err.code;
      if (c === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
      if (c !== 'NETWORK' && S.pick === pick) pick.idem = uuid(); /* a final answer: the next try is a new attempt */
      if (c === 'HOST_TAKEN' || c === 'NOT_FOUND') {
        S.pick = null; S.notice = M().errors[c];
        refreshMap();
      } else if (c === 'ALREADY_ACTIVE') {
        S.sheetErr = errText(err); /* shows at once; replaced with the real PC number when the dashboard answers */
        Promise.resolve(onSession()).then(() => { if (S.pick) { S.sheetErr = errText(err); patch(); } });
      } else {
        if (c === 'HOST_OUT') { const s = findSeat(pick.hostId); if (s) s.state = 'out'; }
        S.sheetErr = errText(err);
        if (c === 'HOST_OUT') { S.pick = null; S.notice = S.sheetErr; }
      }
      patch();
    });
  }

  /* re-read every place once (after someone took our seat, or after a session starts or ends) */
  function refreshMap() {
    api.places(BRANCH).then((pl) => {
      pl.places.forEach((np) => {
        const old = S.places.find((x) => x.id === np.id);
        if (old) old.seats.forEach((s) => { const n = np.seats.find((x) => x.host === s.host); if (n) { s.state = n.state; s.minutesLeft = n.minutesLeft; } });
      });
      S.firstUpd = pl.updatedAt; S.upd = {};
      if (S.pick && !isFree(S.pick.hostId)) S.pick = null;
      patch();
    }, () => { /* keep what is on screen; live refresh retries */ });
  }

  /* ---------- "PC N is on" screen ---------- */
  function renderDone() {
    ensureOverlays();
    const s = S.done;
    doneEl.classList.toggle('is-open', !!s);
    doneEl.setAttribute('aria-hidden', String(!s));
    document.body.classList.toggle('pn-lock', !!s);
    clearInterval(clockTimer);
    if (window.PortalWait) window.PortalWait.sync();
    if (!s) return;
    const m = M();
    const zname = zn(s.zoneId);
    const side = sideOf(s.zoneId);
    doneEl.innerHTML = `<div class="pn-done-in">
      <span class="pn-kicker">${esc(m.sessionStarted)}</span>
      <h2 class="pn-done-title">${esc(m.isOn(s.hostNumber))}</h2>
      <div class="pn-done-box t-${side}">
        <p>${esc(m.doneLine(s.hostNumber, zname))}</p>
        <dl class="pn-done-grid">
          <div><dt>${esc(m.started)}</dt><dd>${esc(clock(s.startedAt))}</dd></div>
          <div><dt>${esc(m.timeLeft)}</dt><dd id="pn-done-left">${hm(leftNow(s, s.gotAt))}</dd></div>
        </dl>
      </div>
      <p class="pn-warn" id="pn-done-err" role="alert" hidden></p>
      <div class="pn-done-btns">
        <button type="button" class="pn-ghost" id="pn-done-end">${esc(m.endSession)}</button>
        <button type="button" class="pn-cta" id="pn-done-back">${esc(m.back)}</button>
      </div></div>`;
    $('pn-done-back').addEventListener('click', () => { S.done = null; renderDone(); refreshMap(); });
    $('pn-done-end').addEventListener('click', () => endSession($('pn-done-end'), true));
    $('pn-done-back').focus();
  }

  function leftNow(s, at) {
    const base = at || Date.now();
    return Math.max(0, (s.minutesLeft || 0) - Math.floor((Date.now() - base) / 60000));
  }

  function endSession(btn, fromDone) {
    if (S.endBusy) return;
    S.endBusy = true; btn.disabled = true; btn.textContent = M().ending;
    api.me.endSession().then(() => 'ok', (err) => (err && err.code === 'NOT_FOUND' ? 'ok' : err)).then((r) => {
      if (r !== 'ok') {
        if (r && r.code === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
        btn.disabled = false; btn.textContent = M().endSession;
        const e = $('pn-done-err') && fromDone ? $('pn-done-err') : $('pn-sess-err');
        if (e) { e.hidden = false; e.textContent = errText(r); }
        return;
      }
      /* gone at once on screen; the dashboard refresh only confirms it */
      if (S.dash) S.dash = Object.assign({}, S.dash, { activeSession: null });
      if (onEnded) onEnded();
      if (fromDone) S.done = null;
      renderDone(); renderSession(); patch();
      return Promise.resolve(onSession()).then(refreshMap, refreshMap);
    }).catch(() => {}).then(() => { S.endBusy = false; });
  }

  /* ---------- running-session card on the dashboard ---------- */
  function renderSession() {
    const box = $('session'); if (!box) return;
    const a = S.dash && S.dash.activeSession;
    const key = a ? `${a.hostId}|${a.startedAt}|${lang()}|${S.zones[a.zoneId] ? 1 : 0}|${S.dashAt}` : '';
    if (key === S.sessKey && (!a || box.querySelector('.pn-sess'))) return;
    S.sessKey = key;
    clearInterval(sessTimer);
    if (!a) { box.innerHTML = ''; return; }
    const m = M();
    const zname = zn(a.zoneId);
    const had = box.querySelector('.pn-sess');
    box.innerHTML = `<div class="pn-sess t-${sideOf(a.zoneId)}${had ? '' : ' pn-fade'}">
      <div class="pn-sess-top"><span class="pn-kicker">${esc(m.sessionTitle)}</span><h2 class="pn-sess-name">${esc(m.pc(a.hostNumber))} <small>${esc(zname)}</small></h2></div>
      <dl class="pn-done-grid">
        <div><dt>${esc(m.started)}</dt><dd>${esc(clock(a.startedAt))}</dd></div>
        <div><dt>${esc(m.timeLeft)}</dt><dd id="pn-sess-left">${hm(leftNow(a, S.dashAt))}</dd></div>
      </dl>
      <p class="pn-warn" id="pn-sess-err" role="alert" hidden></p>
      <button type="button" class="pn-ghost" id="pn-sess-end">${esc(m.endSession)}</button></div>`;
    $('pn-sess-end').addEventListener('click', (e) => endSession(e.currentTarget, false));
    sessTimer = setInterval(() => {
      const left = leftNow(a, S.dashAt);
      const el = $('pn-sess-left'); if (el) el.textContent = hm(left);
      const el2 = $('pn-done-left'); if (el2) el2.textContent = hm(left);
      if (left <= 0) { clearInterval(sessTimer); onSession(); }
    }, 60000);
  }

  /* ---------- public ---------- */
  function init(opts) {
    api = opts.api; site = opts.site; getW = opts.getW; onSession = opts.onSession || (() => {});
    onSignedOut = opts.signedOut; onEnded = opts.onEnded;
    ready = true;
    setInterval(tickUpdated, 1000);
  }

  function setDash(dash) {
    if (!ready) return;
    S.dash = dash; S.dashAt = Date.now();
    if (S.phase === 'idle') { load(); return; }
    patch();
    if (S.done && !dash.activeSession) { S.done = null; renderDone(); }
  }

  /* language switch: rebuild with the other words */
  function rerender() {
    if (!ready || S.phase === 'idle') return;
    renderAll();
    renderDone();
  }

  /* what portal-wait.js (T7) needs from the map */
  const hooks = {
    zoneName: zn,
    doneOpen: () => !!S.done,
    zoneMins,
    refresh: () => { if (ready && S.phase === 'data') refreshMap(); },
    repaint: () => { if (ready) patch(); },
    clearPick: () => { if (S.pick) { S.pick = null; S.sheetErr = ''; patch(); } },
    started: (sess) => { S.pick = null; S.done = Object.assign({}, sess, { gotAt: Date.now() }); onSession(); renderDone(); patch(); refreshMap(); },
  };

  window.PortalMap = { init, setDash, rerender, hooks };
})();
