/* Clash Esports: the branch picker.
   The Clash logo stands on the seam between the two branches as a solid 3D object: the logo picture is the
   front face, and forty copies of its silhouette stacked behind it, each a step darker, give it real depth.
   A red light sits on Zayed's side and a blue light on October's. It assembles on arrival, follows the
   pointer, turns toward the branch under the pointer, and on a choice spins and flies through the camera
   while the chosen half takes the screen. */
import * as THREE from 'three';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phoneQuery = matchMedia('(max-width: 720px), (max-aspect-ratio: 3/4)');

/* ---------- language ---------- */
const EN = {
  title: 'Pick your branch',
  zayed: 'Zayed', zayedLine: 'Open 24 hours · 7 PC rooms · PlayStation and simulators',
  october: 'October', octoberLine: 'Our second branch, in 6th of October',
  enter: 'Enter branch',
  altZayed: 'The Clash Zayed hall in red and blue light with the bull logo',
};
const AR = {};
document.querySelectorAll('[data-i18n]').forEach((el) => { AR[el.dataset.i18n] = el.textContent; });
document.querySelectorAll('[data-i18n-alt]').forEach((el) => { AR[el.dataset.i18nAlt] = el.alt; });
AR._title = document.title;

function applyLang(lang) {
  const t = lang === 'en' ? EN : AR;
  root.lang = lang;
  root.dir = lang === 'en' ? 'ltr' : 'rtl';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => { el.alt = t[el.dataset.i18nAlt]; });
  document.title = lang === 'en' ? 'Clash Esports | Pick your branch' : AR._title;
  const btn = document.getElementById('lang-toggle');
  btn.textContent = lang === 'en' ? 'ع' : 'EN';
  btn.lang = lang === 'en' ? 'ar' : 'en';
  btn.setAttribute('aria-label', lang === 'en' ? 'العربية' : 'English');
  try { localStorage.setItem('clash-lang', lang); } catch (e) { /* storage unavailable */ }
}
let lang = 'ar';
try { lang = localStorage.getItem('clash-lang') === 'en' ? 'en' : 'ar'; } catch (e) { /* storage unavailable */ }
applyLang(lang);
document.getElementById('lang-toggle').addEventListener('click', () => { lang = lang === 'en' ? 'ar' : 'en'; applyLang(lang); });

/* ---------- the 3D logo ---------- */
const canvas = document.getElementById('logo3d');
let logo = null;

