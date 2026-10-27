/* Clash Esports rooms: the list pages, where every room is a full-height card whose photos you swipe
   (zayed-pc.html, zayed-ps.html, october.html), and the room pages with photos, details and booking
   (zayed-pc-room.html?room=vip, zayed-ps-room.html?room=pool, october-pc-room.html?room=team).
   Which rooms: <body data-branch> (zayed | october) and <body data-kind> (pc | ps); which page: <body data-page> (list | room).
   Data: data/clash-zayed.md (WhatsApp catalogue and Gizmo, 2026-10-23), data/clash-october.md (catalogue, 2026-10-24).
   Booking goes to WhatsApp until Clash API is wired (GET /zones, GET /rooms). Runs after site.js. */
(() => {
  const BRANCHES = {
    zayed: { whatsapp: '201099584833', photos: 'clash-hd' },
    october: { whatsapp: '201080972959', photos: 'october-hd' },
  };

  const MAGNETIC = { ar: 'كيبورد مغناطيسي', en: 'Magnetic keyboard' };
  const MOUSE_8K = { ar: 'ماوس جيمنج 8K', en: '8K gaming mouse' };

  /* side: the team colour (red, blue, both, yellow, or null for the stream rooms).
     PC rooms: pack is the 10-hour price; age21 marks rooms where some PCs are for 21 and over (Gizmo's "+21" groups).
     PlayStation rooms: people is how many the room fits; inside is what the photos show, nothing more. */
  const ROOMS = {
    'zayed-pc': [
      {
        id: 'normal', name: 'Normal', side: 'blue', price: 30, was: 40, pack: 240, age21: true,
        photos: [['normal-room-2', 1600, 2133], ['normal-room-3', 960, 1280], ['normal-room-4', 1600, 2133], ['normal-room', 1600, 2133]],
        about: {
          ar: 'الأوضة الزرقا وأرخص ساعة في زايد: شاشات 165Hz وكروت RTX 3060 Ti، وصفوف أجهزة تحت نور أزرق.',
          en: 'The blue room and the cheapest hour in Zayed: 165Hz screens, RTX 3060 Ti cards, and rows of PCs under blue light.',
        },
        spec: { screen: '165Hz', gpu: 'RTX 3060 Ti', cpu: 'Intel Core i5 14th Gen', mouse: 'Razer DeathAdder', keyboard: 'Redragon K552', headset: 'Techno Zone K41' },
      },
      {
        id: 'vip', name: 'VIP', side: 'red', price: 40, was: 50, pack: 340, age21: true,
        photos: [['vip-room-2', 960, 1280], ['vip-room-3', 1600, 2133], ['vip-room-4', 1600, 2133], ['vip-room', 1600, 2133]],
        about: {
          ar: 'الأوضة الحمرا: شاشات 240Hz وكروت RTX 3080، وحيطان حمرا بتنوّر ورا الأجهزة.',
          en: 'The red room: 240Hz screens, RTX 3080 cards, and red walls lit up behind the PCs.',
        },
        spec: { screen: '240Hz', gpu: 'RTX 3080', cpu: 'Intel Core i5 14th Gen', mouse: 'Razer DeathAdder', keyboard: 'Redragon K552', headset: 'Techno Zone K41' },
      },
      {
        id: 'team', name: 'Team Room', side: 'both', price: 60, was: 70, pack: 550,
        photos: [['team-room-3', 1600, 2844], ['team-room-2', 900, 1600], ['team-room-5', 900, 1600], ['team-room-6', 900, 1600], ['team-room-4', 900, 1600], ['team-room', 1600, 2844]],
        about: {
          ar: 'أوضة للتيم كله، الأحمر والأزرق مع بعض: شاشات Alienware 360Hz وكروت RTX 3090.',
          en: 'A room for the whole team, red and blue together: Alienware 360Hz screens and RTX 3090 cards.',
        },
        spec: { screen: 'Alienware 360Hz', gpu: 'RTX 3090', cpu: 'Intel Core i7 14th Gen', mouse: MOUSE_8K, keyboard: MAGNETIC, headset: 'HyperX Cloud II' },
      },
      {
        id: 'cave', name: 'Cave Room', side: 'red', price: 60, was: 70, pack: null,
        photos: [['cave-room-3', 1600, 2133], ['cave-room', 2000, 2667], ['cave-room-2', 1600, 2133]],
        about: {
          ar: 'زي الكهف: حيطان صخر منوّرة أحمر، شاشات 380Hz وكروت RTX 5060.',
          en: 'Like a cave: rock walls lit red, 380Hz screens and RTX 5060 cards.',
        },
        spec: { screen: '380Hz', gpu: 'RTX 5060', cpu: 'AMD Ryzen 5 7500X3D', mouse: 'ATK F1 Ultimate', keyboard: MAGNETIC, headset: 'Razer Kraken V3' },
      },
      {
        id: 'elite', name: 'Elite Room', side: 'yellow', price: 70, was: 80, pack: 650,
        photos: [['elite-room', 1600, 2133], ['elite-room-2', 1600, 2133], ['elite-room-3', 1600, 2133]],
        about: {
          ar: 'الأوضة الصفرا: شاشات ASUS ROG 360Hz، معالجات Ryzen 7 9800X3D وكروت RTX 5060 Ti.',
          en: 'The yellow room: ASUS ROG 360Hz screens, Ryzen 7 9800X3D processors and RTX 5060 Ti cards.',
        },
        spec: { screen: 'ASUS ROG 360Hz', gpu: 'RTX 5060 Ti', cpu: 'AMD Ryzen 7 9800X3D', mouse: MOUSE_8K, keyboard: MAGNETIC, headset: 'HyperX Cloud III' },
      },
      {
        id: 'stream', name: 'Stream Room', side: null, price: 100, was: 115, pack: 900,
        photos: [['stream-room', 1600, 2133], ['stream-room-2', 1200, 1600], ['stream-room-3', 1200, 1600], ['stream-room-4', 900, 1600]],
        about: {
          ar: 'أوضة للستريم في حيطان مبطّنة: مايك HyperX QuadCast 2، كاميرا Logitech MX Brio 4K، وشاشة ASUS ROG 360Hz.',
          en: 'A room to stream from, with padded walls: a HyperX QuadCast 2 mic, a Logitech MX Brio 4K camera and an ASUS ROG 360Hz screen.',
        },
        spec: {
          screen: 'ASUS ROG 360Hz', gpu: 'RTX 5070', cpu: 'AMD Ryzen 7 9800X3D', mouse: 'Logitech Superlight 2 (8K)', keyboard: MAGNETIC, headset: 'Logitech G522',
          extra: { ar: 'مايك HyperX QuadCast 2 · كاميرا Logitech MX Brio 4K', en: 'HyperX QuadCast 2 mic · Logitech MX Brio 4K camera' },
        },
      },
      {
        id: 'duo', name: 'Duo Stream Room', side: null, price: 100, was: 120, pack: 900,
        photos: [['duo-stream-room-2', 1600, 2133], ['duo-stream-room', 960, 1280], ['duo-stream-room-3', 960, 1280]],
        about: {
          ar: 'أوضة ستريم لاتنين: أسرع شاشة عندنا 520Hz، كروت RTX 5070 وكاميرا Logitech MX Brio 4K.',
          en: 'A stream room for two: our fastest screen at 520Hz, RTX 5070 cards and a Logitech MX Brio 4K camera.',
        },
        spec: {
          screen: '520Hz', gpu: 'RTX 5070', cpu: 'AMD Ryzen 7 9800X3D', keyboard: MAGNETIC,
          extra: { ar: 'كاميرا Logitech MX Brio 4K', en: 'Logitech MX Brio 4K camera' },
        },
      },
    ],

    'zayed-ps': [
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
    ],

    /* October: five PC rooms, no 10-hour packs in its catalogue yet */
    'october-pc': [
      {
        id: 'normal', name: 'Normal', side: 'blue', price: 25, was: 35, pack: null,
        photos: [['normal-room', 1600, 2133], ['normal-room-2', 1600, 2133], ['normal-room-3', 1600, 2133]],
        about: {
          ar: 'الأوضة الزرقا وأرخص ساعة في أكتوبر: شاشات 165Hz وكروت RX 6600 / RTX 3060 Ti.',
          en: 'The blue room and the cheapest hour in October: 165Hz screens and RX 6600 / RTX 3060 Ti cards.',
        },
        spec: { screen: '165Hz', gpu: 'RX 6600 / RTX 3060 Ti', cpu: 'Intel Core i5 12400F', mouse: 'Redragon M609', keyboard: 'Redragon K552' },
      },
      {
        id: 'vip', name: 'VIP', side: 'red', price: 35, was: 45, pack: null,
        photos: [['vip-room-2', 1600, 2133], ['vip-room', 1600, 2133], ['vip-room-3', 1600, 2133]],
        about: {
          ar: 'الأوضة الحمرا: شاشات 240Hz وكروت RTX 4060 Ti.',
          en: 'The red room: 240Hz screens and RTX 4060 Ti cards.',
        },
        spec: { screen: '240Hz', gpu: 'RTX 4060 Ti', cpu: 'Intel Core i5 12400F', mouse: 'Logitech G102', keyboard: 'Redragon K552' },
      },
      {
        id: 'team', name: 'Team Room', side: 'both', price: 50, was: 60, pack: null,
        photos: [['team-room', 1600, 2133], ['team-room-2', 1600, 2133], ['team-room-3', 1600, 2133], ['team-room-4', 1600, 2133]],
        about: {
          ar: 'الأحمر والأزرق في أوضة واحدة: شاشات 380Hz وكروت RTX 5060.',
          en: 'Red and blue in one room: 380Hz screens and RTX 5060 cards.',
        },
        spec: { screen: '380Hz', gpu: 'RTX 5060', cpu: 'AMD Ryzen 5 7500X3D', mouse: 'MAD R 8K', keyboard: 'ATTACK SHARK X68 HE' },
      },
      {
        id: 'elite', name: 'Elite Room', side: 'yellow', price: 70, was: 80, pack: null,
        photos: [['elite-room', 1600, 2133], ['elite-room-2', 1600, 2133], ['elite-room-3', 1600, 2133]],
        about: {
          ar: 'الأوضة الصفرا: شاشات 380Hz، معالجات Ryzen 5 7500X3D وكيبورد Razer 8K.',
          en: 'The yellow room: 380Hz screens, Ryzen 5 7500X3D processors and a Razer 8K keyboard.',
        },
        spec: { screen: '380Hz', gpu: 'RTX 5060', cpu: 'AMD Ryzen 5 7500X3D', mouse: 'Logitech Superlight 2', keyboard: { ar: 'كيبورد Razer 8K', en: 'Razer 8K keyboard' } },
      },
      {
        id: 'stream', name: 'Stream Room', side: null, price: 80, was: 100, pack: null,
        photos: [['stream-room-3', 1600, 2133], ['stream-room', 1600, 2133], ['stream-room-2', 1600, 2133]],
        about: {
          ar: 'أسرع شاشة في أكتوبر: 520Hz مع RTX 5070 و Ryzen 7 9800X3D، في أوضة مبطّنة ونور خاص بيها.',
          en: 'The fastest screen in October: 520Hz with an RTX 5070 and a Ryzen 7 9800X3D, in a padded room with its own light.',
        },
        spec: { screen: '520Hz', gpu: 'RTX 5070', cpu: 'AMD Ryzen 7 9800X3D', mouse: 'Logitech Superlight 2', keyboard: 'ATTACK SHARK R85 HE' },
      },
    ],
  };

  /* the English words of the page itself; the Arabic ones are read from the page */
  const EN = {
    skip: 'Skip to content', navLabel: 'Menu', navSections: 'Sections', navRooms: 'Rooms', navPc: 'PC rooms', navPlaystation: 'PlayStation',
    navContact: 'Contact', changeBranch: 'Change branch', login: 'Log in', signup: 'Sign up', menu: 'Menu', whatsapp: 'WhatsApp',
    subZayedPc: 'Zayed · Seven rooms. Swipe through each one, tap it for details and booking.',
    subZayedPs: 'Zayed · Swipe through each room, tap it for details and booking.',
    subOctoberPc: 'Clash October · Five PC rooms, open 24 hours. Swipe through each one, tap it for details and booking.',
    backPc: 'All PC rooms', backPs: 'All PlayStation rooms', others: 'The other rooms',
    footTitle: 'Come play today', footCta: 'Book on WhatsApp',
    branchZayed: 'Zayed branch', branchOctober: 'October branch', map: 'On the map', hours: 'Open 24 hours, every day', catalogue: 'Catalogue',
    rules: 'Rules & terms', privacy: 'Privacy',
  };

  const hoursAr = (h) => (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h <= 10 ? `${h} ساعات` : `${h} ساعة`);
  const hoursEn = (h) => `${h} ${h === 1 ? 'hour' : 'hours'}`;
  const egpAr = (v) => `${v.toLocaleString('en')} جنيه`;
  const egpEn = (v) => `${v.toLocaleString('en')} EGP`;
  const WORDS = {
    ar: {
      side: { red: 'الفريق الأحمر', blue: 'الفريق الأزرق', both: 'الأحمر والأزرق', yellow: 'الأوضة الصفرا' },
      sideNone: 'أوضة ستريم',
      people: (n) => `لحد ${n} أفراد`,
      perHour: 'جنيه للساعة',
      was: (v) => `كان ${v}`,
      save: (v) => `وفّرت ${v} جنيه في الساعة`,
      enter: 'التفاصيل والحجز',
      photos: (name) => `صور ${name}`,
      photo: (i, n) => `صورة ${i} من ${n}`,
      prev: 'الصورة اللي قبلها', next: 'الصورة اللي بعدها',
      capacity: 'السعة', when: 'المواعيد', open: 'مفتوحة 24 ساعة، كل يوم',
      pack: 'باقة 10 ساعات', packText: (v, full) => `${egpAr(v)} بدل ${egpAr(full)}`,
      age: 'السن', age21: 'فيه أجهزة لـ 21 سنة وأكبر بس',
      inside: 'في الأوضة', specs: 'الأجهزة',
      screen: 'الشاشة', gpu: 'كارت الشاشة', cpu: 'المعالج', mouse: 'الماوس', keyboard: 'الكيبورد', headset: 'الهيدسيت', extra: 'كمان',
      hoursLabel: 'كام ساعة؟', less: 'ساعة أقل', more: 'ساعة زيادة',
      total: (h, v) => `${hoursAr(h)} = <b>${egpAr(v)}</b>`,
      packTotal: (v, full) => `باقة 10 ساعات = <b>${egpAr(v)}</b> بدل ${egpAr(full)}`,
      book: 'احجز على واتساب',
      bookNote: 'هنأكدلك الميعاد على واتساب. الحجز من حسابك على الموقع جاي قريب.',
      bookText: (name, h) => `عايز أحجز ${name} لمدة ${hoursAr(h)}`,
      kind: { pc: 'أوض PC', ps: 'بلايستيشن' },
      place: { zayed: 'زايد', october: 'أكتوبر' },
    },
    en: {
      side: { red: 'Team red', blue: 'Team blue', both: 'Red and blue', yellow: 'The yellow room' },
      sideNone: 'Stream room',
      people: (n) => `Up to ${n} people`,
      perHour: 'EGP an hour',
      was: (v) => `was ${v}`,
      save: (v) => `You save ${v} EGP an hour`,
      enter: 'Details and booking',
      photos: (name) => `Photos of the ${name}`,
      photo: (i, n) => `Photo ${i} of ${n}`,
      prev: 'Previous photo', next: 'Next photo',
      capacity: 'Fits', when: 'Hours', open: 'Open 24 hours, every day',
      pack: '10-hour pack', packText: (v, full) => `${egpEn(v)} instead of ${egpEn(full)}`,
      age: 'Age', age21: 'Some PCs are for players 21 and over only',
      inside: 'In the room', specs: 'The PCs',
      screen: 'Screen', gpu: 'Graphics', cpu: 'Processor', mouse: 'Mouse', keyboard: 'Keyboard', headset: 'Headset', extra: 'Also',
      hoursLabel: 'How many hours?', less: 'One hour less', more: 'One hour more',
      total: (h, v) => `${hoursEn(h)} = <b>${egpEn(v)}</b>`,
      packTotal: (v, full) => `10-hour pack = <b>${egpEn(v)}</b> instead of ${egpEn(full)}`,
      book: 'Book on WhatsApp',
      bookNote: 'We confirm your time on WhatsApp. Booking from your account on the site is coming soon.',
      bookText: (name, h) => `I want to book the ${name} for ${hoursEn(h)}`,
      kind: { pc: 'PC rooms', ps: 'PlayStation' },
      place: { zayed: 'Zayed', october: 'October' },
    },
  };

  const BRANCH = document.body.dataset.branch === 'october' ? 'october' : 'zayed';
  const KIND = document.body.dataset.kind === 'ps' ? 'ps' : 'pc';
  const LIST = ROOMS[`${BRANCH}-${KIND}`];
  const { whatsapp, photos: PHOTO_DIR } = BRANCHES[BRANCH];

  const W = () => WORDS[ClashSite.lang];
  const tr = (v) => ClashSite.tr(v);
  const shortName = (r) => r.short || r.name.replace(' Room', '');
  const roomUrl = (r) => `${BRANCH}-${KIND}-room.html?room=${r.id}`;
  const photoSrc = (f) => `assets/${PHOTO_DIR}/${f}.jpg`;
  const wa = (text) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
  /* the short line under a room's name: who it fits (PlayStation) or its team and screen (PC) */
  const cardLine = (r, w) => (KIND === 'ps'
    ? `<span dir="ltr">${r.name}</span> · ${w.people(r.people)}`
    : `${r.side ? w.side[r.side] : w.sideNone} · <span dir="ltr">${tr(r.spec.screen)}</span>`);

  /* ---------- the photo strip: swipe, arrows, the bars at the top, and (on the room page) thumbnails ---------- */
  function galleryHtml(r, { eager = false, thumbs = false } = {}) {
    const w = W();
    const n = r.photos.length;
    return `
      <div class="gal" data-gal>
        <ul class="gal-track" tabindex="0" aria-label="${w.photos(r.name)}">
          ${r.photos.map(([f, pw, ph], i) => `<li class="gal-slide"><img src="${photoSrc(f)}" draggable="false" width="${pw}" height="${ph}" alt="${w.photo(i + 1, n)} · ${r.name}"${eager && i === 0 ? '' : ' loading="lazy"'}></li>`).join('')}
        </ul>
        <p class="gal-bars" aria-hidden="true">${r.photos.map(() => '<span></span>').join('')}</p>
        <button class="gal-btn gal-prev" type="button" aria-label="${w.prev}">${arrow}</button>
        <button class="gal-btn gal-next" type="button" aria-label="${w.next}">${arrow}</button>
      </div>
      ${thumbs ? `<div class="gal-thumbs">${r.photos.map(([f], i) => `<button type="button" class="gal-thumb" data-to="${i}" aria-label="${w.photo(i + 1, n)}"><img src="${photoSrc(f)}" draggable="false" alt="" loading="lazy"></button>`).join('')}</div>` : ''}`;
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

  /* ---------- the list page: a card per room ---------- */
  function renderList() {
    const list = document.getElementById('rooms');
    const w = W();
    list.classList.toggle('is-many', LIST.length > 5);
    list.innerHTML = LIST.map((r) => `
      <article class="rc rc-${r.side || 'none'}" data-room="${r.id}">
        ${galleryHtml(r, { eager: true })}
        <a class="rc-copy" href="${roomUrl(r)}">
          <span class="rc-name" dir="ltr">${shortName(r)}</span>
          <span class="rc-line">${cardLine(r, w)}</span>
          <span class="rc-price"><b dir="ltr">${r.price}</b> ${w.perHour} <s>${w.was(r.was)}</s></span>
          <span class="rc-go">${w.enter}${arrow}</span>
        </a>
      </article>`).join('');
    list.querySelectorAll('.rc').forEach((card) => {
      const r = LIST.find((x) => x.id === card.dataset.room);
      const colour = r.side === 'blue' ? 'blue' : 'red';
      wireGallery(card.querySelector('.gal'));
      const enter = (e) => ClashSite.walk(card, roomUrl(r), colour, e);
      card.querySelector('.rc-copy').addEventListener('click', enter);
      /* a tap on a photo opens the room too; a swipe scrolls the photos and fires no click */
      card.querySelector('.gal-track').addEventListener('click', (e) => { if (e.target.closest('img')) { if (!enter(e)) location.href = roomUrl(r); } });
    });
  }

  /* ---------- the room page ---------- */
  function currentRoom() {
    const id = new URLSearchParams(location.search).get('room');
    return LIST.find((r) => r.id === id) || LIST[0];
  }

  function factsHtml(r, w) {
    const facts = [];
    if (KIND === 'ps') facts.push([w.capacity, w.people(r.people)]);
    if (r.pack) facts.push([w.pack, w.packText(r.pack, r.price * 10)]);
    if (r.age21) facts.push([w.age, w.age21]);
    facts.push([w.when, w.open]);
    return `<dl class="rp-facts">${facts.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl>`;
  }

  /* PlayStation: what is in the room; PC: the table of what the PCs are */
  function insideHtml(r, w) {
    if (KIND === 'ps') return `<h2 class="rp-h">${w.inside}</h2><ul class="rp-inside">${r.inside.map((x) => `<li>${tr(x)}</li>`).join('')}</ul>`;
    const keys = ['screen', 'gpu', 'cpu', 'mouse', 'keyboard', 'headset', 'extra'].filter((k) => r.spec[k]);
    return `<h2 class="rp-h">${w.specs}</h2><dl class="rp-spec">${keys.map((k) => `<div><dt>${w[k]}</dt><dd><bdi>${tr(r.spec[k])}</bdi></dd></div>`).join('')}</dl>`;
  }

  let hours = 2;
  function renderRoom() {
    const r = currentRoom();
    const w = W();
    const title = (lang) => `Clash Esports ${WORDS[lang].place[BRANCH]} | ${r.name} · ${WORDS[lang].kind[KIND]}`;
    ClashSite.setTitles(title('ar'), title('en'));
    document.body.dataset.side = r.side || 'none';
    const [first, rest] = r.name.endsWith(' Room') ? [r.name.slice(0, -5), ' Room'] : [r.name, ''];
    document.getElementById('room').innerHTML = `
      <div class="rp-media">${galleryHtml(r, { eager: true, thumbs: true })}</div>
      <div class="rp-info">
        <h1 class="rp-name" dir="ltr">${first}${rest ? `<span>${rest}</span>` : ''}</h1>
        <p class="rp-about">${tr(r.about)}</p>
        <p class="rp-price"><b class="num" dir="ltr">${r.price}</b> <span>${w.perHour}</span> <s>${w.was(r.was)}</s></p>
        <p class="rp-save">${w.save(r.was - r.price)}</p>
        ${factsHtml(r, w)}
        ${insideHtml(r, w)}
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
      /* ten hours of a room with a pack is the pack */
      document.getElementById('total').innerHTML = hours === 10 && r.pack ? w.packTotal(r.pack, r.price * 10) : w.total(hours, hours * r.price);
      document.getElementById('book').href = wa(w.bookText(r.name, hours));
      document.getElementById('less').disabled = hours <= 1;
      document.getElementById('more').disabled = hours >= 12;
    };
    document.getElementById('less').addEventListener('click', () => { hours = Math.max(1, hours - 1); draw(); });
    document.getElementById('more').addEventListener('click', () => { hours = Math.min(12, hours + 1); draw(); });
    draw();

    /* the other rooms, to move on without going back */
    /* three or four to a row, so none is left on its own */
    const others = LIST.filter((x) => x !== r);
    document.getElementById('others').style.setProperty('--n', others.length % 4 === 0 || others.length < 3 ? Math.min(4, others.length) : 3);
    document.getElementById('others').innerHTML = others.map((x) => `
      <li class="other rc-${x.side || 'none'}">
        <a href="${roomUrl(x)}">
          <img src="${photoSrc(x.photos[0][0])}" draggable="false" width="${x.photos[0][1]}" height="${x.photos[0][2]}" alt="" loading="lazy">
          <span class="other-copy"><span class="other-name" dir="ltr">${shortName(x)}</span><span><b dir="ltr">${x.price}</b> ${w.perHour}</span></span>
        </a>
      </li>`).join('');
  }

  ClashSite.initLang({
    en: EN,
    titleEn: `Clash Esports ${WORDS.en.place[BRANCH]} | ${WORDS.en.kind[KIND]}, open 24 hours`,
    onChange: document.body.dataset.page === 'room' ? renderRoom : renderList,
  });
})();
