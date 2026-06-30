import * as THREE from 'three';

// ---------- Boot ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a4f7a);
scene.fog = new THREE.Fog(0x0a4f7a, 18, 65);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
camera.position.set(0, 1.6, 7.5);
camera.lookAt(0, 0.2, -4);

// ---------- Lighting ----------
scene.add(new THREE.HemisphereLight(0x9fe0ff, 0x06324d, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(4, 12, 6);
scene.add(sun);

// God-ray-ish shafts: a few faint angled planes high above
const shaftMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false });
for (let i = 0; i < 6; i++) {
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2, 70), shaftMat);
  shaft.position.set((Math.random() - 0.5) * 30, 8, -20 - Math.random() * 20);
  shaft.rotation.z = (Math.random() - 0.5) * 0.4;
  scene.add(shaft);
}

// ---------- Seabed ----------
const FLOOR_Y = -4.6;
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 240, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x1a7d7e, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = FLOOR_Y;
scene.add(floor);

// ---------- Turtle (Friday) ----------
const turtle = new THREE.Group();
scene.add(turtle);

// Realistic green sea turtle palette: olive/brown mottled carapace,
// pale cream plastron and limb undersides, spotted olive head.
const CREAM = 0xe5d9ac;       // warm pale yellow plastron / underside
const SKIN = 0x837748;        // olive-tan limb/head skin
const SPOT = 0x2e2716;        // dark brown head spots

// ---- Procedural carapace texture (scute pattern + streaks + mottling) ----
function makeCarapaceTexture() {
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const cx = S / 2, cy = S / 2, A = S * 0.49, B = S * 0.49;

  g.fillStyle = '#605733'; g.fillRect(0, 0, S, S);
  g.save();
  g.beginPath(); g.ellipse(cx, cy, A, B, 0, 0, Math.PI * 2); g.clip();

  const grad = g.createRadialGradient(cx, cy * 0.85, 30, cx, cy, A);
  grad.addColorStop(0, '#8a7c46'); grad.addColorStop(0.6, '#696035'); grad.addColorStop(1, '#433d22');
  g.fillStyle = grad; g.fillRect(0, 0, S, S);

  function scute(px, py, rx, ry, sides, rot, fill, streak) {
    g.beginPath();
    for (let k = 0; k <= sides; k++) {
      const a = rot + (k / sides) * Math.PI * 2;
      const wob = 0.88 + 0.12 * Math.sin(k * 1.7 + px);
      const X = px + Math.cos(a) * rx * wob, Y = py + Math.sin(a) * ry * wob;
      k === 0 ? g.moveTo(X, Y) : g.lineTo(X, Y);
    }
    g.closePath();
    g.fillStyle = fill; g.fill();
    if (streak) {                       // light radiating streaks (green-turtle costal scutes)
      g.save(); g.clip();
      g.strokeStyle = 'rgba(200,186,124,0.5)'; g.lineWidth = 3;
      for (let s = 0; s < 6; s++) {
        const a = rot + (s / 6 - 0.5) * 1.4;
        g.beginPath();
        g.moveTo(px - Math.cos(a) * rx * 0.2, py - Math.sin(a) * ry * 0.2);
        g.lineTo(px + Math.cos(a) * rx * 1.2, py + Math.sin(a) * ry * 1.2);
        g.stroke();
      }
      g.restore();
    }
    g.lineWidth = 4; g.strokeStyle = '#322a16'; g.stroke();
  }

  // vertebral column (5 central scutes)
  const vsh = ['#7a6e40', '#6c6137', '#827343', '#695f35', '#766a3f'];
  for (let i = 0; i < 5; i++)
    scute(cx, cy - B * 0.6 + i * (B * 1.2 / 4), A * 0.15, B * 0.14, 6, Math.PI / 6, vsh[i], false);

  // costal scutes (4 per side) with streaks
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++)
      scute(cx + side * A * 0.43, cy - B * 0.52 + i * (B * 1.04 / 3),
        A * 0.2, B * 0.17, 5, side > 0 ? 0.35 : -0.35, i % 2 ? '#7c7040' : '#675e34', true);

  // marginal scutes (ring around the rim)
  const M = 24;
  for (let i = 0; i < M; i++) {
    const a = (i / M) * Math.PI * 2;
    scute(cx + Math.cos(a) * A * 0.88, cy + Math.sin(a) * B * 0.88,
      A * 0.085, B * 0.085, 4, a, i % 2 ? '#4d4525' : '#5b5230', false);
  }

  // mottling blotches (brown & tan)
  for (let i = 0; i < 170; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * A * r, cy + Math.sin(a) * B * r,
      3 + Math.random() * 10, 2 + Math.random() * 6, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fillStyle = Math.random() < 0.5 ? 'rgba(58,48,24,0.18)' : 'rgba(176,160,104,0.16)';
    g.fill();
  }
  g.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4; tex.needsUpdate = true;
  return tex;
}

