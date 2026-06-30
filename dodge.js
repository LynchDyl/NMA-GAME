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
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 240, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x0d6e84, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -6;
scene.add(floor);

// ---------- Turtle (Friday) ----------
const turtle = new THREE.Group();
scene.add(turtle);

// Realistic green sea turtle palette: olive/brown mottled carapace,
// pale cream plastron and limb undersides, spotted olive head.
const CARAPACE = 0x7d8a4a;   // olive-green shell
const CARAPACE_DK = 0x555e2e; // darker mottled patches
const CARAPACE_BR = 0x8a6f3a; // brownish streaks
const CREAM = 0xe8e2c4;       // pale plastron / underside
const SKIN = 0x9aa05c;        // olive limb/head skin
const SPOT = 0x3a3320;        // dark head spots

const shellMat = new THREE.MeshStandardMaterial({ color: CARAPACE, roughness: 0.65, flatShading: true });
// elongated tear-drop carapace (wider at front shoulders, tapering to rear)
const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), shellMat);
shell.scale.set(1.45, 0.5, 1.95);
const sp = shell.geometry.attributes.position;
for (let i = 0; i < sp.count; i++) {
  const z = sp.getZ(i);
  if (z < 0) { sp.setX(i, sp.getX(i) * (1 + z * 0.18)); } // taper the tail end
}
shell.geometry.computeVertexNormals();
turtle.add(shell);

// pale plastron (belly) slightly below
const plastron = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
  new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.8, flatShading: true }));
plastron.scale.set(1.2, 0.32, 1.7);
plastron.position.y = -0.28;
turtle.add(plastron);

// mottled scute patches scattered over the carapace (varied olive/brown shades)
const scuteShades = [CARAPACE_DK, CARAPACE_BR, CARAPACE_DK, 0x6b7438];
for (let i = 0; i < 16; i++) {
  const mat = new THREE.MeshStandardMaterial({ color: scuteShades[i % scuteShades.length], roughness: 0.75, flatShading: true });
  const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.18 + Math.random() * 0.14, 0.16, 0.06, 6), mat);
  // distribute across the top dome of the shell
  const u = (Math.random() - 0.5) * 1.9;   // across width
  const v = (Math.random() - 0.5) * 2.9;   // along length
  const yTop = 0.48 * Math.sqrt(Math.max(0, 1 - (u / 1.45) ** 2 - (v / 1.95) ** 2));
  patch.position.set(u, yTop + 0.02, v);
  patch.rotation.y = Math.random() * Math.PI;
  turtle.add(patch);
}

const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.7, flatShading: true });
const creamMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.8, flatShading: true });

// neck + head
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.7, 10), skinMat);
neck.rotation.x = Math.PI / 2;
neck.position.set(0, -0.02, 1.75);
turtle.add(neck);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), skinMat);
head.scale.set(0.85, 0.78, 1.15);
head.position.set(0, 0.02, 2.25);
turtle.add(head);
// pale beak / lower jaw
const beak = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), creamMat);
beak.scale.set(0.7, 0.55, 0.8);
beak.position.set(0, -0.13, 2.55);
turtle.add(beak);
// dark spots speckled over the head scales
for (let i = 0; i < 14; i++) {
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6),
    new THREE.MeshStandardMaterial({ color: SPOT, roughness: 0.6 }));
  const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.12;
  spot.position.set(Math.cos(a) * r * 0.8, 0.05 + Math.sin(a) * r * 0.7, 2.25 + (Math.random() - 0.2) * 0.35);
  spot.scale.z = 0.4;
  turtle.add(spot);
}
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
for (const sx of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
  eye.position.set(0.27 * sx, 0.08, 2.4);
  turtle.add(eye);
}

// flippers — large paddle-shaped front pair, smaller rear pair.
// Built as a 2-segment pivot so they sweep like real flippers.
const flippers = [];
function makeFlipper(x, z, front) {
  const pivot = new THREE.Group();
  pivot.position.set(x, -0.05, z);

  const len = front ? 2.0 : 1.0;
  const wide = front ? 0.85 : 0.6;
  const paddle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), skinMat);
  paddle.scale.set(wide, 0.14, len);
  // sweep the paddle outward and back from the shoulder
  paddle.position.set(x * 0.5 * wide, 0, front ? len * 0.42 : -len * 0.42);
  pivot.add(paddle);

  // pale underside trailing edge
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6), creamMat);
  under.scale.set(wide * 0.7, 0.1, len * 0.8);
  under.position.copy(paddle.position);
  under.position.y -= 0.08;
  pivot.add(under);

  turtle.add(pivot);
  flippers.push({ pivot, x, front });
}
makeFlipper(-1.25, 0.7, true);
makeFlipper(1.25, 0.7, true);
makeFlipper(-1.05, -1.15, false);
makeFlipper(1.05, -1.15, false);

// short pointed tail
const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 8), skinMat);
tail.rotation.x = -Math.PI / 2;
tail.position.set(0, -0.1, -2.0);
turtle.add(tail);

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
  bag.position.z = initial ? -10 - Math.random() * 60 : SPAWN_Z - Math.random() * 20;
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

      // collision near the turtle plane
      if (bag.position.z > -1.2 && bag.position.z < 1.2) {
        const dx = bag.position.x - turtle.position.x;
        const dy = bag.position.y - turtle.position.y;
        const hitR = TURTLE_R + 0.5 * bag.scale.x;
        if (dx * dx + dy * dy < hitR * hitR) { gameOver(); }
      }
    }
  }

  // bubbles drift toward camera
  const bp = bubbleGeo.attributes.position;
  for (let i = 0; i < BUB; i++) {
    let z = bp.getZ(i) + (running ? speed : 6) * dt;
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
