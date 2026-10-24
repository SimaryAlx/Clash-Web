/* Clash Esports branch pages: zayed-pc.html, zayed-ps.html and october.html run this same file, each with its own data,
   chosen by <body data-branch> and <body data-page> (pc or ps). Each part draws only when its section is on the page. Zayed data: data/clash-zayed.md (WhatsApp catalogue and Gizmo, 2026-10-23).
   October data: data/clash-october.md (WhatsApp catalogue, 2026-10-24).
   Booking goes to WhatsApp until Clash API is wired: ZONES -> GET /zones, PS -> GET /rooms. */

const BRANCH = document.body.dataset.branch === 'october' ? 'october' : 'zayed';
const PAGE = document.body.dataset.page === 'ps' ? 'ps' : 'pc';
const WHATSAPP = BRANCH === 'october' ? '201080972959' : '201099584833';

/* PC rooms. pcs: hosts in Gizmo; age21: how many of them are for 21 and over (Gizmo's "+21" groups).
   side: the team colour from the catalogue. pack: the 10-hour price. was: the old catalogue price.
   Cave Room is Gizmo's TeamRoom+. */
const ZAYED_ZONES = [
  {
    id: 'normal', name: 'Normal', side: 'blue', pcs: 36, age21: 20, price: 30, was: 40, pack: 240,
    photo: 'assets/clash-hd/normal-room-2.jpg', w: 960, h: 1280,
    spec: { screen: '165Hz', gpu: 'RTX 3060 Ti', cpu: 'Intel Core i5 14th Gen', mouse: 'Razer DeathAdder', keyboard: 'Redragon K552', headset: 'Techno Zone K41' },
  },
  {
    id: 'vip', name: 'VIP', side: 'red', pcs: 31, age21: 15, price: 40, was: 50, pack: 340,
    photo: 'assets/clash-hd/vip-room-3.jpg', w: 960, h: 1280,
    spec: { screen: '240Hz', gpu: 'RTX 3080', cpu: 'Intel Core i5 14th Gen', mouse: 'Razer DeathAdder', keyboard: 'Redragon K552', headset: 'Techno Zone K41' },
  },
  {
    id: 'team', name: 'Team Room', side: 'both', pcs: 10, price: 60, was: 70, pack: 550,
    photo: 'assets/clash-hd/team-room-3.jpg', w: 900, h: 1600,
    spec: { screen: 'Alienware 360Hz', gpu: 'RTX 3090', cpu: 'Intel Core i7 14th Gen', mouse: { ar: 'ماوس جيمنج 8K', en: '8K gaming mouse' }, keyboard: { ar: 'كيبورد مغناطيسي', en: 'Magnetic keyboard' }, headset: 'HyperX Cloud II' },
  },
  {
    id: 'cave', name: 'Cave Room', side: 'red', pcs: 5, price: 60, was: 70, pack: null,
    photo: 'assets/clash-hd/cave-room-3.jpg', w: 960, h: 1280,
    spec: { screen: '380Hz', gpu: 'RTX 5060', cpu: 'AMD Ryzen 5 7500X3D', mouse: 'ATK F1 Ultimate', keyboard: { ar: 'كيبورد مغناطيسي', en: 'Magnetic keyboard' }, headset: 'Razer Kraken V3' },
  },
  {
    id: 'elite', name: 'Elite Room', side: 'yellow', pcs: 5, price: 70, was: 80, pack: 650,
    photo: 'assets/clash-hd/elite-room.jpg', w: 1600, h: 2133,
    spec: { screen: 'ASUS ROG 360Hz', gpu: 'RTX 5060 Ti', cpu: 'AMD Ryzen 7 9800X3D', mouse: { ar: 'ماوس جيمنج 8K', en: '8K gaming mouse' }, keyboard: { ar: 'كيبورد مغناطيسي', en: 'Magnetic keyboard' }, headset: 'HyperX Cloud III' },
  },
  {
    id: 'stream', name: 'Stream Room', side: null, pcs: 2, price: 100, was: 115, pack: 900,
    photo: 'assets/clash-hd/stream-room.jpg', w: 1200, h: 1600,
    spec: {
      screen: 'ASUS ROG 360Hz', gpu: 'RTX 5070', cpu: 'AMD Ryzen 7 9800X3D', mouse: 'Logitech Superlight 2 (8K)', keyboard: { ar: 'كيبورد مغناطيسي', en: 'Magnetic keyboard' }, headset: 'Logitech G522',
      extra: { ar: 'مايك HyperX QuadCast 2 · كاميرا Logitech MX Brio 4K', en: 'HyperX QuadCast 2 mic · Logitech MX Brio 4K camera' },
    },
  },
  {
    id: 'duo', name: 'Duo Stream Room', side: null, pcs: 2, price: 100, was: 120, pack: 900,
    photo: 'assets/clash-hd/duo-stream-room-2.jpg', w: 960, h: 1280,
    spec: {
      screen: '520Hz', gpu: 'RTX 5070', cpu: 'AMD Ryzen 7 9800X3D', keyboard: { ar: 'كيبورد مغناطيسي', en: 'Magnetic keyboard' },
      extra: { ar: 'كاميرا Logitech MX Brio 4K', en: 'Logitech MX Brio 4K camera' },
    },
  },
];