// ---- Procedural head texture (olive ground + dark spots, pale jaw) ----
function makeHeadTexture() {
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#857746'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#ddcd92';                          // creamy-yellow lower face / jaw band
  g.fillRect(0, S * 0.6, S, S * 0.4);
  for (let i = 0; i < 110; i++) {                   // bold dark-brown mottled scales
    const x = Math.random() * S, y = Math.random() * S * 0.72;
    g.beginPath();
    g.ellipse(x, y, 4 + Math.random() * 9, 4 + Math.random() * 7, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fillStyle = `rgba(40,33,18,${0.45 + Math.random() * 0.4})`;
    g.fill();
  }
  // a few dark blotches creeping onto the pale jaw, as in the photos
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    g.ellipse(Math.random() * S, S * (0.62 + Math.random() * 0.32), 3 + Math.random() * 6, 3 + Math.random() * 5, 0, 0, Math.PI * 2);
    g.fillStyle = `rgba(70,58,34,${0.3 + Math.random() * 0.3})`;
    g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

// ---- Domed elliptical carapace geometry with clean top-down UVs ----
function buildCarapace(a, b, height) {
  const RINGS = 16, SEG = 36;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    for (let j = 0; j <= SEG; j++) {
      const ang = (j / SEG) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
      let x = a * t * ca, z = b * t * sa;
      if (z < 0) x *= 1 + (z / b) * 0.16;            // taper the rear
      let y = height * Math.cos(t * Math.PI / 2);     // domed profile
      if (t > 0.84) y -= (t - 0.84) * height * 1.6;   // flared marginal rim dips down
      pos.push(x, y, z);
      uv.push(0.5 + x / (2 * a), 0.5 + z / (2 * b));
    }
  }
  for (let i = 0; i < RINGS; i++)
    for (let j = 0; j < SEG; j++) {
      const a0 = i * (SEG + 1) + j, a1 = a0 + 1, b0 = (i + 1) * (SEG + 1) + j, b1 = b0 + 1;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const shell = new THREE.Mesh(
  buildCarapace(1.5, 2.0, 0.62),
  new THREE.MeshStandardMaterial({ map: makeCarapaceTexture(), roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide })
);
turtle.add(shell);

const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });
const creamMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide });

// pale plastron (belly) tucked just under the carapace
const plastron = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), creamMat);
plastron.scale.set(1.28, 0.34, 1.78);
plastron.position.y = -0.34;
turtle.add(plastron);

// ---- neck + head ---- (larger, blockier head pulled forward, like the photos)
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.95, 12), skinMat);
neck.rotation.x = Math.PI / 2;
neck.position.set(0, -0.02, 1.9);
turtle.add(neck);
const throat = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), creamMat);
throat.scale.set(0.78, 0.55, 1.1);
throat.position.set(0, -0.26, 2.2);
turtle.add(throat);

const headMat = new THREE.MeshStandardMaterial({ map: makeHeadTexture(), roughness: 0.6, metalness: 0.0 });
const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 16), headMat);
head.scale.set(0.92, 0.88, 1.22);
head.position.set(0, 0.04, 2.6);
turtle.add(head);
// pale pointed beak
const beak = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), creamMat);
beak.scale.set(0.66, 0.54, 0.9);
beak.position.set(0, -0.18, 3.0);
turtle.add(beak);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25 });
for (const sx of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), eyeMat);
  eye.position.set(0.34 * sx, 0.11, 2.78);
  turtle.add(eye);
  const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeMat);
  nostril.position.set(0.08 * sx, -0.06, 3.24);
  turtle.add(nostril);
}

// ---- paddle flippers (extruded shape, olive top + pale underside + claw) ----
function paddleGeometry(L, w) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(L * 0.12, w, L * 0.55, w * 0.98, L * 0.86, w * 0.55);
  sh.bezierCurveTo(L * 1.0, w * 0.32, L * 1.03, w * 0.1, L, 0);          // pointed tip
  sh.bezierCurveTo(L * 1.03, -w * 0.1, L * 1.0, -w * 0.32, L * 0.86, -w * 0.55);
  sh.bezierCurveTo(L * 0.55, -w * 0.98, L * 0.12, -w, 0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, {
    depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 2, steps: 1
  });
  geo.translate(0, 0, -0.04);
  geo.rotateX(Math.PI / 2);   // lay flat: length along +x, thickness vertical (y)
  geo.computeVertexNormals();
  return geo;
}

