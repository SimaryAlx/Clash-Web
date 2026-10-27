/* Clash Zayed sections page: the two info panels that open on a tap,
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
  ClashSite.initLang({ en: EN, titleEn: 'Clash Esports Zayed | Pick what you play' });

  /* food and simulators: a tap (or Enter) opens their few words; only one open at a time */
  const infos = document.querySelectorAll('.card-info');
  infos.forEach((card) => card.addEventListener('click', () => {
    const open = !card.classList.contains('is-open');
    infos.forEach((c) => { c.classList.remove('is-open'); c.setAttribute('aria-expanded', 'false'); });
    card.classList.toggle('is-open', open);
    card.setAttribute('aria-expanded', String(open));
  }));

  /* PC and PlayStation: walk through the door into its page */
  document.querySelectorAll('.card-main').forEach((door) => door.addEventListener('click', (e) => {
    ClashSite.walk(door, door.href, door.classList.contains('card-ps') ? 'blue' : 'red', e);
  }));
})();