/* PlayStation rooms and simulators. unit: 'hour' or 'half'. sim: a simulator, which the sections page only mentions. */
const ZAYED_PS = [
  { name: 'Normal PS5 Room', price: 200, was: 250, unit: 'hour', people: 6, photo: 'assets/clash-hd/normal-ps5-room.jpg', w: 1200, h: 1600 },
  { name: 'VIP PS5 Room', price: 250, was: 300, unit: 'hour', people: 10, photo: 'assets/clash-hd/vip-ps5-room.jpg', w: 1200, h: 1600 },
  { name: 'Pool Room', price: 400, was: 600, unit: 'hour', people: 15, photo: 'assets/clash-hd/pool-room.jpg', w: 574, h: 1019 },
  { name: 'Cinema Room', price: 500, was: 700, unit: 'hour', people: 12, photo: 'assets/clash-hd/cinema-room-2.jpg', w: 739, h: 1600 },
  { name: 'Standard Car Simulator', sim: true, price: 100, unit: 'half', note: { ar: '3 شاشات 27 بوصة', en: 'Three 27" screens' }, photo: 'assets/clash-hd/standard-car-simulator.jpg', w: 960, h: 1280 },
  { name: 'Motion Car Simulator', sim: true, price: 280, was: 400, unit: 'hour', note: { ar: 'كرسي بيتحرك مع العربية', en: 'The seat moves with the car' }, photo: 'assets/clash-hd/motion-car-simulator.jpg', w: 960, h: 1280 },
];

/* October: five PC rooms, no 10-hour packs or PlayStation rooms in its catalogue yet. */
const OCTOBER_ZONES = [
  {
    id: 'normal', name: 'Normal', side: 'blue', price: 25, was: 35, pack: null,
    photo: 'assets/october-hd/normal-room.jpg', w: 1600, h: 2133,
    spec: { screen: '165Hz', gpu: 'RX 6600 / RTX 3060 Ti', cpu: 'Intel Core i5 12400F', mouse: 'Redragon M609', keyboard: 'Redragon K552' },
  },
  {
    id: 'vip', name: 'VIP', side: 'red', price: 35, was: 45, pack: null,
    photo: 'assets/october-hd/vip-room-2.jpg', w: 1600, h: 2133,
    spec: { screen: '240Hz', gpu: 'RTX 4060 Ti', cpu: 'Intel Core i5 12400F', mouse: 'Logitech G102', keyboard: 'Redragon K552' },
  },
  {
    id: 'team', name: 'Team Room', side: 'both', price: 50, was: 60, pack: null,
    photo: 'assets/october-hd/team-room.jpg', w: 1600, h: 2133,
    spec: { screen: '380Hz', gpu: 'RTX 5060', cpu: 'AMD Ryzen 5 7500X3D', mouse: 'MAD R 8K', keyboard: 'ATTACK SHARK X68 HE' },
  },
  {
    id: 'elite', name: 'Elite Room', side: 'yellow', price: 70, was: 80, pack: null,
    photo: 'assets/october-hd/elite-room.jpg', w: 1600, h: 2133,
    spec: { screen: '380Hz', gpu: 'RTX 5060', cpu: 'AMD Ryzen 5 7500X3D', mouse: 'Logitech Superlight 2', keyboard: { ar: 'كيبورد Razer 8K', en: 'Razer 8K keyboard' } },
  },
  {
    id: 'stream', name: 'Stream Room', side: null, price: 80, was: 100, pack: null,
    photo: 'assets/october-hd/stream-room-3.jpg', w: 1600, h: 2133,
    spec: { screen: '520Hz', gpu: 'RTX 5070', cpu: 'AMD Ryzen 7 9800X3D', mouse: 'Logitech Superlight 2', keyboard: 'ATTACK SHARK R85 HE' },
  },
];