const flippers = [];
function makeFlipper(x, z, front) {
  const pivot = new THREE.Group();
  pivot.position.set(x, -0.05, z);
  const side = x < 0 ? -1 : 1;

  const L = front ? 2.5 : 1.45, w = front ? 0.62 : 0.54;
  const geo = paddleGeometry(L, w);

  const top = new THREE.Mesh(geo, skinMat);
  pivot.add(top);
  const bottom = new THREE.Mesh(geo, creamMat);   // pale underside, just below
  bottom.position.y = -0.07;
  bottom.scale.set(0.97, 0.6, 0.97);
  pivot.add(bottom);

  if (front) {                        // single claw near the leading tip
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), creamMat);
    claw.position.set(L * 0.96, 0, w * 0.18);
    claw.rotation.z = -Math.PI / 2;
    pivot.add(claw);
  }
  // Rest pose without negative-scale mirroring (which made the two sides
  // asymmetric). The paddle points +x; the right side keeps that, the left
  // is the true mirror (PI - sweep). Front flippers sweep forward, rear back.
  const sweep = front ? -0.4 : 0.7;
  const baseY = side > 0 ? sweep : Math.PI - sweep;
  pivot.rotation.y = baseY;
  turtle.add(pivot);
  flippers.push({ pivot, x, side, front, baseY });
}
makeFlipper(-1.2, 0.85, true);
makeFlipper(1.2, 0.85, true);
makeFlipper(-1.0, -1.25, false);
makeFlipper(1.0, -1.25, false);

// short pointed tail (slightly larger)
const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.85, 8), skinMat);
const TAIL_BASE_X = -Math.PI / 2;   // points straight back
tail.rotation.x = TAIL_BASE_X;
tail.position.set(0, -0.12, -2.12);
turtle.add(tail);

// protective bubble shown during the start grace period
const shield = new THREE.Mesh(
  new THREE.SphereGeometry(2.6, 20, 16),
  new THREE.MeshStandardMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
);
shield.visible = false;
turtle.add(shield);

turtle.rotation.y = Math.PI; // face into the screen (-z)

// ---------- Plastic bags ----------
const bagMat = new THREE.MeshStandardMaterial({
  color: 0xeaf2f5, roughness: 0.25, metalness: 0.0,
  transparent: true, opacity: 0.55, side: THREE.DoubleSide, flatShading: true
});

function makeBag() {
  const g = new THREE.Group();
  // crumpled body
  const body = new THREE.IcosahedronGeometry(0.7, 1);
  const pos = body.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i,
      pos.getX(i) * (0.8 + Math.random() * 0.5),
      pos.getY(i) * (1.0 + Math.random() * 0.4),
      pos.getZ(i) * (0.7 + Math.random() * 0.5));
  }
  body.computeVertexNormals();
  const mesh = new THREE.Mesh(body, bagMat);
  g.add(mesh);
  // two handle loops on top
  for (const sx of [-0.28, 0.28]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 10), bagMat);
    handle.position.set(sx, 0.75, 0);
    handle.rotation.x = Math.PI / 2;
    g.add(handle);
  }
  return g;
}

const BAG_COUNT = 12;
const bags = [];
const SPAWN_Z = -70;
const xRange = 5.2, yRange = 3.0;

function placeBag(bag, initial) {
  bag.position.x = (Math.random() - 0.5) * 2 * xRange;
  bag.position.y = (Math.random() - 0.5) * 2 * yRange;
  bag.position.z = initial ? -26 - Math.random() * 60 : SPAWN_Z - Math.random() * 30;
  bag.userData.spin = (Math.random() - 0.5) * 1.2;
  bag.userData.bob = Math.random() * Math.PI * 2;
  bag.userData.scored = false;
  const s = 0.7 + Math.random() * 0.7;
  bag.scale.set(s, s, s);
}

for (let i = 0; i < BAG_COUNT; i++) {
  const b = makeBag();
  placeBag(b, true);
  bags.push(b);
  scene.add(b);
}

