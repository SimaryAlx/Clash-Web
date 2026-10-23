/* Clash Esports: the branch picker.
   The Clash bull stands on the seam between the two branches as a solid 3D object (see the 3D bull below).
   On a choice it opens down the middle and the chosen half takes the screen. */
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

/* ---------- the 3D bull ----------
   Built from the logo picture in three pieces: the red half of the head, the blue half, and the CLASH word.
   Each piece is a solid: its picture on the front and forty copies of its silhouette stacked behind, each a step
   darker. The bull watches the pointer, leans its own colour forward toward the branch under the pointer,
   gets angry when the pointer is thrown around (eyes flare, it shakes, the halves clash, it snorts), calms when
   the pointer rests, dozes when the pointer leaves, and on a choice opens down the middle like two doors. */
const canvas = document.getElementById('logo3d');
let logo = null;

/* where things are on the logo picture, as fractions of its width (u) and height from the bottom (v) */
const MAP = {
  seam: 0.497,          // the line between red and blue
  headFrom: 0.215,      // the head sits above this; the CLASH word below
  eyeL: [0.33, 0.59], eyeR: [0.665, 0.59],
  noseL: [0.43, 0.41], noseR: [0.565, 0.41],
};

function softDot(inner, outer) {
  /* a round soft light, drawn once on a canvas and used as a texture */
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, inner);
  r.addColorStop(0.35, outer);
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function setup3D() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const pivot = new THREE.Group();   // looking, leaning, shaking
  const body = new THREE.Group();    // scaled to the screen
  pivot.add(body);
  scene.add(pivot);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(0.5, 2.5, 6);
  scene.add(key);
  const red = new THREE.PointLight(0xff2a3a, 60, 30, 2);
  red.position.set(-4.5, 1.2, 3.2);
  const blue = new THREE.PointLight(0x2f7bff, 60, 30, 2);
  blue.position.set(4.5, 1.2, 3.2);
  scene.add(red, blue);

  const H = 2.7;          // logo height in scene units
  let W = 1.8;            // set from the picture's aspect
  const LAYERS = 36;
  const DEPTH = 0.34;
  const pieces = {};
  const allLayers = [];
  const glows = [];
  const smoke = [];
  let ready = false;

  /* one solid piece of the logo: the picture between u0..u1 and v0..v1 */
  function piece(tex, u0, u1, v0, v1) {
    const w = W * (u1 - u0), h = H * (v1 - v0);
    const geo = new THREE.PlaneGeometry(w, h);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    const g = new THREE.Group();
    g.position.set(((u0 + u1) / 2 - 0.5) * W, ((v0 + v1) / 2 - 0.5) * H, 0);
    g.userData.home = g.position.clone();
    for (let i = 1; i <= LAYERS; i++) {
      const t = i / LAYERS;
      const shade = new THREE.Color().lerpColors(new THREE.Color(0x707078), new THREE.Color(0x101014), Math.pow(t, 0.6));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: shade, alphaTest: 0.5, side: THREE.DoubleSide }));
      m.userData.z = -t * DEPTH;
      g.add(m);
      allLayers.push(m);
    }
    const face = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex, alphaTest: 0.5, roughness: 0.32, metalness: 0.25,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.62,
    }));
    face.userData.z = 0.004;
    face.userData.face = true;
    g.add(face);
    allLayers.push(face);
    g.userData.face = face;
    body.add(g);
    return g;
  }
  /* a point on the picture, in a piece's own coordinates */
  const local = (g, [u, v], z = 0.03) => new THREE.Vector3((u - 0.5) * W - g.userData.home.x, (v - 0.5) * H - g.userData.home.y, z);

  new THREE.TextureLoader().load('assets/brand/clash-logo.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    W = H * (tex.image.width / tex.image.height);

    pieces.left = piece(tex, 0, MAP.seam, MAP.headFrom, 1);
    pieces.right = piece(tex, MAP.seam, 1, MAP.headFrom, 1);
    pieces.word = piece(tex, 0, 1, 0, MAP.headFrom);

    /* the eyes: a light over each, in its own colour */
    const glowTex = softDot('rgba(255,255,255,1)', 'rgba(255,255,255,0.45)');
    [[pieces.left, MAP.eyeL, 0xff3b47], [pieces.right, MAP.eyeR, 0x4f93ff]].forEach(([g, at, col]) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.userData.home = local(g, at, 0.05);
      s.position.copy(s.userData.home);
      g.add(s);
      glows.push(s);
    });

    /* steam from the nostrils: a small pool of soft puffs, reused */
    const puffTex = softDot('rgba(235,235,245,0.9)', 'rgba(200,200,215,0.35)');
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData.life = 0;
      body.add(s);
      smoke.push(s);
    }

    ready = true;
    root.classList.add('has-3d');
    resize();
    start = performance.now();
  });

  function fit() {
    const phone = phoneQuery.matches;
    const target = phone ? 0.3 : 0.58;
    const visible = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byHeight = (visible * target) / H;
    const byWidth = (visible * camera.aspect * 0.5) / W;
    body.scale.setScalar(Math.min(byHeight, byWidth));
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    fit();
  }
  addEventListener('resize', resize);
  resize();

  /* what the page tells the bull */
  const state = { px: 0, py: 0, side: 0, away: false, leaving: null };
  let lastX = 0, lastY = 0, lastMove = performance.now(), speed = 0;
  addEventListener('pointermove', (e) => {
    const x = (e.clientX / innerWidth) * 2 - 1;
    const y = (e.clientY / innerHeight) * 2 - 1;
    speed += Math.hypot(x - lastX, y - lastY);
    lastX = x; lastY = y;
    state.px = x; state.py = y;
    state.away = false;
    lastMove = performance.now();
  });
  document.addEventListener('pointerleave', () => { state.away = true; });
  addEventListener('blur', () => { state.away = true; });

  /* puff of steam from one nostril */
  let puffIndex = 0;
  function snort(strength) {
    for (const [g, at, dir] of [[pieces.left, MAP.noseL, -1], [pieces.right, MAP.noseR, 1]]) {
      for (let k = 0; k < 3; k++) {
        const s = smoke[puffIndex++ % smoke.length];
        const p = local(g, at, 0.12).add(g.position);
        s.position.copy(p);
        s.userData.v = new THREE.Vector3(dir * (0.25 + Math.random() * 0.25), -0.12 - Math.random() * 0.2, 0.5 + Math.random() * 0.3).multiplyScalar(strength);
        s.userData.life = 1;
        s.scale.setScalar(0.08);
      }
    }
  }

  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  const easeIn = (t) => Math.pow(Math.min(Math.max(t, 0), 1), 2.2);
  const damp = (a, b, k) => a + (b - a) * k;
  let start = performance.now();
  let prev = performance.now();
  let rotY = 0, rotX = 0, redI = 60, blueI = 60;
  let anger = 0, sleep = 0, nextSnort = 3, clashT = 0;
  const lean = { left: 0, right: 0 };
  let running = true;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!ready) return;
    const t = (now - start) / 1000;
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    /* mood: thrown pointer → anger; resting pointer → calm; pointer gone → asleep */
    anger = Math.min(1, Math.max(0, anger + speed * 0.9 - dt * 0.45));
    speed = 0;
    const still = (now - lastMove) / 1000;
    sleep = damp(sleep, state.away || still > 6 ? 1 : 0, dt * 1.5);
    if (reduced) { anger = 0; sleep = 0; }

    /* arrival: the layers telescope in from deep behind while it turns to face you */
    const intro = reduced ? 1 : ease(t / 1.8);
    const spread = 1 + (1 - intro) * 14;
    for (const m of allLayers) m.position.z = m.userData.z * spread;
    const introTurn = reduced ? 0 : (1 - intro) * -Math.PI * 1.2;

    /* looking: the head follows the pointer, lowers its horns when angry, drops when asleep */
    const sway = phoneQuery.matches && !reduced ? Math.sin(t * 0.6) * 0.25 : 0;
    const look = state.away ? 0 : 1;
    const targetY = (state.px * 0.45 + state.side * 0.3) * look + sway;
    const targetX = state.py * 0.25 * look + anger * 0.22 + sleep * 0.18;
    rotY = damp(rotY, targetY, 0.07);
    rotX = damp(rotX, targetX, 0.07);
    const shake = reduced ? 0 : anger * anger * 0.05;
    pivot.rotation.set(
      rotX + (Math.random() - 0.5) * shake,
      rotY + introTurn + (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake * 0.6,
    );
    const breathe = reduced ? 0 : Math.sin(t * (1.1 - sleep * 0.5)) * (0.06 + sleep * 0.03);
    pivot.position.y = breathe - sleep * 0.15;

    /* the two halves: the branch's own colour steps forward, the other gives way; anger makes them clash */
    lean.left = damp(lean.left, state.side < 0 ? 1 : state.side > 0 ? -1 : 0, 0.08);
    lean.right = damp(lean.right, state.side > 0 ? 1 : state.side < 0 ? -1 : 0, 0.08);
    clashT += dt * (2 + anger * 10);
    const clash = reduced ? 0 : anger * Math.max(0, Math.sin(clashT)) * 0.09;   // halves slam into the seam
    const breathGap = reduced ? 0 : 0.012 + Math.sin(t * 1.1) * 0.01;
    for (const [g, l, dir] of [[pieces.left, lean.left, -1], [pieces.right, lean.right, 1]]) {
      const home = g.userData.home;
      const gap = breathGap + Math.max(0, l) * 0.06 + Math.max(0, -l) * 0.12 - clash;
      g.position.set(home.x + dir * gap, home.y + Math.max(0, l) * 0.05, home.z + l * 0.35);
      g.rotation.y = -dir * Math.max(0, -l) * 0.2 + dir * Math.max(0, l) * 0.08;
      g.scale.setScalar(1 + Math.max(0, l) * 0.06);
      g.userData.face.material.emissiveIntensity = 0.62 + Math.max(0, l) * 0.25 - Math.max(0, -l) * 0.3 - sleep * 0.25;
    }

    /* the eyes: they track the pointer a little, flare with anger, go dim asleep, burn in the hovered colour */
    glows.forEach((s, i) => {
      const mine = i === 0 ? lean.left : lean.right;
      const flare = 0.55 + anger * 1.3 + Math.max(0, mine) * 0.9 - sleep * 0.5;
      const pulse = 1 + Math.sin(t * (3 + anger * 9) + i) * (0.05 + anger * 0.15);
      s.material.opacity = Math.max(0.05, Math.min(1, flare)) * (reduced ? 0.7 : 1);
      s.scale.setScalar(0.28 * pulse * (0.7 + Math.max(0, flare) * 0.45));
      s.position.set(s.userData.home.x + state.px * 0.025 * look, s.userData.home.y - state.py * 0.02 * look, s.userData.home.z);
    });

    /* snorts: every few seconds when calm, often when angry */
    nextSnort -= dt * (1 + anger * 6);
    if (!reduced && nextSnort <= 0 && sleep < 0.5) {
      snort(0.6 + anger * 0.9);
      nextSnort = 3.5 + Math.random() * 3;
    }
    for (const s of smoke) {
      if (s.userData.life <= 0) { s.material.opacity = 0; continue; }
      s.userData.life -= dt * 0.9;
      s.position.addScaledVector(s.userData.v, dt);
      s.userData.v.y += dt * 0.35;   // steam rises as it slows
      s.scale.setScalar(0.08 + (1 - s.userData.life) * 0.5);
      s.material.opacity = Math.max(0, s.userData.life) * 0.55;
    }

    /* the lights follow the mood and the branch */
    const wantRed = (state.side < 0 ? 150 : state.side > 0 ? 25 : 60) * (1 - sleep * 0.6) + anger * 60 * (0.6 + Math.random() * 0.4);
    const wantBlue = (state.side > 0 ? 150 : state.side < 0 ? 25 : 60) * (1 - sleep * 0.6) + anger * 60 * (0.6 + Math.random() * 0.4);
    redI = damp(redI, wantRed, 0.1);
    blueI = damp(blueI, wantBlue, 0.1);
    red.intensity = redI;
    blue.intensity = blueI;

    /* leaving: the head opens down the middle like two doors and the camera goes through */
    if (state.leaving) {
      const p = easeIn((now - state.leaving.t0) / 1000 / 1.15);
      const open = ease((now - state.leaving.t0) / 1000 / 0.8);
      for (const [g, dir] of [[pieces.left, -1], [pieces.right, 1]]) {
        g.position.x = g.userData.home.x + dir * open * 2.2;
        g.rotation.y = -dir * open * 1.3;
      }
      pieces.word.position.y = pieces.word.userData.home.y - open * 1.8;
      pieces.word.rotation.x = open * 0.9;
      pivot.position.z = p * 9.5;
      pivot.rotation.y = rotY * (1 - open);
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { prev = performance.now(); requestAnimationFrame(frame); }
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
  setTimeout(() => { canvas.style.transition = 'opacity 260ms ease'; canvas.style.opacity = '0'; }, 820);
  setTimeout(() => sheet.classList.add('is-on'), 780);
  setTimeout(() => { location.href = href; }, 1460);
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