const ZONES = BRANCH === 'october' ? OCTOBER_ZONES : ZAYED_ZONES;
const PS = BRANCH === 'october' ? [] : ZAYED_PS.filter((p) => !p.sim);

const EN = {
  skip: 'Skip to content', navLabel: 'Menu', navRooms: 'Rooms', navOffers: 'Packs', navPlaystation: 'PlayStation',
  navStart: 'Get started', navContact: 'Contact', navSections: 'Sections', navPc: 'PC rooms', login: 'Log in', signup: 'Sign up', menu: 'Menu',
  heroLine: 'A gaming lounge in Zayed, open 24 hours. Seven PC rooms, from Normal at 30 EGP to the Stream Room with a mic and a 4K camera.',
  heroCta: 'Book on WhatsApp', heroRooms: 'See the rooms', heroStatement: 'We never close. 24 hours, every day.',
  mRed: 'Red', mBlue: 'Blue', m24: '24 hours', mZayed: 'Zayed',
  vsTitle: 'Red vs Blue', vsLine: 'The lounge is split in two and the war runs 24 hours. Whose side are you on?',
  altVip: 'The VIP room in red light with rows of PCs', altNormal: 'The Normal room in blue light with rows of PCs',
  vsRedTeam: 'Team red', vsRedMeta: '240Hz screens · RTX 3080',
  vsBlueTeam: 'Team blue', vsBlueMeta: '165Hz screens · RTX 3060 Ti',
  perHour: 'EGP an hour',
  statsTitle: 'Clash Zayed in numbers',
  stat1: 'hours a day. The lounge never closes.',
  stat2: 'PC rooms, from Normal at 30 EGP to the Stream Room with a mic and a 4K camera.',
  stat3: 'EGP is all 10 hours cost in the Normal room.',
  stat4: 'our fastest screen, in the Duo Stream Room.',
  altWaiting: 'The waiting area with red and blue chairs under a red and blue lit ceiling', capWaiting: 'The waiting area, seats for both teams.',
  roomsTitle: 'Seven PC rooms', roomsLine: 'From Normal at 30 EGP to the Stream Room with a mic and a 4K camera. Tap a room for its details.',
  zonesTitle: 'Count your hours', zonesTabs: 'Rooms',
  specCaption: 'PC specs in this room', calcLabel: 'How many hours?', zoneCta: 'Book on WhatsApp',
  offerA: '10 Normal hours', offerB: 'for', egp: 'EGP',
  offerSub: 'That is 24 EGP an hour instead of 30. Every PC room has a 10-hour pack, see the table below.',
  offerCta: 'Book this pack on WhatsApp', offersAll: 'All 10-hour packs',
  thZone: 'Room', thHours: 'Hours', thPrice: 'Price', thHourly: 'Per hour', thSave: 'You save', thBook: 'Book',
  psHeroLine: 'Closed PS5 rooms for your crew at Clash Zayed, from 6 to 15 people. Open 24 hours.', psStatement: 'Your crew, your room, 24 hours.',
  psRoomsTitle: 'Four PlayStation rooms', psRoomsLine: 'Normal, VIP, Pool and Cinema. Closed rooms for your crew, from 6 to 15 people.',
  startTitle: 'From sign-up to your seat in minutes',
  uiRegister: 'Create account', uiPhone: 'Mobile', uiSendCode: 'Send code',
  s1t: 'First, make your account.', s1: 'The same username and password you use on the lounge PCs. We text a code to your phone to confirm it.',
  uiRecharge: 'Top up', uiPay: 'Pay with Paymob',
  s2t: 'Then top up.', s2: 'By card or mobile wallet through Paymob. Your balance updates the moment the payment is confirmed.',
  uiHours: 'hours', uiBalanceAfter: 'Balance after', uiBuy: 'Buy from balance',
  s3t: 'Pick a pack.', s3: 'Every room has a 10-hour pack and the hours show on the room card at once. Short on balance? We send you to top up the difference only.',
  uiLeft: 'Time left', uiStart: 'Start PC',
  s4t: 'Finally, start your PC.', s4: 'Choose a free PC on the site and it unlocks in your name. You can end the session from your phone too.',
  instaLine: '24K followers. Tournaments and new offers go up there first.', instaCta: 'Follow us',
  altIg1: 'A red and blue CLASH neon sign with the bull head', altIg2: 'A 100PC neon sign above rows of PCs', altIg3: 'The Clash entrance with the bull logo in red and blue light',
  altIg4: 'A gaming screen in a blue-lit room', altIg5: 'An FC27 poster: available in Clash rooms',
  footTitle: 'Come play today', footCta: 'Book on WhatsApp',
  branchZayed: 'Zayed branch', branchOctober: 'October branch', map: 'On the map', hours: 'Open 24 hours, every day', catalogue: 'Catalogue',
  changeBranch: 'Change branch', rules: 'Rules & terms', privacy: 'Privacy', whatsapp: 'WhatsApp',
};