// ---------- Moon jellyfish (edible) ----------
// Detailed translucent moon jellies (Aurelia): a pulsing bell, four
// horseshoe gonads and trailing oral arms. Swim into one to eat it — it pops.
function makeJelly() {
  const g = new THREE.Group();
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0xcfe9ff, transparent: true, opacity: 0.45, roughness: 0.15,
    side: THREE.DoubleSide, depthWrite: false
  });
  const gonMat = new THREE.MeshStandardMaterial({
    color: 0xe48fd0, transparent: true, opacity: 0.6, roughness: 0.4,
    side: THREE.DoubleSide, depthWrite: false
  });

  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), bellMat);
  g.add(bell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.06, 8, 26), bellMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.02;
  bell.add(rim);

  for (let i = 0; i < 4; i++) {              // four horseshoe-shaped gonads
    const horse = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI * 1.35), gonMat);
    const a = (i / 4) * Math.PI * 2;
    horse.position.set(Math.cos(a) * 0.26, 0.16, Math.sin(a) * 0.26);
    horse.rotation.x = Math.PI / 2; horse.rotation.z = a;
    g.add(horse);
  }
  const arms = [];
  for (let i = 0; i < 10; i++) {             // trailing oral arms / tentacles
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.005, 0.75, 5), bellMat);
    const a = (i / 10) * Math.PI * 2, r = i % 2 ? 0.18 : 0.42;
    arm.position.set(Math.cos(a) * r, -0.4, Math.sin(a) * r);
    g.add(arm); arms.push(arm);
  }

  g.userData = { bell, arms, bellMat, gonMat, popping: false, popT: 0, baseScale: 1, phase: 0 };
  return g;
}

const JELLY_COUNT = 5;
const jellies = [];
function placeJelly(j, initial) {
  j.position.x = (Math.random() - 0.5) * 2 * xRange;
  j.position.y = (Math.random() - 0.5) * 2 * yRange;
  j.position.z = initial ? -34 - Math.random() * 46 : SPAWN_Z - Math.random() * 30;
  j.userData.popping = false;
  j.userData.bellMat.opacity = 0.45;
  j.userData.gonMat.opacity = 0.6;
  j.userData.phase = Math.random() * Math.PI * 2;
  j.userData.baseScale = 0.75 + Math.random() * 0.6;
  j.scale.setScalar(j.userData.baseScale);
  j.visible = true;
}
for (let i = 0; i < JELLY_COUNT; i++) {
  const j = makeJelly();
  placeJelly(j, true);
  jellies.push(j);
  scene.add(j);
}

// ---------- Bubbles ----------
const bubbleGeo = new THREE.BufferGeometry();
const BUB = 220;
const bpos = new Float32Array(BUB * 3);
for (let i = 0; i < BUB; i++) {
  bpos[i * 3] = (Math.random() - 0.5) * 50;
  bpos[i * 3 + 1] = (Math.random() - 0.5) * 24;
  bpos[i * 3 + 2] = -Math.random() * 80;
}
bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
const bubbles = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({ color: 0xcdeeff, size: 0.12, transparent: true, opacity: 0.5 }));
scene.add(bubbles);

// ---------- Seagrass ----------
// Clusters of tapered blades rooted on the seabed; they scroll toward the
// camera with the current and sway, then recycle far ahead.
const grassMat = new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.9, side: THREE.DoubleSide });
const grassMatDk = new THREE.MeshStandardMaterial({ color: 0x2f6f2e, roughness: 0.9, side: THREE.DoubleSide });

function makeBlade(h) {
  // a narrow tapered blade with vertical segments so it can bend
  const geo = new THREE.PlaneGeometry(0.16, h, 1, 5);
  geo.translate(0, h / 2, 0); // root at y=0
  return new THREE.Mesh(geo, Math.random() < 0.5 ? grassMat : grassMatDk);
}

