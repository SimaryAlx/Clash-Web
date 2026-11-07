/* Clash Esports member portal: History view.
   Four tabs (purchases, top-ups, sessions, points) read from ClashAPI.me.history(kind, cursor); each has loading / empty / error / data states
   and a "Load more" button while the API gives a nextCursor. portal.js shows and hides this view; words live in W below. */
(() => {
  let api, site, onSignedOut, zoneName, root, ready = false, active = false;

  const KINDS = ['purchases', 'deposits', 'sessions', 'points'];
  const TAB_KEY = { purchases: 'tPurchases', deposits: 'tDeposits', sessions: 'tSessions', points: 'tPoints' };

  const W = {
    en: {
      title: 'History', tabs: 'History sections',
      tPurchases: 'Purchases', tDeposits: 'Top-ups', tSessions: 'Sessions', tPoints: 'Points',
      empty: 'Nothing here yet', retry: 'Try again', more: 'Load more', loadingMore: 'Loading…',
      egp: 'EGP', pts: 'pts', qty: (n) => `x${n}`,
      topup: 'Top-up', withdraw: 'Withdrawal', via: (m) => `Top-up · ${m}`,
      pc: (n) => `PC ${n}`, pcUnknown: 'PC', playing: 'Playing now', hm: 'h:mm', untitled: 'Purchase',
      pointsPlus: 'Points earned', pointsMinus: 'Points used', unpaid: 'Unpaid',
      pointKinds: { 0: 'Earned', 1: 'Used', 2: 'Added by staff', 3: 'Removed by staff', 4: 'Expired' },
      down: "The service isn't available right now, try again in a bit.",
      network: "Can't reach the service. Check your connection and try again.",
      generic: 'Something went wrong. Try again.',
      rate: (n) => `Too many tries, wait ${n} seconds.`,
    },
    ar: {
      title: 'السجل', tabs: 'أقسام السجل',
      tPurchases: 'المشتريات', tDeposits: 'الشحن', tSessions: 'الجلسات', tPoints: 'النقاط',
      empty: 'مفيش حاجة هنا لسه', retry: 'جرّب تاني', more: 'اعرض أكتر', loadingMore: 'بنحمّل…',
      egp: 'جنيه', pts: 'نقطة', qty: (n) => `الكمية ${n}`,
      topup: 'شحن رصيد', withdraw: 'سحب', via: (m) => `شحن رصيد · ${m}`,
      pc: (n) => `PC ${n}`, pcUnknown: 'PC', playing: 'بتلعب دلوقتي', hm: '', untitled: 'شراء',
      pointsPlus: 'نقاط اتضافت', pointsMinus: 'نقاط اتخصمت', unpaid: 'لسه متدفعتش',
      pointKinds: { 0: 'اتكسبت', 1: 'اتصرفت', 2: 'ضافها الموظفين', 3: 'شالها الموظفين', 4: 'صلاحيتها خلصت' },
      down: 'الخدمة مش متاحة دلوقتي، جرّب تاني بعد شوية.',
      network: 'مش قادرين نوصل للخدمة. اتأكد من النت وجرّب تاني.',
      generic: 'حصلت مشكلة. جرّب تاني.',
      rate: (n) => `محاولات كتير، استنى ${window.PortalFmt.count(n, 'sec')}.`,
    },
  };
  const T = () => W[site.lang === 'ar' ? 'ar' : 'en'];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => (site.lang === 'ar' ? 'ar' : 'en');

  const S = { tab: 'purchases' };
  const fresh = () => ({ phase: 'idle', items: [], cursor: null, more: false, err: null, moreErr: null, tok: 0 });
  const D = {};
  KINDS.forEach((k) => { D[k] = fresh(); });

  function errText(e) {
    const t = T(); const c = e && e.code;
    if (c === 'RATE_LIMITED') return t.rate(Math.max(1, Math.ceil(Number(e.retryAfter) || 5)));
    if (c === 'GIZMO_DOWN') return t.down;
    if (c === 'NETWORK') return t.network;
    return t.generic;
  }

  /* ---------- formatting ---------- */
  /* English "7 Nov 2026, 22:05"; Arabic "7 نوفمبر 2026 · 10:05 م" (Western digits like the rest of the site) */
  const when = (iso) => window.PortalFmt.date(iso, lang());
  function money(n) {
    const v = Number(n) || 0;
    const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${v < 0 ? '−' : ''}${s}`;
  }

  /* ---------- rows ---------- */
  function row(tone, main, sub, side, opts) {
    const o = opts || {};
    return `<li class="pn-hrow t-${tone}${o.muted ? ' is-neg' : ''}">
      <div class="pn-hmain"><p class="pn-htext${o.clamp ? ' is-clamp' : ''}"${o.clamp ? ` title="${esc(o.clamp)}"` : ''}>${main}</p><p class="pn-hsub">${sub}</p></div>
      <div class="pn-hside">${side}</div></li>`;
  }
  /* the number keeps its own left-to-right order (minus sign first); in Arabic the unit sits to its left: "12.00 جنيه" */
  const amountHtml = (n, unit) => `<b dir="ltr">${esc(money(n))}</b><small>${esc(unit)}</small>`;

  function rowHtml(kind, it) {
    const t = T();
    if (kind === 'purchases') {
      const title = String(it.title == null ? '' : it.title) || t.untitled;
      const q = Number(it.quantity) > 1 ? ` · ${esc(t.qty(Number(it.quantity)))}` : '';
      /* amount = the money; paid = a flag (false: still open at the desk) */
      /* Arabic: no " · " before the flag, so a wrapped line never ends on a lone dot */
      const unpaid = it.paid === false ? `${lang() === 'ar' ? ' ' : ' · '}<span class="pn-hflag">${esc(t.unpaid)}</span>` : '';
      return row('red', esc(title), `${esc(when(it.at))}${q}${unpaid}`, amountHtml(it.amount, t.egp), { clamp: title });
    }
    if (kind === 'deposits') {
      const neg = Number(it.amount) < 0;
      const main = neg ? t.withdraw : (it.method ? t.via(it.method) : t.topup);
      return row('blue', esc(main), esc(when(it.at)), amountHtml(it.amount, t.egp), { muted: neg });
    }
    if (kind === 'sessions') {
      const z = it.zoneId != null ? zoneName(it.zoneId) : '';
      const pc = it.hostNumber != null ? t.pc(it.hostNumber) : t.pcUnknown;
      const main = `${esc(pc)}${z ? ` · ${esc(z)}` : ''}`;
      const sub = it.end ? esc(when(it.start)) : `${esc(when(it.start))} · <span class="pn-hlive">${esc(t.playing)}</span>`;
      /* English "2:30 h:mm"; Arabic "2 س 30 د" */
      return row('yellow', main, sub, `${window.PortalFmt.durHtml(it.minutes, lang(), 'b')}${t.hm ? `<small>${esc(t.hm)}</small>` : ''}`);
    }
    const n = Number(it.amount) || 0;
    /* kind '0'..'4' from the API; anything else: show it as is, or earned / used by the sign */
    const known = it.kind != null && Object.prototype.hasOwnProperty.call(t.pointKinds, String(it.kind)) ? t.pointKinds[String(it.kind)] : '';
    const label = known || (it.kind ? String(it.kind) : (n < 0 ? t.pointsMinus : t.pointsPlus));
    return row('both', esc(label), esc(when(it.at)),
      `<b dir="ltr">${esc((n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US'))}</b><small>${esc(t.pts)}</small>`, { muted: n < 0 });
  }

  /* ---------- states ---------- */
  function skeleton() {
    const one = '<li class="pn-hrow is-skel"><div class="pn-hmain"><span class="pn-skel line" style="display:block;width:11em;margin-bottom:8px"></span><span class="pn-skel line" style="display:block;width:7em"></span></div><div class="pn-hside"><span class="pn-skel line" style="display:block;width:4em"></span></div></li>';
    return `<ul class="pn-hlist" aria-hidden="true">${one.repeat(5)}</ul>`;
  }

  function bodyHtml(kind) {
    const t = T(); const d = D[kind];
    if (d.phase === 'idle' || (d.phase === 'loading' && !d.items.length)) return skeleton();
    if (d.phase === 'error') {
      return `<div class="pn-error" role="alert"><p>${esc(errText(d.err))}</p><button class="pn-retry" type="button" data-act="retry">${esc(t.retry)}</button></div>`;
    }
    if (!d.items.length) return `<p class="pn-hempty">${esc(t.empty)}</p>`;
    let html = `<ul class="pn-hlist">${d.items.map((it) => rowHtml(kind, it)).join('')}</ul>`;
    if (d.cursor) {
      html += `<div class="pn-hmorebox">${d.moreErr ? `<p class="pn-warn" role="alert">${esc(errText(d.moreErr))}</p>` : ''}
        <button class="pn-ghost pn-hmore" type="button" data-act="more" ${d.more ? 'disabled' : ''}>${esc(d.more ? t.loadingMore : t.more)}</button></div>`;
    }
    return html;
  }

  function render() {
    if (!ready) return;
    const t = T();
    const tabs = KINDS.map((k) => `<button type="button" class="pn-chip${k === S.tab ? ' is-on' : ''}" role="tab" id="pn-htab-${k}" aria-selected="${k === S.tab}" aria-controls="pn-hpanel" data-tab="${k}" tabindex="${k === S.tab ? 0 : -1}">${esc(t[TAB_KEY[k]])}</button>`).join('');
    const d = D[S.tab];
    root.innerHTML = `<h2 class="pn-htitle">${esc(t.title)}</h2>
      <div class="pn-chips pn-htabs" role="tablist" aria-label="${esc(t.tabs)}">${tabs}</div>
      <div id="pn-hpanel" class="pn-hpanel" role="tabpanel" aria-labelledby="pn-htab-${S.tab}" aria-busy="${d.phase === 'loading' && !d.items.length}">${bodyHtml(S.tab)}</div>`;
  }

  /* only the list part: keeps the tab buttons (and keyboard focus) as they are */
  function renderPanel() {
    const panel = root.querySelector('#pn-hpanel');
    if (!panel) { render(); return; }
    const d = D[S.tab];
    const ae = document.activeElement;
    const focusMore = !!(ae && ae.dataset && ae.dataset.act === 'more');
    panel.setAttribute('aria-busy', String(d.phase === 'loading' && !d.items.length));
    panel.innerHTML = bodyHtml(S.tab);
    if (focusMore) { const b = panel.querySelector('[data-act="more"]'); if (b) b.focus({ preventScroll: true }); }
  }

  /* ---------- loading ---------- */
  function fetchKind(kind, append) {
    const d = D[kind];
    const mine = ++d.tok;
    if (append) { d.more = true; d.moreErr = null; } else { d.phase = 'loading'; d.err = null; d.items = []; d.cursor = null; }
    if (kind === S.tab) renderPanel();
    api.me.history(kind, append ? d.cursor : undefined).then((res) => {
      if (mine !== d.tok) return;
      const items = (res && Array.isArray(res.items)) ? res.items : [];
      d.items = append ? d.items.concat(items) : items;
      d.cursor = (res && res.nextCursor) || null;
      d.phase = 'data'; d.more = false;
      if (kind === S.tab) renderPanel();
    }, (err) => {
      if (mine !== d.tok) return;
      if (err && err.code === 'NOT_SIGNED_IN') { if (onSignedOut) onSignedOut(); return; }
      d.more = false;
      if (append) d.moreErr = err; else { d.phase = 'error'; d.err = err; }
      if (kind === S.tab) renderPanel();
    });
  }

  function selectTab(k) {
    if (!KINDS.includes(k)) return;
    S.tab = k;
    render();
    const d = D[k];
    if (d.phase === 'idle' || d.phase === 'error') fetchKind(k, false);
  }

  function onClick(e) {
    const tab = e.target.closest('[data-tab]');
    if (tab) { selectTab(tab.dataset.tab); const b = root.querySelector(`#pn-htab-${S.tab}`); if (b) b.focus(); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const d = D[S.tab];
    if (act.dataset.act === 'retry') fetchKind(S.tab, false);
    else if (act.dataset.act === 'more' && !d.more && d.cursor) fetchKind(S.tab, true);
  }

  function onKey(e) {
    const tab = e.target.closest && e.target.closest('[data-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const rtl = document.documentElement.dir === 'rtl';
    const i = KINDS.indexOf(S.tab);
    let n = i;
    if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = KINDS.length - 1;
    else n = (i + (e.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1) + KINDS.length) % KINDS.length;
    e.preventDefault();
    selectTab(KINDS[n]);
    const b = root.querySelector(`#pn-htab-${S.tab}`); if (b) b.focus();
  }

  /* ---------- public ---------- */
  function init(opts) {
    api = opts.api; site = opts.site; onSignedOut = opts.signedOut;
    zoneName = (id) => { try { const n = opts.zoneName(id); return n && n !== String(id) ? n : ''; } catch (e) { return ''; } };
    root = document.getElementById('history');
    if (!root) return;
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    ready = true;
  }
  /* fresh data each time the view opens */
  function show() {
    if (!ready) return;
    active = true;
    KINDS.forEach((k) => { const tok = D[k].tok + 1; D[k] = fresh(); D[k].tok = tok; });
    S.tab = 'purchases';
    root.hidden = false;
    render();
    fetchKind(S.tab, false);
  }
  function hide() { if (!ready) return; active = false; root.hidden = true; }
  function rerender() { if (ready && active) render(); }

  window.PortalHistory = { init, show, hide, rerender, get active() { return active; } };
})();