/* the October page's own English words; everything else is shared with Zayed */
if (BRANCH === 'october') Object.assign(EN, {
  heroLine: 'A gaming lounge in 6th of October, open 24 hours. Five PC rooms, from Normal at 25 EGP to the Stream Room on a 520Hz screen.',
  mPlace: 'October',
  vsLine: 'October is split in two as well, and the war runs 24 hours. Whose side are you on?',
  altVip: 'The October VIP room in red light with rows of PCs', altNormal: 'The October Normal room in blue light with rows of PCs',
  vsRedMeta: '240Hz screens · RTX 4060 Ti', vsBlueMeta: '165Hz screens · RX 6600 / RTX 3060 Ti',
  statsTitle: 'Clash October in numbers',
  stat2: 'PC rooms, from Normal to the Stream Room.',
  stat3: 'EGP an hour in the Normal room, down from 35.',
  stat4: 'our fastest screen, in the Stream Room.',
  altCover: 'A Stream Room seat against orange padded walls', capCover: 'The Stream Room, padded walls and its own light.',
  roomsTitle: 'Five PC rooms', roomsLine: 'From Normal at 25 EGP to the Stream Room on a 520Hz screen. Tap a room for its details.',
  offerA: 'A Normal hour', offerSub: 'Instead of 35. Every room in October is on offer right now, see the table below.',
  offerCta: 'Book on WhatsApp', offersAll: 'Hour prices in October',
  thHour: 'Per hour', thWas: 'Was', thSave: 'You save',
});

