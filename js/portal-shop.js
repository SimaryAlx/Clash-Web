/* Clash Esports member portal: "Buy time" sheet.
   Pick a time package for a zone (ClashAPI.shopTime), confirm, pay from the balance (ClashAPI.me.buyTime), see the new balance and time.
   Same sheet pattern as the open-a-PC sheet (bottom sheet on phones, under the zone box on desktop, inside #dock).
   Entry points: the menu item (portal.js calls PortalShop.open()), and the "Buy time" buttons portal-map.js draws in the zone box
   (a zone with no time) and in the open-a-PC sheet (no time / NO_TIME); they call PortalShop.open(zoneId).
   Pay: from the balance (me.buyTime) or by card (me.payCheckout, then the browser goes to the card page). The "Top up balance" sheet
   (PortalShop.openTopup) is the same sheet with amounts. When the portal loads with ?pay=<id> (back from the card page) a return sheet polls
   me.payStatus every 1.5 s (up to 60 s) and tells how it ended, then drops ?pay from the URL and refreshes the dashboard.
   One idempotency key per confirm attempt and per choice (balance / card / amount): kept after a lost connection or a 5xx, new after a final answer (ClashAPI.isFinal) or a changed choice. */
(() => {
  let api, site, getDash, zoneName, onDone, onSignedOut, ready = false;

  const W = {
    en: {
      kicker: 'Buy time', close: 'Close', timeHere: 'Time left here', balance: 'Balance', egp: 'EGP', hm: 'h:mm', zero: '0:00',
      loading: 'Loading time packages', empty: 'No time packages for this zone', retry: 'Try again', zonesLabel: 'Zone',
      pick: 'Pick a package', back: 'Back', pay: (p) => `Pay ${p} EGP`, paying: 'Paying…',
      ask: (p) => `Pay ${p} EGP from your balance?`, adds: (t) => `Adds ${t} to your time here`,
      doneKicker: 'Time added', doneTitle: 'You are set', newBalance: 'New balance', newTime: 'Time left here',
      more: 'Buy more', done: 'Done', buyTime: 'Buy time', packages: 'Time packages',
      hint: 'Top up by card or at the lounge desk',
      choose: 'How do you want to pay?', payBal: 'Pay from balance', payCard: 'Pay by card',
      balLow: 'Not enough balance for this', cardSub: 'You finish on a secure card page', topLink: 'Top up balance',
      redirecting: 'Taking you to the card page…',
      topKicker: 'Top up balance', amounts: 'Amount', other: 'Other amount', otherPh: '20 to 5000', topNote: 'Whole amounts from 20 to 5000 EGP.',
      topPay: (a) => (a ? `Top up ${a} EGP by card` : 'Top up by card'),
      rate: (n) => `Too many tries, wait ${n} seconds.`,
      errors: {
        BAD_AMOUNT: 'Enter a whole amount from 20 to 5000 EGP.',
        BAD_REQUEST: 'That payment could not be started. Check it and try again.',
        NO_BALANCE: 'Not enough balance for this.',
        GIZMO_DOWN: "The lounge system isn't answering right now, try again in a bit.",
        NETWORK: "Can't reach the service. Check your connection and try again.",
        NOT_FOUND: "That package isn't available any more. Pick another.",
        PRICE_CHANGED: 'The price changed. Check it and try again.',
        NOT_WIRED: "This isn't connected yet.",
      },
      generic: 'Something went wrong. Try again.',
    },
    ar: {
      kicker: 'اشتري وقت', close: 'قفل', timeHere: 'وقتك هنا', balance: 'الرصيد', egp: 'جنيه', hm: '', zero: 'مفيش وقت',
      loading: 'بنحمّل باقات الوقت', empty: 'مفيش باقات وقت للمنطقة دي', retry: 'جرّب تاني', zonesLabel: 'المنطقة',
      pick: 'اختار باقة', back: 'رجوع', pay: (p) => `ادفع ${p} جنيه`, paying: 'بندفع…',
      ask: (p) => `تدفع ${p} جنيه من رصيدك؟`, adds: (t) => `هيتضاف ${t} لوقتك هنا`,
      doneKicker: 'اتضاف الوقت', doneTitle: 'كله تمام', newBalance: 'رصيدك دلوقتي', newTime: 'وقتك هنا',
      more: 'اشتري كمان', done: 'تمام', buyTime: 'اشتري وقت', packages: 'باقات الوقت',
      hint: 'اشحن رصيدك بالكارت أو من الكاشير في الصالة',
      choose: 'عايز تدفع إزاي؟', payBal: 'ادفع من رصيدك', payCard: 'ادفع بالكارت',
      balLow: 'رصيدك مش كفاية', cardSub: 'هتكمّل على صفحة دفع آمنة', topLink: 'اشحن رصيدك',
      redirecting: 'بنوديك لصفحة الدفع…',
      topKicker: 'اشحن رصيدك', amounts: 'المبلغ', other: 'مبلغ تاني', otherPh: 'من 20 لـ 5000', topNote: 'أي مبلغ من 20 لـ 5000 جنيه، من غير كسور.',
      topPay: (a) => (a ? `اشحن ${a} جنيه بالكارت` : 'اشحن بالكارت'),
      rate: (n) => `محاولات كتير، استنى ${F.count(n, 'sec')}.`,
      errors: {
        BAD_AMOUNT: 'اكتب مبلغ من 20 لـ 5000 جنيه، من غير كسور.',
        BAD_REQUEST: 'مقدرناش نبدأ الدفع. راجع البيانات وجرّب تاني.',
        NO_BALANCE: 'رصيدك مش كفاية.',
        GIZMO_DOWN: 'سيستم الصالة مش بيرد دلوقتي، جرّب تاني بعد شوية.',
        NETWORK: 'مش قادرين نوصل للخدمة. اتأكد من النت وجرّب تاني.',
        NOT_FOUND: 'الباقة دي مبقتش متاحة. اختار باقة تانية.',
        PRICE_CHANGED: 'السعر اتغيّر. راجعه وجرّب تاني.',
        NOT_WIRED: 'الخدمة دي لسه مش متوصّلة.',
      },
      generic: 'حصلت مشكلة. جرّب تاني.',
    },
  };
  /* the return sheet (back from the card page) */
  const R_TXT = {
    en: {
      kicker: 'Card payment', close: 'Close', done: 'Done', buyTime: 'Buy time', ref: 'Reference',
      pending: ['Waiting for your payment', 'Keep this page open. This usually takes a few seconds.'],
      processing: ['Payment received', 'Adding it to your account…'],
      timeout: ['Still processing', "We'll update your balance as soon as it's done. Check History in a bit."],
      notfound: ["We can't find that payment", 'Check History to see if it went through.'],
      topup: ['Balance topped up', (a) => `${a} EGP added`, 'Your balance is updated.'],
      time: ['Time added', (n) => n, (a, t) => `Added ${t} to your time. Paid ${a} EGP by card.`],
      credited: ['Paid', 'Added to your balance', (a) => `We got your ${a} EGP and added it to your balance, but the time wasn't bought. Buy it from your balance.`],
      failed: ["Payment didn't go through", 'Nothing was charged', 'You can try again whenever you like.'],
      review: ['Paid, being checked', 'Staff will check it', 'We got your payment but could not confirm it yet. Staff will check it and fix it. Tell them this reference:'],
    },
    ar: {
      kicker: 'الدفع بالكارت', close: 'قفل', done: 'تمام', buyTime: 'اشتري وقت', ref: 'رقم العملية',
      pending: ['مستنيين الدفع', 'سيب الصفحة مفتوحة، غالبًا مش هياخد غير ثواني.'],
      processing: ['الدفع وصل', 'بنضيفه لحسابك…'],
      timeout: ['لسه شغالين عليه', 'هنحدّث رصيدك أول ما يخلص. بص على السجل بعد شوية.'],
      notfound: ['مش لاقيين الدفعة دي', 'بص على السجل تشوف لو اتمّت.'],
      topup: ['اتشحن الرصيد', (a) => `اتضاف ${a} جنيه`, 'رصيدك اتحدّث.'],
      time: ['اتضاف الوقت', (n) => n, (a, t) => `اتضاف ${t} لوقتك. دفعت ${a} جنيه بالكارت.`],
      credited: ['اتدفع', 'اتضاف لرصيدك', (a) => `وصلنا ${a} جنيه وضفناهم لرصيدك، بس الوقت متشتراش. اشتريه من رصيدك.`],
      failed: ['الدفع متمّش', 'متخصمش منك أي فلوس', 'تقدر تجرّب تاني في أي وقت.'],
      review: ['اتدفع وبيتراجع', 'الموظفين هيراجعوه', 'وصلتنا فلوسك بس لسه مقدرناش نأكد العملية. الموظفين هيراجعوها ويظبطوها. قولهم رقم العملية ده:'],
    },
  };
  /* before ClashSite.initLang has run, site.lang is only the Arabic default: read the saved choice (English first) */
  const savedLang = () => { try { return localStorage.getItem('clash-language') === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } };
  const lang = () => (site.langReady === false ? savedLang() : (site.lang === 'ar' ? 'ar' : 'en'));
  const T = () => W[lang()];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = window.PortalFmt; /* js/portal-map.js: English h:mm, Arabic "2 س 30 د" (values) and "ساعتين و30 دقيقة" (sentences) */
  const hm = (mins) => F.dur(mins, lang());
  const hmText = (mins) => F.durText(mins, lang());
  const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tr = (v) => (v && typeof v === 'object' ? (v[lang()] || v.en || '') : String(v == null ? '' : v));
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(16).slice(2)}`);
  const SIDES = ['red', 'blue', 'yellow', 'both'];

  /* open: sheet shown; phase: loading | error | empty | list | confirm | done; note: a message over the list (PRICE_CHANGED) */
  const S = {
    open: false, mode: 'buy', amt: null, custom: '', idemM: null, redirecting: false, phase: 'loading', zoneId: null, zoneIds: [], products: [], pick: null, idem: null,
    busy: false, err: null, note: null, bought: false, bal: null, mins: null, sides: {}, tok: 0, result: null,
  };
  let sheetEl;

  /* ---------- where the member is on the map (asked from portal-map.js) ---------- */
  const mapHook = (name) => { try { const h = window.PortalMap && window.PortalMap.hooks; return h && h[name] ? h[name]() : null; } catch (e) { return null; } };
  const placeZones = () => mapHook('placeZones') || [];
  const pickedZone = () => mapHook('pickedZone');
  const dash = () => (getDash && getDash()) || null;
  const dashMins = (zoneId) => { const d = dash(); const z = d && d.zones && d.zones.find((x) => x.zoneId === zoneId); return z ? z.usableMinutes : 0; };
  const minsNow = () => (S.mins != null && S.mins.zoneId === S.zoneId ? S.mins.value : dashMins(S.zoneId));
  const balNow = () => (S.bal != null ? S.bal : (dash() ? dash().balance : 0));
  const sideOf = (id) => (SIDES.includes(S.sides[id]) ? S.sides[id] : 'none');
  const zn = (id) => (zoneName ? zoneName(id) : String(id));

  /* ---------- errors ---------- */
  function errText(e) {
    const t = T(); const c = e && e.code;
    if (c === 'RATE_LIMITED') return t.rate(Math.max(1, Math.ceil(Number(e.retryAfter) || 5)));
    return t.errors[c] || t.generic;
  }

  /* ---------- open / close ---------- */
  function ensureEl() {
    if (sheetEl) return;
    sheetEl = document.createElement('div');
    sheetEl.className = 'pn-sheet pn-shop'; sheetEl.id = 'pn-shopsheet';
    sheetEl.setAttribute('role', 'dialog'); sheetEl.setAttribute('aria-modal', 'false');
    sheetEl.setAttribute('aria-hidden', 'true');
    (document.getElementById('dock') || document.body).appendChild(sheetEl);
    sheetEl.addEventListener('click', onSheetClick);
    sheetEl.addEventListener('input', onSheetInput);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.open && !S.busy) close(); });
  }

  function open(zoneId) {
    if (!ready || !dash()) return;
    ensureEl();
    const zones = placeZones();
    const z = zoneId || pickedZone() || zones[0] || 'normal';
    /* only one sheet at a time: put the others away first */
    try { if (window.PortalWait) window.PortalWait.closeSheet(); } catch (e) { /* fine */ }
    try { if (window.PortalMap) window.PortalMap.hooks.clearPick(); } catch (e) { /* fine */ }
    closePay();
    S.mode = 'buy'; S.idemM = null; S.redirecting = false;
    S.open = true; S.bought = false; S.bal = null; S.mins = null; S.pick = null; S.idem = null; S.busy = false; S.err = null; S.note = null; S.result = null;
    S.zoneIds = zones.includes(z) ? zones.slice() : [z];
    loadZone(z);
    api.zones('zayed').then((list) => { (list || []).forEach((x) => { S.sides[x.id] = x.side; }); if (S.open) render(); }, () => {});
    try { sheetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* fine */ }
  }

  /* the "Top up balance" sheet: amounts, then the card page */
  function openTopup() {
    if (!ready || !dash()) return;
    ensureEl();
    try { if (window.PortalWait) window.PortalWait.closeSheet(); } catch (e) { /* fine */ }
    try { if (window.PortalMap) window.PortalMap.hooks.clearPick(); } catch (e) { /* fine */ }
    closePay();
    S.tok++;
    S.mode = 'topup'; S.open = true; S.phase = 'topup'; S.bal = null; S.pick = null; S.idem = null; S.idemM = null; S.busy = false; S.redirecting = false;
    S.err = null; S.note = null; S.amt = null; S.custom = ''; S.bought = false;
    render();
    try { sheetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* fine */ }
  }
  const QUICK = [50, 100, 200, 500];
  /* the amount in the field: a number, or NaN when what was typed is not a whole amount 20 to 5000, or null when nothing yet */
  function topAmount() {
    if (String(S.custom).trim() === '') return null;
    const a = Number(S.custom);
    return Number.isInteger(a) && a >= 20 && a <= 5000 ? a : NaN;
  }

  /* note: an error to keep showing over the fresh list (PRICE_CHANGED) */
  function loadZone(zoneId, note) {
    const mine = ++S.tok;
    S.zoneId = zoneId; S.products = []; S.pick = null; S.idem = null; S.err = null; S.note = note || null; S.phase = 'loading';
    render();
    api.shopTime(zoneId).then((list) => {
      if (mine !== S.tok || !S.open) return;
      S.products = (Array.isArray(list) ? list : []).slice().sort((a, b) => a.price - b.price);
      S.phase = S.products.length ? 'list' : 'empty';
      render();
    }, (e) => {
      if (mine !== S.tok || !S.open) return;
      if (e && e.code === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
      S.phase = 'error'; S.err = e;
      render();
    });
  }

  /* not while a payment is on its way: the member must see how it ended */
  function close() {
    if (!S.open || S.busy) return;
    S.open = false; S.tok++;
    render();
    if (S.bought && onDone) onDone();
  }

  /* ---------- render ---------- */
  function headHtml(t) {
    if (S.mode === 'topup') {
      return `<span class="pn-grab" aria-hidden="true"></span>
      <div class="pn-sheet-box t-none">
        <div class="pn-sheet-top"><div><span class="pn-kicker">${esc(t.balance)}</span><span class="pn-sheet-pc pn-shop-zone">${esc(t.topKicker)}</span></div>
          <button type="button" class="pn-change" data-act="close" ${S.busy ? 'disabled' : ''}>${esc(t.close)}</button></div>
        <dl class="pn-done-grid">
          <div><dt>${esc(t.balance)}</dt><dd>${esc(money(balNow()))} <small>${esc(t.egp)}</small></dd></div>
        </dl>
      </div>`;
    }
    const zones = S.zoneIds.length > 1
      ? `<div class="pn-chips pn-shop-zones" role="group" aria-label="${esc(t.zonesLabel)}">${S.zoneIds.map((z) =>
        `<button type="button" class="pn-chip${z === S.zoneId ? ' is-on' : ''}" data-shopzone="${esc(z)}" aria-pressed="${z === S.zoneId}" ${S.busy ? 'disabled' : ''}><span>${esc(zn(z))}</span></button>`).join('')}</div>`
      : '';
    return `<span class="pn-grab" aria-hidden="true"></span>
      <div class="pn-sheet-box t-${sideOf(S.zoneId)}">
        <div class="pn-sheet-top"><div><span class="pn-kicker">${esc(t.kicker)}</span><span class="pn-sheet-pc pn-shop-zone">${esc(zn(S.zoneId))}</span></div>
          <button type="button" class="pn-change" data-act="close" ${S.busy ? 'disabled' : ''}>${esc(t.close)}</button></div>
        <dl class="pn-done-grid">
          <div><dt>${esc(t.timeHere)}</dt><dd>${esc(minsNow() > 0 ? hm(minsNow()) : t.zero)}</dd></div>
          <div><dt>${esc(t.balance)}</dt><dd>${esc(money(balNow()))} <small>${esc(t.egp)}</small></dd></div>
        </dl>
      </div>${zones}`;
  }

  /* "Prices in EGP" + accepted cards + refund policy link, shown by the pay buttons */
  const payNote = () => `<p class="pn-paynote"><span>${lang() === "ar" ? "الأسعار بالجنيه المصري" : "Prices in EGP"}</span><span class="pn-badge" dir="ltr">Visa</span><span class="pn-badge pn-badge-mc" dir="ltr"><i></i><i></i><span>Mastercard</span></span><span class="pn-badge" dir="ltr">Meeza</span><a href="../refund.html">${lang() === "ar" ? "سياسة الاسترجاع" : "Refund policy"}</a></p>`;

  function topHtml(t) {
    const a = topAmount();
    const label = S.redirecting ? t.redirecting : t.topPay(typeof a === 'number' && !Number.isNaN(a) ? String(a) : '');
    const err = S.err ? errText(S.err) : '';
    return `<p class="pn-kicker">${esc(t.amounts)}</p>
      <div class="pn-chips pn-top-amts" role="group" aria-label="${esc(t.amounts)}">${QUICK.map((q) =>
        `<button type="button" class="pn-chip${S.amt === q ? ' is-on' : ''}" data-amt="${q}" aria-pressed="${S.amt === q}" ${S.busy ? 'disabled' : ''}><span dir="ltr">${q}</span></button>`).join('')}</div>
      <label class="pn-top-custom"><span class="pn-kicker">${esc(t.other)}</span>
        <span class="pn-top-field"><input id="pn-topin" type="number" inputmode="numeric" min="20" max="5000" step="1" dir="ltr" placeholder="${esc(t.otherPh)}" value="${esc(S.custom)}" ${S.busy ? 'disabled' : ''}><small>${esc(t.egp)}</small></span></label>
      <p class="pn-wtext pn-shop-empty">${esc(t.topNote)}</p>
      <p class="pn-warn" id="pn-toperr" role="alert" ${err ? '' : 'hidden'}>${esc(err)}</p>
      ${payNote()}
      <div class="pn-wbtns"><button type="button" class="pn-cta" id="pn-toppay" data-act="toppay" ${S.busy || a == null ? 'disabled' : ''}>${esc(label)}</button></div>`;
  }

  function bodyHtml(t) {
    if (S.phase === 'topup') return topHtml(t);
    if (S.phase === 'loading') {
      return `<div class="pn-shop-list" aria-busy="true" aria-label="${esc(t.loading)}">${[0, 1, 2].map(() => '<div class="pn-skel pn-prod-skel"></div>').join('')}</div>`;
    }
    if (S.phase === 'error') {
      return `<p class="pn-warn" role="alert">${esc(errText(S.err))}</p>
        <button type="button" class="pn-ghost" data-act="retry">${esc(t.retry)}</button>`;
    }
    const note = S.note ? `<p class="pn-warn" role="alert">${esc(errText(S.note))}</p>` : '';
    if (S.phase === 'empty') return `${note}<p class="pn-wtext pn-shop-empty">${esc(t.empty)}</p>`;
    if (S.phase === 'list') {
      return `${note}<p class="pn-kicker">${esc(t.packages)}</p><div class="pn-shop-list">${S.products.map((p) =>
        `<button type="button" class="pn-prod" data-prod="${esc(p.id)}"><span class="pn-prod-main"><b>${esc(tr(p.name))}</b><small>${esc(hm(p.minutes))}</small></span>
          <span class="pn-prod-price"><b>${esc(money(p.price))}</b><small>${esc(t.egp)}</small></span></button>`).join('')}</div>`;
    }
    if (S.phase === 'confirm') {
      const p = S.pick;
      const noBal = S.err && S.err.code === 'NO_BALANCE';
      const low = balNow() < p.price;
      const cardBusy = S.busy && String(S.idemM).startsWith('card');
      const balBusy = S.busy && String(S.idemM).startsWith('bal');
      return `<div class="pn-shop-sum t-${sideOf(S.zoneId)}"><span class="pn-prod-main"><b>${esc(tr(p.name))}</b><small>${esc(t.adds(hmText(p.minutes)))}</small></span>
          <span class="pn-prod-price"><b>${esc(money(p.price))}</b><small>${esc(t.egp)}</small></span></div>
        <p class="pn-wtext">${esc(t.choose)}</p>
        <div class="pn-shop-list">
          <button type="button" class="pn-prod pn-method" data-act="paybal" ${S.busy || low ? 'disabled' : ''}><span class="pn-prod-main"><b>${esc(balBusy ? t.paying : t.payBal)}</b><small>${esc(low ? t.balLow : t.balance)}</small></span>
            <span class="pn-prod-price"><b>${esc(money(balNow()))}</b><small>${esc(t.egp)}</small></span></button>
          <button type="button" class="pn-prod pn-method" data-act="paycard" ${S.busy ? 'disabled' : ''}><span class="pn-prod-main"><b>${esc(S.redirecting ? t.redirecting : cardBusy ? t.paying : t.payCard)}</b><small>${esc(t.cardSub)}</small></span>
            <span class="pn-prod-price"><b>${esc(money(p.price))}</b><small>${esc(t.egp)}</small></span></button>
        </div>
        ${S.err ? `<p class="pn-warn" role="alert">${esc(errText(S.err))}${noBal ? `<br><span class="pn-shop-hint">${esc(t.hint)}</span>` : ''}</p>` : ''}
        ${low || noBal ? `<button type="button" class="pn-ghost" data-act="topup" ${S.busy ? 'disabled' : ''}>${esc(t.topLink)}</button>` : ''}
        ${payNote()}
        <div class="pn-wbtns">
          <button type="button" class="pn-ghost" data-act="back" ${S.busy ? 'disabled' : ''}>${esc(t.back)}</button>
        </div>`;
    }
    /* done */
    return `<div class="pn-shop-sum is-ok t-${sideOf(S.zoneId)}"><span class="pn-prod-main"><span class="pn-kicker pn-kicker-y">${esc(t.doneKicker)}</span><b>${esc(tr(S.pick.name))}</b></span></div>
      <div class="pn-wbtns">
        <button type="button" class="pn-ghost" data-act="more">${esc(t.more)}</button>
        <button type="button" class="pn-cta" data-act="done">${esc(t.done)}</button>
      </div>`;
  }

  function render() {
    if (!sheetEl) return;
    const open = S.open;
    sheetEl.classList.toggle('is-open', open);
    sheetEl.setAttribute('aria-hidden', String(!open));
    if (!open) return;
    const t = T();
    ['red', 'blue', 'yellow', 'both', 'none'].forEach((c) => sheetEl.classList.toggle('t-' + c, c === sideOf(S.zoneId)));
    sheetEl.innerHTML = headHtml(t) + bodyHtml(t);
    if (S.phase === 'confirm') { const b = sheetEl.querySelector('[data-act="paybal"]:not(:disabled), [data-act="paycard"]:not(:disabled)'); if (b && !S.busy) { try { b.focus({ preventScroll: true }); } catch (e) { /* fine */ } } }
  }

  /* ---------- actions ---------- */
  function onSheetClick(e) {
    const z = e.target.closest('[data-shopzone]');
    if (z && !S.busy) { if (z.dataset.shopzone !== S.zoneId) loadZone(z.dataset.shopzone); return; }
    const amt = e.target.closest('[data-amt]');
    if (amt && !S.busy) {
      S.amt = Number(amt.dataset.amt); S.custom = String(S.amt); S.err = null;
      const inp = sheetEl.querySelector('#pn-topin'); if (inp) inp.value = S.custom; /* the field is the one source of the amount */
      updateTop();
      return;
    }
    const prod = e.target.closest('[data-prod]');
    if (prod && !S.busy) {
      S.pick = S.products.find((p) => p.id === prod.dataset.prod) || null;
      if (!S.pick) return;
      S.idem = null; S.idemM = null; S.err = null; S.note = null; S.phase = 'confirm';
      render();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act || act.disabled) return;
    const a = act.dataset.act;
    if (a === 'close' || a === 'done') close();
    else if (a === 'retry') loadZone(S.zoneId);
    else if (a === 'back' && !S.busy) { S.pick = null; S.idem = null; S.idemM = null; S.err = null; S.phase = 'list'; render(); }
    else if (a === 'more') { S.pick = null; S.idem = null; S.idemM = null; S.err = null; S.phase = 'list'; render(); }
    else if (a === 'paybal') pay('bal');
    else if (a === 'paycard') pay('card');
    else if (a === 'topup') openTopup();
    else if (a === 'toppay') topPay();
  }

  /* typing in the custom amount: no redraw (keeps focus), just the chips, the button and the message */
  function onSheetInput(e) {
    if (!e.target || e.target.id !== 'pn-topin') return;
    S.custom = e.target.value; S.amt = null; S.err = null;
    updateTop();
  }
  function updateTop() {
    if (!sheetEl || S.phase !== 'topup') return;
    const t = T(); const a = topAmount();
    sheetEl.querySelectorAll('[data-amt]').forEach((b) => { const on = S.amt === Number(b.dataset.amt); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    const btn = sheetEl.querySelector('#pn-toppay');
    if (btn) { btn.textContent = t.topPay(typeof a === 'number' && !Number.isNaN(a) ? String(a) : ''); btn.disabled = S.busy || a == null; }
    const er = sheetEl.querySelector('#pn-toperr'); if (er) { er.hidden = true; er.textContent = ''; }
  }

  /* card checkout: the key follows the choice (what is bought / which amount), so a retry after a lost connection is the same payment */
  function checkout(body, choice, fromTop) {
    if (S.busy) return;
    if (S.idemM !== choice || !S.idem) { S.idem = uuid(); S.idemM = choice; }
    const key = S.idem;
    S.busy = true; S.err = null;
    render();
    api.me.payCheckout(body, key).then((r) => {
      if (!r || !r.redirectUrl) { S.busy = false; S.idem = null; S.err = {}; render(); return; }
      S.redirecting = true; S.idem = null; S.idemM = null;
      render();
      try { window.location.assign(r.redirectUrl); } catch (e) { S.busy = false; S.redirecting = false; S.err = { code: 'NETWORK' }; render(); }
    }, (e) => {
      S.busy = false;
      const c = e && e.code;
      if (c === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
      if (api.isFinal(c)) S.idem = null;
      if (!S.open) return;
      if (!fromTop && c === 'PRICE_CHANGED') { loadZone(S.zoneId, e); return; }
      S.err = e || {};
      render();
    });
  }
  function topPay() {
    const a = topAmount();
    if (a == null) return;
    if (Number.isNaN(a)) { S.err = { code: 'BAD_AMOUNT' }; render(); const inp = sheetEl.querySelector('#pn-topin'); if (inp) { try { inp.focus({ preventScroll: true }); } catch (x) { /* fine */ } } return; }
    checkout({ kind: 'topup', amount: a }, `top:${a}`, true);
  }

  function pay(method) {
    if (S.busy || !S.pick) return;
    if (method === 'card') {
      checkout({ kind: 'time', productId: S.pick.id, zoneId: S.zoneId, price: S.pick.price }, `card:${S.pick.id}:${S.zoneId}:${S.pick.price}`, false);
      return;
    }
    const choice = `bal:${S.pick.id}:${S.zoneId}:${S.pick.price}`;
    if (S.idemM !== choice || !S.idem) { S.idem = uuid(); S.idemM = choice; }
    const pick = S.pick, key = S.idem, zoneId = S.zoneId;
    S.busy = true; S.err = null;
    render();
    api.me.buyTime(pick.id, zoneId, pick.price, key).then((r) => {
      S.busy = false;
      if (S.pick === pick) { S.idem = null; S.idemM = null; } /* done: a later buy is a new attempt */
      if (!S.open) { if (onDone) onDone(); return; }
      S.bought = true;
      if (r && typeof r.balance === 'number') S.bal = r.balance;
      if (r && typeof r.usableMinutes === 'number') S.mins = { zoneId, value: r.usableMinutes };
      S.phase = 'done';
      render();
    }, (e) => {
      S.busy = false;
      const c = e && e.code;
      if (c === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
      /* a final answer: the next try is a new attempt. A lost connection or a 5xx keeps the key, so the server can finish the first one. */
      if (api.isFinal(c) && S.pick === pick) S.idem = null;
      if (!S.open) return;
      /* the price moved: show the fresh list with the message, the member picks again */
      if (c === 'PRICE_CHANGED') { loadZone(zoneId, e); return; }
      S.err = e || {};
      render();
    });
  }

  /* ---------- return sheet: back from the card page with ?pay=<id> ---------- */
  const POLL_MS = 1500, POLL_MAX = 60000;
  const FINAL_STATES = ['done', 'credited', 'failed', 'review'];
  const P = { open: false, id: null, phase: 'pending', data: null, started: 0, timer: null, tok: 0 };
  let payEl;
  const refOf = (id) => String(id || '').replace(/^pi_/, '').slice(0, 8).toUpperCase();
  const payParam = () => { try { return new URLSearchParams(window.location.search).get('pay'); } catch (e) { return null; } };
  function stripPayParam() {
    try {
      const u = new URL(window.location.href);
      if (!u.searchParams.has('pay')) return;
      u.searchParams.delete('pay');
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
    } catch (e) { /* fine */ }
  }
  function ensurePayEl() {
    if (payEl) return;
    payEl = document.createElement('div');
    payEl.className = 'pn-sheet pn-shop pn-pay'; payEl.id = 'pn-paysheet';
    payEl.setAttribute('role', 'dialog'); payEl.setAttribute('aria-modal', 'false'); payEl.setAttribute('aria-live', 'polite');
    payEl.setAttribute('aria-hidden', 'true');
    (document.getElementById('dock') || document.body).appendChild(payEl);
    payEl.addEventListener('click', (e) => {
      const a = e.target.closest('[data-pact]');
      if (!a) return;
      if (a.dataset.pact === 'buy') { const z = P.data && P.data.zoneId; closePay(); open(z || undefined); } else closePay();
    });
  }
  function payView() {
    const r = R_TXT[lang()], d = P.data || {}, a = (Number(d.amount) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    let tone = 'none', kicker = r.kicker, title = '', sub = '', extra = '', buy = false;
    if (P.phase === 'pending' || P.phase === 'processing' || P.phase === 'timeout' || P.phase === 'notfound') {
      [title, sub] = r[P.phase];
      tone = P.phase === 'notfound' ? 'red' : 'blue';
    } else if (d.state === 'done') {
      if (d.kind === 'time') { const x = r.time; kicker = x[0]; title = x[1](tr(d.product && d.product.name)); sub = x[2](a, hmText(d.product && d.product.minutes)); }
      else { const x = r.topup; kicker = x[0]; title = x[1](a); sub = x[2]; }
      tone = 'yellow';
    } else if (d.state === 'credited') {
      const x = r.credited; kicker = x[0]; title = x[1]; sub = x[2](a); tone = 'blue'; buy = true;
    } else if (d.state === 'failed') {
      const x = r.failed; kicker = x[0]; title = x[1]; sub = x[2]; tone = 'red';
    } else {
      const x = r.review; kicker = x[0]; title = x[1]; sub = x[2]; tone = 'blue';
      extra = `<p class="pn-pay-ref"><span class="pn-kicker">${esc(r.ref)}</span><b>${esc(refOf(d.intentId || P.id))}</b></p>`;
    }
    return { r, tone, kicker, title, sub, extra, buy, waiting: P.phase === 'pending' || P.phase === 'processing' };
  }
  function renderPay() {
    if (!payEl) return;
    payEl.classList.toggle('is-open', P.open);
    payEl.setAttribute('aria-hidden', String(!P.open));
    if (!P.open) return;
    const v = payView();
    ['red', 'blue', 'yellow', 'both', 'none'].forEach((c) => payEl.classList.toggle('t-' + c, c === v.tone));
    payEl.innerHTML = `<span class="pn-grab" aria-hidden="true"></span>
      <div class="pn-sheet-box t-${v.tone}">
        <div class="pn-sheet-top"><div><span class="pn-kicker${v.waiting ? '' : ' pn-kicker-y'}">${esc(v.kicker)}</span><span class="pn-sheet-pc pn-shop-zone">${esc(v.title)}</span></div>
          <button type="button" class="pn-change" data-pact="close">${esc(v.r.close)}</button></div>
        <p class="pn-wtext pn-pay-sub">${esc(v.sub)}</p>${v.extra}
        ${v.waiting ? '<span class="pn-pay-bar" aria-hidden="true"></span>' : ''}
      </div>
      <div class="pn-wbtns">
        ${v.buy ? `<button type="button" class="pn-ghost" data-pact="buy">${esc(v.r.buyTime)}</button>` : ''}
        <button type="button" class="pn-cta" data-pact="done">${esc(v.r.done)}</button>
      </div>`;
  }
  function closePay() {
    if (!P.open) return;
    P.open = false; P.tok++;
    clearTimeout(P.timer);
    stripPayParam();
    renderPay();
    if (onDone) onDone();
  }
  function endPay(phase, data) {
    P.phase = phase; if (data) P.data = data;
    stripPayParam();
    renderPay();
    if (onDone) onDone();
    const b = payEl && payEl.querySelector('[data-pact="done"]');
    if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* fine */ } }
  }
  function pollPay(mine) {
    if (mine !== P.tok || !P.open) return;
    api.me.payStatus(P.id).then((r) => {
      if (mine !== P.tok || !P.open) return;
      if (r && FINAL_STATES.includes(r.state)) { endPay(r.state, r); return; }
      const ph = r && r.state === 'processing' ? 'processing' : 'pending';
      if (ph !== P.phase) { P.phase = ph; renderPay(); }
      next(mine);
    }, (e) => {
      if (mine !== P.tok || !P.open) return;
      const c = e && e.code;
      if (c === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
      if (c === 'NOT_FOUND') { endPay('notfound'); return; }
      next(mine); /* a lost connection or a 5xx: keep asking until the time is up */
    });
  }
  function next(mine) {
    if (Date.now() - P.started >= POLL_MAX) { endPay('timeout'); return; }
    P.timer = setTimeout(() => pollPay(mine), POLL_MS);
  }
  function showReturn(id) {
    ensurePayEl();
    try { if (window.PortalWait) window.PortalWait.closeSheet(); } catch (e) { /* fine */ }
    P.open = true; P.id = id; P.phase = 'pending'; P.data = null; P.started = Date.now(); P.tok++;
    renderPay();
    pollPay(P.tok);
  }

  /* ---------- public ---------- */
  function init(opts) {
    api = opts.api; site = opts.site; getDash = opts.getDash; zoneName = opts.zoneName;
    onDone = opts.onDone; onSignedOut = opts.signedOut;
    ready = true;
    ensureEl();
    /* back from the browser's forward/back cache: the redirect did not happen or was undone */
    window.addEventListener('pageshow', (e) => { if (e.persisted && S.redirecting) { S.busy = false; S.redirecting = false; render(); } });
    const id = payParam();
    if (id && /^[\w-]{3,64}$/.test(id)) showReturn(id); else if (id) stripPayParam();
  }
  /* language switch: redraw the sheet in the other words (portal-map.js redraws its own buttons) */
  function rerender() { if (ready) { render(); renderPay(); } }
  /* the dashboard changed: fresh time and balance in the sheet head (not mid-confirm, so focus stays put) */
  function sync() {
    if (!ready || !S.open || S.busy) return;
    if (S.phase === 'topup') { const d = sheetEl.querySelector('.pn-done-grid dd'); if (d) d.innerHTML = `${esc(money(balNow()))} <small>${esc(T().egp)}</small>`; } else if (S.phase !== 'confirm') render();
  }

  /* ready: the map shows its "Buy time" buttons only then; label: the button word in the current language */
  window.PortalShop = {
    init, open, openTopup, close, rerender, sync,
    get isOpen() { return S.open; }, get ready() { return ready; }, get label() { return ready ? T().buyTime : W.en.buyTime; },
  };
})();
