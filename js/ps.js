/* Clash Zayed PlayStation: the rooms page (zayed-ps.html), where every room is a full-height card whose photos
   you swipe, and the room page (zayed-ps-room.html?room=pool) with its photos, details and booking.
   Data: data/clash-zayed.md (WhatsApp catalogue, 2026-10-23). Booking goes to WhatsApp until Clash API is wired
   (GET /rooms). Runs after site.js. */
(() => {
  const WHATSAPP = '201099584833';

  /* side: the colour of the card's band. inside: what the photos show, nothing more. */
  const ROOMS = [
    {
      id: 'normal', name: 'Normal PS5 Room', short: 'Normal', side: 'blue', people: 6, price: 200, was: 250,
      photos: [['normal-ps5-room', 1200, 1600], ['normal-ps5-room-2', 1200, 1600]],
      about: {
        ar: 'أوضة مقفولة لشلة لحد 6 أفراد: PS5 قدام شاشة كبيرة، كنبة واسعة، ونور أحمر وأزرق.',
        en: 'A closed room for a crew of up to 6: a PS5 on a big screen, a wide sofa, and red and blue light.',
      },
      inside: [
        { ar: 'PS5 وشاشة كبيرة', en: 'A PS5 and a big screen' },
        { ar: 'كنبة واسعة', en: 'A wide sofa' },
        { ar: 'إضاءة حمرا وزرقا', en: 'Red and blue lighting' },
      ],
    },
    {
      id: 'vip', name: 'VIP PS5 Room', short: 'VIP', side: 'red', people: 10, price: 250, was: 300,
      photos: [['vip-ps5-room-2', 1200, 1600], ['vip-ps5-room', 1200, 1600]],
      about: {
        ar: 'أوسع من الـ Normal، لحد 10 أفراد: PS5 على شاشة متعلقة على الحيطة، وكنب كبير يكفي الشلة كلها.',
        en: 'Bigger than the Normal, for up to 10: a PS5 on a wall-mounted screen and a big sofa for the whole crew.',
      },
      inside: [
        { ar: 'PS5 وشاشة على الحيطة', en: 'A PS5 on a wall-mounted screen' },
        { ar: 'كنب كبير لـ 10 أفراد', en: 'Big sofas for 10' },
      ],
    },
    {
      id: 'pool', name: 'Pool Room', short: 'Pool', side: 'blue', people: 15, price: 400, was: 600,
      photos: [['pool-room-2', 1200, 2132], ['pool-room-3', 1200, 2134], ['pool-room', 1200, 2130]],
      about: {
        ar: 'أكبر أوضة عندنا، لحد 15 فرد: قعدة أرضية مبطّنة نازلة في الأرض زي حمام السباحة، قدام شاشة كبيرة وتحت سقف نجوم.',
        en: 'Our biggest room, for up to 15: padded seating sunk into the floor like a pool, facing a big screen under a starry ceiling.',
      },
      inside: [
        { ar: 'قعدة أرضية مبطّنة على شكل حمام سباحة', en: 'Padded seating sunk in like a pool' },
        { ar: 'شاشة كبيرة', en: 'A big screen' },
        { ar: 'سقف نجوم', en: 'A starry ceiling' },
      ],
    },
    {
      id: 'cinema', name: 'Cinema Room', short: 'Cinema', side: 'red', people: 12, price: 500, was: 700,
      photos: [['cinema-room-2', 1200, 2135], ['cinema-room', 1200, 2139], ['cinema-room-3', 1200, 2132]],
      about: {
        ar: 'سينما لشلتك، لحد 12 فرد: شاشة عرض كبيرة، كنب وكراسي مريحة، وسقف نجوم.',
        en: 'A cinema for your crew, up to 12: a big projection screen, sofas and soft chairs, and a starry ceiling.',
      },
      inside: [
        { ar: 'شاشة عرض كبيرة', en: 'A big projection screen' },
        { ar: 'كنب وكراسي مريحة', en: 'Sofas and soft chairs' },
        { ar: 'سقف نجوم', en: 'A starry ceiling' },
      ],
    },
  ];

  const EN = {
    skip: 'Skip to content', navLabel: 'Menu', navSections: 'Sections', navRooms: 'Rooms', navPc: 'PC rooms', navContact: 'Contact',
    changeBranch: 'Change branch', login: 'Log in', signup: 'Sign up', menu: 'Menu', whatsapp: 'WhatsApp',
    psSub: 'Zayed · Swipe through each room, tap it for details and booking.',
    back: 'All PlayStation rooms', others: 'The other rooms',
    footTitle: 'Come play today', footCta: 'Book on WhatsApp',
    branchZayed: 'Zayed branch', branchOctober: 'October branch', map: 'On the map', hours: 'Open 24 hours, every day', catalogue: 'Catalogue',
    rules: 'Rules & terms', privacy: 'Privacy',
  };

  const WORDS = {
    ar: {
      people: (n) => `لحد ${n} أفراد`,
      perHour: 'جنيه للساعة',
      was: (v) => `كان ${v}`,
      save: (v) => `وفّرت ${v} جنيه في الساعة`,
      enter: 'التفاصيل والحجز',
      photos: (name) => `صور ${name}`,
      photo: (i, n) => `صورة ${i} من ${n}`,
      prev: 'الصورة اللي قبلها', next: 'الصورة اللي بعدها',
      capacity: 'السعة', price: 'السعر', when: 'المواعيد', open: 'مفتوحة 24 ساعة، كل يوم',
      inside: 'في الأوضة',
      hoursLabel: 'كام ساعة؟', less: 'ساعة أقل', more: 'ساعة زيادة',
      hoursN: (h) => (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h <= 10 ? `${h} ساعات` : `${h} ساعة`),
      egp: (v) => `${v.toLocaleString('en')} جنيه`,
      total: (h, v) => `${WORDS.ar.hoursN(h)} = <b>${WORDS.ar.egp(v)}</b>`,
      book: 'احجز على واتساب',
      bookNote: 'هنأكدلك الميعاد على واتساب. الحجز من حسابك على الموقع جاي قريب.',
      bookText: (name, h) => `عايز أحجز ${name} لمدة ${WORDS.ar.hoursN(h)}`,
      title: (name) => `Clash Esports زايد | ${name} · بلايستيشن`,
    },
    en: {
      people: (n) => `Up to ${n} people`,
      perHour: 'EGP an hour',
      was: (v) => `was ${v}`,
      save: (v) => `You save ${v} EGP an hour`,
      enter: 'Details and booking',
      photos: (name) => `Photos of the ${name}`,
      photo: (i, n) => `Photo ${i} of ${n}`,
      prev: 'Previous photo', next: 'Next photo',
      capacity: 'Fits', price: 'Price', when: 'Hours', open: 'Open 24 hours, every day',
      inside: 'In the room',
      hoursLabel: 'How many hours?', less: 'One hour less', more: 'One hour more',
      hoursN: (h) => `${h} ${h === 1 ? 'hour' : 'hours'}`,
      egp: (v) => `${v.toLocaleString('en')} EGP`,
      total: (h, v) => `${WORDS.en.hoursN(h)} = <b>${WORDS.en.egp(v)}</b>`,
      book: 'Book on WhatsApp',
      bookNote: 'We confirm your time on WhatsApp. Booking from your account on the site is coming soon.',
      bookText: (name, h) => `I want to book the ${name} for ${WORDS.en.hoursN(h)}`,
      title: (name) => `Clash Esports Zayed | ${name} · PlayStation`,
    },
  };

  const W = () => WORDS[ClashSite.lang];
  const tr = (v) => ClashSite.tr(v);
  const roomUrl = (r) => `zayed-ps-room.html?room=${r.id}`;
  const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';

  /* ---------- the photo strip: swipe, arrows, the bars at the top, and (on the room page) thumbnails ---------- */
  function galleryHtml(r, { eager = false, thumbs = false } = {}) {
    const w = W();
    const n = r.photos.length;
    return `
      <div class="gal" data-gal>
        <ul class="gal-track" tabindex="0" aria-label="${w.photos(r.name)}">
          ${r.photos.map(([f, pw, ph], i) => `<li class="gal-slide"><img src="assets/clash-hd/${f}.jpg" width="${pw}" height="${ph}" alt="${w.photo(i + 1, n)} · ${r.name}"${eager && i === 0 ? '' : ' loading="lazy"'}></li>`).join('')}
        </ul>
        <p class="gal-bars" aria-hidden="true">${r.photos.map(() => '<span></span>').join('')}</p>
        <button class="gal-btn gal-prev" type="button" aria-label="${w.prev}">${arrow}</button>
        <button class="gal-btn gal-next" type="button" aria-label="${w.next}">${arrow}</button>
      </div>
      ${thumbs ? `<div class="gal-thumbs">${r.photos.map(([f], i) => `<button type="button" class="gal-thumb" data-to="${i}" aria-label="${w.photo(i + 1, n)}"><img src="assets/clash-hd/${f}.jpg" alt="" loading="lazy"></button>`).join('')}</div>` : ''}`;
  }

  function wireGallery(root, scope = root) {
    const track = root.querySelector('.gal-track');
    const slides = [...track.children];
    const bars = [...root.querySelectorAll('.gal-bars span')];
    const thumbs = [...scope.querySelectorAll('.gal-thumb')];
    let index = 0;
    const mark = () => {
      bars.forEach((b, i) => b.classList.toggle('is-on', i === index));
      thumbs.forEach((t, i) => t.setAttribute('aria-current', String(i === index)));
    };
    /* scrollBy with the distance between the slide and the strip works the same in both reading directions */
    const go = (i) => {
      index = (i + slides.length) % slides.length;
      const delta = slides[index].getBoundingClientRect().left - track.getBoundingClientRect().left;
      track.scrollBy({ left: delta, behavior: ClashSite.reduced ? 'auto' : 'smooth' });
      mark();
    };
    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const left = track.getBoundingClientRect().left;
        let best = 0;
        slides.forEach((s, i) => { if (Math.abs(s.getBoundingClientRect().left - left) < Math.abs(slides[best].getBoundingClientRect().left - left)) best = i; });
        if (best !== index) { index = best; mark(); }
      });
    }, { passive: true });
    root.querySelector('.gal-prev').addEventListener('click', (e) => { e.stopPropagation(); go(index - 1); });
    root.querySelector('.gal-next').addEventListener('click', (e) => { e.stopPropagation(); go(index + 1); });
    thumbs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    if (slides.length < 2) root.classList.add('is-single');
    mark();
  }

  /* ---------- the rooms page: four cards side by side ---------- */
  function renderList() {
    const list = document.getElementById('ps-rooms');
    const w = W();
    list.innerHTML = ROOMS.map((r) => `
      <article class="psr psr-${r.side}" data-room="${r.id}">
        ${galleryHtml(r, { eager: true })}
        <a class="psr-copy" href="${roomUrl(r)}">
          <span class="psr-name" dir="ltr">${r.short}</span>
          <span class="psr-line"><span dir="ltr">${r.name}</span> · ${w.people(r.people)}</span>
          <span class="psr-price"><b dir="ltr">${r.price}</b> ${w.perHour} <s>${w.was(r.was)}</s></span>
          <span class="psr-go">${w.enter}${arrow}</span>
        </a>
      </article>`).join('');
    list.querySelectorAll('.psr').forEach((card) => {
      const r = ROOMS.find((x) => x.id === card.dataset.room);
      wireGallery(card.querySelector('.gal'));
      const enter = (e) => ClashSite.walk(card, roomUrl(r), r.side, e);
      card.querySelector('.psr-copy').addEventListener('click', enter);
      /* a tap on a photo opens the room too; a swipe scrolls the photos and fires no click */
      card.querySelector('.gal-track').addEventListener('click', (e) => { if (e.target.closest('img')) { if (!enter(e)) location.href = roomUrl(r); } });
    });
  }

  /* ---------- the room page ---------- */
  function currentRoom() {
    const id = new URLSearchParams(location.search).get('room');
    return ROOMS.find((r) => r.id === id) || ROOMS[0];
  }

  let hours = 2;
  function renderRoom() {
    const r = currentRoom();
    const w = W();
    ClashSite.setTitles(WORDS.ar.title(r.name), WORDS.en.title(r.name));
    document.body.dataset.side = r.side;
    document.getElementById('room').innerHTML = `
      <div class="rp-media">${galleryHtml(r, { eager: true, thumbs: true })}</div>
      <div class="rp-info">
        <h1 class="rp-name" dir="ltr">${r.name.replace(' Room', '')}<span> Room</span></h1>
        <p class="rp-about">${tr(r.about)}</p>
        <p class="rp-price"><b class="num" dir="ltr">${r.price}</b> <span>${w.perHour}</span> <s>${w.was(r.was)}</s></p>
        <p class="rp-save">${w.save(r.was - r.price)}</p>
        <dl class="rp-facts">
          <div><dt>${w.capacity}</dt><dd>${w.people(r.people)}</dd></div>
          <div><dt>${w.when}</dt><dd>${w.open}</dd></div>
        </dl>
        <h2 class="rp-h">${w.inside}</h2>
        <ul class="rp-inside">${r.inside.map((x) => `<li>${tr(x)}</li>`).join('')}</ul>
        <div class="rp-book">
          <div class="rp-hours">
            <p class="rp-h" id="hours-label">${w.hoursLabel}</p>
            <div class="stepper" role="group" aria-labelledby="hours-label">
              <button type="button" class="step" id="less" aria-label="${w.less}">−</button>
              <output class="num" id="hours" aria-live="polite" dir="ltr">${hours}</output>
              <button type="button" class="step" id="more" aria-label="${w.more}">+</button>
            </div>
          </div>
          <p class="rp-total" id="total"></p>
          <a class="btn rp-cta" id="book" href="#" target="_blank" rel="noopener">${w.book}</a>
          <p class="rp-note">${w.bookNote}</p>
        </div>
      </div>`;
    const media = document.querySelector('.rp-media');
    wireGallery(media.querySelector('.gal'), media);
    const draw = () => {
      document.getElementById('hours').textContent = hours;
      document.getElementById('total').innerHTML = w.total(hours, hours * r.price);
      document.getElementById('book').href = wa(w.bookText(r.name, hours));
      document.getElementById('less').disabled = hours <= 1;
      document.getElementById('more').disabled = hours >= 12;
    };
    document.getElementById('less').addEventListener('click', () => { hours = Math.max(1, hours - 1); draw(); });
    document.getElementById('more').addEventListener('click', () => { hours = Math.min(12, hours + 1); draw(); });
    draw();

    /* the other three rooms, to move on without going back */
    document.getElementById('others').innerHTML = ROOMS.filter((x) => x !== r).map((x) => `
      <li class="other other-${x.side}">
        <a href="${roomUrl(x)}">
          <img src="assets/clash-hd/${x.photos[0][0]}.jpg" width="${x.photos[0][1]}" height="${x.photos[0][2]}" alt="" loading="lazy">
          <span class="other-copy"><span class="other-name" dir="ltr">${x.short}</span><span>${w.people(x.people)} · <b dir="ltr">${x.price}</b> ${w.perHour}</span></span>
        </a>
      </li>`).join('');
  }

  const page = document.body.dataset.page;
  const draw = page === 'ps-room' ? renderRoom : renderList;
  ClashSite.initLang({
    en: EN,
    titleEn: 'Clash Esports Zayed | PlayStation rooms, open 24 hours',
    onChange: draw,
  });
})();
