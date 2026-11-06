/* Clash Esports member portal: waiting list (T7).
   Join button in the zone box when a zone is full, waiting sheet, dashed pill above the chips, the "your turn" offer screen with a
   5-minute hold countdown, and the expiry note. Everything comes from window.ClashAPI (me.joinWaitlist, leaveWaitlist, acceptOffer,
   watchWaitlist). portal-map.js owns the zone box and the map; this file talks to it only through PortalMap.hooks. */
(() => {
  let api, site, hooks, onSignedOut, ready = false;

  const W = {
    en: {
      join: 'Join the waiting list', joining: 'Joining…',
      already: (z) => `You are already waiting for ${z}. Leave that list first.`,
      notFull: 'A PC just freed up, open it now',
      pill: (n, z) => `Waiting list · #${n} for ${z}`, eta: (m) => `~${m} min`,
      kicker: (z) => `Waiting list · ${z}`, inLine: (m) => `in line · about ${m} min`,
      hold: 'When a PC frees up we send you a notification and hold it for you for 5 minutes. Keep browsing; you stay in line.',
      leave: 'Leave the list', leaving: 'Leaving…', ok: 'OK', position: (n) => `Place ${n} of 3`,
      turn: 'Your turn', held: (n) => `PC ${n} is held for you`, heldFor: (z) => `${z} · held for`,
      offerNote: 'Open it before the time runs out, or it goes to the next person in line.',
      letGo: 'Let it go', openNow: (n) => `Open PC ${n} now`, opening: 'Opening…',
      expired: 'The 5 minutes ran out, the PC went to the next in line', dismiss: 'Close',
      menuWait: 'Waiting list',
      errors: {
        NO_TIME: 'You have no time left in this zone. Buy hours first.',
        ALREADY_ACTIVE: "You're already playing on a PC, end that session first.",
        GIZMO_DOWN: "The lounge system isn't answering right now, try again in a bit.",
        NETWORK: "Can't reach the service. Check your connection and try again.",
        NOT_FOUND: 'That offer is gone.',
        HOST_OUT: 'This PC is out of order, we will find you another.',
        NOT_WIRED: "This isn't connected yet.",
      },
      rate: (n) => `Too many tries, wait ${n} seconds.`,
      noRefresh: "Couldn't refresh", letGoFail: "Couldn't reach the service, but the offer is closed.",
      generic: 'Something went wrong. Try again.',
    },
    ar: {
      join: 'انضم لقائمة الانتظار', joining: 'بننضمك…',
      already: (z) => `إنت مستني أصلًا في ${z}. اخرج من القائمة دي الأول.`,
      notFull: 'فيه PC فضي حالًا، افتحه دلوقتي',
      pill: (n, z) => `قائمة الانتظار · #${n} على ${z}`, eta: (m) => `~${m} د`,
      kicker: (z) => `قائمة الانتظار · ${z}`, inLine: (m) => `في الطابور · حوالي ${m} دقيقة`,
      hold: 'أول ما PC يفضى هنبعتلك إشعار ونحجزهولك 5 دقايق. كمّل تصفح؛ مكانك في الطابور محفوظ.',
      leave: 'اخرج من القائمة', leaving: 'بنخرجك…', ok: 'تمام', position: (n) => `المكان ${n} من 3`,
      turn: 'دورك', held: (n) => `PC ${n} محجوز ليك`, heldFor: (z) => `${z} · محجوز ليك`,
      offerNote: 'افتحه قبل ما الوقت يخلص، أو هيروح للي بعدك في الطابور.',
      letGo: 'سيبه', openNow: (n) => `افتح PC ${n} دلوقتي`, opening: 'بنفتح…',
      expired: 'الـ5 دقايق خلصوا، الجهاز راح للي بعدك في الطابور', dismiss: 'إغلاق',
      menuWait: 'قائمة الانتظار',
      errors: {
        NO_TIME: 'مفيش عندك وقت في المنطقة دي. اشتري ساعات الأول.',
        ALREADY_ACTIVE: 'إنت بتلعب أصلًا على جهاز، أنهي الجلسة دي الأول.',
        GIZMO_DOWN: 'نظام الصالة مش بيرد دلوقتي، جرّب تاني بعد شوية.',
        NETWORK: 'مش قادرين نوصل للخدمة. اتأكد من النت وجرّب تاني.',
        NOT_FOUND: 'العرض ده خلص.',
        HOST_OUT: 'الجهاز ده عطلان، هنلاقيلك جهاز تاني.',
        NOT_WIRED: 'ده لسه مش متوصّل.',
      },
      rate: (n) => `محاولات كتير، استنى ${n} ثانية.`,
      noRefresh: 'مش قادرين نحدّث', letGoFail: 'مش قادرين نوصل للخدمة، بس العرض اتقفل.',
      generic: 'حصلت مشكلة. جرّب تاني.',
    },
  };
  const T = () => W[site.lang === 'ar' ? 'ar' : 'en'];

  const S = {
    entry: null, gone: null, sheetOpen: false, busy: '', err: '', joinMsg: null, expired: false, loaded: false, stale: false, note: '', joinKeys: {}, acceptKey: null,
  };
  let sheetEl, offerEl, clockTimer, unwatch, openOfferKey = '';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(16).slice(2)}`);
  const errText = (e) => {
    const c = e && e.code;
    if (c === 'RATE_LIMITED') return T().rate(Math.max(1, Math.ceil(Number(e.retryAfter) || 5)));
    return T().errors[c] || (c === 'NETWORK' ? T().errors.GIZMO_DOWN : T().generic);
  };
  const signedOut = (e) => { if (e && e.code === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return true; } return false; };
  const waiting = () => !!S.entry && S.entry.status === 'waiting';
  const offered = () => !!S.entry && S.entry.status === 'offered';
  const zname = (id) => hooks.zoneName(id);

  /* ---------- the join button / messages inside the zone box ---------- */
  function fillSlot(slot, zoneId) {
    if (!slot || !ready) return;
    const t = T(); const e = S.entry;
    const msg = S.joinMsg && S.joinMsg.zone === zoneId ? S.joinMsg.text : '';
    let html = '';
    if (e && e.zoneId !== zoneId) html = `<p class="pn-warn">${esc(t.already(zname(e.zoneId)))}</p>`;
    else if (!e) {
      html = `<button type="button" class="pn-cta" id="pn-join" ${S.busy === 'join' ? 'disabled' : ''}>${esc(S.busy === 'join' ? t.joining : t.join)}</button>`
        + (msg ? `<p class="pn-warn" role="alert">${esc(msg)}</p>` : '');
    }
    const key = `${html}|${zoneId}`;
    if (slot.dataset.key === key) return;
    slot.dataset.key = key;
    slot.innerHTML = html;
    const b = slot.querySelector('#pn-join');
    if (b) b.addEventListener('click', () => join(zoneId));
  }

  function join(zoneId) {
    if (S.busy) return;
    S.busy = 'join'; S.joinMsg = null;
    hooks.repaint();
    const key = S.joinKeys[zoneId] || (S.joinKeys[zoneId] = uuid());
    api.me.joinWaitlist(zoneId, key).then((entry) => {
      S.busy = ''; delete S.joinKeys[zoneId];
      S.gone = null;
      S.entry = entry; S.sheetOpen = true;
      hooks.clearPick();
      if (entry.status === 'offered') hooks.refresh();
      renderAll(); hooks.repaint();
    }, (err) => {
      S.busy = '';
      const c = err && err.code;
      const t = T();
      if (c !== 'NETWORK') delete S.joinKeys[zoneId];
      if (signedOut(err)) return;
      if (c === 'NOT_FULL') { S.joinMsg = { zone: zoneId, text: t.notFull }; hooks.refresh(); }
      else if (c === 'ALREADY_WAITING') {
        S.joinMsg = null;
        api.me.waitlist().then((e) => { if (e) { S.entry = e; renderAll(); } hooks.repaint(); }, () => hooks.repaint());
      } else S.joinMsg = { zone: zoneId, text: errText(err) };
      hooks.repaint();
    });
  }

  /* ---------- pill above the chips (and the expiry note) ---------- */
  function renderPill() {
    const box = $('waitpill'); if (!box) return;
    const t = T(); const e = S.entry;
    let html = '';
    if (S.note) html += `<div class="pn-wnote" role="status"><p>${esc(S.note)}</p><button type="button" class="pn-change" id="pn-wnote-n">${esc(t.dismiss)}</button></div>`;
    if (S.stale) html += `<p class="pn-wsub" role="status">${esc(t.noRefresh)}</p>`;
    if (S.expired) html +=`<div class="pn-wnote" role="status"><p>${esc(t.expired)}</p><button type="button" class="pn-change" id="pn-wnote-x">${esc(t.dismiss)}</button></div>`;
    if (waiting() && !S.sheetOpen) {
      html += `<button type="button" class="pn-wpill" id="pn-wpill"><span>${esc(t.pill(e.position, zname(e.zoneId)))}</span><b>${esc(t.eta(e.etaMinutes))}</b></button>`;
    }
    if (box.dataset.key === html) return;
    box.dataset.key = html;
    box.innerHTML = html;
    const p = $('pn-wpill'); if (p) p.addEventListener('click', openSheet);
    const n = $('pn-wnote-n'); if (n) n.addEventListener('click', () => { S.note = ''; renderPill(); });
    const x = $('pn-wnote-x'); if (x) x.addEventListener('click', () => { S.expired = false; renderPill(); });
  }

  /* ---------- waiting sheet ---------- */
  function ensureEls() {
    if (sheetEl) return;
    sheetEl = document.createElement('div');
    sheetEl.className = 'pn-sheet pn-wsheet'; sheetEl.id = 'pn-wsheet';
    sheetEl.setAttribute('role', 'dialog'); sheetEl.setAttribute('aria-modal', 'false');
    (document.getElementById('dock') || document.body).appendChild(sheetEl);
    offerEl = document.createElement('div');
    offerEl.className = 'pn-done pn-offer'; offerEl.id = 'pn-offer';
    offerEl.setAttribute('role', 'dialog'); offerEl.setAttribute('aria-modal', 'true');
    document.body.appendChild(offerEl);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && S.sheetOpen && !S.busy) { S.sheetOpen = false; renderAll(); } });
  }

  function renderSheet() {
    ensureEls();
    const open = waiting() && S.sheetOpen;
    sheetEl.classList.toggle('is-open', open);
    sheetEl.setAttribute('aria-hidden', String(!open));
    if (!open) { sheetEl.dataset.key = ''; return; }
    const t = T(); const e = S.entry;
    const key = `${e.position}|${e.etaMinutes}|${e.zoneId}|${S.busy}|${S.err}|${site.lang}`;
    if (sheetEl.dataset.key === key) return;
    sheetEl.dataset.key = key;
    const bars = [1, 2, 3].map((i) => {
      const cur = Math.min(Math.max(e.position, 1), 3);
      return `<span class="pn-bar${i === cur ? ' is-you' : (i < cur ? ' is-past' : '')}"></span>`;
    }).join('');
    sheetEl.innerHTML = `<span class="pn-grab" aria-hidden="true"></span>
      <div class="pn-sheet-box t-yellow">
        <span class="pn-kicker">${esc(t.kicker(zname(e.zoneId)))}</span>
        <div class="pn-wline"><span class="pn-wbig">#${Number(e.position) || 0}</span><span class="pn-wsub">${esc(t.inLine(e.etaMinutes))}</span></div>
        <div class="pn-bars" role="img" aria-label="${esc(t.position(Math.min(Math.max(e.position, 1), 3)))}">${bars}</div>
        <p class="pn-wtext">${esc(t.hold)}</p>
      </div>
      ${S.err ? `<p class="pn-warn" role="alert">${esc(S.err)}</p>` : ''}
      <div class="pn-wbtns">
        <button type="button" class="pn-ghost" id="pn-wleave" ${S.busy ? 'disabled' : ''}>${esc(S.busy === 'leave' ? t.leaving : t.leave)}</button>
        <button type="button" class="pn-cta" id="pn-wok">${esc(t.ok)}</button>
      </div>`;
    $('pn-wleave').addEventListener('click', leave);
    $('pn-wok').addEventListener('click', () => { S.sheetOpen = false; renderAll(); });
  }

  function openSheet() {
    if (!waiting()) return;
    S.sheetOpen = true; S.err = '';
    hooks.clearPick();
    renderAll();
    const first = sheetEl && sheetEl.querySelector('#pn-wok');
    if (first) { try { sheetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* fine */ } }
  }

  function leave() {
    if (S.busy) return;
    S.busy = 'leave'; S.err = '';
    renderAll();
    const joined = S.entry && S.entry.joinedAt;
    api.me.leaveWaitlist().then(() => {
      S.busy = ''; S.gone = joined; S.entry = null; S.sheetOpen = false; S.joinMsg = null;
      renderAll(); hooks.refresh(); hooks.repaint();
    }, (err) => {
      S.busy = '';
      if (signedOut(err)) return;
      S.err = errText(err);
      renderAll();
    });
  }

  /* ---------- offer screen ---------- */
  const secsLeft = () => (offered() ? Math.max(0, Math.ceil((Date.parse(S.entry.offer.expiresAt) - Date.now()) / 1000)) : 0);
  const mmss = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

  function renderOffer() {
    ensureEls();
    const open = offered() && !(hooks.doneOpen && hooks.doneOpen());
    offerEl.classList.toggle('is-open', open);
    offerEl.setAttribute('aria-hidden', String(!open));
    const dn = document.getElementById('pn-done');
    document.body.classList.toggle('pn-lock', open || !!(dn && dn.classList.contains('is-open')));
    if (!open) { clearInterval(clockTimer); openOfferKey = ''; return; }
    const t = T(); const o = S.entry.offer;
    const key = `${o.hostId}|${o.expiresAt}|${S.busy}|${S.err}|${site.lang}`;
    if (key === openOfferKey) return;
    const fresh = !openOfferKey || !openOfferKey.startsWith(`${o.hostId}|${o.expiresAt}`);
    openOfferKey = key;
    offerEl.innerHTML = `<div class="pn-done-in">
      <span class="pn-kicker pn-kicker-y">${esc(t.turn)}</span>
      <h2 class="pn-done-title">${esc(t.held(o.hostNumber))}</h2>
      <div class="pn-done-box t-yellow">
        <span class="pn-kicker">${esc(t.heldFor(zname(S.entry.zoneId)))}</span>
        <span class="pn-clock" id="pn-clock">${mmss(secsLeft())}</span>
        <p class="pn-wsub">${esc(t.offerNote)}</p>
      </div>
      ${S.err ? `<p class="pn-warn" role="alert">${esc(S.err)}</p>` : ''}
      <div class="pn-done-btns">
        <button type="button" class="pn-ghost" id="pn-letgo" ${S.busy ? 'disabled' : ''}>${esc(S.busy === 'let' ? t.leaving : t.letGo)}</button>
        <button type="button" class="pn-cta" id="pn-accept" ${S.busy ? 'disabled' : ''}>${esc(S.busy === 'accept' ? t.opening : t.openNow(o.hostNumber))}</button>
      </div></div>`;
    $('pn-letgo').addEventListener('click', letGo);
    $('pn-accept').addEventListener('click', accept);
    if (fresh) { const a = $('pn-accept'); if (a && !a.disabled) a.focus(); }
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      const c = $('pn-clock'); if (c) c.textContent = mmss(secsLeft());
      /* time is up: close it here, no need to wait for the network */
      if (offered() && secsLeft() <= 0 && S.busy !== 'accept') {
        clearInterval(clockTimer);
        S.gone = S.entry.joinedAt; S.entry = null; S.busy = '';
        showExpired();
      }
    }, 1000);
  }

  function letGo() {
    if (S.busy) return;
    S.busy = 'let'; S.err = '';
    renderAll();
    const joined = S.entry && S.entry.joinedAt;
    const close = (note) => {
      S.busy = ''; S.gone = joined; S.entry = null; S.sheetOpen = false; S.note = note || '';
      renderAll(); hooks.refresh(); hooks.repaint();
    };
    api.me.leaveWaitlist().then(() => close(''), (err) => { if (!signedOut(err)) close(T().letGoFail); });
  }

  function accept() {
    if (S.busy) return;
    S.busy = 'accept'; S.err = '';
    renderAll();
    const joined = S.entry && S.entry.joinedAt;
    const o = S.entry.offer; const ok = `${o.hostId}|${o.expiresAt}`;
    if (!S.acceptKey || S.acceptKey.k !== ok) S.acceptKey = { k: ok, key: uuid() };
    api.me.acceptOffer(S.acceptKey.key).then((sess) => {
      S.busy = ''; S.acceptKey = null; S.gone = joined; S.entry = null;
      renderAll();
      hooks.started(sess);
    }, (err) => {
      S.busy = '';
      if (err && err.code !== 'NETWORK') S.acceptKey = null;
      if (signedOut(err)) return;
      if (err && err.code === 'OFFER_EXPIRED') { S.gone = joined; S.entry = null; showExpired(); return; }
      S.err = errText(err);
      renderAll();
    });
  }

  function showExpired() {
    S.expired = true; S.sheetOpen = false;
    renderAll(); hooks.refresh(); hooks.repaint();
    try { window.scrollTo({ top: 0 }); } catch (e) { /* fine */ }
  }

  /* ---------- side menu item ---------- */
  function renderMenu() {
    const b = $('pn-menu-wait'), badge = $('pn-menu-badge');
    if (!b) return;
    b.disabled = !waiting();
    if (waiting()) { badge.hidden = false; badge.textContent = `#${Number(S.entry.position) || 0}`; } else badge.hidden = true;
  }

  function renderAll() {
    if (!ready) return;
    renderPill(); renderSheet(); renderOffer(); renderMenu();
  }

  /* ---------- live entry (survives reload: the first callback restores it) ---------- */
  function onEntry(e, err) {
    if (err) { /* keep the last state, say so quietly */
      if (signedOut(err)) return;
      S.stale = true; renderAll(); return;
    }
    S.stale = false;
    if (e && S.gone && e.joinedAt === S.gone) e = null; /* stale answer for an entry we already left or used */
    const prev = S.entry;
    if (S.busy === 'join') return;
    if (!e && prev && prev.status === 'offered' && !S.busy) { S.entry = null; S.gone = prev.joinedAt; showExpired(); return; }
    if (S.busy && !e) return;
    S.entry = e || null;
    if (!e) S.sheetOpen = false;
    if (e && e.status === 'offered' && (!prev || prev.status !== 'offered')) { S.sheetOpen = false; hooks.clearPick(); hooks.refresh(); }
    S.loaded = true;
    renderAll(); hooks.repaint();
  }

  function init(opts) {
    api = opts.api; site = opts.site; hooks = opts.hooks; onSignedOut = opts.signedOut;
    ready = true;
    ensureEls();
    try {
      const r = api.watchWaitlist(onEntry);
      unwatch = typeof r === 'function' ? r : null;
    } catch (e) { onEntry(null, e); }
    renderAll();
  }
  /* the member started a PC: the API drops the waiting entry, so re-read it */
  function refreshEntry() {
    if (!ready) return;
    api.me.waitlist().then((e) => {
      if (!e) { if (S.entry) S.gone = S.entry.joinedAt; S.entry = null; S.sheetOpen = false; } else S.entry = e;
      renderAll(); hooks.repaint();
    }, () => {});
  }
  function closeSheet() { if (ready && S.sheetOpen) { S.sheetOpen = false; renderAll(); } }
  const waitingZone = () => (waiting() ? S.entry.zoneId : null);
  const sync = () => { if (ready) renderAll(); };
  function rerender() { if (!ready) return; sheetEl.dataset.key = ''; openOfferKey = ''; $('waitpill').dataset.key = ''; renderAll(); hooks.repaint(); }

  window.PortalWait = { init, rerender, fillSlot, openSheet, refreshEntry, closeSheet, waitingZone, sync };
})();