const AR_DYN = {
  side: { red: 'الفريق الأحمر', blue: 'الفريق الأزرق', both: 'الأحمر والأزرق في أوضة واحدة', yellow: 'الأوضة الصفرا' },
  age: 'السن', age21note: 'فيه أجهزة لـ 21 سنة وأكبر بس', sideNone: 'أوضة ستريم', screen: 'الشاشة', gpu: 'كارت الشاشة', cpu: 'المعالج', mouse: 'الماوس', keyboard: 'الكيبورد', headset: 'الهيدسيت', extra: 'كمان',
  pcsN: (n) => `${n} ${n <= 10 ? 'أجهزة' : 'جهاز'}`,
  age21: (n) => `منهم ${n} جهاز لـ 21 سنة وأكبر`,
  noSpec: 'اسألنا على واتساب عن أجهزة الأوضة دي.',
  hoursN: (h) => `${h} ${h === 1 ? 'ساعة' : h <= 10 ? 'ساعات' : 'ساعة'}`,
  total: (h, v) => `${D().hoursN(h)} = <b>${D().egp(v)}</b>`,
  packTotal: (v, full) => `باقة 10 ساعات = <b>${D().egp(v)}</b> بدل ${D().egp(full)}`,
  egp: (v) => `${v.toLocaleString('en')} جنيه`,
  was: (v) => `كان ${v}`,
  book: 'احجز',
  bookText: (name, h) => `عايز أحجز ${name} لمدة ${D().hoursN(h)}`,
  bookOne: (name) => `عايز أحجز ${name}`,
  perHour: 'جنيه للساعة', perHalf: 'جنيه لكل نص ساعة', perHourShort: 'ج/ساعة',
  people: (n) => `لحد ${n} أفراد`,
};
const EN_DYN = {
  side: { red: 'Team red', blue: 'Team blue', both: 'Red and blue in one room', yellow: 'The yellow room' },
  age: 'Age', age21note: 'Some PCs are for players 21 and over only', sideNone: 'Stream room', screen: 'Screen', gpu: 'Graphics', cpu: 'Processor', mouse: 'Mouse', keyboard: 'Keyboard', headset: 'Headset', extra: 'Also',
  pcsN: (n) => `${n} ${n === 1 ? 'PC' : 'PCs'}`,
  age21: (n) => `${n} of them for players 21 and over`,
  noSpec: 'Ask us on WhatsApp about the PCs in this room.',
  hoursN: (h) => `${h} ${h === 1 ? 'hour' : 'hours'}`,
  total: (h, v) => `${D().hoursN(h)} = <b>${D().egp(v)}</b>`,
  packTotal: (v, full) => `10-hour pack = <b>${D().egp(v)}</b> instead of ${D().egp(full)}`,
  egp: (v) => `${v.toLocaleString('en')} EGP`,
  was: (v) => `was ${v}`,
  book: 'Book',
  bookText: (name, h) => `I want to book the ${name} for ${D().hoursN(h)}`,
  bookOne: (name) => `I want to book the ${name}`,
  perHour: 'EGP an hour', perHalf: 'EGP per 30 minutes', perHourShort: 'EGP/h',
  people: (n) => `Up to ${n} people`,
};

let lang = 'ar';
const AR = {};
const D = () => (lang === 'en' ? EN_DYN : AR_DYN);
const tr = (v) => (v && typeof v === 'object' ? v[lang] : v);
const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const tagFor = (side) => (side === 'both' ? '<i class="red"></i><i class="blue"></i>' : side ? `<i class="${side}"></i>` : '');

/* ---------- the row of rooms (scene 3) ---------- */
function renderRooms() {
  const d = D();
  const track = document.getElementById('rooms-track');
  if (!track) return;
  track.innerHTML = ZONES.map((z) => `
    <li class="room-card">
      <a href="#zones" data-zone="${z.id}">
        <div class="room-pic${z.photo ? '' : ' is-empty'}">
          ${z.photo ? `<img src="${z.photo}" width="${z.w}" height="${z.h}" alt="${z.name}" loading="lazy">` : `<span dir="ltr">${z.name.replace(' Room', '')}</span>`}
          <span class="room-tag" aria-hidden="true">${tagFor(z.side)}</span>
        </div>
        <h3 class="room-name" dir="ltr">${z.name}</h3>
        <p class="room-meta"><span>${z.side ? d.side[z.side] : d.sideNone}</span><span><b dir="ltr">${z.price}</b> ${d.perHourShort}</span></p>
      </a>
    </li>`).join('');
}

/* ---------- the hour calculator ---------- */
let current = ZONES[0];
const tabs = document.getElementById('zone-tabs');
const range = document.getElementById('calc-hours');

function renderTabs() {
  if (!tabs) return;
  tabs.innerHTML = '';
  ZONES.forEach((z) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'zone-tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(z === current));
    b.setAttribute('aria-controls', 'zone-pic');
    b.dir = 'ltr';
    b.textContent = z.name;
    b.addEventListener('click', () => selectZone(z.id));
    tabs.appendChild(b);
  });
}

function selectZone(id) {
  current = ZONES.find((z) => z.id === id) || ZONES[0];
  renderTabs(); renderZone();
}

