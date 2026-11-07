/* Clash Esports member portal: waiting list (T7).
   Join button in the zone box when a zone is full, waiting sheet, dashed pill above the chips, the "your turn" offer screen with a
   5-minute hold countdown, and the expiry note. Everything comes from window.ClashAPI (me.joinWaitlist, leaveWaitlist, acceptOffer,
   watchWaitlist). portal-map.js owns the zone box and the map; this file talks to it only through PortalMap.hooks. */
(() => {
  let api, site, hooks, onSignedOut, ready = false;
  const F = window.PortalFmt; /* js/portal-map.js: Arabic durations and counts */

  const W = {
    en: {
      join: 'Join the waiting list', joining: 'Joining…',
      already: (z) => `You are already waiting for ${z}. Leave that list first.`,
      notFull: 'A PC just freed up, open it now',
      pill: (n, z) => `Waiting list · #${n} for ${z}`, eta: (m) => `~${m} min`,
      kicker: (z) => `Waiting list · ${z}`, inLine: (m) => `in line · about ${m} min`,
      big: (n) => `#${n}`, badge: (n) => `#${n}`,
      hold: 'When a PC frees up we send you a notification and hold it for you for 5 minutes. Keep browsing; you stay in line.',
      leave: 'Leave the list', leaving: 'Leaving…', ok: 'OK', position: (n) => `Place ${n} of 3`,
      turn: 'Your turn', held: (n) => `PC ${n} is held for you`, heldFor: (z) => `${z} · held for`,
      offerNote: 'Open it before the time runs out, or it goes to the next person in line.',
      letGo: 'Let it go', openNow: (n) => `Open PC ${n} now`, opening: 'Opening…',
      expired: 'The 5 minutes ran out, the PC went to the next in line', dismiss: 'Close',
      menuWait: 'Waiting list',
      pushOn: "Notify me when it's my turn", pushBusy: 'Turning on…', pushIsOn: 'Notifications on', pushOff: 'Turn off',
      pushDenied: 'Notifications are blocked for this site. Allow them in your browser settings (the lock icon next to the address), then try again.',
      pushNone: "This browser can't send notifications. Keep this page open and we will alert you here.",
      pushIos: 'On iPhone: Share → Add to Home Screen, then open Clash from there to get notifications',
      pushFail: "Couldn't turn notifications on. Try again.",
      toastPos: (n) => `You moved up, now #${n} in line`, toastOffer: (n) => `PC ${n} is held for you, open it now`,
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
      join: 'ادخل قائمة الانتظار', joining: 'بنضيفك…',
      already: (z) => `إنت أصلًا في قائمة انتظار ${z}. اخرج منها الأول.`,
      notFull: 'فيه PC فضي حالًا، افتحه دلوقتي',
      pill: (n, z) => `قائمة الانتظار · رقم ${n} على ${z}`, eta: (m) => `حوالي ${F.dur(m, 'ar')}`,
      kicker: (z) => `قائمة الانتظار · ${z}`, inLine: (m) => `ده رقمك في القائمة · دورك بعد حوالي ${F.durText(m, 'ar')}`,
      big: (n) => String(n), badge: (n) => `رقم ${n}`,
      hold: 'أول ما PC يفضى هنبعتلك إشعار ونحجزهولك 5 دقايق. كمّل براحتك، مكانك في القائمة محفوظ.',
      leave: 'اخرج من القائمة', leaving: 'بنخرّجك…', ok: 'تمام', position: (n) => `مكانك ${n} من 3`,
      turn: 'جه دورك', held: (n) => `PC ${n} محجوز ليك`, heldFor: (z) => `${z} · باقي على الحجز`,
      offerNote: 'افتحه قبل ما الوقت يخلص، وإلا هيروح للي بعدك في القائمة.',
      letGo: 'سيبه', openNow: (n) => `افتح PC ${n} دلوقتي`, opening: 'بنفتحه…',
      expired: 'الـ 5 دقايق خلصوا، والـ PC راح للي بعدك في القائمة', dismiss: 'قفل',
      menuWait: 'قائمة الانتظار',
      pushOn: 'نبّهني لما ييجي دوري', pushBusy: 'بنشغّلها…', pushIsOn: 'الإشعارات شغالة', pushOff: 'اقفلها',
      pushDenied: 'الإشعارات مقفولة للموقع ده. افتحها من إعدادات المتصفح (علامة القفل جنب العنوان) وجرّب تاني.',
      pushNone: 'المتصفح ده مبيبعتش إشعارات. سيب الصفحة مفتوحة وهننبّهك هنا.',
      pushIos: 'على الآيفون: دوس Share وبعدين Add to Home Screen، وافتح Clash من الأيقونة دي عشان توصلك الإشعارات',
      pushFail: 'مقدرناش نشغّل الإشعارات. جرّب تاني.',
      toastPos: (n) => `اتقدّمت، بقيت رقم ${n} في القائمة`, toastOffer: (n) => `PC ${n} محجوز ليك، افتحه دلوقتي`,
      errors: {
        NO_TIME: 'مفيش عندك وقت في المنطقة دي. اشتري وقت الأول.',
        ALREADY_ACTIVE: 'إنت بتلعب دلوقتي على PC تاني، خلّص الجلسة دي الأول.',
        GIZMO_DOWN: 'سيستم الصالة مش بيرد دلوقتي، جرّب تاني بعد شوية.',
        NETWORK: 'مش قادرين نوصل للخدمة. اتأكد من النت وجرّب تاني.',
        NOT_FOUND: 'الحجز ده مبقاش موجود.',
        HOST_OUT: 'الـ PC ده عطلان، هنلاقيلك واحد تاني.',
        NOT_WIRED: 'الخدمة دي لسه مش متوصّلة.',
      },
      rate: (n) => `محاولات كتير، استنى ${F.count(n, 'sec')}.`,
      noRefresh: 'مقدرناش نحدّث القائمة', letGoFail: 'مقدرناش نوصل للخدمة، بس الحجز اتلغى.',
      generic: 'حصلت مشكلة. جرّب تاني.',
    },
  };
  const T = () => W[site.lang === 'ar' ? 'ar' : 'en'];

  const S = {
    entry: null, gone: null, sheetOpen: false, busy: '', err: '', joinMsg: null, expired: false, loaded: false, stale: false, note: '', joinKey: null, acceptKey: null,
  };
  let sheetEl, offerEl, clockTimer, unwatch, openOfferKey = '';

  /* ---------- Web Push (portal/sw.js) ---------- */
  const P = { state: 'off', busy: false, err: '' }; /* off | on | denied | none | ios */
  const MOCK_SUB = 'clash-push-mock-sub'; /* mock mode only: a stand-in when this browser has no push service (headless) */
  let swReg = null, interacted = false, audioCtx = null, toastEl, toastTimer;
  const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  const canPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const mockSub = () => { try { return JSON.parse(sessionStorage.getItem(MOCK_SUB)); } catch (e) { return null; } };
  const urlKey = (b64) => {
    const raw = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  };
  const fakeSub = () => {
    const r = (n) => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return { endpoint: `https://fcm.googleapis.com/fcm/send/mock-${r(12)}`, keys: { p256dh: r(65), auth: r(16) } };
  };
  function registerSw() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    /* relative path: works at / and under /Clash-Web/ (GitHub Pages) */
    return navigator.serviceWorker.register('sw.js').then((r) => { swReg = r; return navigator.serviceWorker.ready; }).then(() => swReg, () => null);
  }
  const getSub = () => (swReg ? swReg.pushManager.getSubscription().catch(() => null) : Promise.resolve(null));
  function refreshPush() {
    if (isIos() && !standalone()) { P.state = 'ios'; return Promise.resolve(); }
    if (!canPush()) { P.state = 'none'; return Promise.resolve(); }
    if (Notification.permission === 'denied') { P.state = 'denied'; return Promise.resolve(); }
    return getSub().then((sub) => { P.state = (sub || mockSub()) && Notification.permission === 'granted' ? 'on' : 'off'; });
  }
  /* once per page load: re-send an existing browser subscription so the server moves it to the signed-in member */
  let resubDone = false;
  function resubscribe() {
    if (resubDone || !canPush() || Notification.permission !== 'granted') return;
    resubDone = true;
    getSub().then((sub) => { if (sub) return api.me.pushSubscribe(sub.toJSON(), site.lang === 'ar' ? 'ar' : 'en'); }).catch(() => {});
  }
  function pushOn() {
    if (P.busy) return;
    P.busy = true; P.err = ''; renderAll();
    const done = (err) => { P.busy = false; P.err = err || ''; refreshPush().then(renderAll, renderAll); };
    Notification.requestPermission().then((perm) => {
      if (perm !== 'granted') return done();
      return Promise.all([registerSw(), api.push.key()]).then(([reg, key]) => {
        if (!reg) throw new Error('no sw');
        return getSub().then((existing) => existing
          || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlKey(key) }))
          .catch((e) => {
            if (api.mode !== 'mock') throw e;
            return null; /* no push service in this browser: the mock path goes on with a stand-in */
          });
      }).then((sub) => {
        let json;
        if (sub) json = sub.toJSON();
        else { json = fakeSub(); try { sessionStorage.setItem(MOCK_SUB, JSON.stringify(json)); } catch (e) { /* fine */ } }
        return api.me.pushSubscribe(json, site.lang === 'ar' ? 'ar' : 'en');
      }).then(() => done(), (e) => { if (!signedOut(e)) done(T().pushFail); else P.busy = false; });
    }, () => done(T().pushFail));
  }
  function pushOff() {
    if (P.busy) return;
    P.busy = true; P.err = ''; renderAll();
    pushCleanup().then(() => { P.busy = false; refreshPush().then(renderAll, renderAll); });
  }
  /* unsubscribe on the server (best effort) and in the browser; used by "turn off" and by logout */
  function pushCleanup() {
    const fake = mockSub();
    try { sessionStorage.removeItem(MOCK_SUB); } catch (e) { /* fine */ }
    return getSub().then((sub) => {
      const endpoint = sub ? sub.endpoint : (fake && fake.endpoint);
      if (!endpoint) return null;
      /* both at once: the browser is unsubscribed even if the server call hangs */
      const server = Promise.resolve().then(() => api.me.pushUnsubscribe(endpoint)).catch(() => {});
      const local = sub ? Promise.resolve().then(() => sub.unsubscribe()).catch(() => {}) : Promise.resolve();
      return Promise.all([server, local]);
    }).catch(() => {});
  }

  /* ---------- in-page toast + one soft sound (only while the page is visible and the member has touched it) ---------- */
  const markTouched = () => { interacted = true; };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, markTouched, { once: true, passive: true }));
  function chime() {
    if (!interacted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime;
      [[660, 0], [880, 0.14]].forEach(([f, d]) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.linearRampToValueAtTime(0.05, t0 + d + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.4);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t0 + d); o.stop(t0 + d + 0.45);
      });
    } catch (e) { /* no sound is fine */ }
  }
  function toast(text) {
    if (document.visibilityState !== 'visible') return; /* hidden: the system notification covers it */
    if (!toastEl) {
      toastEl = document.createElement('button');
      toastEl.type = 'button'; toastEl.className = 'pn-toast'; toastEl.setAttribute('role', 'status');
      toastEl.addEventListener('click', () => toastEl.classList.remove('is-on'));
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    void toastEl.offsetWidth;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 7000);
    chime();
  }
  function pushBlock(t) {
    if (P.state === 'ios') return `<p class="pn-wsub pn-push-note">${esc(t.pushIos)}</p>`;
    if (P.state === 'none') return `<p class="pn-wsub pn-push-note">${esc(t.pushNone)}</p>`;
    if (P.state === 'denied') return `<p class="pn-wsub pn-push-note">${esc(t.pushDenied)}</p>`;
    const err = P.err ? `<p class="pn-warn" role="alert">${esc(P.err)}</p>` : '';
    if (P.state === 'on') {
      return `<div class="pn-push-on"><span class="pn-push-state">${esc(t.pushIsOn)}</span><button type="button" class="pn-change" id="pn-pushoff" ${P.busy ? 'disabled' : ''}>${esc(t.pushOff)}</button></div>${err}`;
    }
    return `<button type="button" class="pn-ghost pn-push-btn" id="pn-pushon" ${P.busy ? 'disabled' : ''}>${esc(P.busy ? t.pushBusy : t.pushOn)}</button>${err}`;
  }

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
  /* the waiting sheet is opening: put the shop sheet away (one sheet at a time) */
  const closeShop = () => { try { if (window.PortalShop && window.PortalShop.isOpen) window.PortalShop.close(); } catch (e) { /* fine */ } };

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
    /* one key per attempt: kept after NETWORK / 5xx (ClashAPI.isFinal), new for another zone or after a final answer */
    if (!S.joinKey || S.joinKey.zone !== zoneId) S.joinKey = { zone: zoneId, key: uuid() };
    api.me.joinWaitlist(zoneId, S.joinKey.key).then((entry) => {
      S.busy = ''; S.joinKey = null;
      S.gone = null;
      S.entry = entry; S.sheetOpen = true;
      hooks.clearPick(); closeShop();
      if (entry.status === 'offered') hooks.refresh();
      renderAll(); hooks.repaint();
    }, (err) => {
      S.busy = '';
      const c = err && err.code;
      const t = T();
      if (api.isFinal(c)) S.joinKey = null;
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
    const key = `${e.position}|${e.etaMinutes}|${e.zoneId}|${S.busy}|${S.err}|${site.lang}|${P.state}|${P.busy}|${P.err}`;
    if (sheetEl.dataset.key === key) return;
    sheetEl.dataset.key = key;
    const bars = [1, 2, 3].map((i) => {
      const cur = Math.min(Math.max(e.position, 1), 3);
      return `<span class="pn-bar${i === cur ? ' is-you' : (i < cur ? ' is-past' : '')}"></span>`;
    }).join('');
    sheetEl.innerHTML = `<span class="pn-grab" aria-hidden="true"></span>
      <div class="pn-sheet-box t-yellow">
        <span class="pn-kicker">${esc(t.kicker(zname(e.zoneId)))}</span>
        <div class="pn-wline"><span class="pn-wbig">${esc(t.big(Number(e.position) || 0))}</span><span class="pn-wsub">${esc(t.inLine(e.etaMinutes))}</span></div>
        <div class="pn-bars" role="img" aria-label="${esc(t.position(Math.min(Math.max(e.position, 1), 3)))}">${bars}</div>
        <p class="pn-wtext">${esc(t.hold)}</p>
        ${pushBlock(t)}
      </div>
      ${S.err ? `<p class="pn-warn" role="alert">${esc(S.err)}</p>` : ''}
      <div class="pn-wbtns">
        <button type="button" class="pn-ghost" id="pn-wleave" ${S.busy ? 'disabled' : ''}>${esc(S.busy === 'leave' ? t.leaving : t.leave)}</button>
        <button type="button" class="pn-cta" id="pn-wok">${esc(t.ok)}</button>
      </div>`;
    $('pn-wleave').addEventListener('click', leave);
    const pon = $('pn-pushon'); if (pon) pon.addEventListener('click', pushOn);
    const pof = $('pn-pushoff'); if (pof) pof.addEventListener('click', pushOff);
    $('pn-wok').addEventListener('click', () => { S.sheetOpen = false; renderAll(); });
  }

  function openSheet() {
    if (!waiting()) return;
    S.sheetOpen = true; S.err = '';
    hooks.clearPick(); closeShop();
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
  /* English "04:59"; Arabic "4 د 05 ث" (HTML from PortalFmt, our own markup only) */
  const mmss = (n) => F.countdown(n, site.lang === 'ar' ? 'ar' : 'en');

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
        <span class="pn-clock" id="pn-clock"${site.lang === 'ar' ? ' dir="rtl"' : ''}>${mmss(secsLeft())}</span>
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
      const c = $('pn-clock'); if (c) c.innerHTML = mmss(secsLeft());
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
      if (err && api.isFinal(err.code)) S.acceptKey = null; /* NETWORK / 5xx keep the key for the retry */
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
    if (waiting()) { badge.hidden = false; badge.textContent = T().badge(Number(S.entry.position) || 0); } else badge.hidden = true;
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
    if (e && prev) {
      if (e.status === 'waiting' && prev.status === 'waiting' && e.position < prev.position) toast(T().toastPos(e.position));
      else if (e.status === 'offered' && prev.status !== 'offered') toast(T().toastOffer(e.offer.hostNumber));
    }
    if (e && e.status === 'offered' && (!prev || prev.status !== 'offered')) { S.sheetOpen = false; hooks.clearPick(); hooks.refresh(); }
    S.loaded = true;
    renderAll(); hooks.repaint();
  }

  function init(opts) {
    api = opts.api; site = opts.site; hooks = opts.hooks; onSignedOut = opts.signedOut;
    ready = true;
    ensureEls();
    registerSw().then((r) => { resubscribe(); return r; }).then(refreshPush).then(renderAll, () => {});
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

  window.PortalWait = { pushCleanup, init, rerender, fillSlot, openSheet, refreshEntry, closeSheet, waitingZone, sync };
})();
