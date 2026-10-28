/* Clash Zayed PlayStation: the booking request on a room's page. The visitor picks the lounge day, the hour they
   start, and a room of this kind (a numbered one, or any that is free), leaves a name and a mobile, and the request
   lands in the staff panel; staff call back to confirm the room and how long. Needs booking-store.js and site.js. */
window.ClashBooking = (() => {
  const T = window.ClashTime;
  const S = window.ClashStore;

  const WORDS = {
    ar: {
      title: 'احجز الأوضة', day: 'اليوم', hour: 'هتيجي الساعة كام؟', after: 'بعد نص الليل', room: 'أنهي أوضة؟',
      any: 'أي أوضة فاضية', busy: 'محجوزة', none: 'كل الأوض من النوع ده محجوزة في الساعة دي. جرّب ساعة تانية.',
      name: 'الاسم', phone: 'الموبايل', phoneHint: 'هنكلمك على الرقم ده عشان نأكد الحجز.',
      pick: 'اختار الساعة الأول.', send: 'ابعت طلب الحجز', sending: 'بنبعت…',
      note: 'الحجز بيتأكد لما نكلمك: بنتفق على الأوضة والمدة.', wa: 'أو احجز على واتساب',
      today: 'النهارده', tomorrow: 'بكرة', loading: 'بنشوف الأوض الفاضية…', loadErr: 'معرفناش نجيب الأوض الفاضية. الطلب لسه ينفع يتبعت، وهنأكد لك بالتليفون.',
      done: (ref) => `وصلنا طلبك${ref ? ` رقم ${ref}` : ''}`, doneLine: (phone) => `هنكلمك قريب على ${phone} عشان نأكد الأوضة والمدة.`,
      again: 'احجز تاني', demo: 'وضع تجريبي: الطلب بيتحفظ في المتصفح ده بس.',
      errors: {
        bad_phone: 'اكتب رقم موبايل مصري، 11 رقم يبدأ بـ 01.', bad_name: 'اكتب اسمك.', bad_time: 'الساعة دي عدت أو قريبة قوي. اختار ساعة تانية.',
        too_many: 'عندك 3 طلبات لسه مستنية. هنكلمك عليهم الأول.', room_busy: 'الأوضة دي اتحجزت في الساعة دي. اختار أوضة تانية أو "أي أوضة فاضية".',
        bad_room: 'الأوضة دي مش متاحة دلوقتي.', network: 'النت فصل. جرّب تاني.', unknown: 'حصلت مشكلة. جرّب تاني أو احجز على واتساب.',
      },
      summary: (room, day, hour) => `${room} · ${day} · ${hour}`,
    },
    en: {
      title: 'Book this room', day: 'Day', hour: 'What time will you come?', after: 'After midnight', room: 'Which room?',
      any: 'Any free room', busy: 'booked', none: 'Every room of this kind is booked at that hour. Try another hour.',
      name: 'Name', phone: 'Mobile', phoneHint: 'We call this number to confirm the booking.',
      pick: 'Pick a time first.', send: 'Send booking request', sending: 'Sending…',
      note: 'The booking is confirmed when we call you: we agree the room and how long.', wa: 'Or book on WhatsApp',
      today: 'Today', tomorrow: 'Tomorrow', loading: 'Checking which rooms are free…', loadErr: 'We could not check which rooms are free. You can still send the request and we will confirm by phone.',
      done: (ref) => `We have your request${ref ? ` #${ref}` : ''}`, doneLine: (phone) => `We will call you soon on ${phone} to confirm the room and how long.`,
      again: 'Book again', demo: 'Demo mode: the request is kept in this browser only.',
      errors: {
        bad_phone: 'Enter an Egyptian mobile: 11 digits starting with 01.', bad_name: 'Enter your name.', bad_time: 'That hour has passed or is too close. Pick another.',
        too_many: 'You have 3 requests still waiting. We will call you about those first.', room_busy: 'That room was just booked at that hour. Pick another room or "Any free room".',
        bad_room: 'That room is not available right now.', network: 'The connection dropped. Try again.', unknown: 'Something went wrong. Try again or book on WhatsApp.',
      },
      summary: (room, day, hour) => `${room} · ${day} · ${hour}`,
    },
  };

  const lang = () => ClashSite.lang;
  const W = () => WORDS[lang()];
  const hourLabel = (h) => {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return lang() === 'ar' ? `${h12} ${h < 12 ? 'ص' : 'م'}` : `${h12} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const dayLabel = (key) => {
    const today = T.loungeDay();
    if (key === today) return W().today;
    if (key === T.addDays(today, 1)) return W().tomorrow;
    const [y, m, d] = T.split(key);
    return new Intl.DateTimeFormat(lang() === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  };
  const prettyPhone = (p) => `${p.slice(0, 3)} ${p.slice(3, 7)} ${p.slice(7)}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* el: the box to fill. room: { id: 'vip', name: 'VIP PS5 Room' }. waHref: the WhatsApp fallback link. */
  function mount(el, room, waHref) {
    const st = {
      day: T.loungeDay(), hour: null, unit: 'any', units: [], busy: {}, busyFailed: false,
      name: '', phone: '', sending: false, error: null, done: null,
    };
    try { const saved = JSON.parse(localStorage.getItem('clash-customer') || 'null'); if (saved) { st.name = saved.name || ''; st.phone = saved.phone || ''; } } catch (e) { /* storage unavailable */ }

    /* the rooms of this kind that are in service */
    const loadUnits = S.rooms().then((rows) => { st.units = rows.filter((r) => r.type === room.id && r.in_service); }).catch(() => { st.units = []; });

    /* which rooms are taken over the chosen lounge day (and a little past its end) */
    async function loadBusy(day) {
      if (st.busy[day]) return;
      try {
        st.busy[day] = await S.busy(T.dayStart(day), new Date(+T.dayEnd(day) + 3 * 3600000));
        st.busyFailed = false;
      } catch (e) { st.busy[day] = []; st.busyFailed = true; }
    }
    /* a room is taken at an hour when something holds it in the hour after it */
    const taken = (unitId, at) => (st.busy[st.day] || []).some((r) => r.room_id === unitId && Date.parse(r.starts_at) < +at + 3600000 && Date.parse(r.ends_at) > +at);
    const freeUnits = (at) => st.units.filter((u) => !taken(u.id, at));
    const tooSoon = (at) => +at < Date.now() + 30 * 60000;

    function render() {
      const w = W();
      if (st.done) {
        el.innerHTML = `
          <h2 class="rp-h">${esc(w.done(st.done.ref))}</h2>
          <p class="bk-done-line">${esc(w.summary(st.done.room, dayLabel(st.done.day), hourLabel(st.done.hour)))}</p>
          <p class="rp-note">${esc(w.doneLine(prettyPhone(st.done.phone)))}</p>
          ${S.live ? '' : `<p class="rp-note">${esc(w.demo)}</p>`}
          <button type="button" class="btn btn-ink" data-act="again">${esc(w.again)}</button>`;
        el.querySelector('[data-act="again"]').addEventListener('click', () => { st.done = null; st.hour = null; st.busy = {}; loadBusy(st.day).then(render); render(); });
        return;
      }
      const days = Array.from({ length: 14 }, (_, i) => T.addDays(T.loungeDay(), i));
      const loaded = Boolean(st.busy[st.day]);
      const hourBtn = (h) => {
        const at = T.slot(st.day, h);
        const off = tooSoon(at) || (loaded && st.units.length && !freeUnits(at).length);
        return `<button type="button" class="bk-chip" data-hour="${h}" aria-pressed="${st.hour === h}"${off ? ' disabled' : ''}>${hourLabel(h)}</button>`;
      };
      const at = st.hour === null ? null : T.slot(st.day, st.hour);
      const showUnits = st.units.length > 1;
      const unitBtn = (u) => {
        const busy = at && taken(u.id, at);
        return `<button type="button" class="bk-chip" data-unit="${u.id}" aria-pressed="${st.unit === u.id}"${busy ? ` disabled aria-label="${esc(u.name)} · ${esc(w.busy)}"` : ''}><span dir="ltr">${esc(u.name)}</span>${busy ? ` <small>${esc(w.busy)}</small>` : ''}</button>`;
      };
      const unitName = st.unit === 'any' ? room.name : (st.units.find((u) => u.id === st.unit) || {}).name || room.name;
      el.innerHTML = `
        <h2 class="rp-h">${esc(w.title)}</h2>
        <form class="bk" novalidate>
          <div class="bk-group" role="group" aria-labelledby="bk-day">
            <p class="bk-label" id="bk-day">${esc(w.day)}</p>
            <div class="bk-days">${days.map((d) => `<button type="button" class="bk-chip" data-day="${d}" aria-pressed="${st.day === d}">${esc(dayLabel(d))}</button>`).join('')}</div>
          </div>
          <div class="bk-group" role="group" aria-labelledby="bk-hour">
            <p class="bk-label" id="bk-hour">${esc(w.hour)}</p>
            ${loaded ? '' : `<p class="bk-wait">${esc(w.loading)}</p>`}
            <div class="bk-hours">${T.HOURS.filter((h) => h >= T.DAY_START).map(hourBtn).join('')}</div>
            <p class="bk-sub">${esc(w.after)}</p>
            <div class="bk-hours">${T.HOURS.filter((h) => h < T.DAY_START).map(hourBtn).join('')}</div>
            ${st.busyFailed ? `<p class="bk-msg">${esc(w.loadErr)}</p>` : ''}
          </div>
          ${showUnits ? `
          <div class="bk-group" role="group" aria-labelledby="bk-room">
            <p class="bk-label" id="bk-room">${esc(w.room)}</p>
            <div class="bk-units">
              <button type="button" class="bk-chip" data-unit="any" aria-pressed="${st.unit === 'any'}">${esc(w.any)}</button>
              ${st.units.map(unitBtn).join('')}
            </div>
            ${at && !freeUnits(at).length ? `<p class="bk-msg">${esc(w.none)}</p>` : ''}
          </div>` : ''}
          <div class="bk-fields">
            <label class="bk-field"><span>${esc(w.name)}</span><input name="name" autocomplete="name" maxlength="60" value="${esc(st.name)}" required></label>
            <label class="bk-field"><span>${esc(w.phone)}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" maxlength="16" placeholder="01x xxxx xxxx" value="${esc(st.phone)}" required></label>
          </div>
          <p class="bk-summary" aria-live="polite">${at ? esc(w.summary(unitName, dayLabel(st.day), hourLabel(st.hour))) : esc(w.pick)}</p>
          ${st.error ? `<p class="bk-msg" role="alert">${esc(w.errors[st.error] || w.errors.unknown)}</p>` : ''}
          <button class="btn rp-cta" type="submit"${st.sending ? ' disabled' : ''}>${esc(st.sending ? w.sending : w.send)}</button>
          <p class="rp-note">${esc(w.note)} ${S.live ? '' : esc(w.demo)}</p>
          <a class="link-quiet bk-wa" href="${waHref}" target="_blank" rel="noopener">${esc(w.wa)}</a>
        </form>`;

      el.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', async () => {
        st.day = b.dataset.day; st.hour = null; st.error = null; render();
        await loadBusy(st.day); render();
      }));
      el.querySelectorAll('[data-hour]').forEach((b) => b.addEventListener('click', () => {
        st.hour = +b.dataset.hour; st.error = null;
        if (st.unit !== 'any' && taken(st.unit, T.slot(st.day, st.hour))) st.unit = 'any';
        render();
      }));
      el.querySelectorAll('[data-unit]').forEach((b) => b.addEventListener('click', () => { st.unit = b.dataset.unit; st.error = null; render(); }));
      const form = el.querySelector('form');
      const nameIn = form.querySelector('[name="name"]');
      const phoneIn = form.querySelector('[name="phone"]');
      nameIn.addEventListener('input', () => { st.name = nameIn.value; });
      phoneIn.addEventListener('input', () => { st.phone = phoneIn.value; });
      form.addEventListener('submit', submit);
      /* keep the chosen day in view in its scrolling row */
      const chosen = el.querySelector('.bk-days [aria-pressed="true"]');
      if (chosen) chosen.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    async function submit(e) {
      e.preventDefault();
      if (st.sending) return;
      if (st.hour === null) { st.error = 'bad_time'; render(); return; }
      if (st.name.trim().length < 2) { st.error = 'bad_name'; render(); return; }
      const phone = S.cleanPhone(st.phone);
      if (!phone) { st.error = 'bad_phone'; render(); return; }
      st.sending = true; st.error = null; render();
      try {
        const res = await S.requestBooking({ room_type: room.id, room_id: st.unit === 'any' ? null : st.unit, starts_at: T.slot(st.day, st.hour), name: st.name.trim(), phone });
        try { localStorage.setItem('clash-customer', JSON.stringify({ name: st.name.trim(), phone })); } catch (err) { /* storage unavailable */ }
        const chosen = st.units.find((u) => u.id === st.unit);
        st.done = { ref: res.ref, day: st.day, hour: st.hour, phone, room: chosen ? chosen.name : room.name };
      } catch (err) {
        st.error = err.code || 'unknown';
        if (st.error === 'room_busy') { st.busy = {}; await loadBusy(st.day); }
      }
      st.sending = false;
      render();
    }

    render();
    Promise.all([loadUnits, loadBusy(st.day)]).then(render);
    return { render };
  }

  return { mount };
})();