function makeGrassCluster() {
  const cluster = new THREE.Group();
  const n = 5 + Math.floor(Math.random() * 6);
  cluster.userData.blades = [];
  for (let i = 0; i < n; i++) {
    const h = 1.2 + Math.random() * 2.4;
    const blade = makeBlade(h);
    blade.position.set((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2);
    blade.rotation.y = Math.random() * Math.PI;
    blade.userData = { phase: Math.random() * Math.PI * 2, sway: 0.15 + Math.random() * 0.2, h };
    cluster.add(blade);
    cluster.userData.blades.push(blade);
  }
  return cluster;
}

const GRASS_N = 16;
const grassClusters = [];
function placeGrass(cl, initial) {
  cl.position.set((Math.random() - 0.5) * 36, FLOOR_Y, initial ? -8 - Math.random() * 70 : -78 - Math.random() * 18);
  const s = 0.7 + Math.random() * 0.8;
  cl.scale.setScalar(s);
}
for (let i = 0; i < GRASS_N; i++) {
  const cl = makeGrassCluster();
  placeGrass(cl, true);
  grassClusters.push(cl);
  scene.add(cl);
}

// ---------- Sharks ----------
// Distinct low-poly shark species that cruise through the background now and
// then: 1 zebra shark ("Zeus"), 3 sand tiger, 3 nurse, 2 sandbar. Each swims
// along +x (snout forward) and is flipped for the other direction.
function makeFinGeo(w, h, depth = 0.06) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w * 0.25, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}
function makeTailGeo(len, up, low, depth = 0.06) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(-len, up); s.lineTo(-len * 0.55, up * 0.18); s.lineTo(-len * 0.78, -low); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}
function makeLabelSprite(text) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const x = cv.getContext('2d');
  x.font = 'bold 70px Segoe UI, Tahoma, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,0.65)'; x.strokeText(text, 128, 64);
  x.fillStyle = '#ffef6e'; x.fillText(text, 128, 64);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.scale.set(2.4, 1.2, 1);
  return sp;
}

function buildShark(spec) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.75, flatShading: true });
  const bellyMat = new THREE.MeshStandardMaterial({ color: spec.belly, roughness: 0.85, flatShading: true });
  const L = spec.length, G = spec.girth;

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), bodyMat);
  body.scale.set(L * 0.5, L * 0.16 * G, L * 0.13 * G);
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), bellyMat);
  belly.scale.set(L * 0.46, L * 0.10 * G, L * 0.11 * G);
  belly.position.y = -L * 0.06 * G;
  g.add(belly);

  if (spec.pointy) {
    const snout = new THREE.Mesh(new THREE.ConeGeometry(L * 0.12 * G, L * 0.34, 12), bodyMat);
    snout.rotation.z = -Math.PI / 2; snout.position.x = L * 0.52;
    g.add(snout);
  } else {
    const snout = new THREE.Mesh(new THREE.SphereGeometry(L * 0.14 * G, 12, 10), bodyMat);
    snout.scale.set(1.15, 0.85, 1.05); snout.position.x = L * 0.46;
    g.add(snout);
  }
  if (spec.barbels) {                       // nurse shark whisker barbels
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.45, 5), bellyMat);
      b.rotation.z = Math.PI / 2.3; b.position.set(L * 0.52, -L * 0.07, sx * 0.12);
      g.add(b);
    }
  }

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(L * 0.028, 8, 8), eyeMat);
    e.position.set(L * 0.4, L * 0.03, sx * L * 0.1 * G);
    g.add(e);
  }

  const d1 = new THREE.Mesh(makeFinGeo(L * 0.24, spec.dorsal1 * L), bodyMat);
  d1.position.set(L * 0.06, L * 0.14 * G, 0); g.add(d1);
  if (spec.dorsal2) {
    const d2 = new THREE.Mesh(makeFinGeo(L * 0.17, spec.dorsal2 * L), bodyMat);
    d2.position.set(-L * 0.24, L * 0.13 * G, 0); g.add(d2);
  }
  for (const sx of [-1, 1]) {               // pectoral fins
    const p = new THREE.Mesh(makeFinGeo(L * 0.22, L * 0.18), bodyMat);
    p.position.set(L * 0.2, -L * 0.05, sx * L * 0.1 * G);
    p.rotation.x = sx * Math.PI / 2; p.rotation.y = sx * -0.6; p.rotation.z = -0.25;
    g.add(p);
  }

  const tail = new THREE.Mesh(makeTailGeo(L * 0.32, spec.tailUp * L, spec.tailLow * L), bodyMat);
  tail.position.set(-L * 0.5, 0, 0); g.add(tail);

  if (spec.spots) {                          // zebra shark adult spotting
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x4a3a1e, roughness: 0.7 });
    for (let i = 0; i < 26; i++) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(L * 0.024, 6, 6), spotMat);
      const ang = Math.random() * Math.PI - Math.PI / 2;
      sp.position.set((Math.random() - 0.45) * L * 0.85,
        Math.sin(ang) * L * 0.15 * G, Math.cos(ang) * L * 0.13 * G);
      sp.scale.set(1, 0.4, 1);
      g.add(sp);
    }
  }
  if (spec.name) {
    const label = makeLabelSprite(spec.name);
    label.position.set(0, L * 0.34, 0);
    g.add(label);
  }

  g.userData.tail = tail;
  return g;
}

