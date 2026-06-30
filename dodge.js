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

const shellMat = new THREE.MeshStandardMaterial({ color: 0x2f7d4f, roughness: 0.6, flatShading: true });
const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), shellMat);
shell.scale.set(1.35, 0.55, 1.7);
turtle.add(shell);

// shell scute pattern (darker hexish bumps)
const scuteMat = new THREE.MeshStandardMaterial({ color: 0x1f5d39, roughness: 0.7, flatShading: true });
for (let i = 0; i < 7; i++) {
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 6), scuteMat);
  const ang = (i / 7) * Math.PI * 2;
  const rr = i === 0 ? 0 : 0.75;
  s.position.set(Math.cos(ang) * rr * 1.1, 0.55, Math.sin(ang) * rr * 1.3);
  turtle.add(s);
}

const skinMat = new THREE.MeshStandardMaterial({ color: 0x4caf6e, roughness: 0.7, flatShading: true });

// head
const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), skinMat);
head.scale.set(0.9, 0.8, 1.1);
head.position.set(0, 0.1, 1.9);
turtle.add(head);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101010 });
for (const sx of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
  eye.position.set(0.22 * sx, 0.2, 2.15);
  turtle.add(eye);
}

// flippers (animated)
const flippers = [];
function makeFlipper(x, z, front) {
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), skinMat);
  f.scale.set(front ? 1.2 : 0.9, 0.18, 0.6);
  f.position.set(x, -0.05, z);
  const pivot = new THREE.Group();
  pivot.position.set(x, -0.05, z);
  f.position.set(0, 0, 0);
  pivot.add(f);
  turtle.add(pivot);
  flippers.push({ pivot, x, front });
}
makeFlipper(-1.3, 0.6, true);
makeFlipper(1.3, 0.6, true);
makeFlipper(-1.15, -0.9, false);
makeFlipper(1.15, -0.9, false);

// tail
const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 8), skinMat);
tail.rotation.x = -Math.PI / 2;
tail.position.set(0, 0, -1.9);
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
