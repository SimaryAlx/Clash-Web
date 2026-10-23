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
  october: 'October', octoberLine: 'Open 24 hours · 5 PC rooms · from 25 EGP an hour',
  enter: 'Enter branch',
  altZayed: 'The Clash Zayed hall in red and blue light with the bull logo',
  altOctober: 'The Normal room at Clash October in blue light',
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
   Each piece is a solid: its picture on the front and copies of its silhouette stacked behind, each a step darker.

   On arrival the screen is dark; the red half flies in from the left, the blue from the right, and they slam
   together: a burst of red and blue sparks, the camera shakes, the word rises and the two
   branches open out from the seam. After that the bull watches the pointer, leans its own colour forward toward
   the branch under the pointer, crackles with current along its seam, gets angry when the pointer is thrown
   around (eyes flare, it shakes, the halves clash and throw sparks, it snorts), calms when the pointer rests,
   dozes when the pointer leaves, and on a choice opens down the middle like two doors. Embers drift up behind
   it, red on Zayed's side and blue on October's, and part around the pointer. */
const canvas = document.getElementById('logo3d');
let logo = null;

/* where things are on the logo picture, as fractions of its width (u) and height from the bottom (v) */
const MAP = {
  seam: 0.497,          // the line between red and blue
  headFrom: 0.215,      // the head sits above this; the CLASH word below
  seamTop: 0.83, seamBottom: 0.25,
  eyeL: [0.33, 0.59], eyeR: [0.665, 0.59],
  noseL: [0.43, 0.41], noseR: [0.565, 0.41],
};
const RED = new THREE.Color(0xff3040);
const BLUE = new THREE.Color(0x3d86ff);
const WHITE = new THREE.Color(0xffffff);

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

/* a pool of glowing points that fade by darkening (additive black is invisible) */
function pointPool(count, size, tex) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, pos, col, geo, count };
}

