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
      navMembers: 'New members',
      mTitle: 'New members', mSub: 'Sign-ups from the site. Check the ID, then accept or reject.',
      mPending: 'Pending', mAccepted: 'Accepted', mRejected: 'Rejected', mNone: 'Nothing here.', mMore: 'Load more', mLoading: 'Loading…',
      mId: 'ID ✓', mNoId: 'No ID', mAge: (n) => `${n} y`, mWa: 'WhatsApp',
      mFirst: 'First name', mLast: 'Last name', mUser: 'Username', mPhone: 'Mobile', mEmail: 'Email', mBirth: 'Birth date', mAgeL: 'Age', mSent: 'Sent', mSource: 'Source',
      mStatus: 'Status', mBy: 'Decided by', mReason: 'Reason', mIdFront: 'ID front', mIdBack: 'ID back', mTapZoom: 'Tap to zoom', mImgLoading: 'Loading photos…',
      mWaitBranch: 'Waiting for branch visit: no ID photos were sent.', mAccept: 'Accept', mReject: 'Reject',
      mConfirmAcceptQ: (n) => `Accept ${n}? This turns the lounge account on.`, mConfirm: 'Yes, accept', mBack: 'Back',
      mRejectTitle: 'Why reject?', mQuick: ['ID not clear', "Name doesn't match ID", 'Under age', 'Other…'], mReasonPh: 'Write the reason', mReasonNeed: 'Write a reason first.', mSendReject: 'Reject request',
      mDoneAccepted: 'Accepted. The account is on.', mDoneRejected: 'Rejected. The account stays off.', mTellMember: 'Now tell the member:', mWaSend: 'Send on WhatsApp',
      mWaTextCome: (n) => `Hi ${n}, this is Clash Esports. To finish setting up your account, please come to the branch with your national ID. Thank you!`,
      mErr401: 'Your sign-in expired. Sign out and sign in again.', mErr403: "Your account isn't staff.", mErrDown: 'The lounge system is not answering. Try again in a moment.',
      mErrNet: 'Could not reach the server.', mErrNoApi: 'No server is set for this page.', mErrGeneric: 'Something went wrong.', mErrGone: 'This request was already handled.',
      mS: { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected' }, mSrc: { web: 'Site', google: 'Google' },
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
      navMembers: 'الأعضاء الجدد',
      mTitle: 'الأعضاء الجدد', mSub: 'طلبات التسجيل من الموقع. اتأكد من البطاقة وبعدها اقبل أو ارفض.',
      mPending: 'مستني', mAccepted: 'مقبول', mRejected: 'مرفوض', mNone: 'مفيش حاجة هنا.', mMore: 'هات أكتر', mLoading: 'بيحمّل…',
      mId: 'بطاقة ✓', mNoId: 'من غير بطاقة', mAge: (n) => `${n} سنة`, mWa: 'واتساب',
      mFirst: 'الاسم الأول', mLast: 'اسم العيلة', mUser: 'اسم المستخدم', mPhone: 'الموبايل', mEmail: 'الإيميل', mBirth: 'تاريخ الميلاد', mAgeL: 'السن', mSent: 'اتبعت', mSource: 'المصدر',
      mStatus: 'الحالة', mBy: 'اللي قرر', mReason: 'السبب', mIdFront: 'البطاقة (الوش)', mIdBack: 'البطاقة (الضهر)', mTapZoom: 'دوس عشان تكبّر', mImgLoading: 'بنحمّل الصور…',
      mWaitBranch: 'مستني زيارة الفرع: ما بعتش صور البطاقة.', mAccept: 'اقبل', mReject: 'ارفض',
      mConfirmAcceptQ: (n) => `تقبل ${n}؟ ده هيفتح حسابه في الصالة.`, mConfirm: 'أيوه، اقبل', mBack: 'رجوع',
      mRejectTitle: 'ليه الرفض؟', mQuick: ['البطاقة مش واضحة', 'الاسم مش زي البطاقة', 'تحت السن', 'سبب تاني…'], mReasonPh: 'اكتب السبب', mReasonNeed: 'اكتب السبب الأول.', mSendReject: 'ارفض الطلب',
      mDoneAccepted: 'اتقبل. الحساب اشتغل.', mDoneRejected: 'اترفض. الحساب فاضل مقفول.', mTellMember: 'دلوقتي قوله:', mWaSend: 'ابعت على واتساب',
      mWaTextCome: (n) => `أهلاً ${n}، معاك كلاش إسبورتس. عشان نكمّل تفعيل حسابك، تعالى الفرع ومعاك البطاقة. شكراً!`,
      mErr401: 'تسجيل دخولك خلص. اخرج وادخل تاني.', mErr403: 'حسابك مش من الإدارة.', mErrDown: 'سيستم الصالة مش بيرد. جرّب كمان شوية.',
      mErrNet: 'معرفناش نوصل للسيرفر.', mErrNoApi: 'مفيش سيرفر متحدد للصفحة دي.', mErrGeneric: 'حصلت مشكلة.', mErrGone: 'الطلب ده اتعامل معاه قبل كده.',
      mS: { pending: 'مستني', accepted: 'مقبول', rejected: 'مرفوض' }, mSrc: { web: 'الموقع', google: 'جوجل' },
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
    if (st.view === 'members') memLoad(false); else memPeek();
    await loadAll();
    st.bookings.forEach((b) => seen.add(b.id));
    watch();
  }

  function route() {
    const v = location.hash.replace('#', '');
    st.view = ['bookings', 'board', 'rooms', 'team', 'members'].includes(v) ? v : 'bookings';
    if (st.view === 'team' && !can('seeTeam')) st.view = 'bookings';
  }
  addEventListener('hashchange', () => { route(); st.menu = false; if (st.view === 'members') memLoad(false); else render(); });

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
      ${st.open || st.adding ? drawerHtml() : ''}${mem.open && st.view === 'members' ? memDrawerHtml() : ''}`;
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
          ${item('members', w.navMembers, mem.pend ? `${mem.pend}${mem.pendMore ? '+' : ''}` : 0)}
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
    if (st.view === 'members') return membersHtml();
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

  /* ================================================================ new members (sign-up requests from the site) */
  /* Talks to the Clash API (/v1/staff/*) with the staff member's Supabase access token. Demo mode: built-in sample requests.
     ID photos arrive as data URLs; they are shown through object URLs that are released when the sheet closes, and are never stored. */
  const MCFG = window.CLASH_CONFIG || {};
  const mem = {
    filter: 'pending', rows: [], cursor: null, loading: false, err: null, seq: 0, pend: null, pendMore: false,
    open: null, sel: null, detail: null, imgs: {}, urls: [], mode: 'view', reason: '', quick: -1, working: false, derr: null, result: null, zoom: null,
  };

  /* which Clash API this page talks to: same rules as the member portal (clash-api.js) */
  function apiBase() {
    try {
      const host = location.hostname;
      const local = host === 'localhost' || host === '127.0.0.1';
      const q = new URLSearchParams(location.search).get('api');
      let saved = null;
      try { saved = localStorage.getItem('clash-api-mode'); } catch (e) { /* storage unavailable */ }
      const want = q === 'http' || q === 'staging' || q === 'mock' ? q : saved;
      let url = '';
      if (want === 'staging' && MCFG.CLASH_API_STAGING_URL) url = MCFG.CLASH_API_STAGING_URL;
      else if (MCFG.CLASH_API_MODE === 'http' || (want === 'http' && local)) url = MCFG.CLASH_API_URL || 'http://127.0.0.1:8787';
      return String(url).replace(/\/+$/, '');
    } catch (e) { return ''; }
  }

  /* the current Supabase access token (the panel's own session, read from the same browser storage) */
  let sbClient = null;
  async function accessToken() {
    if (!sbClient) {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
      sbClient = createClient(MCFG.supabaseUrl, MCFG.supabaseAnonKey, { auth: { autoRefreshToken: false } });
    }
    const { data } = await sbClient.auth.getSession();
    return data.session ? data.session.access_token : null;
  }

  const apiErr = (code, status) => Object.assign(new Error(code), { code, status: status || 0 });
  async function memApi(method, path, body) {
    if (!S.live) return demoApi(method, path, body);
    const base = apiBase();
    if (!base) throw apiErr('NO_API');
    let token = null;
    try { token = await accessToken(); } catch (e) { throw apiErr('NETWORK'); }
    if (!token) throw apiErr('UNAUTHORIZED', 401);
    let res;
    try {
      res = await fetch(base + path, {
        method, cache: 'no-store', body: body ? JSON.stringify(body) : undefined,
        headers: Object.assign({ Authorization: `Bearer ${token}` }, body ? { 'Content-Type': 'application/json' } : {}),
      });
    } catch (e) { throw apiErr('NETWORK'); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) throw apiErr((data && data.code) || `HTTP_${res.status}`, res.status);
    return data || {};
  }
  function memErrText(e) {
    const w = W();
    if (!e) return '';
    if (e.code === 'NEED_REASON') return w.mReasonNeed;
    if (e.status === 401) return w.mErr401;
    if (e.status === 403) return w.mErr403;
    if (e.code === 'GIZMO_DOWN' || e.status === 502 || e.status === 503) return w.mErrDown;
    if (e.code === 'NETWORK') return w.mErrNet;
    if (e.code === 'NO_API') return w.mErrNoApi;
    if (e.status === 409) return w.mErrGone;
    return w.mErrGeneric;
  }

  /* ---- demo data: 3 pending (two with ID photos, one without), 2 accepted, 1 rejected */
  const sampleId = (label, hue) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="14" fill="hsl(${hue},30%,26%)"/><rect x="18" y="52" width="76" height="96" rx="6" fill="hsl(${hue},20%,40%)"/><g fill="hsl(${hue},20%,62%)"><rect x="116" y="58" width="170" height="12" rx="3"/><rect x="116" y="84" width="130" height="12" rx="3"/><rect x="116" y="110" width="150" height="12" rx="3"/></g><text x="18" y="32" font-family="sans-serif" font-size="16" fill="#fff">SAMPLE ID ${label}</text></svg>`)}`;
  const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
  const demoRows = [
    { uid: 'd1', username: 'ahmed.k', firstName: 'Ahmed', lastName: 'Khaled', phone: '+201012345678', birthDate: '2004-03-12', hasId: true, status: 'pending', source: 'web', createdAt: minsAgo(6) },
    { uid: 'd2', username: 'mona_s', firstName: 'Mona', lastName: 'Samir', phone: '+201112223344', birthDate: '2001-09-30', hasId: false, status: 'pending', source: 'google', createdAt: minsAgo(95), email: 'mona@example.com' },
    { uid: 'd3', username: 'youssef99', firstName: 'Youssef', lastName: 'Adel', phone: '+201223334455', birthDate: '2009-01-20', hasId: true, status: 'pending', source: 'web', createdAt: minsAgo(60 * 30) },
    { uid: 'd4', username: 'sara.m', firstName: 'Sara', lastName: 'Mostafa', phone: '+201555667788', birthDate: '2000-06-02', hasId: true, status: 'accepted', source: 'web', createdAt: minsAgo(60 * 50), decidedBy: 'Karim' },
    { uid: 'd5', username: 'omar_z', firstName: 'Omar', lastName: 'Zaki', phone: '+201066778899', birthDate: '2003-11-15', hasId: false, status: 'accepted', source: 'google', createdAt: minsAgo(60 * 80), decidedBy: 'gizmo' },
    { uid: 'd6', username: 'hady7', firstName: 'Hady', lastName: 'Fathy', phone: '+201199887766', birthDate: '2002-02-02', hasId: true, status: 'rejected', source: 'web', createdAt: minsAgo(60 * 100), decidedBy: 'Omar', reason: 'ID not clear' },
  ];
  const DEMO_PAGE = +new URLSearchParams(location.search).get('mempage') || 20; // ?demo&mempage=2 to try Load more
  async function demoApi(method, path, body) {
    await new Promise((r) => setTimeout(r, 120));
    const url = new URL(path, 'http://x');
    const parts = url.pathname.split('/').filter(Boolean); // v1 staff signups [uid] [action]
    if (parts.length === 3) {
      const status = url.searchParams.get('status') || 'pending';
      const all = demoRows.filter((r) => r.status === status).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const from = +(url.searchParams.get('cursor') || 0);
      const items = all.slice(from, from + DEMO_PAGE).map((r) => Object.assign({}, r));
      return { items, nextCursor: from + DEMO_PAGE < all.length ? String(from + DEMO_PAGE) : null };
    }
    const row = demoRows.find((r) => r.uid === parts[3]);
    if (!row) throw apiErr('NOT_FOUND', 404);
    if (parts.length === 4) return Object.assign({}, row, row.hasId ? { idFront: sampleId('FRONT', 210), idBack: sampleId('BACK', 150) } : {});
    if (row.status !== 'pending') throw apiErr('ALREADY_DECIDED', 409);
    const ar = lang === 'ar';
    const who = (st.me && st.me.staff && st.me.staff.name) || 'Staff';
    if (parts[4] === 'accept') {
      row.status = 'accepted'; row.decidedBy = who;
      return { status: 'accepted', whatsapp: { phone: row.phone, text: ar ? `أهلاً ${row.firstName}، حسابك على كلاش اتفعّل. تقدر تدخل بيه دلوقتي!` : `Hi ${row.firstName}, your Clash account is active. You can sign in now!` } };
    }
    row.status = 'rejected'; row.reason = body && body.reason; row.decidedBy = who;
    return { status: 'rejected', whatsapp: { phone: row.phone, text: ar ? `أهلاً ${row.firstName}، للأسف مقدرناش نفعّل حسابك: ${row.reason}. تعالى الفرع ومعاك البطاقة.` : `Hi ${row.firstName}, we could not activate your account: ${row.reason}. Please come to the branch with your ID.` } };
  }

  /* ---- helpers */
  const listOf = (res) => (Array.isArray(res) ? res : (res && (res.items || res.signups || res.data)) || []);
  const memName = (r) => `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.username || '';
  const localPhone = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('20') && d.length === 12 ? `0${d.slice(2)}` : d; };
  const waDigits = (p) => { const d = String(p || '').replace(/\D/g, ''); if (d.startsWith('20') && d.length === 12) return d; if (d.startsWith('0') && d.length === 11) return `2${d}`; if (d.length === 10) return `20${d}`; return d; };
  const waHref = (phone, text) => `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(text)}`;
  const ageOf = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return null;
    const now = new Date();
    let a = now.getFullYear() - +m[1];
    if (now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[3])) a -= 1;
    return a;
  };
  /* the "come to the branch with your ID" text, in the member's own language when known, else the panel's */
  const comeText = (r) => WORDS[r.lang === 'ar' || r.lang === 'en' ? r.lang : lang].mWaTextCome(r.firstName || r.username || '');
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  /* ---- loading */
  async function memLoad(more) {
    const f = mem.filter;
    const seq = ++mem.seq;
    mem.loading = true; mem.err = null;
    if (!more) { mem.rows = []; mem.cursor = null; }
    render();
    try {
      const res = await memApi('GET', `/v1/staff/signups?status=${f}${more && mem.cursor ? `&cursor=${encodeURIComponent(mem.cursor)}` : ''}`);
      if (seq !== mem.seq) return;
      const items = listOf(res);
      mem.rows = more ? mem.rows.concat(items) : items;
      mem.cursor = (res && (res.nextCursor || res.cursor)) || null;
      if (f === 'pending' && !more) { mem.pend = items.length; mem.pendMore = Boolean(mem.cursor); }
    } catch (e) { if (seq !== mem.seq) return; mem.err = e; }
    mem.loading = false;
    render();
  }
  /* just the pending count for the tab badge */
  async function memPeek() {
    if (st.view === 'members' && mem.filter === 'pending') return;
    try {
      const res = await memApi('GET', '/v1/staff/signups?status=pending');
      mem.pend = listOf(res).length; mem.pendMore = Boolean(res && (res.nextCursor || res.cursor));
      if (!mem.open) render();
    } catch (e) { /* the badge just stays as it was */ }
  }

  /* ---- detail sheet */
  function toObjectUrl(u) {
    if (typeof u !== 'string' || !u.startsWith('data:')) return null;
    const i = u.indexOf(',');
    const meta = u.slice(5, i);
    const raw = u.slice(i + 1);
    let bytes;
    if (/;base64/.test(meta)) { const bin = atob(raw); bytes = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k += 1) bytes[k] = bin.charCodeAt(k); }
    else bytes = new TextEncoder().encode(decodeURIComponent(raw));
    const url = URL.createObjectURL(new Blob([bytes], { type: meta.split(';')[0] || 'image/jpeg' }));
    mem.urls.push(url);
    return url;
  }
  function releaseImages() { mem.urls.forEach((u) => URL.revokeObjectURL(u)); mem.urls = []; mem.imgs = {}; }
  async function memOpen(uid) {
    const row = mem.rows.find((r) => r.uid === uid);
    if (!row) return;
    releaseImages();
    Object.assign(mem, { open: uid, sel: row, detail: null, mode: 'view', reason: '', quick: -1, working: false, derr: null, result: null, zoom: null });
    render();
    if (!row.hasId) return;
    try {
      const d = await memApi('GET', `/v1/staff/signups/${encodeURIComponent(uid)}`);
      if (mem.open !== uid) return;
      mem.imgs = { front: toObjectUrl(d.idFront || (d.photos && d.photos.front)), back: toObjectUrl(d.idBack || (d.photos && d.photos.back)) };
      delete d.idFront; delete d.idBack; delete d.photos;
      mem.detail = d;
      if (d.email && !row.email) row.email = d.email;
    } catch (e) { if (mem.open === uid) mem.derr = e; }
    if (mem.open === uid) render();
  }
  function memClose() { releaseImages(); Object.assign(mem, { open: null, sel: null, detail: null, zoom: null, result: null, derr: null }); render(); }

  async function memDecide(kind) {
    const row = mem.sel;
    if (!row || mem.working) return;
    if (kind === 'reject' && !mem.reason.trim()) { mem.derr = { code: 'NEED_REASON' }; render(); return; }
    mem.working = true; mem.derr = null; render();
    try {
      const res = await memApi('POST', `/v1/staff/signups/${encodeURIComponent(row.uid)}/${kind}`, kind === 'reject' ? { reason: mem.reason.trim() } : undefined);
      mem.result = { kind, wa: res && res.whatsapp };
      /* the open sheet shows the new status in its header right away */
      mem.sel = { ...row, status: kind === 'accept' ? 'accepted' : 'rejected', reason: kind === 'reject' ? mem.reason.trim() : row.reason };
      mem.rows = mem.rows.filter((r) => r.uid !== row.uid);
      if (mem.pend) mem.pend -= 1;
      releaseImages();
    } catch (e) { mem.derr = e; }
    mem.working = false; render();
  }

  /* ---- rendering */
  function membersHtml() {
    const w = W();
    const chips = ['pending', 'accepted', 'rejected'].map((f) => `<button class="chip" data-act="mem-filter" data-filter="${f}" aria-pressed="${mem.filter === f}">${esc(w[`m${cap(f)}`])}${f === 'pending' && mem.pend ? ` <b class="num">${mem.pend}${mem.pendMore ? '+' : ''}</b>` : ''}</button>`).join('');
    const q = st.q.trim().toLowerCase();
    const rows = q ? mem.rows.filter((r) => `${memName(r)} ${r.username} ${localPhone(r.phone)}`.toLowerCase().includes(q)) : mem.rows;
    let body;
    if (mem.err && !mem.rows.length) body = `<div class="panel empty">${esc(memErrText(mem.err))} <button class="btn btn-text" data-act="mem-retry">${esc(w.retry)}</button></div>`;
    else if (mem.loading && !mem.rows.length) body = `<div class="panel empty">${esc(w.mLoading)}</div>`;
    else if (!rows.length) body = `<div class="panel empty">${esc(w.mNone)}</div>`;
    else {
      body = `<ul class="panel mem-list">${rows.map((r) => {
        const age = ageOf(r.birthDate);
        return `<li class="mem-row">
          <button class="mem-main" data-act="mem-open" data-uid="${esc(r.uid)}">
            <span class="mem-name"><bdi>${esc(memName(r))}</bdi></span>
            <span class="mem-sub"><bdi>@${esc(r.username)}</bdi> · <bdi dir="ltr">${esc(phonePretty(localPhone(r.phone)))}</bdi>${age == null ? '' : ` · ${esc(w.mAge(age))}`}</span>
          </button>
          <span class="mem-meta"><span class="pill ${r.hasId ? 'pill-confirmed' : 'pill-pending'}">${esc(r.hasId ? w.mId : w.mNoId)}</span><span class="cell-sub">${esc(ago(r.createdAt))}</span></span>
          <a class="btn btn-line mem-wa" href="${esc(waHref(r.phone, comeText(r)))}" target="_blank" rel="noopener" aria-label="${esc(`${w.mWa}: ${memName(r)}`)}">${esc(w.mWa)}</a>
        </li>`;
      }).join('')}</ul>`;
      if (mem.err) body += `<p class="warn mem-warn">${esc(memErrText(mem.err))}</p>`;
      if (mem.cursor) body += `<p class="mem-more"><button class="btn btn-line" data-act="mem-more"${mem.loading ? ' disabled' : ''}>${esc(mem.loading ? w.mLoading : w.mMore)}</button></p>`;
    }
    return `
      <div class="title-row"><div><h1>${esc(w.mTitle)}</h1><p>${esc(w.mSub)}</p></div></div>
      <div class="chips" role="group" aria-label="${esc(w.mTitle)}">${chips}</div>
      ${body}`;
  }

  function memDrawerHtml() {
    const w = W();
    const r = mem.sel;
    const d = mem.detail || {};
    const age = ageOf(r.birthDate);
    const waBtn = `<a class="btn btn-line" href="${esc(waHref(r.phone, comeText(r)))}" target="_blank" rel="noopener">${esc(w.mWa)}</a>`;
    const fact = (label, val, wide) => (val ? `<div${wide ? ' class="wide"' : ''}><dt>${esc(label)}</dt><dd>${val}</dd></div>` : '');
    const fig = (side, label) => (mem.imgs[side]
      ? `<figure class="mem-id"><button type="button" data-act="mem-zoom" data-side="${side}" aria-label="${esc(`${label}: ${w.mTapZoom}`)}"><img src="${mem.imgs[side]}" alt="${esc(label)}"></button><figcaption class="hint">${esc(label)} · ${esc(w.mTapZoom)}</figcaption></figure>` : '');
    let ids = '';
    if (mem.result) ids = '';
    else if (!r.hasId) ids = `<p class="mem-note">${esc(w.mWaitBranch)}</p>`;
    else if (mem.derr && !mem.detail) ids = `<p class="warn">${esc(memErrText(mem.derr))} <button class="btn btn-text" data-act="mem-open" data-uid="${esc(r.uid)}">${esc(w.retry)}</button></p>`;
    else if (!mem.detail) ids = `<p class="hint">${esc(w.mImgLoading)}</p>`;
    else ids = `<div class="mem-ids">${fig('front', w.mIdFront)}${fig('back', w.mIdBack)}</div>`;

    const errHtml = mem.derr && (mem.detail || !r.hasId || mem.mode !== 'view' || mem.derr.code === 'NEED_REASON') ? `<p class="warn" role="alert">${esc(memErrText(mem.derr))}</p>` : '';
    let actions;
    if (mem.result) {
      const ok = mem.result.kind === 'accept';
      const wa = mem.result.wa;
      actions = `<div class="mem-done"><p class="mem-done-msg ${ok ? 'is-ok' : 'is-bad'}">${esc(ok ? w.mDoneAccepted : w.mDoneRejected)}</p>
        ${wa ? `<p class="hint">${esc(w.mTellMember)}</p><a class="btn btn-primary mem-wa-big" data-wa="result" href="${esc(waHref(wa.phone, wa.text))}" target="_blank" rel="noopener">${esc(w.mWaSend)}</a>` : ''}
        <button class="btn btn-line" data-act="mem-close">${esc(w.close)}</button></div>`;
    } else if (r.status !== 'pending') {
      actions = `<div class="drawer-actions">${waBtn}</div>`;
    } else if (mem.mode === 'confirm') {
      actions = `<div class="mem-panel"><p><b>${esc(w.mConfirmAcceptQ(memName(r)))}</b></p>${errHtml}
        <div class="drawer-actions"><button class="btn btn-primary" data-act="mem-accept-go"${mem.working ? ' disabled' : ''}>${esc(w.mConfirm)}</button><button class="btn btn-text" data-act="mem-mode" data-mode="view">${esc(w.mBack)}</button></div></div>`;
    } else if (mem.mode === 'reject') {
      actions = `<div class="mem-panel"><p><b>${esc(w.mRejectTitle)}</b></p>
        <div class="quick">${w.mQuick.map((q, i) => `<button type="button" class="chip" data-act="mem-quick" data-i="${i}" aria-pressed="${mem.quick === i}">${esc(q)}</button>`).join('')}</div>
        <label class="field"><span class="sr-only">${esc(w.mReason)}</span><textarea class="textarea" data-act="mem-reason" maxlength="200" placeholder="${esc(w.mReasonPh)}">${esc(mem.reason)}</textarea></label>${errHtml}
        <div class="drawer-actions"><button class="btn btn-primary" data-act="mem-reject-go"${mem.working ? ' disabled' : ''}>${esc(w.mSendReject)}</button><button class="btn btn-text" data-act="mem-mode" data-mode="view">${esc(w.mBack)}</button></div></div>`;
    } else {
      actions = `${errHtml}<div class="drawer-actions"><button class="btn btn-primary" data-act="mem-mode" data-mode="confirm">${esc(w.mAccept)}</button><button class="btn btn-line" data-act="mem-mode" data-mode="reject">${esc(w.mReject)}</button>${waBtn}</div>`;
    }

    return `
      <div class="drawer-back" data-act="mem-close"></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(memName(r))}">
        <div class="drawer-head"><span class="pill ${r.status === 'accepted' ? 'pill-confirmed' : r.status === 'rejected' ? 'pill-no_show' : 'pill-pending'}">${esc(w.mS[r.status] || r.status)}</span><button class="btn btn-text" data-act="mem-close">${esc(w.close)}</button></div>
        <div class="who"><h2><bdi>${esc(memName(r))}</bdi></h2><p><bdi>@${esc(r.username)}</bdi> · ${esc(ago(r.createdAt))}</p></div>
        <dl class="facts">
          ${fact(w.mFirst, `<bdi>${esc(r.firstName)}</bdi>`)}${fact(w.mLast, `<bdi>${esc(r.lastName)}</bdi>`)}
          ${fact(w.mUser, `<bdi>${esc(r.username)}</bdi>`)}${fact(w.mPhone, `<bdi dir="ltr">${esc(phonePretty(localPhone(r.phone)))}</bdi>`)}
          ${fact(w.mBirth, `<bdi dir="ltr">${esc(r.birthDate)}</bdi>`)}${fact(w.mAgeL, age == null ? '' : esc(w.mAge(age)))}
          ${fact(w.mEmail, r.email ? `<bdi dir="ltr">${esc(r.email)}</bdi>` : '', true)}
          ${fact(w.mSource, esc(w.mSrc[r.source] || r.source || ''))}${fact(w.mSent, esc(ago(r.createdAt)))}
          ${r.status !== 'pending' ? fact(w.mBy, esc(r.decidedBy || d.decidedBy || '')) : ''}${fact(w.mReason, esc(r.reason || d.reason || ''), true)}
        </dl>
        ${ids}
        ${actions}
      </aside>
      ${mem.zoom && mem.imgs[mem.zoom] ? `<div class="zoom" data-act="mem-unzoom" role="dialog" aria-label="${esc(mem.zoom === 'front' ? w.mIdFront : w.mIdBack)}"><img src="${mem.imgs[mem.zoom]}" alt=""><button class="btn btn-primary" data-act="mem-unzoom">${esc(w.close)}</button></div>` : ''}`;
  }

  function memAct(el, act) {
    if (act === 'mem-filter') { if (mem.filter !== el.dataset.filter) { mem.filter = el.dataset.filter; memLoad(false); } }
    else if (act === 'mem-more') memLoad(true);
    else if (act === 'mem-retry') memLoad(false);
    else if (act === 'mem-open') memOpen(el.dataset.uid);
    else if (act === 'mem-close') memClose();
    else if (act === 'mem-zoom') { mem.zoom = el.dataset.side; render(); }
    else if (act === 'mem-unzoom') { mem.zoom = null; render(); }
    else if (act === 'mem-mode') { mem.mode = el.dataset.mode; mem.derr = null; render(); const t = app.querySelector('[data-act="mem-reason"]'); if (t) t.focus(); }
    else if (act === 'mem-quick') {
      const i = +el.dataset.i;
      mem.quick = i; mem.reason = i === W().mQuick.length - 1 ? '' : W().mQuick[i]; mem.derr = null; render();
      const t = app.querySelector('[data-act="mem-reason"]'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
    }
    else if (act === 'mem-accept-go') memDecide('accept');
    else if (act === 'mem-reject-go') memDecide('reject');
  }
  function memReset() { releaseImages(); Object.assign(mem, { open: null, sel: null, rows: [], pend: null, cursor: null, err: null, zoom: null, result: null }); }

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
    if (act.startsWith('mem-')) { memAct(el, act); return; }
    if (act === 'filter') { st.filter = el.dataset.filter; render(); }
    else if (act === 'open') openBooking(el.dataset.id);
    else if (act === 'close') closeDrawer();
    else if (act === 'add') { st.adding = true; st.open = null; st.msg = null; st.draft = freshDraft(null); render(); const first = app.querySelector('[data-act="d-name"]'); if (first) first.focus(); }
    else if (act === 'set') setStatus(el.dataset.status);
    else if (act === 'add-save') addBooking(el.dataset.status);
    else if (act === 'day') { const step = +el.dataset.step; st.boardDay = step ? T.addDays(st.boardDay, step) : today(); render(); }
    else if (act === 'menu') { st.menu = !st.menu; render(); }
    else if (act === 'lang') setLang(lang === 'ar' ? 'en' : 'ar');
    else if (act === 'sign-out') { await S.signOut(); memReset(); st.me = null; st.loaded = false; render(); }
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
    } else if (act === 'mem-reason') mem.reason = el.value;
    else if (act === 'd-note') st.draft.staff_note = el.value;
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

  addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (mem.zoom) { mem.zoom = null; render(); } else if (mem.open) memClose(); else if (st.open || st.adding) closeDrawer(); });
  /* relative times stay true */
  setInterval(() => { if (st.loaded && !st.open && !st.adding && !mem.open && document.activeElement.tagName !== 'INPUT') render(); if (st.me && !document.hidden) memPeek(); }, 60000);

  setLang(lang);
  boot();
})();