const SHARK_SPECS = [
  { key: 'zebra', name: 'Zeus', count: 1, length: 4.6, girth: 0.9, color: 0xc2a25e, belly: 0xe6dcb8, pointy: false, dorsal1: 0.18, dorsal2: 0.10, tailUp: 0.52, tailLow: 0.12, spots: true },
  { key: 'sandtiger', count: 3, length: 5.0, girth: 1.05, color: 0x9a9384, belly: 0xd8d2c2, pointy: true, dorsal1: 0.2, dorsal2: 0.18, tailUp: 0.32, tailLow: 0.18 },
  { key: 'nurse', count: 3, length: 4.6, girth: 1.18, color: 0x6e5a3a, belly: 0xb9a784, pointy: false, barbels: true, dorsal1: 0.14, dorsal2: 0.12, tailUp: 0.42, tailLow: 0.08 },
  { key: 'sandbar', count: 2, length: 4.2, girth: 0.95, color: 0x808d96, belly: 0xdfe6ea, pointy: true, dorsal1: 0.3, dorsal2: 0.08, tailUp: 0.34, tailLow: 0.2 },
];
const sharks = [];
for (const spec of SHARK_SPECS) {
  for (let i = 0; i < spec.count; i++) {
    const s = buildShark(spec);
    s.visible = false;
    s.userData.active = false;
    s.userData.phase = Math.random() * Math.PI * 2;
    sharks.push(s);
    scene.add(s);
  }
}
let nextSharkAt = 2.5;     // seconds until the first shark passes through
function launchShark(shark) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  shark.userData.active = true;
  shark.visible = true;
  shark.userData.dir = dir;
  shark.userData.speed = 2.6 + Math.random() * 2.6;
  shark.userData.bob = Math.random() * Math.PI * 2;
  shark.position.set(dir * -32, -2.5 + Math.random() * 8, -15 - Math.random() * 26);
  shark.rotation.set(0, dir > 0 ? 0 : Math.PI, 0);
  shark.scale.setScalar(0.85 + Math.random() * 0.4);
}

// ---------- Input ----------
const target = { x: 0, y: 0 };
const keys = {};
let humpUntil = 0;         // spacebar "happy wiggle" plays until this time
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();                 // don't scroll the page
    humpUntil = clock.elapsedTime + 1.0; // re-trigger / extend the wiggle
  }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function pointerMove(clientX, clientY) {
  const nx = (clientX / window.innerWidth) * 2 - 1;
  const ny = (clientY / window.innerHeight) * 2 - 1;
  target.x = nx * xRange;
  target.y = -ny * yRange;
}
window.addEventListener('mousemove', (e) => { if (running) pointerMove(e.clientX, e.clientY); });
window.addEventListener('touchmove', (e) => {
  if (running && e.touches[0]) { pointerMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }
}, { passive: false });

// ---------- Game state ----------
let running = false;
let score = 0, dodged = 0, jelliesEaten = 0, speed = 11;
let graceUntil = 0;        // collisions disabled until this time (start grace period)
let chompUntil = 0;        // beak chomps until this time (after eating a jelly)
const GRACE = 2.0;         // seconds of safe swimming at the start of each run
const scoreEl = document.getElementById('score');
const dodgedEl = document.getElementById('dodged');
const jelliesEl = document.getElementById('jellies');
const panel = document.getElementById('panel');
const hud = document.getElementById('hud');
const msg = document.getElementById('msg');
const playBtn = document.getElementById('play');
const wiggleText = document.getElementById('wiggle-text');
let wiggleShown = false;

function startGame() {
  score = 0; dodged = 0; jelliesEaten = 0; speed = 11;
  target.x = 0; target.y = 0;
  turtle.position.set(0, 0, 0);
  bags.forEach((b) => placeBag(b, true));
  jellies.forEach((j) => placeJelly(j, true));
  graceUntil = clock.elapsedTime + GRACE;
  scoreEl.textContent = '0';
  dodgedEl.textContent = '0';
  jelliesEl.textContent = '0';
  panel.classList.add('hidden');
  hud.style.display = 'flex';
  running = true;
}

function gameOver() {
  running = false;
  hud.style.display = 'none';
  msg.innerHTML = `A plastic bag caught Friday! 🛑<br><br>You scored <strong>${Math.floor(score)}</strong>, dodged <strong>${dodged}</strong> bags and gobbled <strong>${jelliesEaten}</strong> moon jellies. Marine litter is a real threat to sea turtles — thanks for helping Friday weave through it!`;
  playBtn.textContent = 'Swim Again';
  panel.classList.remove('hidden');
}

