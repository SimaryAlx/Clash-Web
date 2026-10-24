/* Clash Zayed sections page: the language switch, the two info panels that open on a tap,
   and the walk through a door (PC or PlayStation) into its page. */
(() => {
  const EN = {
    skip: 'Skip to content', changeBranch: 'Change branch', login: 'Log in', signup: 'Sign up', whatsapp: 'WhatsApp',
    hubTitle: 'Clash Zayed', hubSub: 'What are you playing today?',
    altPc: 'The VIP room in red light with rows of PCs', altPs: 'A PS5 room with a big screen in red and blue light',
    pcLine: 'Seven rooms, from Normal at 30 EGP to the Stream Room', psLine: 'Four PS5 rooms for your crew, 6 to 15 people',
    enter: 'Enter', here: 'At the lounge',
    foodName: 'Food & drinks', foodInfo: 'There is food and drink inside the lounge. Ask for it when you arrive; the bar menu is coming here soon.',
    simName: 'Simulators', simInfo: 'Racing simulators: the Standard on three 27" screens, and the Motion with a seat that moves with the car. Ask for it when you arrive.',
  };
  const AR = {};
  let lang = 'ar';

  document.querySelectorAll('[data-i18n]').forEach((el) => { AR[el.dataset.i18n] = el.textContent; });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { AR[el.dataset.i18nHtml] = el.innerHTML; });
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => { AR[el.dataset.i18nAlt] = el.alt; });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { AR[el.dataset.i18nAria] = el.getAttribute('aria-label'); });
  AR._title = document.title;

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
    document.title = lang === 'en' ? 'Clash Esports Zayed | Pick what you play' : AR._title;
    const btn = document.getElementById('lang-toggle');
    btn.textContent = lang === 'en' ? 'ع' : 'EN';
    btn.lang = lang === 'en' ? 'ar' : 'en';
    btn.setAttribute('aria-label', lang === 'en' ? 'العربية' : 'English');
    try { localStorage.setItem('clash-lang', lang); } catch (e) { /* storage unavailable */ }
  }

  let saved = null;
  try { saved = localStorage.getItem('clash-lang'); } catch (e) { /* storage unavailable */ }
  applyLang(saved === 'en' ? 'en' : 'ar');
  document.getElementById('lang-toggle').addEventListener('click', () => applyLang(lang === 'en' ? 'ar' : 'en'));

  /* food and simulators: a tap (or Enter) opens their few words; only one open at a time */
  const infos = document.querySelectorAll('.card-info');
  infos.forEach((card) => card.addEventListener('click', () => {
    const open = !card.classList.contains('is-open');
    infos.forEach((c) => { c.classList.remove('is-open'); c.setAttribute('aria-expanded', 'false'); });
    card.classList.toggle('is-open', open);
    card.setAttribute('aria-expanded', String(open));
  }));

  /* PC and PlayStation: the chosen door widens, the page dims to dark, then its page opens */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.card-main').forEach((door) => door.addEventListener('click', (e) => {
    if (reduced || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    try { sessionStorage.setItem('clash-arrive', door.classList.contains('card-ps') ? 'blue' : 'red'); } catch (err) { /* storage unavailable */ }
    door.classList.add('is-chosen');
    document.body.classList.add('is-leaving');
    setTimeout(() => document.querySelector('.sheet').classList.add('is-on'), 450);
    setTimeout(() => { location.href = door.href; }, 980);
  }));

  /* coming back with the browser's back button: undo the walk-through */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.body.classList.remove('is-leaving');
    document.querySelectorAll('.is-chosen').forEach((c) => c.classList.remove('is-chosen'));
    document.querySelector('.sheet').classList.remove('is-on');
  });
})();