function renderZone() {
  if (!tabs) return;
  const z = current;
  const d = D();
  const img = document.getElementById('zone-img');
  const picName = document.getElementById('zone-pic-name');
  if (z.photo) {
    img.hidden = false;
    img.src = z.photo; img.width = z.w; img.height = z.h;
    img.alt = z.name;
    picName.hidden = true;
  } else {
    img.hidden = true;
    picName.hidden = false;
    picName.textContent = z.name;
  }
  document.getElementById('zone-pic').classList.toggle('is-empty', !z.photo);

  document.getElementById('zone-price').textContent = z.price;
  document.getElementById('zone-was').textContent = z.was ? d.was(z.was) : '';
  const side = document.getElementById('zone-side');
  side.textContent = z.side ? d.side[z.side] : '';
  side.className = 'zone-side' + (z.side && z.side !== 'both' ? ` ${z.side}` : '');
  /* device counts stay off the landing page; they belong to the booking pages (phase 2) */
  const rows = z.age21 ? [`<tr><th scope="row">${d.age}</th><td>${d.age21note}</td></tr>`] : [];
  const keys = ['screen', 'gpu', 'cpu', 'mouse', 'keyboard', 'headset', 'extra'].filter((k) => z.spec[k]);
  keys.forEach((k) => rows.push(`<tr><th scope="row">${d[k]}</th><td dir="auto">${tr(z.spec[k])}</td></tr>`));
  if (!keys.length) rows.push(`<tr><td colspan="2">${d.noSpec}</td></tr>`);
  document.getElementById('zone-spec').innerHTML = rows.join('');
  renderCalc();
}

function renderCalc() {
  const z = current;
  const d = D();
  const h = Number(range.value);
  document.getElementById('calc-out').textContent = h;
  const full = h * z.price;
  document.getElementById('calc-total').innerHTML = h === 10 && z.pack ? d.packTotal(z.pack, full) : d.total(h, full);
  document.getElementById('zone-cta').href = wa(d.bookText(z.name, h));
}

/* ---------- 10-hour packs (Zayed), or the hour prices beside their old prices (October) ---------- */
function renderPacks() {
  if (!document.getElementById('packs')) return;
  const d = D();
  const t = lang === 'en' ? EN : AR;
  if (!ZONES.some((z) => z.pack)) {
    document.getElementById('packs').innerHTML = ZONES.map((z) => `
    <tr${z.id === 'normal' ? ' class="is-best"' : ''}>
      <td dir="ltr">${z.name}</td>
      <td>${d.egp(z.price)}</td>
      <td data-label="${t.thWas}"><s>${d.egp(z.was)}</s></td>
      <td data-label="${t.thSave}">${d.egp(z.was - z.price)}</td>
      <td><a class="link" href="${wa(d.bookOne(z.name))}" target="_blank" rel="noopener">${d.book}</a></td>
    </tr>`).join('');
    document.getElementById('offer-cta').href = wa(d.bookOne('Normal'));
    return;
  }
  document.getElementById('packs').innerHTML = ZONES.filter((z) => z.pack).map((z) => `
    <tr${z.id === 'normal' ? ' class="is-best"' : ''}>
      <td dir="ltr">${z.name}</td>
      <td>${d.hoursN(10)}</td>
      <td>${d.egp(z.pack)}</td>
      <td data-label="${t.thHourly}">${d.egp(z.pack / 10)}</td>
      <td data-label="${t.thSave}">${d.egp(z.price * 10 - z.pack)}</td>
      <td><a class="link" href="${wa(d.bookText(z.name, 10))}" target="_blank" rel="noopener">${d.book}</a></td>
    </tr>`).join('');
  document.getElementById('offer-cta').href = wa(d.bookText('Normal', 10));
}

/* ---------- PlayStation and simulators ---------- */
function renderPs() {
  const d = D();
  if (!document.getElementById('ps-grid')) return;
  document.getElementById('ps-grid').innerHTML = PS.map((p) => {
    const meta = [p.people ? d.people(p.people) : tr(p.note), p.was ? d.was(p.was) : ''].filter(Boolean).join(' · ');
    return `<li class="ps-card reveal is-in">
      <div class="ps-pic"><img src="${p.photo}" width="${p.w}" height="${p.h}" alt="${p.name}" loading="lazy"></div>
      <h3 class="ps-name" dir="ltr">${p.name}</h3>
      <p class="ps-meta">${meta}</p>
      <div class="ps-row">
        <p class="ps-price"><b dir="ltr">${p.price}</b> ${p.unit === 'half' ? d.perHalf : d.perHour}</p>
        <a class="btn btn-small" href="${wa(d.bookOne(p.name))}" target="_blank" rel="noopener">${d.book}</a>
      </div>
    </li>`;
  }).join('');
}

