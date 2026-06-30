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
  if (x < 0) pivot.scale.x = -1;     // mirror to the left side

  const L = front ? 2.5 : 1.3, w = front ? 0.62 : 0.5;
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
  // rest pose: front flippers swept slightly forward, rear angled back
  pivot.rotation.y = front ? -0.5 : 1.9;
  turtle.add(pivot);
  flippers.push({ pivot, x, front, baseY: pivot.rotation.y });
}
makeFlipper(-1.2, 0.85, true);
makeFlipper(1.2, 0.85, true);
makeFlipper(-1.0, -1.25, false);
makeFlipper(1.0, -1.25, false);

// short pointed tail
const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 8), skinMat);
tail.rotation.x = -Math.PI / 2;
tail.position.set(0, -0.12, -2.05);
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

const BAG_COUNT = 22;
const bags = [];
const SPAWN_Z = -70;
const xRange = 5.2, yRange = 3.0;

function placeBag(bag, initial) {
  bag.position.x = (Math.random() - 0.5) * 2 * xRange;
  bag.position.y = (Math.random() - 0.5) * 2 * yRange;
  bag.position.z = initial ? -26 - Math.random() * 50 : SPAWN_Z - Math.random() * 20;
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

// ---------- Background fish school ----------
// Small silhouetted fish drifting slowly across the deep background.
const fishMat = new THREE.MeshStandardMaterial({ color: 0x16475f, roughness: 1, transparent: true, opacity: 0.8 });
function makeFish() {
  const f = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 8), fishMat);
  body.rotation.z = -Math.PI / 2;
  f.add(body);
  const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 4), fishMat);
  tailFin.rotation.z = Math.PI / 2;
  tailFin.position.x = -0.42;
  f.add(tailFin);
  return f;
}
const FISH_N = 16;
const fishes = [];
function placeFish(fish) {
  fish.userData.dir = Math.random() < 0.5 ? 1 : -1;
  fish.position.set(fish.userData.dir * -20, (Math.random() - 0.3) * 14, -28 - Math.random() * 28);
  fish.userData.speed = 1.2 + Math.random() * 1.6;
  fish.userData.bob = Math.random() * Math.PI * 2;
  const s = 0.7 + Math.random() * 0.9;
  fish.scale.setScalar(s);
  fish.rotation.y = fish.userData.dir > 0 ? 0 : Math.PI;
}
for (let i = 0; i < FISH_N; i++) {
  const f = makeFish();
  placeFish(f);
  f.position.x = (Math.random() - 0.5) * 40; // spread initially
  fishes.push(f);
  scene.add(f);
}

// ---------- Input ----------
const target = { x: 0, y: 0 };
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
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
let score = 0, dodged = 0, speed = 18;
let graceUntil = 0;        // collisions disabled until this time (start grace period)
const GRACE = 2.0;         // seconds of safe swimming at the start of each run
const scoreEl = document.getElementById('score');
const dodgedEl = document.getElementById('dodged');
const panel = document.getElementById('panel');
const hud = document.getElementById('hud');
const msg = document.getElementById('msg');
const playBtn = document.getElementById('play');

function startGame() {
  score = 0; dodged = 0; speed = 18;
  target.x = 0; target.y = 0;
  turtle.position.set(0, 0, 0);
  bags.forEach((b) => placeBag(b, true));
  graceUntil = clock.elapsedTime + GRACE;
  scoreEl.textContent = '0';
  dodgedEl.textContent = '0';
  panel.classList.add('hidden');
  hud.style.display = 'flex';
  running = true;
}

function gameOver() {
  running = false;
  hud.style.display = 'none';
  msg.innerHTML = `A plastic bag caught Friday! 🛑<br><br>You scored <strong>${Math.floor(score)}</strong> and dodged <strong>${dodged}</strong> bags. Marine litter is a real threat to sea turtles — thanks for helping Friday weave through it!`;
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

  // keyboard steering
  const kspeed = 9 * dt;
  if (keys['a'] || keys['arrowleft']) target.x -= kspeed;
  if (keys['d'] || keys['arrowright']) target.x += kspeed;
  if (keys['w'] || keys['arrowup']) target.y += kspeed;
  if (keys['s'] || keys['arrowdown']) target.y -= kspeed;
  target.x = Math.max(-xRange, Math.min(xRange, target.x));
  target.y = Math.max(-yRange, Math.min(yRange, target.y));

  // smooth turtle motion + banking
  const prevX = turtle.position.x, prevY = turtle.position.y;
  turtle.position.x += (target.x - turtle.position.x) * Math.min(1, 8 * dt);
  turtle.position.y += (target.y - turtle.position.y) * Math.min(1, 8 * dt);
  turtle.position.y += Math.sin(t * 1.5) * 0.003; // gentle idle bob
  const vx = turtle.position.x - prevX, vy = turtle.position.y - prevY;
  turtle.rotation.z = THREE.MathUtils.lerp(turtle.rotation.z, -vx * 4, 0.15);
  turtle.rotation.x = THREE.MathUtils.lerp(turtle.rotation.x, vy * 3, 0.15);

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
    speed += dt * 0.6;            // ramp difficulty
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

  // background fish drift across and slowly toward the camera
  for (const fish of fishes) {
    fish.position.x += fish.userData.dir * fish.userData.speed * dt;
    fish.position.z += flow * 0.25 * dt;
    fish.position.y += Math.sin(t * 1.5 + fish.userData.bob) * 0.004;
    if (fish.userData.dir > 0 && fish.position.x > 22) placeFish(fish);
    else if (fish.userData.dir < 0 && fish.position.x < -22) placeFish(fish);
    else if (fish.position.z > 8) placeFish(fish);
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