function setup3D() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const pivot = new THREE.Group();   // pointer tilt and the exit flight
  const body = new THREE.Group();    // the solid logo
  pivot.add(body);
  scene.add(pivot);

  /* lights: red on Zayed's side, blue on October's, a white key from the front */
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(0.5, 2.5, 6);
  scene.add(key);
  const red = new THREE.PointLight(0xff2a3a, 60, 30, 2);
  red.position.set(-4.5, 1.2, 3.2);
  const blue = new THREE.PointLight(0x2f7bff, 60, 30, 2);
  blue.position.set(4.5, 1.2, 3.2);
  scene.add(red, blue);

  const LAYERS = 40;
  const DEPTH = 0.34;
  const layers = [];
  let ready = false;

  new THREE.TextureLoader().load('assets/brand/clash-logo.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const aspect = tex.image.width / tex.image.height;
    const H = 2.7;
    const geo = new THREE.PlaneGeometry(H * aspect, H);

    /* the sides: the silhouette repeated backwards, each copy darker, tinted by the logo's own colours */
    for (let i = 1; i <= LAYERS; i++) {
      const t = i / LAYERS;
      const shade = new THREE.Color().lerpColors(new THREE.Color(0x707078), new THREE.Color(0x101014), Math.pow(t, 0.6));
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: shade, alphaTest: 0.5, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      m.userData.z = -t * DEPTH;
      m.position.z = m.userData.z;
      body.add(m);
      layers.push(m);
    }
    /* the face: lit, so the red and blue lights slide across it as it turns */
    const face = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex, alphaTest: 0.5, roughness: 0.32, metalness: 0.25,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.62,
    }));
    face.position.z = 0.004;
    face.userData.z = 0.004;
    body.add(face);
    layers.push(face);
    ready = true;
    root.classList.add('has-3d');
    resize();
    start = performance.now();
  });

  function fit() {
    /* the logo is about 44% of the screen's height on a wide screen, smaller where the halves stack */
    const phone = phoneQuery.matches;
    const target = phone ? 0.3 : 0.58;
    const visible = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byHeight = (visible * target) / 2.7;
    const byWidth = (visible * camera.aspect * 0.5) / 1.8;
    body.scale.setScalar(Math.min(byHeight, byWidth));
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
  }
  addEventListener('resize', resize);
  resize();

  /* state the page writes to */
  const state = { px: 0, py: 0, side: 0, leaving: null };
  addEventListener('pointermove', (e) => {
    state.px = (e.clientX / innerWidth) * 2 - 1;
    state.py = (e.clientY / innerHeight) * 2 - 1;
  });

  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  const easeIn = (t) => Math.pow(Math.min(Math.max(t, 0), 1), 2.2);
  let start = performance.now();
  let rotY = 0, rotX = 0, redI = 60, blueI = 60;
  let running = true;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!ready) return;
    const t = (now - start) / 1000;

    /* arrival: the layers telescope in from deep behind while the logo turns to face you */
    const intro = reduced ? 1 : ease(t / 1.8);
    const spread = 1 + (1 - intro) * 14;
    for (const m of layers) m.position.z = m.userData.z * spread;
    const introTurn = reduced ? 0 : (1 - intro) * -Math.PI * 1.2;

    /* idle: it breathes, follows the pointer and leans toward the branch under it */
    const sway = phoneQuery.matches && !reduced ? Math.sin(t * 0.6) * 0.25 : 0;
    const targetY = state.px * 0.32 + state.side * 0.55 + sway;
    const targetX = state.py * 0.18;
    rotY += (targetY - rotY) * 0.06;
    rotX += (targetX - rotX) * 0.06;
    pivot.rotation.set(rotX, rotY + introTurn, 0);
    pivot.position.y = reduced ? 0 : Math.sin(t * 1.1) * 0.06;

    const wantRed = state.side < 0 ? 140 : state.side > 0 ? 25 : 60;
    const wantBlue = state.side > 0 ? 140 : state.side < 0 ? 25 : 60;
    redI += (wantRed - redI) * 0.08;
    blueI += (wantBlue - blueI) * 0.08;
    red.intensity = redI;
    blue.intensity = blueI;

    /* leaving: one full turn toward the chosen side while it flies through the camera */
    if (state.leaving) {
      const k = (now - state.leaving.t0) / 1000;
      const p = easeIn(k / 1.1);
      pivot.rotation.y = rotY + state.leaving.dir * p * Math.PI * 2;
      pivot.position.z = p * 9.6;
      pivot.position.x = -state.leaving.dir * p * 0.4;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  return { state };
}

try { logo = setup3D(); } catch (e) { logo = null; /* no WebGL: the flat logo stays */ }

/* ---------- the branches ---------- */
const branches = [...document.querySelectorAll('.branch')];
const sideOf = (el) => (el.dataset.side === 'red' ? -1 : 1);

branches.forEach((el) => {
  el.addEventListener('pointerenter', () => { if (logo) logo.state.side = sideOf(el); });
  el.addEventListener('pointerleave', () => { if (logo) logo.state.side = 0; });
  el.addEventListener('focus', () => { if (logo) logo.state.side = sideOf(el); });
  el.addEventListener('blur', () => { if (logo) logo.state.side = 0; });
  el.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    choose(el);
  });
});

let leaving = false;
function choose(el) {
  if (leaving) return;
  leaving = true;
  const href = el.getAttribute('href');
  const colour = el.dataset.side;
  try {
    sessionStorage.setItem('clash-arrive', colour);
    localStorage.setItem('clash-branch', el.dataset.branch);
  } catch (e) { /* storage unavailable */ }
  if (reduced) { location.href = href; return; }

  el.classList.add('is-chosen');
  root.classList.add('is-leaving');
  if (logo) {
    logo.state.side = sideOf(el);
    logo.state.leaving = { t0: performance.now(), dir: sideOf(el) };
  }
  const sheet = document.querySelector('.sheet');
  sheet.classList.toggle('is-blue', colour === 'blue');
  setTimeout(() => { canvas.style.transition = 'opacity 260ms ease'; canvas.style.opacity = '0'; }, 620);
  setTimeout(() => sheet.classList.add('is-on'), 700);
  setTimeout(() => { location.href = href; }, 1380);
}

/* coming back with the browser's back button: undo the exit */
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  leaving = false;
  root.classList.remove('is-leaving');
  branches.forEach((b) => b.classList.remove('is-chosen'));
  document.querySelector('.sheet').classList.remove('is-on');
  if (logo) { logo.state.leaving = null; }
  location.reload();
});
