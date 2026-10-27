/* Clash Esports: what every page except the branch picker shares (the sections page and the room pages):
   the Arabic / English switch, where Arabic is read from the page itself and each page hands over its English words,
   and the walk from one page into the next. */
window.ClashSite = (() => {
  const AR = {};
  let EN = {};
  let lang = 'ar';
  let titleEn = '';
  let onChange = () => {};

  function capture() {
    document.querySelectorAll('[data-i18n]').forEach((el) => { AR[el.dataset.i18n] = el.textContent; });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { AR[el.dataset.i18nHtml] = el.innerHTML; });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => { AR[el.dataset.i18nAlt] = el.alt; });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { AR[el.dataset.i18nAria] = el.getAttribute('aria-label'); });
    AR._title = document.title;
  }

  function apply(next) {
    lang = next;
    const t = lang === 'en' ? EN : AR;
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.querySelectorAll('[data-i18n]').forEach((el) => { if (t[el.dataset.i18n]) el.textContent = t[el.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { if (t[el.dataset.i18nHtml]) el.innerHTML = t[el.dataset.i18nHtml]; });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => { if (t[el.dataset.i18nAlt]) el.alt = t[el.dataset.i18nAlt]; });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { if (t[el.dataset.i18nAria]) el.setAttribute('aria-label', t[el.dataset.i18nAria]); });
    document.title = lang === 'en' ? titleEn : AR._title;
    const btn = document.getElementById('lang-toggle');
    btn.textContent = lang === 'en' ? 'ع' : 'EN';
    btn.lang = lang === 'en' ? 'ar' : 'en';
    btn.setAttribute('aria-label', lang === 'en' ? 'العربية' : 'English');
    try { localStorage.setItem('clash-lang', lang); } catch (e) { /* storage unavailable */ }
    onChange(lang);
  }

  /* the phone menu, where the page has one */
  function wireMenu() {
    const menuBtn = document.getElementById('menu-toggle');
    const navList = document.getElementById('nav-links');
    if (!menuBtn || !navList) return;
    menuBtn.addEventListener('click', () => {
      const open = navList.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navList.addEventListener('click', (e) => {
      if (e.target.closest('a')) { navList.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* the chosen card widens, the page dims to dark, then the next page opens; arriving there fades in from dark.
     colour: 'red' or 'blue', what the next page arrives with. Returns false when the browser should just follow the link. */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function walk(card, href, colour, e) {
    if (reduced || (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0))) return false;
    if (e) e.preventDefault();
    try { sessionStorage.setItem('clash-arrive', colour); } catch (err) { /* storage unavailable */ }
    card.classList.add('is-chosen');
    document.body.classList.add('is-leaving');
    setTimeout(() => document.querySelector('.sheet').classList.add('is-on'), 450);
    setTimeout(() => { location.href = href; }, 980);
    return true;
  }
  /* the floating WhatsApp button steps aside while the footer, which has its own, is on screen */
  const float = document.querySelector('.wa');
  const foot = document.querySelector('.foot');
  if (float && foot && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => float.classList.toggle('is-away', e.isIntersecting)).observe(foot);
  }

  /* coming back with the browser's back button: undo the walk */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.body.classList.remove('is-leaving');
    document.querySelectorAll('.is-chosen').forEach((c) => c.classList.remove('is-chosen'));
    const sheet = document.querySelector('.sheet');
    if (sheet) sheet.classList.remove('is-on');
  });

  return {
    walk,
    reduced,
    /* opts.en: English words by key; opts.titleEn: the English page title; opts.onChange(lang): redraw what the page builds */
    initLang(opts) {
      EN = opts.en;
      titleEn = opts.titleEn;
      if (opts.onChange) onChange = opts.onChange;
      capture();
      let saved = null;
      try { saved = localStorage.getItem('clash-lang'); } catch (e) { /* storage unavailable */ }
      /* English first; Arabic only for visitors who switched to it */
      apply(saved === 'ar' ? 'ar' : 'en');
      document.getElementById('lang-toggle').addEventListener('click', () => apply(lang === 'en' ? 'ar' : 'en'));
      wireMenu();
    },
    get lang() { return lang; },
    /* a value that is either plain or { ar, en } */
    tr: (v) => (v && typeof v === 'object' ? v[lang] : v),
    /* change the titles the switch uses, for pages that know their title only after reading the address */
    setTitles(ar, en) { AR._title = ar; titleEn = en; document.title = lang === 'en' ? en : ar; },
  };
})();
