/* Clash Esports: the three scroll scenes, built on assets/scenes/stage.js (taste-skill references/scenes.md).
   Each one is readable at progress 0 and rests as an ordinary section without script or with reduced motion. */
(() => {
  window.Scenes = window.Scenes || {};
  const rtl = () => document.documentElement.dir === 'rtl';

  /* SCENE 1 · the window in the name opens onto the Cave Room */
  Scenes['hero-window'] = (root, opts = {}) => Stage.scene(root, {
    hold: opts.hold ?? 1.4,
    scrub: 0.6,
    build(tl, { q, phone, stage }) {
      const frame = q('.mono-pic')[0];
      const full = q('.hero-full')[0];
      const windowInset = () => {
        const s = stage.getBoundingClientRect();
        const r = frame.getBoundingClientRect();
        return `inset(${r.top - s.top}px ${s.right - r.right}px ${s.bottom - r.bottom}px ${r.left - s.left}px)`;
      };
      tl.fromTo(full, { clipPath: windowInset }, { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.6, ease: 'power2.inOut' }, 0)
        .fromTo(q('.hero-full video'), { scale: 1.18 }, { scale: 1, duration: 0.7 }, 0)
        .to(q('.mono-a'), phone ? { yPercent: -80, autoAlpha: 0, duration: 0.3 } : { xPercent: -45, autoAlpha: 0, duration: 0.35 }, 0.04)
        .to(q('.mono-b'), phone ? { yPercent: 80, autoAlpha: 0, duration: 0.3 } : { xPercent: 45, autoAlpha: 0, duration: 0.35 }, 0.04)
        .to(q('.hero-foot'), { y: 40, autoAlpha: 0, duration: 0.2 }, 0)
        .fromTo(q('.hero-statement span'), { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.2, ease: 'power2.out' }, 0.62);
    },
  });

  /* SCENE 2 · red and blue slide in from opposite edges and meet at VS */
  Scenes.vs = (root, opts = {}) => Stage.scene(root, {
    hold: opts.hold ?? 1.6,
    scrub: 0.6,
    build(tl, { q }) {
      tl.fromTo(q('.vs-red'), { xPercent: -62 }, { xPercent: 0, duration: 0.42, ease: 'power3.out' }, 0)
        .fromTo(q('.vs-blue'), { xPercent: 62 }, { xPercent: 0, duration: 0.42, ease: 'power3.out' }, 0)
        .fromTo(q('.vs-half > img'), { scale: 1.25 }, { scale: 1, duration: 0.6 }, 0)
        .fromTo(q('.vs-badge'), { scale: 3, rotate: -14, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.14, ease: 'back.out(2)' }, 0.42)
        .fromTo(q('.vs-copy'), { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.2, stagger: 0.08, ease: 'power2.out' }, 0.56);
    },
  });

  /* SCENE 3 · the row of rooms passes sideways while the page scrolls down */
  Scenes.track = (root, opts = {}) => Stage.scene(root, {
    hold: opts.hold ?? 2.4,
    scrub: 0.5,
    phone: 'rest',
    build(tl, { q }) {
      const track = q('.rooms-track')[0];
      const vp = q('.rooms-viewport')[0];
      const distance = () => {
        return Math.max(0, track.scrollWidth - vp.clientWidth);
      };
      tl.fromTo(track, { x: 0 }, { x: () => (rtl() ? 1 : -1) * distance(), duration: 1 }, 0)
        .fromTo(q('.room-pic img'), { xPercent: () => (rtl() ? -8 : 8) }, { xPercent: () => (rtl() ? 8 : -8), duration: 1 }, 0);
    },
  });
})();