playBtn.addEventListener('click', startGame);

// ---------- Loop ----------
const clock = new THREE.Clock();
const TURTLE_R = 1.1;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // keyboard steering (gentler)
  const kspeed = 6 * dt;
  if (keys['a'] || keys['arrowleft']) target.x -= kspeed;
  if (keys['d'] || keys['arrowright']) target.x += kspeed;
  if (keys['w'] || keys['arrowup']) target.y += kspeed;
  if (keys['s'] || keys['arrowdown']) target.y -= kspeed;
  target.x = Math.max(-xRange, Math.min(xRange, target.x));
  target.y = Math.max(-yRange, Math.min(yRange, target.y));

  // smooth turtle motion + banking (slower, heavier glide)
  const prevX = turtle.position.x, prevY = turtle.position.y;
  turtle.position.x += (target.x - turtle.position.x) * Math.min(1, 6 * dt);
  turtle.position.y += (target.y - turtle.position.y) * Math.min(1, 6 * dt);
  turtle.position.y += Math.sin(t * 1.5) * 0.003; // gentle idle bob
  const vx = turtle.position.x - prevX, vy = turtle.position.y - prevY;
  turtle.rotation.z = THREE.MathUtils.lerp(turtle.rotation.z, -vx * 4, 0.15);
  turtle.rotation.x = THREE.MathUtils.lerp(turtle.rotation.x, vy * 3, 0.15);

  // spacebar wiggle — fast, aggressive thrusting with a side shimmy, a scale
  // pulse, and the tail curling down toward the belly. Plus the shout.
  const wiggling = t < humpUntil;
  if (wiggling) {
    const p = Math.sin(t * 26);            // fast thrust
    const q = Math.sin(t * 13);            // slower shimmy
    turtle.position.z = 0.7 + p * 1.2;     // big lunge toward / away from camera
    turtle.position.y += Math.abs(p) * 0.32;
    turtle.rotation.x = p * 0.95;          // hard pelvic tilt
    turtle.rotation.z = q * 0.45;          // side-to-side shimmy
    turtle.rotation.y = Math.PI + q * 0.28;
    turtle.scale.setScalar(1 + Math.abs(p) * 0.14);
    // tail curls down and tucks forward toward the belly, wagging
    tail.rotation.x = TAIL_BASE_X - 1.5 + p * 0.25;
    tail.position.z = -1.7;
    tail.position.y = -0.5;
  } else {
    if (turtle.position.z !== 0) {
      turtle.position.z += (0 - turtle.position.z) * Math.min(1, 8 * dt);
      if (Math.abs(turtle.position.z) < 0.01) turtle.position.z = 0;
    }
    turtle.rotation.y += (Math.PI - turtle.rotation.y) * Math.min(1, 10 * dt);
    turtle.scale.x += (1 - turtle.scale.x) * Math.min(1, 10 * dt);
    turtle.scale.y = turtle.scale.z = turtle.scale.x;
    tail.rotation.x += (TAIL_BASE_X - tail.rotation.x) * Math.min(1, 8 * dt);
    tail.position.z += (-2.12 - tail.position.z) * Math.min(1, 8 * dt);
    tail.position.y += (-0.12 - tail.position.y) * Math.min(1, 8 * dt);
  }
  if (wiggling !== wiggleShown) {                         // toggle the "plane time baby!" shout
    wiggleText.style.display = wiggling ? 'block' : 'none';
    wiggleShown = wiggling;
  }

  // chomp — the beak snaps open and shut after Friday eats a jelly
  if (t < chompUntil) {
    beak.position.y = -0.18 - 0.32 * Math.abs(Math.sin(t * 34));
  } else if (beak.position.y !== -0.18) {
    beak.position.y += (-0.18 - beak.position.y) * Math.min(1, 12 * dt);
  }

  // grace-period shield: visible & pulsing while invulnerable at the start
  const inGrace = running && t < graceUntil;
  shield.visible = inGrace;
  if (inGrace) {
    shield.material.opacity = 0.12 + Math.abs(Math.sin(t * 6)) * 0.14;
    shield.scale.setScalar(1 + Math.sin(t * 6) * 0.04);
  }

  // flipper flap
  flippers.forEach((f, i) => {
    f.pivot.rotation.z = Math.sin(t * 6 + (i % 2) * Math.PI) * 0.5 * (f.x < 0 ? 1 : -1);
  });

  if (running) {
    speed += dt * 0.35;           // ramp difficulty (gentler)
    score += dt * 10 + dt * speed; // distance + speed bonus
    scoreEl.textContent = Math.floor(score);

    for (const bag of bags) {
      bag.position.z += speed * dt;
      bag.rotation.y += bag.userData.spin * dt;
      bag.position.x += Math.sin(t + bag.userData.bob) * 0.004;

      // passed the turtle without hitting -> dodged
      if (!bag.userData.scored && bag.position.z > 2) {
        bag.userData.scored = true;
        dodged++;
        dodgedEl.textContent = dodged;
      }
      // recycle
      if (bag.position.z > 12) placeBag(bag, false);

      // collision near the turtle plane (disabled during the start grace period)
      if (t > graceUntil && bag.position.z > -1.2 && bag.position.z < 1.2) {
        const dx = bag.position.x - turtle.position.x;
        const dy = bag.position.y - turtle.position.y;
        const hitR = TURTLE_R + 0.5 * bag.scale.x;
        if (dx * dx + dy * dy < hitR * hitR) { gameOver(); }
      }
    }

    // moon jellies — drift toward Friday; swim into one to eat it (it pops)
    for (const j of jellies) {
      j.position.z += speed * dt;
      j.rotation.y += 0.3 * dt;

      if (j.userData.popping) {                 // pop: balloon out & fade, then recycle
        const k = (t - j.userData.popT) / 0.32;
        j.scale.setScalar(j.userData.baseScale * (1 + k * 1.6));
        j.userData.bellMat.opacity = 0.45 * (1 - k);
        j.userData.gonMat.opacity = 0.6 * (1 - k);
        if (k >= 1) placeJelly(j, false);
        continue;
      }

      j.userData.bell.scale.y = 1 + Math.sin(t * 3 + j.userData.phase) * 0.2;   // bell pulse
      if (j.position.z > 12) { placeJelly(j, false); continue; }

      // eat when overlapping the turtle
      if (j.position.z > -1.5 && j.position.z < 1.5) {
        const dx = j.position.x - turtle.position.x;
        const dy = j.position.y - turtle.position.y;
        const r = TURTLE_R + 1.2 * j.scale.x;
        if (dx * dx + dy * dy < r * r) {
          j.userData.popping = true;
          j.userData.popT = t;
          jelliesEaten++;
          score += 25;
          chompUntil = t + 0.45;
          jelliesEl.textContent = jelliesEaten;
        }
      }
    }
  }

  // current speed used for ambient scrolling (gentle drift on menu, game speed in play)
  const flow = running ? speed : 6;

  // seagrass scrolls with the current and sways
  for (const cl of grassClusters) {
    cl.position.z += flow * dt;
    if (cl.position.z > 14) placeGrass(cl, false);
    for (const blade of cl.userData.blades) {
      blade.rotation.z = Math.sin(t * 1.6 + blade.userData.phase) * blade.userData.sway;
    }
  }

  // occasionally send a shark cruising across the background
  if (t > nextSharkAt) {
    const idle = sharks.filter((s) => !s.userData.active);
    if (idle.length) launchShark(idle[Math.floor(Math.random() * idle.length)]);
    nextSharkAt = t + 3.5 + Math.random() * 6;   // next one in a few seconds
  }
  for (const shark of sharks) {
    if (!shark.userData.active) continue;
    shark.position.x += shark.userData.dir * shark.userData.speed * dt;
    shark.position.y += Math.sin(t * 1.2 + shark.userData.bob) * 0.005;
    shark.userData.tail.rotation.y = Math.sin(t * 5 + shark.userData.phase) * 0.5;   // swimming wag
    shark.rotation.z = Math.sin(t * 2.5 + shark.userData.phase) * 0.06;              // gentle roll
    if (Math.abs(shark.position.x) > 34) { shark.userData.active = false; shark.visible = false; }
  }

  // bubbles drift toward camera
  const bp = bubbleGeo.attributes.position;
  for (let i = 0; i < BUB; i++) {
    let z = bp.getZ(i) + flow * dt;
    let y = bp.getY(i) + dt * 0.6;
    if (z > 12) z = -80;
    if (y > 12) y = -12;
    bp.setZ(i, z); bp.setY(i, y);
  }
  bp.needsUpdate = true;

  renderer.render(scene, camera);
}

// hide loading once first frame is ready
document.getElementById('loading').style.display = 'none';
animate();