/* ---------- language ---------- */
function captureArabic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { AR[el.dataset.i18n] = el.textContent; });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { AR[el.dataset.i18nHtml] = el.innerHTML; });
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => { AR[el.dataset.i18nAlt] = el.alt; });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { AR[el.dataset.i18nAria] = el.getAttribute('aria-label'); });
  AR._title = document.title;
}

function applyLang(next) {
  lang = next;
  const t = lang === 'en' ? EN : AR;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'en' ? 'ltr' : 'rtl';
  document.querySelectorAll('[data-i18n]').forEach((el) => { if (t[el.dataset.i18n]) el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { if (t[el.dataset.i18nHtml]) el.innerHTML = t[el.dataset.i18nHtml]; });
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => { if (t[el.dataset.i18nAlt]) el.alt = t[el.dataset.i18nAlt]; });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { if (t[el.dataset.i18nAria]) el.setAttribute('aria-label', t[el.dataset.i18nAria]); });
  document.title = lang === 'en' ? `Clash Esports ${BRANCH === 'october' ? 'October' : 'Zayed'} | ${PAGE === 'ps' ? 'PlayStation rooms' : 'PC rooms'}, open 24 hours` : AR._title;
  const btn = document.getElementById('lang-toggle');
  btn.textContent = lang === 'en' ? 'ع' : 'EN';
  btn.lang = lang === 'en' ? 'ar' : 'en';
  btn.setAttribute('aria-label', lang === 'en' ? 'العربية' : 'English');
  renderRooms(); renderTabs(); renderZone(); renderPacks(); renderPs();
  try { localStorage.setItem('clash-lang', lang); } catch (e) { /* storage unavailable */ }
  if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
}

/* ---------- quiet motion: entrances and rolling figures ---------- */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setupReveal() {
  document.querySelectorAll('section, .foot').forEach((sec) => {
    sec.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 6) * 80}ms`));
  });
  const els = document.querySelectorAll('.reveal:not(.is-in)');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}

function setupCounts() {
  const els = document.querySelectorAll('[data-count]');
  if (reduced || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const to = Number(el.dataset.count);
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 1400);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  els.forEach((el) => { io.observe(el); });
}

/* ---------- start ---------- */
captureArabic();
let saved = null;
try { saved = localStorage.getItem('clash-lang'); } catch (e) { /* storage unavailable */ }
applyLang(saved === 'en' ? 'en' : 'ar');

document.getElementById('lang-toggle').addEventListener('click', () => applyLang(lang === 'en' ? 'ar' : 'en'));
if (range) range.addEventListener('input', renderCalc);
if (document.getElementById('rooms-track')) document.getElementById('rooms-track').addEventListener('click', (e) => {
  const a = e.target.closest('[data-zone]');
  if (a) selectZone(a.dataset.zone);
});

const menuBtn = document.getElementById('menu-toggle');
const navList = document.getElementById('nav-links');
menuBtn.addEventListener('click', () => {
  const open = navList.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
navList.addEventListener('click', (e) => {
  if (e.target.closest('a')) { navList.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
});

setupReveal();
setupCounts();

/* the brand reel (rendered with Remotion, video/): wide or tall file for the screen, and it plays only while the hero is on screen */
const reel = document.querySelector('.hero-video');
if (reel && !reduced) {
  const tall = window.matchMedia('(max-aspect-ratio: 1/1)').matches;
  reel.src = tall ? reel.dataset.srcTall : reel.dataset.srcWide;
  if (tall) reel.poster = reel.dataset.posterTall;
  new IntersectionObserver(([e]) => { if (e.isIntersecting) reel.play().catch(() => {}); else reel.pause(); }).observe(reel.closest('.hero'));
}
if (window.Stage) { Stage.smooth(); Stage.init(); }
