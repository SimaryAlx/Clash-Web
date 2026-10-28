/* Clash staff panel (admin/). The bookings people send from the site land here; staff call them back, give them a
   room and a length, and confirm. Screens: Bookings (the queue and every booking), Rooms board (the lounge day,
   room by room), Rooms (in or out of service), Team (who is staff, and with what role).
   Data comes from js/booking-store.js: Supabase when js/config.js is filled in, this browser in demo mode.
   Roles: shift works bookings; manager also runs the rooms; owner also decides who is staff. */
(() => {
  const S = window.ClashStore;
  const T = window.ClashTime;
  const app = document.getElementById('app');

  /* ================================================================ words */
  const WORDS = {
    en: {
      staff: 'Staff', branch: 'Zayed', branchLine: 'PlayStation rooms', live: 'Live', demo: 'Demo',
      navBookings: 'Bookings', navBoard: 'Rooms board', navRooms: 'Rooms', navTeam: 'Team',
      groupPs: 'PlayStation · Zayed', groupClash: 'Clash', groupNext: 'Coming next',
      soonPc: 'PC rooms', soonCustomers: 'Customers', soonReports: 'Reports', soon: 'Soon',
      signOut: 'Sign out', langBtn: 'العربية', menu: 'Menu', close: 'Close',
      search: 'Search by name, mobile or #number',
      roles: { owner: 'Owner', manager: 'Manager', shift: 'Shift' },
      /* sign in */
      signInTitle: 'Staff sign in', signInLine: 'Bookings from the site, rooms and the team.', email: 'Email', password: 'Password', name: 'Name',
      signIn: 'Sign in', signUpTitle: 'Create a staff account', signUp: 'Create account', toSignUp: 'New here? Create an account', toSignIn: 'Have an account? Sign in',
      demoGate: 'Demo mode: any password works. owner@clash.demo is the owner, karim@clash.demo a manager, omar@clash.demo a shift.',
      badLogin: 'Wrong email or password.', unconfirmed: 'Confirm your email first: open the link we sent you.', exists: 'That email already has an account. Sign in instead.',
      checkEmail: 'Check your email and open the link, then sign in here.', badSignup: 'Could not create the account. Use a real email and a password of 8 characters or more.',
      waitTitle: 'Waiting for approval', waitLine: (n) => `${n}, your account is ready. The owner gives you access from the Team screen; this page opens by itself once they do.`,
      offTitle: 'Access turned off', offLine: 'Ask the owner to turn your access back on.',
      /* bookings */
      bookingsTitle: 'Bookings', add: 'Add booking',
      finding: (n, ago) => (n ? `<b>${n} waiting for a call</b> · the oldest asked ${ago}` : 'Nobody is waiting for a call.'),
      cards: { waiting: 'Waiting for a call', upcoming: 'Confirmed, coming up', today: 'Tonight', finished: 'Played', cancelled: 'Cancelled' },
      cols: { ref: '#', customer: 'Customer', room: 'Room', when: 'Starts', asked: 'Asked', status: 'Status' },
      any: (type) => `Any <bdi>${type}</bdi>`, call: 'Call',
      status: { pending: 'Waiting', confirmed: 'Confirmed', done: 'Played', no_show: "Didn't come", cancelled: 'Cancelled' },
      emptyFilter: { waiting: 'Nobody is waiting for a call.', upcoming: 'No confirmed bookings coming up.', today: 'Nothing booked tonight yet.', finished: 'Nothing played yet.', cancelled: 'No cancelled bookings.' },
      searching: (q, n) => `${n} found for “${q}” across every booking`, noMatch: 'Nothing matches that search.',
      demoNote: 'Demo mode: the bookings here live in this browser only, with sample data. Connect the database to go live.', resetDemo: 'Reset sample data',
      /* drawer */
      requested: 'Asked for', roomField: 'Room', dayField: 'Day', hourField: 'Starts at', lengthField: 'Length', noteField: 'Staff note',
      customerNote: 'Their note', source: { web: 'From the site', staff: 'Added by staff' },
      pickRoom: 'Choose a room', confirm: 'Confirm booking', save: 'Save changes', cancelReq: 'Cancel request', cancelBooking: 'Cancel booking',
      done: 'Played', noShow: "Didn't come", reopen: 'Reopen', whatsapp: 'WhatsApp',
      clash: (room, from, to, who) => `${room} is booked ${from}–${to}${who ? ` (${who})` : ''}. Pick another room or time.`,
      needRoom: 'Give it a room and a length to confirm.', history: 'History', notStarted: 'Played and Didn\'t come open once it has started.',
      ev: { requested: 'Asked on the site', added: 'Added', confirmed: 'Confirmed', cancelled: 'Cancelled', done: 'Marked played', no_show: "Marked didn't come", reopened: 'Reopened', edited: 'Changed' },
      by: (who) => (who ? ` by ${who}` : ''),
      addTitle: 'Add a booking', addLine: 'A booking taken by phone or at the desk.', typeField: 'Kind of room', phoneField: 'Mobile',
      confirmNow: 'Confirm now', keepWaiting: 'Save as waiting', badPhone: 'Enter an Egyptian mobile: 11 digits starting with 01.', badName: 'Enter the name.',
      saved: 'Saved.', failed: 'Could not save. Try again.', busyErr: 'That room is taken at that time.',
      /* board */
      boardTitle: 'Rooms board', boardLine: (n, w) => `${n} booked tonight${w ? ` · ${w} waiting for a call` : ''}`,
      prevDay: 'Previous day', nextDay: 'Next day', today: 'Tonight', now: 'Now', anyRow: 'Waiting, any room',
      legendBooked: 'Confirmed', legendWaiting: 'Waiting for a call', legendPlayed: 'Played',
      /* rooms */
      roomsTitle: 'Rooms', roomsLine: (off) => (off ? `${off} out of service` : 'Every room is in service.'),
      inService: 'In service', outOfService: 'Out of service', notePlaceholder: 'Why it is out (for the team)', roomsReadOnly: 'Only a manager or the owner can change these.',
      types: { normal: 'Normal PS5', vip: 'VIP PS5', pool: 'Pool Room', cinema: 'Cinema Room' },
      typeLine: { normal: 'Up to 6 people · 200 EGP an hour', vip: 'Up to 10 people · 250 EGP an hour', pool: 'Up to 15 people · 400 EGP an hour', cinema: 'Up to 12 people · 500 EGP an hour' },
      /* team */
      teamTitle: 'Team', teamLine: (n, p) => `${n} with access${p ? ` · ${p} waiting for approval` : ''}`,
      people: 'People', peopleLine: 'Everyone who can open this panel, and what they may do.',
      roleHelp: 'Shift: bookings and the board. Manager: also the rooms. Owner: also the team.',
      requests: 'Waiting for approval', requestsLine: 'They created an account on this page. Give them a role, or decline.',
      noRequests: 'Nobody is waiting.', approve: 'Approve', decline: 'Decline', active: 'Access on', you: 'you',
      addPeople: 'Adding someone', addPeopleLine: 'Send them the link to this page. They create an account with their email, and they appear here for you to approve.',
      teamReadOnly: 'Only the owner can change the team.',
      newRequest: (ref) => `New request #${ref}`,
      open: 'Open', loadErr: 'Could not load the bookings.', retry: 'Retry',
      nowTitle: 'Right now', freeOf: (f, n) => `${f} of ${n} free`, free: 'Free', busyUntil: (t) => `Busy until ${t}`, offNote: (n) => `${n} out of service`,
      nextTitle: 'Arriving next', nothingNext: 'No confirmed bookings coming up.',
      hourShort: 'h', minShort: 'min',
      agoNow: 'just now', agoMin: (n) => `${n} min ago`, agoHour: (n) => `${n} h ago`, agoDay: (n) => `${n} d ago`,
      yesterday: 'Yesterday', tomorrow: 'Tomorrow', tonight: 'Tonight',
    },
    ar: {
      staff: 'الإدارة', branch: 'زايد', branchLine: 'أوض البلايستيشن', live: 'مباشر', demo: 'تجريبي',
      navBookings: 'الحجوزات', navBoard: 'جدول الأوض', navRooms: 'الأوض', navTeam: 'الفريق',
      groupPs: 'بلايستيشن · زايد', groupClash: 'كلاش', groupNext: 'جاي قريب',
      soonPc: 'أوض PC', soonCustomers: 'العملاء', soonReports: 'التقارير', soon: 'قريب',
      signOut: 'خروج', langBtn: 'English', menu: 'القائمة', close: 'قفل',
      search: 'دوّر بالاسم أو الموبايل أو رقم الحجز',
      roles: { owner: 'المالك', manager: 'مدير', shift: 'شيفت' },
      signInTitle: 'دخول الإدارة', signInLine: 'حجوزات الموقع والأوض والفريق.', email: 'الإيميل', password: 'الباسورد', name: 'الاسم',
      signIn: 'دخول', signUpTitle: 'اعمل حساب للفريق', signUp: 'اعمل الحساب', toSignUp: 'أول مرة؟ اعمل حساب', toSignIn: 'عندك حساب؟ ادخل',
      demoGate: 'وضع تجريبي: أي باسورد ينفع. owner@clash.demo المالك، karim@clash.demo مدير، omar@clash.demo شيفت.',
      badLogin: 'الإيميل أو الباسورد غلط.', unconfirmed: 'أكّد إيميلك الأول من اللينك اللي بعتناه.', exists: 'الإيميل ده عليه حساب. ادخل بيه.',
      checkEmail: 'افتح إيميلك ودوس على اللينك، وبعدين ادخل من هنا.', badSignup: 'معرفناش نعمل الحساب. استخدم إيميل حقيقي وباسورد 8 حروف أو أكتر.',
      waitTitle: 'مستني الموافقة', waitLine: (n) => `${n}، حسابك جاهز. المالك هيديك صلاحية من صفحة الفريق، والصفحة دي هتفتح لوحدها أول ما يعمل كده.`,
      offTitle: 'الصلاحية مقفولة', offLine: 'اطلب من المالك يفتحلك الصلاحية تاني.',
      bookingsTitle: 'الحجوزات', add: 'ضيف حجز',
      finding: (n, ago) => (n ? `<b>${n} مستنيين مكالمة</b> · أقدم واحد طلب ${ago}` : 'مفيش حد مستني مكالمة.'),
      cards: { waiting: 'مستنيين مكالمة', upcoming: 'متأكدة وجاية', today: 'النهارده', finished: 'اتلعبت', cancelled: 'اتلغت' },
      cols: { ref: '#', customer: 'العميل', room: 'الأوضة', when: 'البداية', asked: 'طلب', status: 'الحالة' },
      any: (type) => `أي <bdi>${type}</bdi>`, call: 'كلّمه',
      status: { pending: 'مستني', confirmed: 'متأكد', done: 'اتلعب', no_show: 'مجاش', cancelled: 'اتلغى' },
      emptyFilter: { waiting: 'مفيش حد مستني مكالمة.', upcoming: 'مفيش حجوزات متأكدة جاية.', today: 'لسه مفيش حجوزات النهارده.', finished: 'لسه محدش لعب.', cancelled: 'مفيش حجوزات ملغية.' },
      searching: (q, n) => `${n} نتيجة لـ «${q}» في كل الحجوزات`, noMatch: 'مفيش حاجة بالبحث ده.',
      demoNote: 'وضع تجريبي: الحجوزات هنا في المتصفح ده بس وببيانات للتجربة. اربط الداتابيز عشان يشتغل بجد.', resetDemo: 'رجّع بيانات التجربة',
      requested: 'طلب', roomField: 'الأوضة', dayField: 'اليوم', hourField: 'يبدأ الساعة', lengthField: 'المدة', noteField: 'ملاحظة للفريق',
      customerNote: 'ملاحظته', source: { web: 'من الموقع', staff: 'ضافه الفريق' },
      pickRoom: 'اختار أوضة', confirm: 'أكّد الحجز', save: 'احفظ', cancelReq: 'الغي الطلب', cancelBooking: 'الغي الحجز',
      done: 'اتلعب', noShow: 'مجاش', reopen: 'افتحه تاني', whatsapp: 'واتساب',
      clash: (room, from, to, who) => `${room} محجوزة من ${from} لـ ${to}${who ? ` (${who})` : ''}. اختار أوضة أو ساعة تانية.`,
      needRoom: 'اختار أوضة ومدة عشان تأكّد.', history: 'اللي حصل', notStarted: '«اتلعب» و«مجاش» بيفتحوا لما الحجز يبدأ.',
      ev: { requested: 'طلب من الموقع', added: 'اتضاف', confirmed: 'اتأكد', cancelled: 'اتلغى', done: 'اتعلّم اتلعب', no_show: 'اتعلّم مجاش', reopened: 'اتفتح تاني', edited: 'اتعدّل' },
      by: (who) => (who ? ` من ${who}` : ''),
      addTitle: 'ضيف حجز', addLine: 'حجز جه بالتليفون أو في الصالة.', typeField: 'نوع الأوضة', phoneField: 'الموبايل',
      confirmNow: 'أكّد دلوقتي', keepWaiting: 'احفظه مستني', badPhone: 'اكتب موبايل مصري، 11 رقم يبدأ بـ 01.', badName: 'اكتب الاسم.',
      saved: 'اتحفظ.', failed: 'محفظش. جرّب تاني.', busyErr: 'الأوضة دي محجوزة في الوقت ده.',
      boardTitle: 'جدول الأوض', boardLine: (n, w) => `${n} حجز النهارده${w ? ` · ${w} مستنيين مكالمة` : ''}`,
      prevDay: 'اليوم اللي قبله', nextDay: 'اليوم اللي بعده', today: 'النهارده', now: 'دلوقتي', anyRow: 'مستنيين، أي أوضة',
      legendBooked: 'متأكد', legendWaiting: 'مستني مكالمة', legendPlayed: 'اتلعب',
      roomsTitle: 'الأوض', roomsLine: (off) => (off ? `${off} برّه الخدمة` : 'كل الأوض شغالة.'),
      inService: 'شغالة', outOfService: 'برّه الخدمة', notePlaceholder: 'ليه واقفة (للفريق)', roomsReadOnly: 'المدير أو المالك بس يقدر يغيّر هنا.',
      types: { normal: 'Normal PS5', vip: 'VIP PS5', pool: 'Pool Room', cinema: 'Cinema Room' },
      typeLine: { normal: 'لحد 6 أفراد · 200 جنيه للساعة', vip: 'لحد 10 أفراد · 250 جنيه للساعة', pool: 'لحد 15 فرد · 400 جنيه للساعة', cinema: 'لحد 12 فرد · 500 جنيه للساعة' },
      teamTitle: 'الفريق', teamLine: (n, p) => `${n} عندهم صلاحية${p ? ` · ${p} مستنيين موافقة` : ''}`,
      people: 'الناس', peopleLine: 'كل اللي يقدر يفتح الصفحة دي، ويعمل إيه.',
      roleHelp: 'شيفت: الحجوزات والجدول. مدير: كمان الأوض. المالك: كمان الفريق.',
      requests: 'مستنيين موافقة', requestsLine: 'عملوا حساب من الصفحة دي. اديلهم دور، أو ارفض.',
      noRequests: 'محدش مستني.', approve: 'وافق', decline: 'ارفض', active: 'الصلاحية شغالة', you: 'إنت',
      addPeople: 'إزاي تضيف حد', addPeopleLine: 'ابعتله لينك الصفحة دي. يعمل حساب بإيميله، ويظهر هنا عشان توافق عليه.',
      teamReadOnly: 'المالك بس يقدر يغيّر الفريق.',
      newRequest: (ref) => `طلب جديد رقم ${ref}`,
      open: 'افتح', loadErr: 'معرفناش نجيب الحجوزات.', retry: 'جرّب تاني',
      nowTitle: 'دلوقتي', freeOf: (f, n) => `${f} من ${n} فاضيين`, free: 'فاضية', busyUntil: (t) => `مشغولة لحد ${t}`, offNote: (n) => `${n} برّه الخدمة`,
      nextTitle: 'جايين بعد شوية', nothingNext: 'مفيش حجوزات متأكدة جاية.',
      hourShort: 'س', minShort: 'د',
      agoNow: 'دلوقتي', agoMin: (n) => `من ${n} دقيقة`, agoHour: (n) => `من ${n} ساعة`, agoDay: (n) => `من ${n} يوم`,
      yesterday: 'امبارح', tomorrow: 'بكرة', tonight: 'النهارده',
    },
  };
  let lang = 'en';
  try { lang = localStorage.getItem('clash-language') === 'ar' ? 'ar' : 'en'; } catch (e) { /* storage unavailable */ }
  const W = () => WORDS[lang];
  const setLang = (next) => {
    lang = next;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('clash-language', lang); } catch (e) { /* storage unavailable */ }
    render();
  };

  /* ================================================================ formatting */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hourLabel = (h, mi = 0) => {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const m = mi ? `:${String(mi).padStart(2, '0')}` : '';
    return lang === 'ar' ? `${h12}${m} ${h < 12 ? 'ص' : 'م'}` : `${h12}${m} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const timeOf = (iso) => { const p = T.parts(new Date(iso)); return hourLabel(p.h, p.mi); };
  const dateFmt = () => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayName = (key) => {
    const today = T.loungeDay();
    if (key === today) return W().tonight;
    if (key === T.addDays(today, 1)) return W().tomorrow;
    if (key === T.addDays(today, -1)) return W().yesterday;
    const [y, m, d] = T.split(key);
    return dateFmt().format(new Date(Date.UTC(y, m - 1, d)));
  };
  const fullDate = (key) => { const [y, m, d] = T.split(key); return dateFmt().format(new Date(Date.UTC(y, m - 1, d))); };
  const ago = (iso) => {
    const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (min < 1) return W().agoNow;
    if (min < 60) return W().agoMin(min);
    if (min < 60 * 24) return W().agoHour(Math.round(min / 60));
    return W().agoDay(Math.round(min / 1440));
  };
  const length = (min) => {
    if (!min) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    return [h ? `${h} ${W().hourShort}` : '', m ? `${m} ${W().minShort}` : ''].filter(Boolean).join(' ');
  };
  const phonePretty = (p) => (p && p.length === 11 ? `${p.slice(0, 3)} ${p.slice(3, 7)} ${p.slice(7)}` : p || '');
  const waLink = (p) => `https://wa.me/2${p}`;
  const endOf = (b) => Date.parse(b.starts_at) + (b.minutes || 120) * 60000;

  /* ================================================================ state */
  const st = {
    me: null, rooms: [], bookings: [], staff: [], loaded: false, loadErr: false,
    view: 'bookings', filter: 'waiting', q: '', open: null, adding: false, boardDay: T.loungeDay(),
    events: [], draft: null, msg: null, gate: 'in', gateMsg: null, busy: false, menu: false, checked: false,
  };
  const roomById = (id) => st.rooms.find((r) => r.id === id);
  const roomName = (id) => (roomById(id) || {}).name || '—';
  const typeName = (t) => W().types[t] || t;
  /* the room a booking holds or asks for, as HTML: a room's own name is Latin and kept apart from the Arabic around it */
  const roomLabel = (b) => (b.room_id || b.requested_room ? `<bdi>${esc(roomName(b.room_id || b.requested_room))}</bdi>` : W().any(esc(typeName(b.room_type))));
  const sideOf = (b) => { const r = roomById(b.room_id || b.requested_room); if (r) return r.side; const any = st.rooms.find((x) => x.type === b.room_type); return any ? any.side : null; };
  const can = (what) => {
    const role = st.me && st.me.staff && st.me.staff.role;
    if (what === 'rooms') return role === 'owner' || role === 'manager';
    if (what === 'team') return role === 'owner';
    if (what === 'seeTeam') return role === 'owner' || role === 'manager';
    return Boolean(role);
  };

  /* which bookings each count card holds, computed from the rows on screen */
  const today = () => T.loungeDay();
  const inDay = (b, key) => Date.parse(b.starts_at) >= +T.dayStart(key) && Date.parse(b.starts_at) < +T.dayEnd(key);
  const FILTERS = {
    waiting: { test: (b) => b.status === 'pending', sort: (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) },
    upcoming: { test: (b) => b.status === 'confirmed' && endOf(b) > Date.now(), sort: (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) },
    today: { test: (b) => b.status !== 'cancelled' && inDay(b, today()), sort: (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) },
    finished: { test: (b) => b.status === 'done' || b.status === 'no_show', sort: (a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at) },
    cancelled: { test: (b) => b.status === 'cancelled', sort: (a, b) => Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at) },
  };

  /* ================================================================ loading */
  async function loadAll() {
    try {
      const from = new Date(+T.dayStart(T.addDays(today(), -14)));
      const to = new Date(+T.dayEnd(T.addDays(today(), 32)));
      const [rooms, bookings] = await Promise.all([S.rooms(), S.bookings(from, to)]);
      st.rooms = rooms; st.bookings = bookings; st.loaded = true; st.loadErr = false;
      if (can('seeTeam')) st.staff = await S.staffList();
    } catch (e) { st.loadErr = true; }
    render();
  }
  let reloadTimer = null;
  const seen = new Set();
  function watch() {
    S.subscribe(() => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(async () => {
        await loadAll();
        /* a request that was not here before: tell the shift */
        st.bookings.filter((b) => b.status === 'pending' && !seen.has(b.id)).forEach((b) => toast(b));
        st.bookings.forEach((b) => seen.add(b.id));
        if (st.open) { st.events = await S.events(st.open).catch(() => []); render(); }
      }, 250);
    });
  }

  async function boot() {
    /* demo mode only: admin/?demo or admin/#demo opens straight in as the owner, for previews */
    if (!S.live && /[?&#]demo/.test(location.search + location.hash) && !(await S.session())) await S.signIn('owner@clash.demo');
    try { st.me = await S.session(); } catch (e) { st.me = null; }
    st.checked = true;
    if (!st.me) { render(); return; }
    if (!st.me.staff || st.me.staff.status !== 'active') {
      render();
      /* waiting for approval: look again every 20 seconds */
      setTimeout(boot, 20000);
      return;
    }
    route();
    await loadAll();
    st.bookings.forEach((b) => seen.add(b.id));
    watch();
  }

  function route() {
    const v = location.hash.replace('#', '');
    st.view = ['bookings', 'board', 'rooms', 'team'].includes(v) ? v : 'bookings';
    if (st.view === 'team' && !can('seeTeam')) st.view = 'bookings';
  }
  addEventListener('hashchange', () => { route(); st.menu = false; render(); });

  /* ================================================================ rendering */
  function render() {
    if (!st.checked) return;
    if (!st.me) { app.innerHTML = gateHtml(); document.title = 'Clash staff'; return; }
    if (!st.me.staff || st.me.staff.status !== 'active') { app.innerHTML = waitHtml(); return; }
    const w = W();
    const waiting = st.bookings.filter(FILTERS.waiting.test).length;
    document.title = `${waiting ? `(${waiting}) ` : ''}${w[`nav${st.view[0].toUpperCase()}${st.view.slice(1)}`]} · Clash staff`;
    app.innerHTML = `
      <div class="shell">
        ${sideHtml(waiting)}
        ${topHtml()}
        <main class="canvas" id="main">${S.live ? '' : `<p class="demo-note"><span>${esc(w.demoNote)}</span><button class="btn btn-text" data-act="reset-demo">${esc(w.resetDemo)}</button></p>`}${viewHtml()}</main>
      </div>
      ${st.open || st.adding ? drawerHtml() : ''}`;
  }

  function sideHtml(waiting) {
    const w = W();
    const item = (view, label, count) => `<a class="nav-item" href="#${view}"${st.view === view ? ' aria-current="page"' : ''}><span>${esc(label)}</span>${count ? `<span class="count">${count}</span>` : ''}</a>`;
    const soon = (label) => `<span class="nav-item is-soon" aria-disabled="true"><span>${esc(label)}</span><small>${esc(w.soon)}</small></span>`;
    return `
      <aside class="side${st.menu ? ' is-open' : ''}" id="side">
        <a class="brand" href="#bookings"><img src="../assets/brand/clash-logo-512.png" alt=""><b>CLASH</b><span>${esc(w.staff)}</span></a>
        ${st.menu ? `<button class="btn btn-line" data-act="menu" style="justify-self:start;margin:0 0 12px 10px">${esc(w.close)}</button>` : ''}
        <nav class="nav" aria-label="${esc(w.menu)}">
          <p class="nav-group">${esc(w.groupPs)}</p>
          ${item('bookings', w.navBookings, waiting)}
          ${item('board', w.navBoard)}
          ${item('rooms', w.navRooms)}
          ${can('seeTeam') ? `<p class="nav-group">${esc(w.groupClash)}</p>${item('team', w.navTeam)}` : ''}
          <p class="nav-group">${esc(w.groupNext)}</p>
          ${soon(w.soonPc)}${soon(w.soonCustomers)}${soon(w.soonReports)}
        </nav>
        <div class="me">
          <div><p class="me-name">${esc(st.me.staff.name)}</p><p class="me-role">${esc(w.roles[st.me.staff.role])} · ${esc(st.me.user.email)}</p></div>
          <div class="me-actions">
            <button class="btn btn-text" data-act="lang" lang="${lang === 'ar' ? 'en' : 'ar'}">${esc(w.langBtn)}</button>
            <button class="btn btn-text" data-act="sign-out">${esc(w.signOut)}</button>
          </div>
        </div>
      </aside>`;
  }

  function topHtml() {
    const w = W();
    return `
      <header class="top">
        <button class="btn btn-line menu-btn" data-act="menu" aria-expanded="${st.menu}" aria-controls="side">${esc(w.menu)}</button>
        <label class="search"><span class="sr-only">${esc(w.search)}</span><input type="search" value="${esc(st.q)}" placeholder="${esc(w.search)}" data-act="search"></label>
        <div class="top-right">
          <p class="stamp${S.live ? '' : ' is-demo'}"><i></i>${esc(S.live ? w.live : w.demo)}</p>
          <div class="scope"><b>${esc(w.branch)}</b><span>${esc(w.branchLine)}</span></div>
        </div>
      </header>`;
  }

  function viewHtml() {
    if (st.loadErr) return `<div class="title-row"><div><h1>${esc(W().bookingsTitle)}</h1></div></div><div class="panel empty">${esc(W().loadErr)} <button class="btn btn-text" data-act="retry">${esc(W().retry)}</button></div>`;
    if (!st.loaded) return `<div class="title-row"><div><h1>${esc(W()[`nav${st.view[0].toUpperCase()}${st.view.slice(1)}`])}</h1></div></div><div class="panel empty">…</div>`;
    if (st.q.trim()) return bookingsHtml();
    if (st.view === 'board') return boardHtml();
    if (st.view === 'rooms') return roomsHtml();
    if (st.view === 'team') return teamHtml();
    return bookingsHtml();
  }

  /* ---------------------------------------------------------------- bookings */
  function bookingsHtml() {
    const w = W();
    const waitingRows = st.bookings.filter(FILTERS.waiting.test).sort(FILTERS.waiting.sort);
    const q = st.q.trim().toLowerCase().replace(/^#/, '');
    let rows;
    let line;
    if (q) {
      const digits = q.replace(/[^0-9]/g, '');
      rows = st.bookings.filter((b) => b.customer_name.toLowerCase().includes(q) || (digits && (b.customer_phone.includes(digits) || String(b.ref) === digits)))
        .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
      line = esc(w.searching(st.q.trim(), rows.length));
    } else {
      const f = FILTERS[st.filter];
      rows = st.bookings.filter(f.test).sort(f.sort);
      line = w.finding(waitingRows.length, waitingRows.length ? ago(waitingRows[0].created_at) : '');
    }
    const cards = Object.keys(FILTERS).map((k) => `
      <button class="count-card${k === 'waiting' && waitingRows.length ? ' is-wait' : ''}" data-act="filter" data-filter="${k}" aria-pressed="${!q && st.filter === k}">
        <span>${esc(w.cards[k])}</span><b>${st.bookings.filter(FILTERS[k].test).length}</b>
      </button>`).join('');
    const row = (b) => {
      const side = sideOf(b);
      const day = T.loungeDay(new Date(b.starts_at));
      return `
        <tr data-act="open" data-id="${b.id}"${st.open === b.id ? ' aria-selected="true"' : ''}>
          <td class="ref num">#${b.ref}</td>
          <td><p class="cell-main">${esc(b.customer_name)}</p><p class="cell-sub num" dir="ltr">${esc(phonePretty(b.customer_phone))}</p></td>
          <td class="c-room"><p class="cell-main"><span class="team team-${side || 'none'}"></span>${roomLabel(b)}</p><p class="cell-sub">${b.room_id || b.requested_room ? esc(typeName(b.room_type)) : ''}</p></td>
          <td class="c-when"><p class="cell-main">${esc(dayName(day))} · ${esc(timeOf(b.starts_at))}</p><p class="cell-sub">${esc(fullDate(day))}${b.minutes ? ` · ${esc(length(b.minutes))}` : ''}</p></td>
          <td class="c-asked"><p class="cell-sub">${esc(ago(b.created_at))}</p></td>
          <td class="c-status"><span class="pill pill-${b.status}">${esc(w.status[b.status])}</span></td>
          <td class="act">${b.status === 'pending' ? `<a class="btn btn-line" href="tel:${b.customer_phone}" data-stop>${esc(w.call)}</a>` : ''}</td>
        </tr>`;
    };
    return `
      <div class="title-row">
        <div><h1>${esc(w.bookingsTitle)}</h1><p>${line}</p></div>
        <div class="title-actions"><button class="btn btn-primary" data-act="add">${esc(w.add)}</button></div>
      </div>
      ${q ? '' : `<div class="counts">${cards}</div>`}
      <div class="split">
      <div class="panel">
        ${rows.length ? `
        <table class="table">
          <thead><tr><th class="ref">${esc(w.cols.ref)}</th><th>${esc(w.cols.customer)}</th><th>${esc(w.cols.room)}</th><th>${esc(w.cols.when)}</th><th>${esc(w.cols.asked)}</th><th>${esc(w.cols.status)}</th><th class="act"><span class="sr-only">${esc(w.call)}</span></th></tr></thead>
          <tbody>${rows.slice(0, 100).map(row).join('')}</tbody>
        </table>` : `<p class="empty">${esc(q ? w.noMatch : w.emptyFilter[st.filter])}</p>`}
      </div>
      ${railHtml()}
      </div>`;
  }

  /* beside the list: which rooms are free this minute, and who arrives next (what the shift is asked on the phone) */
  function railHtml() {
    const w = W();
    const now = Date.now();
    const holding = (r) => st.bookings.find((b) => b.status === 'confirmed' && b.room_id === r.id && Date.parse(b.starts_at) <= now && endOf(b) > now);
    const kinds = ['normal', 'vip', 'pool', 'cinema'].map((type) => {
      const rooms = st.rooms.filter((r) => r.type === type);
      const working = rooms.filter((r) => r.in_service);
      const taken = working.map(holding).filter(Boolean);
      const off = rooms.length - working.length;
      const status = rooms.length === 1
        ? (!working.length ? w.outOfService : taken.length ? w.busyUntil(timeOf(new Date(endOf(taken[0])).toISOString())) : w.free)
        : w.freeOf(working.length - taken.length, working.length);
      const cells = rooms.length > 1
        ? `<span class="cells" aria-hidden="true">${rooms.map((r) => `<i class="team-${r.side}${!r.in_service ? ' is-off' : holding(r) ? ' is-taken' : ''}"></i>`).join('')}</span>`
        : '';
      return `<div class="rail-row"><b>${esc(typeName(type))}</b><span class="num">${esc(status)}</span>${cells}${off && rooms.length > 1 ? `<p>${esc(w.offNote(off))}</p>` : ''}</div>`;
    }).join('');
    const next = st.bookings.filter((b) => b.status === 'confirmed' && Date.parse(b.starts_at) > now)
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)).slice(0, 5);
    const rows = next.map((b) => `<button class="rail-row" data-act="open" data-id="${b.id}"><b>${esc(b.customer_name)}</b><span class="num">${esc(timeOf(b.starts_at))}</span><p><span class="team team-${sideOf(b) || 'none'}"></span>${roomLabel(b)} · ${esc(dayName(T.loungeDay(new Date(b.starts_at))))} · ${esc(length(b.minutes))}</p></button>`).join('');
    return `
      <aside class="rail">
        <section><h2>${esc(w.nowTitle)}</h2><div class="rail-list">${kinds}</div></section>
        <section><h2>${esc(w.nextTitle)}</h2><div class="rail-list">${rows || `<p class="panel-empty">${esc(w.nothingNext)}</p>`}</div></section>
      </aside>`;
  }

  /* ---------------------------------------------------------------- rooms board */
  function boardHtml() {
    const w = W();
    const day = st.boardDay;
    const start = +T.dayStart(day), end = +T.dayEnd(day), span = end - start;
    const pos = (ms) => Math.max(0, Math.min(100, ((ms - start) / span) * 100));
    const dayRows = st.bookings.filter((b) => b.status !== 'cancelled' && Date.parse(b.starts_at) < end && endOf(b) > start);
    const booked = dayRows.filter((b) => b.status !== 'pending').length;
    const waiting = dayRows.filter((b) => b.status === 'pending').length;
    const bar = (b) => {
      const s = Date.parse(b.starts_at);
      const left = pos(s), right = pos(endOf(b));
      const cls = b.status === 'pending' ? 'is-pending' : b.status === 'confirmed' ? `bar-${sideOf(b) || 'blue'}` : 'is-done';
      const label = `${b.customer_name} · ${timeOf(b.starts_at)}`;
      return `<button class="bar ${cls}" data-act="open" data-id="${b.id}" style="inset-inline-start:${left}%;width:${Math.max(2.4, right - left)}%" title="${esc(label)}"><span>${esc(b.customer_name.split(' ')[0])}</span></button>`;
    };
    const lane = (roomId) => dayRows.filter((b) => (b.room_id || (b.status === 'pending' && b.requested_room)) === roomId).map(bar).join('');
    const anyRows = dayRows.filter((b) => b.status === 'pending' && !b.requested_room && !b.room_id);
    const groups = ['normal', 'vip', 'pool', 'cinema'].map((type) => {
      const rooms = st.rooms.filter((r) => r.type === type);
      return `<p class="board-group">${esc(typeName(type))}</p>${rooms.map((r) => `
        <p class="board-name${r.in_service ? '' : ' is-off'}"><span class="team team-${r.side}"></span><span dir="ltr">${esc(r.name)}</span></p>
        <div class="board-lane">${lane(r.id)}</div>`).join('')}`;
    }).join('');
    const nowPct = Date.now() >= start && Date.now() < end ? pos(Date.now()) : null;
    const hours = T.HOURS.filter((_, i) => i % 2 === 0).map((h, i) => ({ h, pct: (i * 2 / 24) * 100 }))
      .filter(({ pct }) => nowPct === null || Math.abs(pct - nowPct) > 4)
      .map(({ h, pct }) => `<span style="inset-inline-start:${pct}%">${esc(hourLabel(h))}</span>`).join('');
    return `
      <div class="title-row">
        <div><h1>${esc(w.boardTitle)}</h1><p>${esc(dayName(day))} · ${esc(fullDate(day))} · ${esc(w.boardLine(booked, waiting))}</p></div>
        <div class="title-actions board-tools">
          <button class="btn btn-line" data-act="day" data-step="-1" aria-label="${esc(w.prevDay)}">‹</button>
          <button class="btn btn-line" data-act="day" data-step="0">${esc(w.today)}</button>
          <button class="btn btn-line" data-act="day" data-step="1" aria-label="${esc(w.nextDay)}">›</button>
          <button class="btn btn-primary" data-act="add">${esc(w.add)}</button>
        </div>
      </div>
      <div class="panel board">
        <div class="board-grid">
          <div class="board-lines" aria-hidden="true">${'<i></i>'.repeat(24)}</div>
          <p></p><div class="board-hours">${hours}</div>
          ${anyRows.length ? `<p class="board-group">${esc(w.anyRow)}</p><p class="board-name"></p><div class="board-lane">${anyRows.map(bar).join('')}</div>` : ''}
          ${groups}
          ${nowPct !== null ? `<div class="now-line" style="inset-inline-start:calc(150px + (100% - 150px) * ${nowPct / 100})"><span>${esc(w.now)}</span></div>` : ''}
        </div>
        <p class="legend"><span><i style="background:#8f1820"></i><i style="background:#1d438f"></i>${esc(w.legendBooked)}</span><span><i style="border:1px dashed var(--wait-ink)"></i>${esc(w.legendWaiting)}</span><span><i style="background:var(--raised)"></i>${esc(w.legendPlayed)}</span></p>
      </div>`;
  }

  /* ---------------------------------------------------------------- rooms */
  function roomsHtml() {
    const w = W();
    const off = st.rooms.filter((r) => !r.in_service).length;
    const edit = can('rooms');
    const rows = ['normal', 'vip', 'pool', 'cinema'].map((type) => `
      <section class="row">
        <div class="row-label"><h2>${esc(typeName(type))}</h2><p>${esc(w.typeLine[type])}</p></div>
        <div class="row-panel">${st.rooms.filter((r) => r.type === type).map((r) => `
          <div class="line">
            <div class="line-main"><b><span class="team team-${r.side}"></span><span dir="ltr">${esc(r.name)}</span></b><p>${esc(r.in_service ? w.inService : w.outOfService)}${r.note ? ` · ${esc(r.note)}` : ''}</p></div>
            ${edit && !r.in_service ? `<input class="input" data-act="room-note" data-id="${r.id}" value="${esc(r.note || '')}" placeholder="${esc(w.notePlaceholder)}" aria-label="${esc(w.notePlaceholder)}">` : ''}
            <button class="toggle" role="switch" aria-checked="${r.in_service}" aria-label="${esc(r.name)} · ${esc(w.inService)}" data-act="room-toggle" data-id="${r.id}"${edit ? '' : ' disabled'}></button>
          </div>`).join('')}
        </div>
      </section>`).join('');
    return `
      <div class="title-row"><div><h1>${esc(w.roomsTitle)}</h1><p>${esc(w.roomsLine(off))}${edit ? '' : ` · ${esc(w.roomsReadOnly)}`}</p></div></div>
      <div class="rows">${rows}</div>`;
  }

  /* ---------------------------------------------------------------- team */
  function teamHtml() {
    const w = W();
    const edit = can('team');
    const active = st.staff.filter((p) => p.status !== 'pending');
    const pending = st.staff.filter((p) => p.status === 'pending');
    const roleSelect = (p) => `<span class="select-wrap"><select class="select" data-act="role" data-id="${p.user_id}" aria-label="${esc(p.name)}"${edit && p.user_id !== st.me.user.id ? '' : ' disabled'}>
      ${['shift', 'manager', 'owner'].map((r) => `<option value="${r}"${p.role === r ? ' selected' : ''}>${esc(w.roles[r])}</option>`).join('')}</select></span>`;
    return `
      <div class="title-row"><div><h1>${esc(w.teamTitle)}</h1><p>${esc(w.teamLine(active.filter((p) => p.status === 'active').length, pending.length))}${edit ? '' : ` · ${esc(w.teamReadOnly)}`}</p></div></div>
      <div class="rows">
        <section class="row">
          <div class="row-label"><h2>${esc(w.requests)}</h2><p>${esc(w.requestsLine)}</p></div>
          <div class="row-panel">${pending.length ? pending.map((p) => `
            <div class="line">
              <div class="line-main"><b>${esc(p.name)}</b><p>${esc(p.email)} · ${esc(ago(p.created_at))}</p></div>
              ${edit ? `${roleSelect(p)}<button class="btn btn-primary" data-act="approve" data-id="${p.user_id}">${esc(w.approve)}</button><button class="btn btn-danger" data-act="decline" data-id="${p.user_id}">${esc(w.decline)}</button>` : ''}
            </div>`).join('') : `<p class="panel-empty">${esc(w.noRequests)}</p>`}
          </div>
        </section>
        <section class="row">
          <div class="row-label"><h2>${esc(w.people)}</h2><p>${esc(w.peopleLine)}</p><p>${esc(w.roleHelp)}</p></div>
          <div class="row-panel">${active.map((p) => `
            <div class="line">
              <div class="line-main"><b>${esc(p.name)}${p.user_id === st.me.user.id ? ` · ${esc(w.you)}` : ''}</b><p>${esc(p.email)}</p></div>
              ${roleSelect(p)}
              <button class="toggle" role="switch" aria-checked="${p.status === 'active'}" aria-label="${esc(p.name)} · ${esc(w.active)}" data-act="staff-toggle" data-id="${p.user_id}"${edit && p.user_id !== st.me.user.id ? '' : ' disabled'}></button>
            </div>`).join('')}
          </div>
        </section>
        <section class="row">
          <div class="row-label"><h2>${esc(w.addPeople)}</h2><p>${esc(w.addPeopleLine)}</p></div>
          <div class="row-panel"><div class="line"><div class="line-main"><b class="num" dir="ltr">${esc(location.origin + location.pathname)}</b></div><button class="btn btn-line" data-act="copy-link">${lang === 'ar' ? 'انسخ' : 'Copy'}</button></div></div>
        </section>
      </div>`;
  }

  /* ---------------------------------------------------------------- the drawer: one booking, or a new one */
  function freshDraft(b) {
    if (!b) {
      const next = new Date(Date.now() + 60 * 60000);
      const p = T.parts(next);
      return { name: '', phone: '', room_type: 'normal', room_id: '', day: T.loungeDay(next), hour: p.h, minutes: 120, staff_note: '' };
    }
    const p = T.parts(new Date(b.starts_at));
    return { room_id: b.room_id || b.requested_room || '', day: T.loungeDay(new Date(b.starts_at)), hour: p.h, minutes: b.minutes || 120, staff_note: b.staff_note || '' };
  }
  /* a confirmed booking already holding that room in that time, if any */
  function clashFor(roomId, startMs, minutes, skipId) {
    if (!roomId) return null;
    return st.bookings.find((o) => o.id !== skipId && o.status === 'confirmed' && o.room_id === roomId
      && Date.parse(o.starts_at) < startMs + minutes * 60000 && endOf(o) > startMs) || null;
  }

  function drawerHtml() {
    const w = W();
    const b = st.open ? st.bookings.find((x) => x.id === st.open) : null;
    if (st.open && !b) return '';
    const d = st.draft;
    const type = b ? b.room_type : d.room_type;
    const startMs = +T.slot(d.day, d.hour);
    const clash = clashFor(d.room_id, startMs, d.minutes, b && b.id);
    const days = Array.from({ length: 31 }, (_, i) => T.addDays(today(), i - 1));
    if (!days.includes(d.day)) days.unshift(d.day);
    const roomOptions = st.rooms.filter((r) => r.type === type).map((r) => {
      const taken = clashFor(r.id, startMs, d.minutes, b && b.id);
      return `<option value="${r.id}"${d.room_id === r.id ? ' selected' : ''}${r.in_service ? '' : ' disabled'}>${esc(r.name)}${taken ? ` · ${esc(taken.customer_name.split(' ')[0])} ${esc(timeOf(taken.starts_at))}` : ''}${r.in_service ? '' : ` · ${esc(w.outOfService)}`}</option>`;
    }).join('');
    const lengths = [60, 90, 120, 150, 180, 240, 300, 360, 480, 600, 720];
    const sel = (act, opts, extra = '') => `<span class="select-wrap"><select class="select" data-act="${act}"${extra}>${opts}</select></span>`;
    const timeFields = `
      <label class="field"><span>${esc(w.dayField)}</span>${sel('d-day', days.map((k) => `<option value="${k}"${k === d.day ? ' selected' : ''}>${esc(dayName(k))}${k === today() || k === T.addDays(today(), 1) || k === T.addDays(today(), -1) ? ` · ${esc(fullDate(k))}` : ''}</option>`).join(''))}</label>
      <label class="field"><span>${esc(w.hourField)}</span>${sel('d-hour', T.HOURS.map((h) => `<option value="${h}"${h === d.hour ? ' selected' : ''}>${esc(hourLabel(h))}</option>`).join(''))}</label>
      <label class="field"><span>${esc(w.roomField)}</span>${sel('d-room', `<option value="">${esc(w.pickRoom)}</option>${roomOptions}`)}</label>
      <label class="field"><span>${esc(w.lengthField)}</span>${sel('d-minutes', lengths.map((m) => `<option value="${m}"${m === d.minutes ? ' selected' : ''}>${esc(length(m))}</option>`).join(''))}</label>
      <label class="field wide"><span>${esc(w.noteField)}</span><textarea class="textarea" data-act="d-note">${esc(d.staff_note)}</textarea></label>`;
    const clashMsg = clash ? `<p class="warn">${esc(w.clash(roomName(clash.room_id), timeOf(clash.starts_at), timeOf(new Date(endOf(clash)).toISOString()), clash.customer_name))}</p>` : '';
    const msg = st.msg ? `<p class="${st.msg.bad ? 'warn' : 'hint'}" role="status">${esc(st.msg.text)}</p>` : '';

    if (!b) {
      return `
        <div class="drawer-back" data-act="close"></div>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
          <div class="drawer-head"><h2 id="drawer-title" class="cell-main">${esc(w.addTitle)}</h2><button class="btn btn-text" data-act="close">${esc(w.close)}</button></div>
          <p class="hint">${esc(w.addLine)}</p>
          <div class="form-grid">
            <label class="field"><span>${esc(w.name)}</span><input class="input" data-act="d-name" value="${esc(d.name)}" autocomplete="off"></label>
            <label class="field"><span>${esc(w.phoneField)}</span><input class="input" data-act="d-phone" value="${esc(d.phone)}" inputmode="tel" dir="ltr" autocomplete="off"></label>
            <label class="field wide"><span>${esc(w.typeField)}</span>${sel('d-type', ['normal', 'vip', 'pool', 'cinema'].map((t) => `<option value="${t}"${t === d.room_type ? ' selected' : ''}>${esc(typeName(t))}</option>`).join(''))}</label>
            ${timeFields}
          </div>
          ${clashMsg}${msg}
          <div class="drawer-actions">
            <button class="btn btn-primary" data-act="add-save" data-status="confirmed"${!d.room_id || clash || st.busy ? ' disabled' : ''}>${esc(w.confirmNow)}</button>
            <button class="btn btn-line" data-act="add-save" data-status="pending"${st.busy ? ' disabled' : ''}>${esc(w.keepWaiting)}</button>
          </div>
        </aside>`;
    }

    const started = Date.parse(b.starts_at) <= Date.now();
    const open = b.status === 'pending' || b.status === 'confirmed';
    const asked = b.requested_room ? `<bdi>${esc(roomName(b.requested_room))}</bdi>` : w.any(esc(typeName(b.room_type)));
    const history = st.events.map((e) => `<li><span>${esc(w.ev[e.action] || e.action)}${esc(w.by(e.by_name))}</span><span>${esc(dayName(T.loungeDay(new Date(e.at))))} ${esc(timeOf(e.at))}</span></li>`).join('');
    return `
      <div class="drawer-back" data-act="close"></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div class="drawer-head"><span class="ref num">#${b.ref}</span><span class="pill pill-${b.status}">${esc(w.status[b.status])}</span><button class="btn btn-text" data-act="close">${esc(w.close)}</button></div>
        <div class="who">
          <h2 id="drawer-title">${esc(b.customer_name)}</h2>
          <p class="num" dir="ltr">${esc(phonePretty(b.customer_phone))}</p>
          <div class="who-actions">
            <a class="btn btn-line" href="tel:${b.customer_phone}">${esc(w.call)}</a>
            <a class="btn btn-line" href="${waLink(b.customer_phone)}" target="_blank" rel="noopener">${esc(w.whatsapp)}</a>
          </div>
        </div>
        <dl class="facts">
          <div><dt>${esc(w.requested)}</dt><dd><span class="team team-${sideOf(b) || 'none'}"></span>${asked}</dd></div>
          <div><dt>${esc(w.cols.when)}</dt><dd>${esc(dayName(T.loungeDay(new Date(b.starts_at))))} · ${esc(timeOf(b.starts_at))}</dd></div>
          <div><dt>${esc(w.cols.asked)}</dt><dd>${esc(ago(b.created_at))} · ${esc(w.source[b.source] || '')}</dd></div>
          <div><dt>${esc(w.lengthField)}</dt><dd>${esc(length(b.minutes))}</dd></div>
          ${b.customer_note ? `<div class="wide"><dt>${esc(w.customerNote)}</dt><dd>${esc(b.customer_note)}</dd></div>` : ''}
        </dl>
        ${open ? `<div class="form-grid">${timeFields}</div>${clashMsg}${b.status === 'pending' && !d.room_id ? `<p class="hint">${esc(w.needRoom)}</p>` : ''}` : (b.staff_note ? `<p class="hint">${esc(b.staff_note)}</p>` : '')}
        ${msg}
        <div class="drawer-actions">
          ${b.status === 'pending' ? `
            <button class="btn btn-primary" data-act="set" data-status="confirmed"${!d.room_id || clash || st.busy ? ' disabled' : ''}>${esc(w.confirm)}</button>
            <button class="btn btn-line" data-act="set"${st.busy ? ' disabled' : ''}>${esc(w.save)}</button>
            <button class="btn btn-danger" data-act="set" data-status="cancelled">${esc(w.cancelReq)}</button>` : ''}
          ${b.status === 'confirmed' ? `
            <button class="btn btn-primary" data-act="set"${clash || st.busy ? ' disabled' : ''}>${esc(w.save)}</button>
            <button class="btn btn-line" data-act="set" data-status="done"${started ? '' : ' disabled'}>${esc(w.done)}</button>
            <button class="btn btn-line" data-act="set" data-status="no_show"${started ? '' : ' disabled'}>${esc(w.noShow)}</button>
            <button class="btn btn-danger" data-act="set" data-status="cancelled">${esc(w.cancelBooking)}</button>` : ''}
          ${!open ? `<button class="btn btn-line" data-act="set" data-status="pending">${esc(w.reopen)}</button>` : ''}
        </div>
        ${b.status === 'confirmed' && !started ? `<p class="hint">${esc(w.notStarted)}</p>` : ''}
        ${history ? `<section class="history"><h3>${esc(w.history)}</h3><ul>${history}</ul></section>` : ''}
      </aside>`;
  }

  /* ---------------------------------------------------------------- sign in */
  function gateHtml() {
    const w = W();
    const up = st.gate === 'up';
    return `
      <main class="gate">
        <form class="gate-card" data-act="${up ? 'sign-up' : 'sign-in'}" novalidate>
          <p class="brand"><img src="../assets/brand/clash-logo-512.png" alt=""><b>CLASH</b><span>${esc(w.staff)}</span></p>
          <h1>${esc(up ? w.signUpTitle : w.signInTitle)}</h1>
          <p>${esc(w.signInLine)}</p>
          ${up ? `<label class="field"><span>${esc(w.name)}</span><input class="input" name="name" autocomplete="name" required></label>` : ''}
          <label class="field"><span>${esc(w.email)}</span><input class="input" name="email" type="email" autocomplete="username" dir="ltr" required></label>
          <label class="field"><span>${esc(w.password)}</span><input class="input" name="password" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" dir="ltr" required></label>
          ${st.gateMsg ? `<p class="gate-msg" role="alert">${esc(st.gateMsg)}</p>` : ''}
          <button class="btn btn-primary" type="submit"${st.busy ? ' disabled' : ''}>${esc(up ? w.signUp : w.signIn)}</button>
          <button class="btn btn-text gate-switch" type="button" data-act="gate-switch">${esc(up ? w.toSignIn : w.toSignUp)}</button>
          ${S.live ? '' : `<p class="hint">${esc(w.demoGate)}</p>`}
          <button class="btn btn-text gate-switch" type="button" data-act="lang">${esc(w.langBtn)}</button>
        </form>
      </main>`;
  }
  function waitHtml() {
    const w = W();
    const off = st.me.staff && st.me.staff.status === 'disabled';
    return `
      <main class="gate"><div class="gate-card">
        <p class="brand"><img src="../assets/brand/clash-logo-512.png" alt=""><b>CLASH</b><span>${esc(w.staff)}</span></p>
        <h1>${esc(off ? w.offTitle : w.waitTitle)}</h1>
        <p>${esc(off ? w.offLine : w.waitLine(st.me.staff ? st.me.staff.name : st.me.user.email))}</p>
        <button class="btn btn-line" data-act="sign-out">${esc(w.signOut)}</button>
      </div></main>`;
  }

  /* ---------------------------------------------------------------- a new request arrives */
  function toast(b) {
    const w = W();
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div><b>${esc(w.newRequest(b.ref))}</b><p>${esc(b.customer_name)} · ${roomLabel(b)} · ${esc(dayName(T.loungeDay(new Date(b.starts_at))))} ${esc(timeOf(b.starts_at))}</p></div><button class="btn btn-line">${esc(w.open)}</button>`;
    el.querySelector('button').addEventListener('click', () => { openBooking(b.id); el.remove(); });
    box.appendChild(el);
    setTimeout(() => el.remove(), 12000);
  }

  /* ================================================================ actions */
  async function openBooking(id) {
    const b = st.bookings.find((x) => x.id === id);
    if (!b) return;
    st.open = id; st.adding = false; st.msg = null; st.draft = freshDraft(b); st.events = [];
    render();
    st.events = await S.events(id).catch(() => []);
    if (st.open === id) render();
  }
  const closeDrawer = () => { st.open = null; st.adding = false; st.msg = null; render(); };

  async function setStatus(status) {
    const b = st.bookings.find((x) => x.id === st.open);
    const d = st.draft;
    const patch = { staff_note: d.staff_note || null };
    if (b.status === 'pending' || b.status === 'confirmed') {
      Object.assign(patch, { room_id: d.room_id || null, starts_at: T.slot(d.day, d.hour).toISOString(), minutes: d.room_id ? d.minutes : null });
    }
    if (status) patch.status = status;
    st.busy = true; render();
    try {
      await S.updateBooking(b.id, patch);
      st.msg = { text: W().saved };
      await loadAll();
      st.events = await S.events(b.id).catch(() => []);
      if (status === 'cancelled' || status === 'done' || status === 'no_show') st.draft = freshDraft(st.bookings.find((x) => x.id === b.id));
    } catch (e) {
      st.msg = { bad: true, text: e.code === 'room_busy' ? W().busyErr : W().failed };
    }
    st.busy = false; render();
  }

  async function addBooking(status) {
    const d = st.draft;
    const phone = S.cleanPhone(d.phone);
    if (d.name.trim().length < 2) { st.msg = { bad: true, text: W().badName }; render(); return; }
    if (!phone) { st.msg = { bad: true, text: W().badPhone }; render(); return; }
    st.busy = true; render();
    try {
      const row = await S.addBooking({
        room_type: d.room_type, room_id: d.room_id || null, requested_room: d.room_id || null, starts_at: T.slot(d.day, d.hour).toISOString(),
        minutes: d.room_id ? d.minutes : null, customer_name: d.name.trim(), customer_phone: phone, staff_note: d.staff_note || null,
        status: status === 'confirmed' && d.room_id ? 'confirmed' : 'pending',
      });
      seen.add(row.id);
      await loadAll();
      st.busy = false;
      openBooking(row.id);
      return;
    } catch (e) {
      st.msg = { bad: true, text: e.code === 'room_busy' ? W().busyErr : W().failed };
    }
    st.busy = false; render();
  }

  app.addEventListener('click', async (e) => {
    if (e.target.closest('[data-stop]')) { e.stopPropagation(); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'filter') { st.filter = el.dataset.filter; render(); }
    else if (act === 'open') openBooking(el.dataset.id);
    else if (act === 'close') closeDrawer();
    else if (act === 'add') { st.adding = true; st.open = null; st.msg = null; st.draft = freshDraft(null); render(); const first = app.querySelector('[data-act="d-name"]'); if (first) first.focus(); }
    else if (act === 'set') setStatus(el.dataset.status);
    else if (act === 'add-save') addBooking(el.dataset.status);
    else if (act === 'day') { const step = +el.dataset.step; st.boardDay = step ? T.addDays(st.boardDay, step) : today(); render(); }
    else if (act === 'menu') { st.menu = !st.menu; render(); }
    else if (act === 'lang') setLang(lang === 'ar' ? 'en' : 'ar');
    else if (act === 'sign-out') { await S.signOut(); st.me = null; st.loaded = false; render(); }
    else if (act === 'gate-switch') { st.gate = st.gate === 'up' ? 'in' : 'up'; st.gateMsg = null; render(); }
    else if (act === 'retry') loadAll();
    else if (act === 'reset-demo') { S.reset(); await loadAll(); }
    else if (act === 'room-toggle' && can('rooms')) { const r = roomById(el.dataset.id); await S.updateRoom(r.id, { in_service: !r.in_service }); await loadAll(); }
    else if (act === 'staff-toggle' && can('team')) { const p = st.staff.find((x) => x.user_id === el.dataset.id); await S.updateStaff(p.user_id, { status: p.status === 'active' ? 'disabled' : 'active' }); await loadAll(); }
    else if (act === 'approve' && can('team')) { const sel = app.querySelector(`[data-act="role"][data-id="${el.dataset.id}"]`); await S.updateStaff(el.dataset.id, { status: 'active', role: sel ? sel.value : 'shift' }); await loadAll(); }
    else if (act === 'decline' && can('team')) { await S.removeStaff(el.dataset.id); await loadAll(); }
    else if (act === 'copy-link') { try { await navigator.clipboard.writeText(location.origin + location.pathname); el.textContent = lang === 'ar' ? 'اتنسخ' : 'Copied'; } catch (err) { /* clipboard unavailable */ } }
  });

  app.addEventListener('change', async (e) => {
    const el = e.target;
    const act = el.dataset.act;
    if (!act) return;
    const d = st.draft;
    if (act === 'd-day') { d.day = el.value; render(); }
    else if (act === 'd-hour') { d.hour = +el.value; render(); }
    else if (act === 'd-room') { d.room_id = el.value; render(); }
    else if (act === 'd-minutes') { d.minutes = +el.value; render(); }
    else if (act === 'd-type') { d.room_type = el.value; d.room_id = ''; render(); }
    else if (act === 'role' && can('team')) {
      const p = st.staff.find((x) => x.user_id === el.dataset.id);
      if (p && p.status !== 'pending') { await S.updateStaff(p.user_id, { role: el.value }); await loadAll(); }
    } else if (act === 'room-note' && can('rooms')) { await S.updateRoom(el.dataset.id, { note: el.value.trim() || null }); await loadAll(); }
  });

  app.addEventListener('input', (e) => {
    const el = e.target;
    const act = el.dataset.act;
    if (act === 'search') {
      st.q = el.value;
      const pos = el.selectionStart;
      const main = document.getElementById('main');
      if (main) main.innerHTML = (S.live ? '' : main.querySelector('.demo-note') ? main.querySelector('.demo-note').outerHTML : '') + viewHtml();
      el.focus(); el.setSelectionRange(pos, pos);
    } else if (act === 'd-note') st.draft.staff_note = el.value;
    else if (act === 'd-name') st.draft.name = el.value;
    else if (act === 'd-phone') st.draft.phone = el.value;
  });

  app.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const val = (n) => (form.querySelector(`[name="${n}"]`) || {}).value || '';
    st.busy = true; st.gateMsg = null; render();
    try {
      if (form.dataset.act === 'sign-up') {
        const res = await S.signUp(val('name').trim(), val('email').trim(), val('password'));
        if (res && res.needsConfirm) { st.gate = 'in'; st.gateMsg = W().checkEmail; st.busy = false; render(); return; }
      } else {
        await S.signIn(val('email').trim(), val('password'));
      }
      st.busy = false;
      await boot();
    } catch (err) {
      const w = W();
      st.gateMsg = { unconfirmed: w.unconfirmed, exists: w.exists, bad_signup: w.badSignup }[err.code] || w.badLogin;
      st.busy = false; render();
    }
  });

  addEventListener('keydown', (e) => { if (e.key === 'Escape' && (st.open || st.adding)) closeDrawer(); });
  /* relative times stay true */
  setInterval(() => { if (st.loaded && !st.open && !st.adding && document.activeElement.tagName !== 'INPUT') render(); }, 60000);

  setLang(lang);
  boot();
})();