function setup3D() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const CAM = new THREE.Vector3(0, 0, 10);
  camera.position.copy(CAM);

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
  const arc = [];
  let embers = null, sparks = null;
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
    g.add(face);
    allLayers.push(face);
    g.userData.face = face;
    body.add(g);
    return g;
  }
  /* a point on the picture, in a piece's own coordinates */
  const local = (g, [u, v], z = 0.03) => new THREE.Vector3((u - 0.5) * W - g.userData.home.x, (v - 0.5) * H - g.userData.home.y, z);

  const glowTex = softDot('rgba(255,255,255,1)', 'rgba(255,255,255,0.45)');
  const sparkTex = softDot('rgba(255,255,255,1)', 'rgba(255,255,255,0.25)');

  new THREE.TextureLoader().load('assets/brand/clash-logo.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    W = H * (tex.image.width / tex.image.height);

    pieces.left = piece(tex, 0, MAP.seam, MAP.headFrom, 1);
    pieces.right = piece(tex, MAP.seam, 1, MAP.headFrom, 1);
    pieces.word = piece(tex, 0, 1, 0, MAP.headFrom);

    /* the eyes: a light over each, in its own colour */
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

    /* the current in the seam: a chain of small lights re-drawn as a jagged bolt many times a second */
    for (let i = 0; i < 70; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: i % 3 === 0 ? 0xffffff : i % 2 ? 0xff3a48 : 0x4a8fff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
      body.add(s);
      arc.push(s);
    }

    /* sparks thrown out when the halves collide */
    sparks = pointPool(520, 0.13, sparkTex);
    sparks.vel = new Float32Array(sparks.count * 3);
    sparks.life = new Float32Array(sparks.count);
    sparks.base = new Float32Array(sparks.count * 3);
    sparks.next = 0;
    body.add(sparks.pts);


    ready = true;
    root.classList.add('has-3d');
    resize();
    start = performance.now();
  });

  /* embers behind the bull, red on the left and blue on the right; they live in the scene, not on the bull */
  embers = pointPool(260, 0.11, sparkTex);
  embers.speed = new Float32Array(embers.count);
  for (let i = 0; i < embers.count; i++) resetEmber(i, true);
  scene.add(embers.pts);
  function resetEmber(i, anywhere) {
    const x = (Math.random() * 2 - 1) * 7;
    embers.pos[i * 3] = x;
    embers.pos[i * 3 + 1] = anywhere ? (Math.random() * 2 - 1) * 4.5 : -4.6;
    embers.pos[i * 3 + 2] = -1.5 - Math.random() * 3;
    embers.speed[i] = 0.15 + Math.random() * 0.45;
    const c = x < 0 ? RED : BLUE;
    const k = 0.25 + Math.random() * 0.6;
    embers.col[i * 3] = c.r * k; embers.col[i * 3 + 1] = c.g * k; embers.col[i * 3 + 2] = c.b * k;
  }

  function fit() {
    const phone = phoneQuery.matches;
    const target = phone ? 0.3 : 0.58;
    const visible = 2 * CAM.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
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
  const state = { px: 0, py: 0, side: 0, away: false, leaving: null, skip: false };
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

  /* puffs of steam from both nostrils */
  let puffIndex = 0;
  function snort(strength) {
    for (const [g, at, dir] of [[pieces.left, MAP.noseL, -1], [pieces.right, MAP.noseR, 1]]) {
      for (let k = 0; k < 3; k++) {
        const s = smoke[puffIndex++ % smoke.length];
        s.position.copy(local(g, at, 0.12).add(g.position));
        s.userData.v = new THREE.Vector3(dir * (0.25 + Math.random() * 0.25), -0.12 - Math.random() * 0.2, 0.5 + Math.random() * 0.3).multiplyScalar(strength);
        s.userData.life = 1;
        s.scale.setScalar(0.08);
      }
    }
  }

  /* the halves collide: sparks out of the seam, the current surges, the camera shakes */
  let shake = 0, surge = 0;
  function impact(power) {
    const n = Math.round(220 * power);
    for (let k = 0; k < n; k++) {
      const i = sparks.next++ % sparks.count;
      const y = (MAP.seamBottom + Math.random() * (MAP.seamTop - MAP.seamBottom) - 0.5) * H;
      sparks.pos[i * 3] = (Math.random() - 0.5) * 0.04;
      sparks.pos[i * 3 + 1] = y;
      sparks.pos[i * 3 + 2] = 0.1;
      const side = Math.random() < 0.5 ? -1 : 1;
      const sp = (1.2 + Math.random() * 3.2) * (0.6 + power * 0.6);
      const a = (Math.random() - 0.5) * 1.6;
      sparks.vel[i * 3] = side * Math.cos(a) * sp;
      sparks.vel[i * 3 + 1] = Math.sin(a) * sp + 0.6;
      sparks.vel[i * 3 + 2] = (Math.random() - 0.2) * sp * 0.6;
      sparks.life[i] = 0.6 + Math.random() * 0.7;
      const c = Math.random() < 0.25 ? WHITE : side < 0 ? RED : BLUE;
      sparks.base[i * 3] = c.r; sparks.base[i * 3 + 1] = c.g; sparks.base[i * 3 + 2] = c.b;
    }
    shake = Math.max(shake, power);
    surge = Math.max(surge, power);
  }

  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  const easeIn = (t) => Math.pow(Math.min(Math.max(t, 0), 1), 2.2);
  const backOut = (t) => { t = Math.min(Math.max(t, 0), 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const damp = (a, b, k) => a + (b - a) * k;
  let start = performance.now();
  let prev = performance.now();
  let rotY = 0, rotX = 0, redI = 60, blueI = 60;
  let anger = 0, sleep = 0, nextSnort = 3, clashT = 0, slamCool = 0, arcClock = 0;
  let landed = reduced;
  const lean = { left: 0, right: 0 };
  let running = true;
  const SLAM = 1.05;        // seconds into the page when the halves meet

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!ready) return;
    if (state.skip && !landed) { start = Math.min(start, now - SLAM * 1000); state.skip = false; }
    const t = (now - start) / 1000;
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    /* mood: thrown pointer → anger; resting pointer → calm; pointer gone → asleep */
    anger = Math.min(1, Math.max(0, anger + speed * 0.9 - dt * 0.45));
    speed = 0;
    const still = (now - lastMove) / 1000;
    sleep = damp(sleep, state.away || still > 6 ? 1 : 0, dt * 1.5);
    if (reduced || !landed) { anger = 0; sleep = 0; }

    /* the arrival: halves fly in from the sides with their layers stretched out, and slam at SLAM */
    const fly = reduced ? 0 : 1 - easeIn((t - 0.1) / (SLAM - 0.1));
    if (!landed && t >= SLAM) {
      landed = true;
      impact(1.25);
      root.classList.remove('is-intro');
      root.classList.add('is-landed');
    }
    const spread = 1 + fly * 10;
    for (const m of allLayers) m.position.z = m.userData.z * spread;
    const rise = reduced ? 1 : backOut((t - SLAM - 0.05) / 0.6);

    /* looking: the head follows the pointer, lowers its horns when angry, drops when asleep */
    const sway = phoneQuery.matches && !reduced ? Math.sin(t * 0.6) * 0.25 : 0;
    const look = state.away || !landed ? 0 : 1;
    const targetY = (state.px * 0.45 + state.side * 0.3) * look + sway;
    const targetX = state.py * 0.25 * look + anger * 0.22 + sleep * 0.18;
    rotY = damp(rotY, targetY, 0.07);
    rotX = damp(rotX, targetX, 0.07);
    const jitter = reduced ? 0 : anger * anger * 0.05 + shake * 0.06;
    pivot.rotation.set(
      rotX + (Math.random() - 0.5) * jitter,
      rotY + (Math.random() - 0.5) * jitter,
      (Math.random() - 0.5) * jitter * 0.6,
    );
    const breathe = reduced ? 0 : Math.sin(t * (1.1 - sleep * 0.5)) * (0.06 + sleep * 0.03);
    pivot.position.y = breathe - sleep * 0.15;

    /* the two halves: the branch's own colour steps forward, the other gives way; anger makes them clash */
    lean.left = damp(lean.left, state.side < 0 ? 1 : state.side > 0 ? -1 : 0, 0.08);
    lean.right = damp(lean.right, state.side > 0 ? 1 : state.side < 0 ? -1 : 0, 0.08);
    clashT += dt * (2 + anger * 10);
    const clash = reduced ? 0 : anger * Math.max(0, Math.sin(clashT)) * 0.09;
    if (!reduced && landed && anger > 0.85 && slamCool <= 0 && Math.sin(clashT) > 0.97) { impact(0.45); slamCool = 0.5; }
    slamCool -= dt;
    const breathGap = reduced ? 0 : 0.012 + Math.sin(t * 1.1) * 0.01;
    for (const [g, l, dir] of [[pieces.left, lean.left, -1], [pieces.right, lean.right, 1]]) {
      const home = g.userData.home;
      const gap = breathGap + Math.max(0, l) * 0.06 + Math.max(0, -l) * 0.12 - clash;
      g.position.set(home.x + dir * (gap + fly * 6), home.y + Math.max(0, l) * 0.05, home.z + l * 0.35 + fly * 1.5);
      g.rotation.set(0, -dir * Math.max(0, -l) * 0.2 + dir * Math.max(0, l) * 0.08 - dir * fly * 1.1, dir * fly * 0.25);
      g.scale.setScalar(1 + Math.max(0, l) * 0.06);
      g.userData.face.material.emissiveIntensity = 0.62 + Math.max(0, l) * 0.25 - Math.max(0, -l) * 0.3 - sleep * 0.25;
    }
    const word = pieces.word;
    word.position.y = word.userData.home.y - (1 - rise) * 1.4;
    word.scale.setScalar(Math.max(0.001, rise));
    word.visible = rise > 0.01;

    /* the eyes: they track the pointer a little, flare with anger, go dim asleep, burn in the hovered colour */
    glows.forEach((s, i) => {
      const mine = i === 0 ? lean.left : lean.right;
      const flare = (landed ? 0.55 : 0.9) + anger * 1.3 + Math.max(0, mine) * 0.9 - sleep * 0.5;
      const pulse = 1 + Math.sin(t * (3 + anger * 9) + i) * (0.05 + anger * 0.15);
      s.material.opacity = Math.max(0.05, Math.min(1, flare)) * (reduced ? 0.7 : 1);
      s.scale.setScalar(0.28 * pulse * (0.7 + Math.max(0, flare) * 0.45));
      s.position.set(s.userData.home.x + state.px * 0.025 * look, s.userData.home.y - state.py * 0.02 * look, s.userData.home.z);
    });

    /* the current in the seam: brighter with anger, with a hovered branch and right after a collision */
    const energy = reduced ? 0.12 : Math.min(1.4, 0.14 + anger * 0.9 + Math.abs(lean.left) * 0.45 + surge * 0.8) * (1 - sleep * 0.8) * (landed ? 1 : 0);
    arcClock -= dt;
    if (arcClock <= 0) {
      arcClock = 0.045;
      const top = (MAP.seamTop - 0.5) * H, bottom = (MAP.seamBottom - 0.5) * H;
      let x = 0;
      const amp = 0.02 + energy * 0.06;
      arc.forEach((s, i) => {
        const k = i / (arc.length - 1);
        x = x * 0.55 + (Math.random() - 0.5) * amp * 2;
        s.userData.p = [x, top + (bottom - top) * k];
        s.userData.r = 0.05 + Math.random() * 0.07;
      });
    }
    const midX = (pieces.left.position.x + pieces.right.position.x) / 2 - (pieces.left.userData.home.x + pieces.right.userData.home.x) / 2;
    arc.forEach((s) => {
      s.position.set(midX + s.userData.p[0], s.userData.p[1], 0.06);
      s.scale.setScalar(s.userData.r * (0.7 + energy * 0.9));
      s.material.opacity = Math.min(1, energy) * (0.55 + Math.random() * 0.45);
    });

    /* snorts: every few seconds when calm, often when angry */
    nextSnort -= dt * (1 + anger * 6);
    if (!reduced && landed && nextSnort <= 0 && sleep < 0.5) {
      snort(0.6 + anger * 0.9);
      nextSnort = 3.5 + Math.random() * 3;
    }
    for (const s of smoke) {
      if (s.userData.life <= 0) { s.material.opacity = 0; continue; }
      s.userData.life -= dt * 0.9;
      s.position.addScaledVector(s.userData.v, dt);
      s.userData.v.y += dt * 0.35;
      s.scale.setScalar(0.08 + (1 - s.userData.life) * 0.5);
      s.material.opacity = Math.max(0, s.userData.life) * 0.55;
    }

    /* sparks: fly, fall, fade */
    for (let i = 0; i < sparks.count; i++) {
      if (sparks.life[i] <= 0) { sparks.col[i * 3] = sparks.col[i * 3 + 1] = sparks.col[i * 3 + 2] = 0; continue; }
      sparks.life[i] -= dt;
      sparks.vel[i * 3 + 1] -= dt * 4.2;
      sparks.vel[i * 3] *= 0.985;
      sparks.pos[i * 3] += sparks.vel[i * 3] * dt;
      sparks.pos[i * 3 + 1] += sparks.vel[i * 3 + 1] * dt;
      sparks.pos[i * 3 + 2] += sparks.vel[i * 3 + 2] * dt;
      const k = Math.max(0, Math.min(1, sparks.life[i] * 1.6));
      sparks.col[i * 3] = sparks.base[i * 3] * k; sparks.col[i * 3 + 1] = sparks.base[i * 3 + 1] * k; sparks.col[i * 3 + 2] = sparks.base[i * 3 + 2] * k;
    }
    sparks.geo.attributes.position.needsUpdate = true;
    sparks.geo.attributes.color.needsUpdate = true;


    /* embers rise and part around the pointer */
    const half = CAM.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const mx = state.px * half * camera.aspect, my = -state.py * half;
    for (let i = 0; i < embers.count; i++) {
      const j = i * 3;
      embers.pos[j + 1] += embers.speed[i] * dt * (1 + anger * 2);
      embers.pos[j] += Math.sin(t * 0.7 + i) * dt * 0.08;
      if (!state.away) {
        const dx = embers.pos[j] - mx, dy = embers.pos[j + 1] - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < 2.2) { const f = (1 - d2 / 2.2) * dt * 2.4; embers.pos[j] += dx * f; embers.pos[j + 1] += dy * f; }
      }
      if (embers.pos[j + 1] > 4.6) resetEmber(i, false);
    }
    embers.geo.attributes.position.needsUpdate = true;
    embers.pts.visible = landed;

    /* lights follow the mood, the branch and the collision */
    const wantRed = (state.side < 0 ? 150 : state.side > 0 ? 25 : 60) * (1 - sleep * 0.6) + anger * 60 * (0.6 + Math.random() * 0.4);
    const wantBlue = (state.side > 0 ? 150 : state.side < 0 ? 25 : 60) * (1 - sleep * 0.6) + anger * 60 * (0.6 + Math.random() * 0.4);
    redI = damp(redI, wantRed, 0.1);
    blueI = damp(blueI, wantBlue, 0.1);
    red.intensity = redI;
    blue.intensity = blueI;
    surge = Math.max(0, surge - dt * 2.8);

    /* camera shake after a collision */
    shake = Math.max(0, shake - dt * 2.2);
    camera.position.set(CAM.x + (Math.random() - 0.5) * shake * 0.18, CAM.y + (Math.random() - 0.5) * shake * 0.18, CAM.z);

    /* leaving: the head opens down the middle like two doors and the camera goes through */
    if (state.leaving) {
      const p = easeIn((now - state.leaving.t0) / 1000 / 1.15);
      const open = ease((now - state.leaving.t0) / 1000 / 0.8);
      for (const [g, dir] of [[pieces.left, -1], [pieces.right, 1]]) {
        g.position.x = g.userData.home.x + dir * open * 2.2;
        g.rotation.y = -dir * open * 1.3;
      }
      word.position.y = word.userData.home.y - open * 1.8;
      word.rotation.x = open * 0.9;
      pivot.position.z = p * 9.5;
      pivot.rotation.y = rotY * (1 - open);
      arc.forEach((s) => { s.material.opacity *= 1 - open; });
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

/* the arrival plays once per visit; any click, key or scroll skips to the collision */
if (!reduced) root.classList.add('is-intro');
try { logo = setup3D(); } catch (e) { logo = null; /* no WebGL: the flat logo stays */ }
const endIntro = () => { if (!root.classList.contains('is-intro')) return; root.classList.remove('is-intro'); root.classList.add('is-landed'); };
if (!logo) endIntro();
setTimeout(endIntro, 4500);   // a safety net if the logo picture never loads
const skip = () => { if (logo && root.classList.contains('is-intro')) logo.state.skip = true; };
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, skip, { passive: true }));

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
  if (leaving || root.classList.contains('is-intro')) return;
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
