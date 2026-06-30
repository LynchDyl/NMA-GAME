import * as THREE from 'three';
import { getModel } from './vendor/models.js';

// ---------- Boot ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // filmic, GTA-ish grade
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a4f7a);
scene.fog = new THREE.Fog(0x0a4f7a, 20, 70);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
camera.position.set(0, 1.6, 7.5);
camera.lookAt(0, 0.2, -4);

// ---------- Lighting ----------
scene.add(new THREE.HemisphereLight(0x9fe0ff, 0x06324d, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.35);   // warm key from above
sun.position.set(5, 13, 7);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xbfe6ff, 0.5);   // cool fill from front-left
fill.position.set(-6, 3, 8);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xcdf0ff, 0.7);    // cool rim from behind for separation
rim.position.set(-2, 4, -10);
scene.add(rim);
// soft spotlight that lights Friday on the wardrobe turntable
const studio = new THREE.SpotLight(0xfff4e0, 0.0, 30, Math.PI / 5, 0.5, 1.2);
studio.position.set(0, 9, 6);
studio.target.position.set(0, 0.4, 1.5);
scene.add(studio); scene.add(studio.target);

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

// ---- Reptile skin scale texture (tiled), tints via material colour ----
function makeScaleTexture() {
  const S = 128, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#8f8f8f'; g.fillRect(0, 0, S, S);
  const cell = 17;
  for (let y = -1; y * cell < S + cell; y++) {
    for (let x = -1; x * cell < S + cell; x++) {
      const ox = (y & 1) * cell / 2;
      const cxp = x * cell + ox + (Math.random() - 0.5) * 4;
      const cyp = y * cell + (Math.random() - 0.5) * 4;
      const r = cell * 0.5 + (Math.random() - 0.5) * 3;
      g.beginPath();
      g.ellipse(cxp, cyp, r, r * 0.82, Math.random() * 0.6, 0, Math.PI * 2);
      const s = 190 + Math.random() * 55;            // light scale crowns
      g.fillStyle = `rgb(${s},${s},${s})`;
      g.fill();
      g.lineWidth = 1.6; g.strokeStyle = 'rgba(60,60,60,0.55)'; // dark seams
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  return tex;
}
const scaleTex = makeScaleTexture();

// ---- Domed carapace with true scute relief + per-vertex colour ----
// Scutes are laid out as Voronoi cells from seed points; cell interiors are
// raised into rounded plates and seams sink into grooves, with a brown/olive
// shade per scute (subtle, natural) — no painted texture.
function buildCarapace(a, b, height) {
  const RINGS = 30, SEG = 64;
  const seeds = [];
  for (let i = 0; i < 5; i++) seeds.push([0, -0.62 + i * 0.31]);                 // vertebral row
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) seeds.push([s * 0.46, -0.5 + i * 0.34]); // costals
  const M = 18; for (let i = 0; i < M; i++) { const an = (i + 0.5) / M * Math.PI * 2; seeds.push([Math.cos(an) * 0.84, Math.sin(an) * 0.84]); } // marginals
  seeds.push([0, 0.95]);                                                         // nuchal
  const shades = seeds.map((s, i) => {
    const f = Math.abs((Math.sin(i * 91.17) * 1000) % 1);
    return new THREE.Color().setRGB(0.34 + 0.13 * f, 0.30 + 0.11 * f, 0.17 + 0.07 * f);
  });

  const pos = [], col = [], idx = [];
  const tmp = new THREE.Color();
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    for (let j = 0; j <= SEG; j++) {
      const ang = (j / SEG) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
      let x = a * t * ca, z = b * t * sa;
      if (z < 0) x *= 1 + (z / b) * 0.16;             // rear taper
      const u = t * ca, v = t * sa;                    // unit-disk coords for seeds
      let d1 = 1e9, d2 = 1e9, n1 = 0;
      for (let s = 0; s < seeds.length; s++) {
        const du = u - seeds[s][0], dv = v - seeds[s][1], d = du * du + dv * dv;
        if (d < d1) { d2 = d1; d1 = d; n1 = s; } else if (d < d2) { d2 = d; }
      }
      d1 = Math.sqrt(d1); d2 = Math.sqrt(d2);
      const edge = Math.max(0, Math.min(1, (d2 - d1) / 0.05)); // 0 at seam → 1 inside
      let y = height * Math.cos(t * Math.PI / 2);
      if (t > 0.84) y -= (t - 0.84) * height * 1.6;    // marginal rim flare
      y += 0.06 * edge * (1 - t * 0.4);                // raised scute plates
      pos.push(x, y, z);
      tmp.copy(shades[n1]);
      const mott = 0.9 + 0.1 * Math.sin(x * 6.3 + z * 4.7);
      tmp.multiplyScalar((0.5 + 0.5 * edge) * mott);   // darken grooves
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < RINGS; i++)
    for (let j = 0; j < SEG; j++) {
      const a0 = i * (SEG + 1) + j, a1 = a0 + 1, b0 = (i + 1) * (SEG + 1) + j, b1 = b0 + 1;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const shell = new THREE.Mesh(
  buildCarapace(1.5, 2.0, 0.62),
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0, side: THREE.DoubleSide })
);
turtle.add(shell);

// NMA logo stickered onto the carapace. The plane is gently bowed to hug the
// dome so it reads as printed on the shell rather than floating above it.
const texLoader = new THREE.TextureLoader();
const logoTex = texLoader.load('assets/logos/nma-decal.png');
logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 4;
const LOGO_W = 1.5, LOGO_H = LOGO_W * 211 / 658;
const logoGeo = new THREE.PlaneGeometry(LOGO_W, LOGO_H, 12, 4);
{
  const p = logoGeo.attributes.position;          // bow down at the edges to follow the dome
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, -(x * x) * 0.34 - (y * y) * 0.5);
  }
  logoGeo.computeVertexNormals();
}
const logoDecal = new THREE.Mesh(logoGeo, new THREE.MeshStandardMaterial({
  map: logoTex, transparent: true, roughness: 0.6, metalness: 0.0,
  polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false, side: THREE.DoubleSide,
}));
logoDecal.rotation.x = -Math.PI / 2;              // lie flat on the dome, text reading toward the head
logoDecal.position.set(0, 0.66, -0.1);
turtle.add(logoDecal);

const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, map: scaleTex, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });
const creamMat = new THREE.MeshStandardMaterial({ color: CREAM, map: scaleTex, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide });

// pale plastron (belly) tucked just under the carapace
const plastron = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), creamMat);
plastron.scale.set(1.28, 0.34, 1.78);
plastron.position.y = -0.34;
turtle.add(plastron);

// ---- neck + head ---- (blockier loggerhead-style head with a hooked beak)
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.95, 16), skinMat);
neck.rotation.x = Math.PI / 2;
neck.position.set(0, -0.02, 1.9);
turtle.add(neck);
const throat = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), creamMat);
throat.scale.set(0.8, 0.58, 1.1);
throat.position.set(0, -0.26, 2.24);
turtle.add(throat);

const headMat = new THREE.MeshStandardMaterial({ map: makeHeadTexture(), roughness: 0.55, metalness: 0.0 });
const hornMat = new THREE.MeshStandardMaterial({ color: 0xcdbb86, roughness: 0.45, metalness: 0.0 });

// main head — elongated, slightly flattened crown
const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 22, 18), headMat);
head.scale.set(0.9, 0.82, 1.34);
head.position.set(0, 0.04, 2.62);
turtle.add(head);
// blocky cheeks for a chunky loggerhead jaw
for (const sx of [-1, 1]) {
  const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), headMat);
  cheek.scale.set(0.7, 0.7, 0.95);
  cheek.position.set(0.28 * sx, -0.06, 2.78);
  turtle.add(cheek);
}
// brow ridges (hooded look over the eyes)
for (const sx of [-1, 1]) {
  const brow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), headMat);
  brow.scale.set(1.0, 0.45, 0.7);
  brow.position.set(0.3 * sx, 0.26, 2.82);
  turtle.add(brow);
}
// upper jaw — hooked keratin beak
const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.46, 14), hornMat);
upperBeak.rotation.x = Math.PI / 2 + 0.55;
upperBeak.scale.set(1, 0.72, 1);
upperBeak.position.set(0, 0.0, 3.16);
turtle.add(upperBeak);
// lower jaw (cream) — this is what animates during the chomp
const beak = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), creamMat);
beak.scale.set(0.64, 0.5, 0.92);
beak.position.set(0, -0.18, 3.02);
turtle.add(beak);

const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0x1a1408, roughness: 0.5 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.15, metalness: 0.1 });
for (const sx of [-1, 1]) {
  const socket = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), eyeWhiteMat);
  socket.scale.set(1, 1, 0.7);
  socket.position.set(0.35 * sx, 0.13, 2.92);
  turtle.add(socket);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), eyeMat);
  eye.position.set(0.37 * sx, 0.14, 3.0);
  turtle.add(eye);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  glint.position.set(0.4 * sx, 0.18, 3.05);
  turtle.add(glint);
  const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), eyeMat);
  nostril.position.set(0.08 * sx, 0.02, 3.42);
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

// =====================================================================
// HATS — a wardrobe of detailed hats that seat on Friday's head.
// Each builder returns a Group whose local origin is the "seat" point;
// the hat is added to hatAnchor, parked just above the crown so brims
// flare clear of the head (no clipping).
// =====================================================================
const hatAnchor = new THREE.Group();
hatAnchor.position.set(0, 0.40, 2.62);   // just above the crown
turtle.add(hatAnchor);

function hatMat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.65, metalness: o.metal ?? 0.0,
    side: THREE.DoubleSide, flatShading: !!o.flat
  });
}
function cyl(rt, rb, h, mat, seg = 24) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}

// Cowboy hat — upturned lathe brim, creased crown, leather band.
function hatCowboy() {
  const g = new THREE.Group();
  const leather = hatMat(0x6e4a29, { rough: 0.75 });
  const dark = hatMat(0x3c2614, { rough: 0.8 });
  const brimProfile = [
    new THREE.Vector2(0.30, 0.05), new THREE.Vector2(0.55, 0.00),
    new THREE.Vector2(0.78, 0.01), new THREE.Vector2(0.90, 0.10),
    new THREE.Vector2(0.92, 0.16)
  ];
  const brim = new THREE.Mesh(new THREE.LatheGeometry(brimProfile, 32), leather);
  brim.scale.set(1, 1, 0.82);           // a touch oval
  g.add(brim);
  const crown = cyl(0.30, 0.345, 0.42, leather);
  crown.position.y = 0.27;
  crown.scale.z = 0.92;
  g.add(crown);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.30, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), leather);
  dome.position.y = 0.48; dome.scale.set(1, 0.7, 0.92);
  g.add(dome);
  const crease = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.5), dark);
  crease.position.y = 0.55;
  g.add(crease);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.045, 8, 28), dark);
  band.rotation.x = Math.PI / 2; band.position.y = 0.13; band.scale.z = 0.92;
  g.add(band);
  return g;
}

// Beer / drinking helmet — cap, two cans, curly straws to the mouth.
function hatBeer() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), hatMat(0xdadfe3, { rough: 0.4 }));
  cap.position.y = 0.02; cap.scale.y = 0.85;
  g.add(cap);
  const canRed = hatMat(0xc0392b, { rough: 0.35 });
  const canWhite = hatMat(0xf2f2f2, { rough: 0.4 });
  const straw = hatMat(0xd23b2c, { rough: 0.4 });
  for (const sx of [-1, 1]) {
    const can = cyl(0.14, 0.14, 0.34, canRed, 16);
    can.position.set(sx * 0.42, 0.2, 0);
    g.add(can);
    const label = cyl(0.142, 0.142, 0.12, canWhite, 16);
    label.position.set(sx * 0.42, 0.2, 0);
    g.add(label);
    const top = cyl(0.13, 0.13, 0.03, hatMat(0xb0b6ba, { metal: 0.6, rough: 0.3 }), 16);
    top.position.set(sx * 0.42, 0.38, 0);
    g.add(top);
    // curly straw: a tube from can top arcing to the front-centre (mouth)
    const pts = [
      new THREE.Vector3(sx * 0.42, 0.42, 0),
      new THREE.Vector3(sx * 0.34, 0.55, 0.18),
      new THREE.Vector3(sx * 0.12, 0.30, 0.42),
      new THREE.Vector3(sx * 0.05, -0.05, 0.55)
    ];
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.022, 6), straw);
    g.add(tube);
  }
  return g;
}

// Fez — truncated cone with a flat top and a swinging tassel.
function hatFez() {
  const g = new THREE.Group();
  const felt = hatMat(0xb02a2a, { rough: 0.7 });
  const body = cyl(0.27, 0.34, 0.44, felt, 28);
  body.position.y = 0.22;
  g.add(body);
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.27, 28), felt);
  top.rotation.x = -Math.PI / 2; top.position.y = 0.44;
  g.add(top);
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), hatMat(0xd4af37, { metal: 0.4, rough: 0.4 }));
  button.position.y = 0.45; g.add(button);
  const gold = hatMat(0xe6c84b, { metal: 0.3, rough: 0.4 });
  const cord = cyl(0.012, 0.012, 0.34, gold, 6);
  cord.position.set(0.16, 0.30, 0.06); cord.rotation.z = 0.5;
  g.add(cord);
  const tassel = cyl(0.05, 0.02, 0.12, gold, 8);
  tassel.position.set(0.3, 0.16, 0.1);
  g.add(tassel);
  return g;
}

// Top hat — tall cylinder, curved brim, ribbon band.
function hatTop() {
  const g = new THREE.Group();
  const blk = hatMat(0x141414, { rough: 0.35 });
  const brim = cyl(0.62, 0.62, 0.04, blk, 36);
  brim.scale.z = 0.9; brim.position.y = 0.02;
  g.add(brim);
  const body = cyl(0.42, 0.40, 0.66, blk, 32);
  body.position.y = 0.37; body.scale.z = 0.92;
  g.add(body);
  const topc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), blk);
  topc.rotation.x = -Math.PI / 2; topc.position.y = 0.70; topc.scale.z = 0.92;
  g.add(topc);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.05, 8, 32), hatMat(0x7a1f1f, { rough: 0.5 }));
  band.rotation.x = Math.PI / 2; band.position.y = 0.12; band.scale.z = 0.92;
  g.add(band);
  return g;
}

// Party hat — striped cone with a pom-pom.
function hatParty() {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const cx = cv.getContext('2d');
  const cols = ['#ff4d8d', '#ffd23f', '#3fc1ff', '#7be06b'];
  for (let i = 0; i < 16; i++) { cx.fillStyle = cols[i % cols.length]; cx.fillRect(i * 4, 0, 4, 64); }
  const tex = new THREE.CanvasTexture(cv);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.72, 24),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  cone.position.y = 0.36; g.add(cone);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), hatMat(0xfff3a0, { rough: 0.9 }));
  pom.position.y = 0.74; g.add(pom);
  return g;
}

// Captain's cap — white crown, peaked black visor, gold band + emblem.
function hatCaptain() {
  const g = new THREE.Group();
  const white = hatMat(0xf3f4f6, { rough: 0.5 });
  const band = cyl(0.42, 0.42, 0.16, white, 28);
  band.position.y = 0.08; band.scale.z = 0.95; g.add(band);
  const crown = cyl(0.47, 0.42, 0.12, white, 28);
  crown.position.y = 0.2; crown.scale.z = 0.95; g.add(crown);
  const topc = new THREE.Mesh(new THREE.CircleGeometry(0.47, 28), white);
  topc.rotation.x = -Math.PI / 2; topc.position.y = 0.26; topc.scale.z = 0.95; g.add(topc);
  const gold = hatMat(0xd4af37, { metal: 0.5, rough: 0.35 });
  const gband = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.022, 8, 30), gold);
  gband.rotation.x = Math.PI / 2; gband.position.y = 0.02; gband.scale.z = 0.95; g.add(gband);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 28, 1, false, -Math.PI * 0.28, Math.PI * 0.56), hatMat(0x111417, { rough: 0.4 }));
  visor.position.set(0, 0.0, 0.34); visor.scale.set(1.05, 1, 1.5); g.add(visor);
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), gold);
  emblem.position.set(0, 0.12, 0.41); g.add(emblem);
  return g;
}

// Crown — gold band with points and gems.
function hatCrown() {
  const g = new THREE.Group();
  const gold = hatMat(0xe8c14a, { metal: 0.7, rough: 0.25 });
  const band = cyl(0.42, 0.42, 0.2, gold, 28);
  band.position.y = 0.1; g.add(band);
  const gemCols = [0xff3b5c, 0x3b7bff, 0x46e06b, 0xffd23f];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pt = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), gold);
    pt.position.set(Math.cos(a) * 0.42, 0.3, Math.sin(a) * 0.42);
    g.add(pt);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), hatMat(gemCols[i % 4], { metal: 0.3, rough: 0.2 }));
    tip.position.set(Math.cos(a) * 0.42, 0.42, Math.sin(a) * 0.42);
    g.add(tip);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), hatMat(gemCols[i % 4], { metal: 0.3, rough: 0.2 }));
    gem.position.set(Math.cos(a) * 0.42, 0.12, Math.sin(a) * 0.42);
    gem.scale.set(1, 1, 0.5); g.add(gem);
  }
  return g;
}

// Sombrero — huge upturned brim and tall crown with a colourful band.
function hatSombrero() {
  const g = new THREE.Group();
  const straw = hatMat(0xd9b066, { rough: 0.85 });
  const brim = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.34, 0.04), new THREE.Vector2(0.7, -0.02),
    new THREE.Vector2(1.05, 0.02), new THREE.Vector2(1.18, 0.16)
  ], 36), straw);
  g.add(brim);
  const crown = cyl(0.3, 0.36, 0.5, straw, 28);
  crown.position.y = 0.3; g.add(crown);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), straw);
  dome.position.y = 0.55; g.add(dome);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 28), hatMat(0xb5402f, { rough: 0.6 }));
  band.rotation.x = Math.PI / 2; band.position.y = 0.12; g.add(band);
  return g;
}

// Propeller beanie — striped cap, button and a spinning propeller.
function hatPropeller() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), hatMat(0x2f7d9a, { rough: 0.6 }));
  cap.position.y = 0.0; cap.scale.y = 0.95; g.add(cap);
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.405, 20, 14, i * Math.PI / 2, Math.PI / 4, 0, Math.PI / 2),
      hatMat(i % 2 ? 0xe8554d : 0xf2c14e, { rough: 0.6 }));
    stripe.scale.y = 0.95; g.add(stripe);
  }
  const stalk = cyl(0.025, 0.025, 0.16, hatMat(0x9aa0a6, { metal: 0.4 }), 8);
  stalk.position.y = 0.42; g.add(stalk);
  const prop = new THREE.Group();
  for (const r of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.07), hatMat(0xff5d5d, { rough: 0.5 }));
    blade.position.set(Math.cos(r) * 0.17, 0, Math.sin(r) * 0.17);
    blade.rotation.y = r; blade.rotation.z = 0.25;
    prop.add(blade);
  }
  prop.position.y = 0.5; prop.userData.spin = true;
  g.add(prop);
  g.userData.propeller = prop;
  return g;
}

// Pirate tricorn — three upturned black flaps round a low crown, skull badge.
function hatPirate() {
  const g = new THREE.Group();
  const blk = hatMat(0x1c1c20, { rough: 0.6 });
  const crown = cyl(0.34, 0.38, 0.26, blk, 24);
  crown.position.y = 0.16; g.add(crown);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), blk);
  top.position.y = 0.26; top.scale.y = 0.5; g.add(top);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const flap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 20, 1, false, -0.6, 1.2), blk);
    flap.position.set(Math.cos(a) * 0.34, 0.16, Math.sin(a) * 0.34);
    flap.rotation.y = -a; flap.rotation.x = -0.55; flap.scale.set(1, 1, 1.6);
    g.add(flap);
  }
  const trim = hatMat(0xd9c25a, { metal: 0.3, rough: 0.5 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), hatMat(0xf3f0e6, { rough: 0.6 }));
  skull.position.set(0, 0.18, 0.4); skull.scale.set(1, 1.1, 0.7); g.add(skull);
  for (const sx of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), hatMat(0x111));
    socket.position.set(0.035 * sx, 0.19, 0.47); g.add(socket);
  }
  for (const rot of [0.6, -0.6]) {          // crossbones
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.18, 6), hatMat(0xf3f0e6, { rough: 0.6 }));
    bone.position.set(0, 0.08, 0.42); bone.rotation.z = Math.PI / 2 + rot; g.add(bone);
  }
  const feather = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 8), hatMat(0xb5402f, { rough: 0.7 }));
  feather.position.set(0.22, 0.5, -0.1); feather.rotation.z = -0.5; feather.scale.set(1, 1, 0.3); g.add(feather);
  return g;
}

// Snorkel & dive mask — lens over the eyes (offset down/forward) + snorkel tube.
function hatSnorkel() {
  const g = new THREE.Group();
  const strap = hatMat(0x16161a, { rough: 0.7 });
  const frame = hatMat(0x1f6f8c, { rough: 0.4 });
  const lens = new THREE.MeshStandardMaterial({ color: 0x9fe4ff, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide });
  // mask body sits over the eyes
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.36, 0.18), frame);
  body.position.set(0, -0.2, 0.34); body.scale.set(1, 1, 1);
  // round the front a touch
  g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.26, 0.08), lens);
  glass.position.set(0, -0.2, 0.45); g.add(glass);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 8, 28), strap);
  band.position.set(0, -0.16, 0.05); band.rotation.y = Math.PI / 2; band.scale.set(1, 0.7, 1); g.add(band);
  // snorkel: vertical tube on the left with a curved mouthpiece
  const tube = cyl(0.05, 0.05, 0.7, frame, 12);
  tube.position.set(-0.5, 0.05, 0.3); g.add(tube);
  const topBend = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.05, 8, 12, Math.PI), frame);
  topBend.position.set(-0.44, 0.4, 0.3); topBend.rotation.z = Math.PI; g.add(topBend);
  const mouth = cyl(0.045, 0.045, 0.18, strap, 10);
  mouth.position.set(-0.42, -0.28, 0.34); mouth.rotation.x = 0.4; g.add(mouth);
  return g;
}

// Halo — glowing gold ring that floats above the head.
function hatHalo() {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffcf3a, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 12, 36), ringMat);
  ring.rotation.x = Math.PI / 2.2;
  ring.position.y = 0.5;
  g.add(ring);
  g.userData.halo = ring;
  return g;
}

const HATS = [
  { id: 'none', name: 'No Hat', icon: '🚫', build: null },
  { id: 'cowboy', name: 'Cowboy', icon: '🤠', build: hatCowboy },
  { id: 'beer', name: 'Beer Hat', icon: '🍺', build: hatBeer },
  { id: 'fez', name: 'Fez', icon: '🎩', build: hatFez },
  { id: 'top', name: 'Top Hat', icon: '🎩', build: hatTop },
  { id: 'party', name: 'Party', icon: '🥳', build: hatParty },
  { id: 'captain', name: "Captain's Cap", icon: '⚓', build: hatCaptain },
  { id: 'crown', name: 'Crown', icon: '👑', build: hatCrown },
  { id: 'sombrero', name: 'Sombrero', icon: '🌵', build: hatSombrero },
  { id: 'propeller', name: 'Propeller', icon: '🛩️', build: hatPropeller },
  { id: 'pirate', name: 'Pirate Tricorn', icon: '🏴‍☠️', build: hatPirate },
  { id: 'snorkel', name: 'Snorkel Mask', icon: '🤿', build: hatSnorkel },
  { id: 'halo', name: 'Halo', icon: '😇', build: hatHalo },
];
const hatMeshes = {};
for (const h of HATS) {
  if (!h.build) continue;
  const m = h.build();
  m.visible = false;
  hatAnchor.add(m);
  hatMeshes[h.id] = m;
}
let currentHat = 'none';
function setHat(id) {
  currentHat = id;
  for (const key in hatMeshes) hatMeshes[key].visible = (key === id);
}

// =====================================================================
// LOADOUT — a rack of weapons Friday can wield. Each builder returns a
// Group modelled pointing +z (Friday's forward / head direction) and
// gripped near its local origin. Weapons seat on `weaponAnchor`, parked
// at the right front flipper so Friday looks like he's holding them.
// =====================================================================
const weaponAnchor = new THREE.Group();
const WEAPON_BASE = new THREE.Vector3(1.2, 0.18, 1.6);   // raised on the right, gripped by the right flipper
weaponAnchor.position.copy(WEAPON_BASE);
weaponAnchor.scale.setScalar(1.3);
turtle.add(weaponAnchor);

const steelMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.22, metalness: 0.9 });

// AK-47 — wood furniture, banana mag, long barrel, muzzle flash.
function wepAK() {
  const g = new THREE.Group();
  const metal = hatMat(0x26262b, { rough: 0.45, metal: 0.6 });
  const wood = hatMat(0x6b3f1d, { rough: 0.7 });
  const rec = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.66), metal);
  rec.position.set(0, 0, 0.06); g.add(rec);
  const barrel = cyl(0.032, 0.032, 0.82, metal, 12);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, 0.72); g.add(barrel);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.34), wood);
  hand.position.set(0, -0.01, 0.44); g.add(hand);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.42), wood);
  stock.position.set(0, -0.03, -0.36); g.add(stock);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.13), metal);
  mag.position.set(0, -0.2, 0.16); mag.rotation.x = 0.34; g.add(mag);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.09), metal);
  grip.position.set(0, -0.16, -0.08); grip.rotation.x = -0.32; g.add(grip);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), metal);
  sight.position.set(0, 0.13, 0.42); g.add(sight);
  const flash = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.95 }));
  flash.rotation.x = -Math.PI / 2; flash.position.set(0, 0.03, 1.2); flash.visible = false;
  g.add(flash);
  g.userData.flash = flash;
  g.userData.muzzle = new THREE.Vector3(0, 0.03, 1.18);
  return g;
}

// Katana — wrapped grip, gold tsuba, long polished blade.
function wepKatana() {
  const g = new THREE.Group();
  const wrap = hatMat(0x161618, { rough: 0.7 });
  const gold = hatMat(0xd4af37, { metal: 0.6, rough: 0.3 });
  const handle = cyl(0.04, 0.046, 0.34, wrap, 10);
  handle.rotation.x = Math.PI / 2; handle.position.set(0, 0, -0.22); g.add(handle);
  const guard = cyl(0.11, 0.11, 0.03, gold, 18);
  guard.rotation.x = Math.PI / 2; guard.position.set(0, 0, -0.04); g.add(guard);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.075, 1.12), steelMat);
  blade.position.set(0, 0.02, 0.55); blade.rotation.x = -0.05; g.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 4), steelMat);
  tip.rotation.x = Math.PI / 2; tip.position.set(0, 0.06, 1.2); tip.scale.set(0.45, 1, 1); g.add(tip);
  g.userData.melee = true;
  g.userData.muzzle = new THREE.Vector3(0, 0.04, 1.0);
  return g;
}

// Taser — chunky yellow stun-gun with two prongs and an arc.
function wepTaser() {
  const g = new THREE.Group();
  const yellow = hatMat(0xf4c20d, { rough: 0.5 });
  const black = hatMat(0x161618, { rough: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.34), yellow);
  body.position.set(0, 0, 0.04); g.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), black);
  grip.position.set(0, -0.16, -0.08); grip.rotation.x = -0.3; g.add(grip);
  for (const sx of [-1, 1]) {
    const prong = cyl(0.013, 0.013, 0.24, black, 6);
    prong.rotation.x = Math.PI / 2; prong.position.set(sx * 0.035, 0.02, 0.32); g.add(prong);
  }
  const arc = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x8af0ff, transparent: true, opacity: 0.95 }));
  arc.position.set(0, 0.02, 0.46); arc.visible = false; g.add(arc);
  g.userData.flash = arc;
  g.userData.muzzle = new THREE.Vector3(0, 0.02, 0.44);
  return g;
}

// Shiv — taped grip, crude tapered blade.
function wepShiv() {
  const g = new THREE.Group();
  const tape = hatMat(0x3a3a3a, { rough: 0.9 });
  const handle = cyl(0.035, 0.042, 0.22, tape, 8);
  handle.rotation.x = Math.PI / 2; handle.position.set(0, 0, -0.12); g.add(handle);
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.44, 4), steelMat);
  blade.rotation.x = Math.PI / 2; blade.position.set(0, 0, 0.2); blade.scale.set(0.55, 1, 1); g.add(blade);
  g.userData.melee = true;
  g.userData.muzzle = new THREE.Vector3(0, 0, 0.42);
  return g;
}

// Rocket launcher — green tube, rear flare, loaded warhead at the muzzle.
function wepRocket() {
  const g = new THREE.Group();
  const green = hatMat(0x3a5a32, { rough: 0.7 });
  const black = hatMat(0x161618, { rough: 0.6 });
  const tube = cyl(0.11, 0.11, 1.0, green, 16);
  tube.rotation.x = Math.PI / 2; tube.position.set(0, 0, 0.22); g.add(tube);
  const rear = cyl(0.16, 0.1, 0.16, black, 16);
  rear.rotation.x = Math.PI / 2; rear.position.set(0, 0, -0.34); g.add(rear);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.09), black);
  grip.position.set(0, -0.18, 0.0); grip.rotation.x = -0.2; g.add(grip);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), black);
  sight.position.set(0, 0.17, 0.28); g.add(sight);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 12), hatMat(0xb5402f, { rough: 0.5 }));
  head.rotation.x = Math.PI / 2; head.position.set(0, 0, 0.88); g.add(head);
  g.userData.warhead = head;
  g.userData.muzzle = new THREE.Vector3(0, 0, 1.02);
  g.userData.rocket = true;
  return g;
}

const WEAPONS = [
  { id: 'none', name: 'Unarmed', icon: '🚫', build: null, kind: 'none' },
  { id: 'ak47', name: 'AK-47', icon: '🔫', build: wepAK, kind: 'gun', dmg: 3, cooldown: 0.1, range: 48 },
  { id: 'katana', name: 'Katana', icon: '🗡️', build: wepKatana, kind: 'melee', dmg: 7, cooldown: 0.4, range: 6.5 },
  { id: 'taser', name: 'Taser', icon: '⚡', build: wepTaser, kind: 'gun', dmg: 5, cooldown: 0.55, range: 16 },
  { id: 'shiv', name: 'Shiv', icon: '🔪', build: wepShiv, kind: 'melee', dmg: 4, cooldown: 0.28, range: 5 },
  { id: 'rocket', name: 'Rocket Launcher', icon: '🚀', build: wepRocket, kind: 'rocket', dmg: 200, cooldown: 1.3, range: 80, splash: 9 },
];
const weaponMeshes = {};
for (const w of WEAPONS) {
  if (!w.build) continue;
  const m = w.build();
  m.visible = false;
  weaponAnchor.add(m);
  weaponMeshes[w.id] = m;
}
let currentWeapon = 'none';
let currentWeaponSpec = WEAPONS[0];
function setWeapon(id) {
  currentWeapon = id;
  currentWeaponSpec = WEAPONS.find((w) => w.id === id) || WEAPONS[0];
  for (const key in weaponMeshes) weaponMeshes[key].visible = (key === id);
  resetWeaponPose();
}
function resetWeaponPose() {
  weaponAnchor.position.copy(WEAPON_BASE);
  weaponAnchor.rotation.set(currentWeaponSpec.kind === 'melee' ? 0.35 : 0.0, 0, 0);
}

// ---------- Combat: projectiles, tracers, explosions, burgers ----------
const playerFwd = new THREE.Vector3(0, 0, 1);
let firing = false;          // mouse / touch held
let lastShot = -10;          // time of last shot/swing
let swingT = -10;            // time the current melee swing began
let armBlend = 0;            // eased 0→1 grip pose when a weapon is equipped
let sharksDefeated = 0, burgersCollected = 0;

// reusable bullet tracers
const tracerGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);
const tracerMat = new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.9 });
const tracers = [];
for (let i = 0; i < 6; i++) {
  const tr = new THREE.Mesh(tracerGeo, tracerMat.clone());
  tr.visible = false; scene.add(tr); tracers.push({ mesh: tr, until: 0 });
}
const _yUp = new THREE.Vector3(0, 1, 0);
function showTracer(a, b, t) {
  const slot = tracers.find((s) => t > s.until) || tracers[0];
  const dir = b.clone().sub(a); const len = Math.max(0.1, dir.length());
  slot.mesh.position.copy(a).addScaledVector(dir, 0.5);
  slot.mesh.scale.set(1, len, 1);
  slot.mesh.quaternion.setFromUnitVectors(_yUp, dir.normalize());
  slot.mesh.visible = true; slot.until = t + 0.05;
}

// reusable explosions (expanding fading sphere)
const explosions = [];
for (let i = 0; i < 4; i++) {
  const ex = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0 }));
  ex.visible = false; scene.add(ex);
  explosions.push({ mesh: ex, t0: -10 });
}
function boom(pos, t) {
  const slot = explosions.find((s) => t - s.t0 > 0.5) || explosions[0];
  slot.mesh.position.copy(pos); slot.mesh.t0 = t; slot.t0 = t; slot.mesh.visible = true;
}

// rocket projectiles
const rockets = [];
for (let i = 0; i < 5; i++) {
  const r = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 10), hatMat(0xb5402f, { rough: 0.5 }));
  r.add(cone);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.85 }));
  flame.position.y = -0.4; flame.rotation.x = Math.PI; r.add(flame);
  r.visible = false; scene.add(r);
  rockets.push({ grp: r, vel: new THREE.Vector3(), dist: 0, active: false });
}
function fireRocket(origin, dir, t) {
  const r = rockets.find((x) => !x.active); if (!r) return;
  r.grp.position.copy(origin);
  r.vel.copy(dir).multiplyScalar(40);
  r.grp.quaternion.setFromUnitVectors(_yUp, dir.clone().normalize());
  r.dist = 0; r.active = true; r.grp.visible = true;
}

// cheeseburger drops
function makeBurger() {
  const g = new THREE.Group();
  const bun = hatMat(0xd98a3a, { rough: 0.8 });
  const bottom = cyl(0.32, 0.28, 0.16, bun, 18);
  bottom.position.y = -0.16; g.add(bottom);
  const patty = cyl(0.36, 0.36, 0.12, hatMat(0x4a2c17, { rough: 0.85 }), 18);
  patty.position.y = -0.05; g.add(patty);
  const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.035, 0.6), hatMat(0xf3b73b, { rough: 0.5 }));
  cheese.position.y = 0.01; cheese.rotation.y = Math.PI / 4; g.add(cheese);
  const lettuce = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 18), hatMat(0x6fb43a, { rough: 0.85 }));
  lettuce.rotation.x = Math.PI / 2; lettuce.position.y = 0.05; g.add(lettuce);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), bun);
  top.position.y = 0.07; top.scale.y = 0.82; g.add(top);
  const ses = hatMat(0xf4e3b0, { rough: 0.6 });
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), ses);
    const a = Math.random() * Math.PI * 2, r = 0.05 + Math.random() * 0.18;
    s.position.set(Math.cos(a) * r, 0.07 + Math.sqrt(Math.max(0, 1 - (r / 0.33) ** 2)) * 0.24, Math.sin(a) * r);
    g.add(s);
  }
  g.scale.setScalar(0.9);
  g.visible = false;
  return g;
}
const BURGER_POOL = 10;
const burgers = [];
for (let i = 0; i < BURGER_POOL; i++) {
  const b = makeBurger();
  b.userData = { active: false, t0: 0, bob: 0, baseY: 0 };
  scene.add(b); burgers.push(b);
}
function spawnBurger(pos, t) {
  const b = burgers.find((x) => !x.userData.active); if (!b) return;
  b.position.copy(pos);
  b.userData.active = true; b.userData.t0 = t;
  b.userData.bob = Math.random() * Math.PI * 2; b.userData.baseY = pos.y;
  b.scale.setScalar(0.001); b.visible = true;
}

turtle.rotation.y = Math.PI; // face into the screen (-z)

// ---------- Wardrobe turntable ----------
const turntable = new THREE.Group();
turntable.position.set(0, -0.15, 0.2);
const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(2.5, 2.7, 0.3, 48),
  new THREE.MeshStandardMaterial({ color: 0x0d2b3e, roughness: 0.4, metalness: 0.3 })
);
turntable.add(platform);
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.5, 0.06, 10, 60),
  new THREE.MeshStandardMaterial({ color: 0x6fe8ff, emissive: 0x2bb8e0, emissiveIntensity: 1.4, roughness: 0.4 })
);
ring.rotation.x = Math.PI / 2; ring.position.y = 0.16;
turntable.add(ring);
turntable.visible = false;
scene.add(turntable);

// ---------- Camera poses (wardrobe vs play) ----------
const CAM_PLAY = { pos: new THREE.Vector3(0, 1.6, 7.5), look: new THREE.Vector3(0, 0.2, -4) };
const CAM_WARDROBE = { pos: new THREE.Vector3(1.7, 1.5, 6.1), look: new THREE.Vector3(-0.7, 0.55, 0.4) };
const camLook = CAM_PLAY.look.clone();
let mode = 'wardrobe';   // 'wardrobe' | 'play'

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

// ---------- Open-world bounds ----------
const WORLD_R = 60;                          // horizontal radius of the open ocean
const Y_MIN = FLOOR_Y + 1.6, Y_MAX = 13;     // swimmable depth band
function randWorldPos(out) {
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * WORLD_R;
  out.set(Math.cos(a) * r, Y_MIN + Math.random() * (Y_MAX - Y_MIN), Math.sin(a) * r);
  return out;
}

const BAG_COUNT = 24;
const bags = [];
function placeBag(bag, awayFrom) {
  randWorldPos(bag.position);
  if (awayFrom) { let n = 0; while (bag.position.distanceTo(awayFrom) < 16 && n++ < 8) randWorldPos(bag.position); }
  bag.userData.spin = (Math.random() - 0.5) * 0.8;
  bag.userData.bob = Math.random() * Math.PI * 2;
  bag.userData.bobBase = bag.position.y;
  const s = 0.7 + Math.random() * 0.7;
  bag.scale.set(s, s, s);
}
for (let i = 0; i < BAG_COUNT; i++) {
  const b = makeBag();
  placeBag(b);
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

const JELLY_COUNT = 12;
const jellies = [];
function placeJelly(j, awayFrom) {
  randWorldPos(j.position);
  if (awayFrom) { let n = 0; while (j.position.distanceTo(awayFrom) < 12 && n++ < 8) randWorldPos(j.position); }
  j.userData.popping = false;
  j.userData.bellMat.opacity = 0.45;
  j.userData.gonMat.opacity = 0.6;
  j.userData.phase = Math.random() * Math.PI * 2;
  j.userData.baseScale = 0.8 + Math.random() * 0.7;
  j.userData.baseY = j.position.y;
  j.scale.setScalar(j.userData.baseScale);
  j.visible = true;
}
for (let i = 0; i < JELLY_COUNT; i++) {
  const j = makeJelly();
  placeJelly(j);
  jellies.push(j);
  scene.add(j);
}

// ---------- Bubbles ----------
const bubbleGeo = new THREE.BufferGeometry();
const BUB = 220;
const bpos = new Float32Array(BUB * 3);
for (let i = 0; i < BUB; i++) {
  const a = Math.random() * Math.PI * 2, r = Math.random() * WORLD_R;
  bpos[i * 3] = Math.cos(a) * r;
  bpos[i * 3 + 1] = Y_MIN + Math.random() * (Y_MAX - Y_MIN + 4);
  bpos[i * 3 + 2] = Math.sin(a) * r;
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

const GRASS_N = 54;
const grassClusters = [];
function placeGrass(cl) {
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * WORLD_R;
  cl.position.set(Math.cos(a) * r, FLOOR_Y, Math.sin(a) * r);
  cl.scale.setScalar(0.7 + Math.random() * 0.9);
}
for (let i = 0; i < GRASS_N; i++) {
  const cl = makeGrassCluster();
  placeGrass(cl);
  grassClusters.push(cl);
  scene.add(cl);
}

// ---------- Loaded OBJ models (shark + fish pack) ----------
// The uploaded Blender meshes are baked into vendor/models.js (positions only,
// normalized so the longest axis spans 1.0, length along +z). Each instance
// gets its own materials so it can carry an independent "swimming" wiggle —
// a vertex displacement injected via onBeforeCompile that bends the body
// side-to-side along its length, standing in for skeletal animation.
const swimMats = [];   // every swim material, time-driven from the main loop
function makeSwimMat(color, opts) {
  const m = new THREE.MeshStandardMaterial({
    color, roughness: opts.rough ?? 0.7, metalness: 0.0, side: THREE.DoubleSide
  });
  m.userData.phase = opts.phase ?? Math.random() * Math.PI * 2;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uPhase = { value: m.userData.phase };
    shader.uniforms.uAmp = { value: opts.amp ?? 0.07 };
    shader.uniforms.uWaves = { value: opts.waves ?? 5.5 };
    shader.uniforms.uSpeed = { value: opts.speed ?? 6.0 };
    shader.vertexShader = 'uniform float uTime, uPhase, uAmp, uWaves, uSpeed;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float swZ = transformed.z;            // length axis (model space)
       float swTail = clamp(0.5 - swZ, 0.0, 1.0);   // sway grows toward the tail
       transformed.x += uAmp * sin(swZ * uWaves + uTime * uSpeed + uPhase) * swTail;`);
    m.userData.shader = shader;
  };
  swimMats.push(m);
  return m;
}

// Build one instance of a baked model, oriented so its nose points +x (the
// game's forward) and scaled to a target world length. Returns the holder
// Group plus the material list (for tinting / hit-flash).
function instantiateModel(name, opts) {
  const data = getModel(name);
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  const mats = [];
  for (const part of data.parts) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
    geo.computeVertexNormals();
    const isEye = /eye/i.test(part.material);
    const color = isEye ? 0x101014 : (opts.colorFor ? opts.colorFor(part.material) : opts.color);
    const mat = makeSwimMat(color, { ...opts, rough: isEye ? 0.3 : opts.rough });
    mats.push(mat);
    inner.add(new THREE.Mesh(geo, mat));
  }
  inner.rotation.y = opts.flip ? -Math.PI / 2 : Math.PI / 2;   // +z (length) → +x
  inner.scale.setScalar(opts.length);
  holder.add(inner);
  holder.userData.mats = mats;
  holder.userData.len = opts.length;
  return holder;
}

// ---------- Enemy sharks (the bad guys) ----------
const SHARK_LEN = 5.0;
const SHARK_COUNT = 6;
const sharks = [];
function launchShark(shark) {
  const th = Math.random() * Math.PI * 2;          // heading across the world
  shark.userData.dirA = th;
  shark.userData.speed = 1.8 + Math.random() * 2.2;
  shark.userData.bob = Math.random() * Math.PI * 2;
  const start = -1.2 * WORLD_R;
  shark.position.set(
    Math.cos(th) * start + (Math.random() - 0.5) * 24,
    Y_MIN + 2 + Math.random() * (Y_MAX - Y_MIN - 3),
    Math.sin(th) * start + (Math.random() - 0.5) * 24
  );
  shark.rotation.set(0, -th, 0);                    // holder faces +x → aim along heading
  shark.scale.setScalar(0.8 + Math.random() * 0.5);
  shark.visible = true;
  shark.userData.alive = true;
  shark.userData.hp = shark.userData.maxHp;
  shark.userData.hitFlash = -10;
  shark.userData.respawnAt = 0;
}
for (let i = 0; i < SHARK_COUNT; i++) {
  const s = instantiateModel('shark', {
    length: SHARK_LEN, color: 0x6b7884, rough: 0.7,
    amp: 0.05, waves: 4.5, speed: 5.0,
  });
  s.userData.maxHp = Math.round(SHARK_LEN * 2);     // tougher than a quick kill
  s.userData.phase = Math.random() * Math.PI * 2;
  sharks.push(s);
  scene.add(s);
  launchShark(s);
}

// ---------- Ambient fish (peaceful background life) ----------
const FISH_TYPES = [
  { name: 'fish01', palette: [0xffb14a, 0xff7b3a, 0xfff0c2] },   // clownfish-ish
  { name: 'fish02', palette: [0x4fc3f7, 0x2a73c0, 0xeaf6ff] },   // blue tang-ish
  { name: 'fish03', palette: [0x8bd450, 0x4a9e3a, 0xfff6a0] },   // green wrasse-ish
];
const fishes = [];
function launchFish(fish) {
  const th = Math.random() * Math.PI * 2;
  fish.userData.dirA = th;
  fish.userData.turn = (Math.random() - 0.5) * 0.3;
  fish.userData.speed = 1.2 + Math.random() * 1.8;
  fish.userData.bob = Math.random() * Math.PI * 2;
  randWorldPos(fish.position);
  fish.rotation.set(0, -th, 0);
}
const FISH_COUNT = 26;
for (let i = 0; i < FISH_COUNT; i++) {
  const type = FISH_TYPES[i % FISH_TYPES.length];
  const pal = type.palette;
  let pi = 0;
  const f = instantiateModel(type.name, {
    length: 0.7 + Math.random() * 0.7,
    rough: 0.6, amp: 0.12, waves: 6.5, speed: 8.0 + Math.random() * 3,
    colorFor: (mat) => pal[(pi++) % pal.length],
  });
  launchFish(f);
  fishes.push(f);
  scene.add(f);
}

// ---------- Zeus — the friendly zebra shark who defends you ----------
// A golden, spotted shark that swims at Friday's side and charges any enemy
// shark that strays too close, chomping it. He can't be hurt and never bites you.
function makeLabelSprite(text, color = '#ffe46e') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
  const x = cv.getContext('2d');
  x.font = 'bold 60px Segoe UI, Tahoma, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 9; x.strokeStyle = 'rgba(0,0,0,0.7)'; x.strokeText(text, 128, 48);
  x.fillStyle = color; x.fillText(text, 128, 48);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.scale.set(3.2, 1.2, 1);
  return sp;
}
const ZEUS_LEN = 5.6;
const zeus = instantiateModel('shark', {
  length: ZEUS_LEN, color: 0xd8b24a, rough: 0.55,
  amp: 0.05, waves: 4.5, speed: 6.0,
});
// scatter friendly zebra spots across his flanks (in the model's normalized
// space — the inner group is scaled to length, so coords stay within ±0.5)
{
  const spotMat = new THREE.MeshStandardMaterial({ color: 0x4a3a1e, roughness: 0.6 });
  const inner = zeus.children[0];
  for (let i = 0; i < 36; i++) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), spotMat);
    // model length runs along local +z here (orientation is applied to `inner`)
    sp.position.set((Math.random() - 0.5) * 0.18, (Math.random() - 0.1) * 0.18, (Math.random() - 0.5) * 0.8);
    sp.scale.set(1, 0.5, 1);
    inner.add(sp);
  }
}
const zeusLabel = makeLabelSprite('ZEUS 🛡️', '#ffe46e');
zeusLabel.position.set(0, 1.7, 0);
zeus.add(zeusLabel);
zeus.userData.yaw = 0;
zeus.userData.vel = new THREE.Vector3();
zeus.visible = false;
scene.add(zeus);

function updateZeus(dt, t) {
  // find the nearest living enemy shark that's threatening Friday
  let target = null, best = Infinity;
  for (const s of sharks) {
    if (!s.userData.alive) continue;
    if (s.position.distanceTo(player.pos) > 26) continue;   // only defend close threats
    const d = s.position.distanceTo(zeus.position);
    if (d < best) { best = d; target = s; }
  }
  const desired = new THREE.Vector3();
  let speed;
  if (target) {
    desired.copy(target.position);                          // charge the threat
    speed = 17;
    if (zeus.position.distanceTo(target.position) < 2.6 + sharkRadius(target)) {
      damageShark(target, 5, t);                            // chomp!
    }
  } else {                                                  // escort: trail beside Friday
    const hf = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const side = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    desired.copy(player.pos).addScaledVector(hf, -5).addScaledVector(side, 4.5);
    desired.y += 1.4 + Math.sin(t * 0.7) * 0.6;
    speed = 11;
  }
  const to = desired.sub(zeus.position);
  const dist = to.length();
  if (dist > 0.001) {
    to.multiplyScalar(speed / dist);
    zeus.userData.vel.lerp(to, Math.min(1, 2.2 * dt));      // eased acceleration
  }
  zeus.position.addScaledVector(zeus.userData.vel, dt);
  zeus.position.y = Math.max(Y_MIN, Math.min(Y_MAX, zeus.position.y));
  const v = zeus.userData.vel;
  if (v.lengthSq() > 0.02) {
    zeus.userData.yaw = steerAngle(zeus.userData.yaw, Math.atan2(v.z, v.x), dt * 2.2);
    zeus.rotation.set(0, -zeus.userData.yaw, 0);
  }
}

// ---------- Combat helpers ----------
const AGGRO_R = 17;          // sharks notice Friday within this range
const SHARK_CHASE = 7.5;     // chase speed (below Friday's 14 top speed → escapable)
function sharkRadius(s) { return s.userData.len * 0.42 * s.scale.x; }
function steerAngle(cur, target, max) {        // rotate `cur` toward `target`, capped
  let d = target - cur;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return cur + Math.max(-max, Math.min(max, d));
}

function damageShark(shark, dmg, t) {
  if (!shark.userData.alive) return;
  shark.userData.hp -= dmg;
  shark.userData.hitFlash = t;
  if (shark.userData.hp <= 0) killShark(shark, t);
}
function killShark(shark, t) {
  shark.userData.alive = false;
  shark.userData.respawnAt = t + 5;
  shark.visible = false;
  sharksDefeated++;
  score += 40;
  spawnBurger(shark.position, t);
  boom(shark.position, t);     // little death puff
}

// world-space muzzle point + forward direction of the equipped weapon
const _muzzle = new THREE.Vector3(), _aim = new THREE.Vector3();
function weaponMuzzle(out) {
  const mesh = weaponMeshes[currentWeapon];
  if (mesh && mesh.userData.muzzle) out.copy(mesh.userData.muzzle), mesh.localToWorld(out);
  else out.copy(player.pos).addScaledVector(playerFwd, 1.5);
  return out;
}

function tryFire(t) {
  const w = currentWeaponSpec;
  if (w.kind === 'none') return;
  if (t - lastShot < w.cooldown) return;
  lastShot = t;
  _aim.copy(playerFwd).normalize();
  weaponMuzzle(_muzzle);
  if (w.kind === 'melee') { swingT = t; meleeSwing(w, t); }
  else if (w.kind === 'rocket') fireRocket(_muzzle, _aim, t);
  else hitscan(w, t);
}

// pick the closest shark whose centre lies near the aim ray, damage it
function hitscan(w, t) {
  let best = null, bestProj = Infinity, bestPoint = null;
  const to = new THREE.Vector3();
  for (const s of sharks) {
    if (!s.userData.alive) continue;
    to.copy(s.position).sub(player.pos);
    const proj = to.dot(_aim);
    if (proj < 0 || proj > w.range) continue;
    const perp = to.addScaledVector(_aim, -proj).length();
    if (perp > sharkRadius(s) + 0.5) continue;
    if (proj < bestProj) { bestProj = proj; best = s; bestPoint = s.position.clone(); }
  }
  const end = best ? bestPoint : _muzzle.clone().addScaledVector(_aim, w.range);
  showTracer(_muzzle, end, t);
  if (best) damageShark(best, w.dmg, t);
}

// damage every shark inside a wide frontal arc within reach
function meleeSwing(w, t) {
  const to = new THREE.Vector3();
  for (const s of sharks) {
    if (!s.userData.alive) continue;
    to.copy(s.position).sub(player.pos);
    const dist = to.length();
    if (dist > w.range + sharkRadius(s)) continue;
    if (to.normalize().dot(_aim) < 0.4) continue;
    damageShark(s, w.dmg, t);
  }
}

// recoil / swing pose + muzzle-flash visibility (called each play frame)
function updateWeapon(dt, t) {
  const w = currentWeaponSpec;
  if (w.kind === 'none') return;
  if ((firing || keys['f']) && running && mode === 'play') tryFire(t);

  const mesh = weaponMeshes[currentWeapon];
  if (mesh.userData.flash) mesh.userData.flash.visible = (t - lastShot) < 0.05;
  if (mesh.userData.warhead) mesh.userData.warhead.visible = (t - lastShot) > 0.4;  // reload

  if (w.kind === 'melee') {
    const k = (t - swingT) / 0.26;
    if (k < 1) {
      const s = Math.sin(k * Math.PI);              // chop down and back
      weaponAnchor.rotation.x = 0.35 - s * 1.7;
      weaponAnchor.rotation.z = -s * 0.5;
    } else {
      weaponAnchor.rotation.x += (0.35 - weaponAnchor.rotation.x) * Math.min(1, 12 * dt);
      weaponAnchor.rotation.z += (0 - weaponAnchor.rotation.z) * Math.min(1, 12 * dt);
    }
  } else {
    const k = (t - lastShot) / (w.cooldown * 0.6 + 0.05);
    const kick = k < 1 ? (1 - k) * (w.kind === 'rocket' ? 0.22 : 0.13) : 0;
    weaponAnchor.position.z = WEAPON_BASE.z - kick;
    weaponAnchor.rotation.x = -kick * 0.7;
  }
}

// advance rockets, explosions, tracers and burgers
function updateOrdnance(dt, t) {
  for (const r of rockets) {
    if (!r.active) continue;
    r.grp.position.addScaledVector(r.vel, dt);
    r.dist += r.vel.length() * dt;
    let hit = !running;
    for (const s of sharks) {
      if (!s.userData.alive) continue;
      if (r.grp.position.distanceTo(s.position) < sharkRadius(s) + 0.5) { hit = true; break; }
    }
    if (hit || r.dist > currentWeaponSpec.range || r.grp.position.y < FLOOR_Y) {
      const splash = 9;
      for (const s of sharks) {
        if (s.userData.alive && r.grp.position.distanceTo(s.position) < splash)
          damageShark(s, 200, t);
      }
      boom(r.grp.position, t);
      r.active = false; r.grp.visible = false;
    }
  }
  for (const e of explosions) {
    const k = (t - e.t0) / 0.45;
    if (k >= 1) { e.mesh.visible = false; continue; }
    e.mesh.visible = true;
    e.mesh.scale.setScalar(0.4 + k * 5);
    e.mesh.material.opacity = 0.7 * (1 - k);
  }
  for (const tr of tracers) if (tr.mesh.visible && t > tr.until) tr.mesh.visible = false;
}

// ---------- Input (free-swim look + thrust) ----------
const keys = {};
let humpUntil = 0;            // spacebar "happy wiggle" plays until this time
let mouseYaw = 0, mousePitch = 0;   // relative look deltas, consumed each frame
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    humpUntil = clock.elapsedTime + 1.0;
  }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// mouse look (relative; works without pointer lock via movementX/Y)
window.addEventListener('mousemove', (e) => {
  if (mode !== 'play' || !running) return;
  mouseYaw -= (e.movementX || 0) * 0.0022;
  mousePitch -= (e.movementY || 0) * 0.0022;
});
// fire: hold left mouse (or F) to attack
window.addEventListener('mousedown', (e) => { if (e.button === 0) firing = true; });
window.addEventListener('mouseup', (e) => { if (e.button === 0) firing = false; });
// touch look (drag)
let lastTouch = null;
window.addEventListener('touchstart', (e) => {
  lastTouch = e.touches[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  if (mode === 'play' && running) firing = true;   // tap/hold to attack
});
window.addEventListener('touchmove', (e) => {
  if (mode !== 'play' || !running || !e.touches[0]) return;
  if (lastTouch) {
    mouseYaw -= (e.touches[0].clientX - lastTouch.x) * 0.005;
    mousePitch -= (e.touches[0].clientY - lastTouch.y) * 0.005;
  }
  lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', () => { lastTouch = null; firing = false; });

// ---------- Game state ----------
let running = false;
let score = 0, jelliesEaten = 0, lives = 3;
let graceUntil = 0;        // invulnerable until this time (start + after a hit)
let chompUntil = 0;        // beak chomps until this time (after eating a jelly)
const GRACE = 2.5;         // seconds of safe swimming at the start of each run
const MAX_LIVES = 3;
const player = { pos: new THREE.Vector3(0, 4, 0), yaw: 0, pitch: 0, speed: 0 };
let bankCur = 0;
const _desired = new THREE.Vector3(), _look = new THREE.Vector3();
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const jelliesEl = document.getElementById('jellies');
const burgersEl = document.getElementById('burgers');
const crosshair = document.getElementById('crosshair');
const panel = document.getElementById('panel');
const hud = document.getElementById('hud');
const msg = document.getElementById('msg');
const playBtn = document.getElementById('play');
const wiggleText = document.getElementById('wiggle-text');
let wiggleShown = false;

const wardrobe = document.getElementById('wardrobe');
// Lives as Friday face tokens (Lego-Star-Wars style): full portraits for the
// lives you have, dimmed/greyed portraits for the ones you've lost.
function renderLives(n) {
  let html = '';
  for (let i = 0; i < MAX_LIVES; i++)
    html += `<img class="life${i < n ? '' : ' lost'}" src="assets/friday-face.png" alt="">`;
  livesEl.innerHTML = html;
}

function enterWardrobe() {
  mode = 'wardrobe';
  running = false;
  bags.forEach((b) => (b.visible = false));
  jellies.forEach((j) => (j.visible = false));
  burgers.forEach((b) => { b.userData.active = false; b.visible = false; });
  firing = false;
  zeus.visible = false;
  panel.classList.add('hidden');
  hud.style.display = 'none';
  wardrobe.classList.remove('hidden');
}

function startGame() {
  mode = 'play';
  score = 0; jelliesEaten = 0; lives = MAX_LIVES;
  player.pos.set(0, 4, 0); player.yaw = 0; player.pitch = 0; player.speed = 0;
  mouseYaw = 0; mousePitch = 0; bankCur = 0;
  firing = false; sharksDefeated = 0; burgersCollected = 0;
  turtle.scale.setScalar(1);
  bags.forEach((b) => { b.visible = true; placeBag(b, player.pos); });
  jellies.forEach((j) => { j.visible = true; placeJelly(j, player.pos); });
  burgers.forEach((b) => { b.userData.active = false; b.visible = false; });
  sharks.forEach(launchShark);   // fresh, full-health sharks each run
  zeus.visible = true;
  zeus.position.set(player.pos.x + 4, player.pos.y + 1.4, player.pos.z - 4);
  zeus.userData.vel.set(0, 0, 0); zeus.userData.yaw = 0;
  graceUntil = clock.elapsedTime + GRACE;
  scoreEl.textContent = '0';
  jelliesEl.textContent = '0';
  burgersEl.textContent = '0';
  renderLives(lives);
  wardrobe.classList.add('hidden');
  panel.classList.add('hidden');
  hud.style.display = 'flex';
  running = true;
}

function gameOver() {
  running = false;
  zeus.visible = false;
  hud.style.display = 'none';
  msg.innerHTML = `Friday's out of lives! 🛑<br><br>You gobbled <strong>${jelliesEaten}</strong> moon jellies, took down <strong>${sharksDefeated}</strong> sharks 🦈, scoffed <strong>${burgersCollected}</strong> cheeseburgers 🍔 and scored <strong>${Math.floor(score)}</strong>. Marine litter is a real threat to sea turtles — thanks for steering Friday clear of it!`;
  playBtn.textContent = 'Swim Again';
  panel.classList.remove('hidden');
}

playBtn.addEventListener('click', startGame);
document.getElementById('play-again').addEventListener('click', startGame);
document.getElementById('change-hat').addEventListener('click', enterWardrobe);

// ---------- Build the hat rack UI ----------
const rack = document.getElementById('hat-rack');
HATS.forEach((h) => {
  const btn = document.createElement('button');
  btn.className = 'hat-btn' + (h.id === 'none' ? ' selected' : '');
  btn.dataset.id = h.id;
  btn.innerHTML = `<span class="hat-ico">${h.icon}</span><span class="hat-name">${h.name}</span>`;
  btn.addEventListener('click', () => {
    setHat(h.id);
    rack.querySelectorAll('.hat-btn').forEach((b) => b.classList.toggle('selected', b === btn));
  });
  rack.appendChild(btn);
});

// ---------- Build the loadout rack UI ----------
const wrack = document.getElementById('weapon-rack');
WEAPONS.forEach((w) => {
  const btn = document.createElement('button');
  btn.className = 'hat-btn' + (w.id === 'none' ? ' selected' : '');
  btn.dataset.id = w.id;
  btn.innerHTML = `<span class="hat-ico">${w.icon}</span><span class="hat-name">${w.name}</span>`;
  btn.addEventListener('click', () => {
    setWeapon(w.id);
    wrack.querySelectorAll('.hat-btn').forEach((b) => b.classList.toggle('selected', b === btn));
  });
  wrack.appendChild(btn);
});

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

  const inWardrobe = mode === 'wardrobe';
  turntable.visible = inWardrobe;
  studio.intensity += ((inWardrobe ? 1.3 : 0) - studio.intensity) * Math.min(1, 4 * dt);
  turntable.rotation.y = t * 0.4;

  // animated hats (both modes)
  const propHat = hatMeshes['propeller'];
  if (propHat && propHat.visible) propHat.userData.propeller.rotation.y += dt * 14;
  const haloHat = hatMeshes['halo'];
  if (haloHat && haloHat.visible) {
    haloHat.userData.halo.position.y = 0.5 + Math.sin(t * 2) * 0.05;
    haloHat.userData.halo.rotation.z += dt * 0.5;
  }

  // drive the swimming wiggle on every loaded fish/shark material
  for (const m of swimMats) if (m.userData.shader) m.userData.shader.uniforms.uTime.value = t;

  // flipper flap (both modes; faster while swimming). The right front flipper
  // holds a forward "grip" pose when Friday is carrying a weapon.
  const flapSpd = inWardrobe ? 2 : 6, flapAmp = inWardrobe ? 0.25 : 0.45;
  const armed = currentWeapon !== 'none';
  armBlend += ((armed ? 1 : 0) - armBlend) * Math.min(1, 6 * dt);   // ease in/out the grip
  flippers.forEach((f, i) => {
    const flapZ = Math.sin(t * flapSpd + (i % 2) * Math.PI) * flapAmp * (f.x < 0 ? 1 : -1);
    if (f.front && f.side > 0) {            // right front flipper blends to a forward grip
      const gz = 0.15 + Math.sin(t * 4) * 0.04;
      f.pivot.rotation.set(
        -0.25 * armBlend,
        f.baseY * (1 - armBlend) + (-1.2) * armBlend,
        flapZ * (1 - armBlend) + gz * armBlend
      );
    } else {
      f.pivot.rotation.set(0, f.baseY, flapZ);
    }
  });

  if (inWardrobe) {
    camera.position.lerp(CAM_WARDROBE.pos, Math.min(1, 3 * dt));
    camLook.lerp(CAM_WARDROBE.look, Math.min(1, 3 * dt));
    camera.lookAt(camLook);
    turtle.position.set(0, 0.45 + Math.sin(t * 1.2) * 0.06, 0.2);
    turtle.rotation.set(0, t * 0.5, 0);
    turtle.scale.setScalar(1);
    tail.rotation.x = TAIL_BASE_X; tail.position.set(0, -0.12, -2.12);
    beak.position.y = -0.18; shield.visible = false;
    resetWeaponPose();
    crosshair.style.display = 'none';
    renderAmbient(dt, t);
    renderer.render(scene, camera);
    return;
  }

  if (running) updatePlay(dt, t);
  crosshair.style.display = (running && armed) ? 'block' : 'none';
  renderAmbient(dt, t);
  renderer.render(scene, camera);
}

// ---------- Open-world play update ----------
function updatePlay(dt, t) {
  // steering — keyboard yaw/pitch plus relative mouse/touch look
  let yawIn = 0, pitchIn = 0;
  if (keys['a'] || keys['arrowleft']) yawIn += 1;
  if (keys['d'] || keys['arrowright']) yawIn -= 1;
  if (keys['arrowup']) pitchIn += 1;
  if (keys['arrowdown']) pitchIn -= 1;
  const yawDelta = yawIn * 1.8 * dt + mouseYaw;
  player.yaw += yawDelta;
  player.pitch += pitchIn * 1.2 * dt + mousePitch;
  mouseYaw = 0; mousePitch = 0;
  player.pitch = Math.max(-1.0, Math.min(1.0, player.pitch));

  // thrust (W forward, S reverse, wiggle = boost)
  const wiggling = t < humpUntil;
  let targetSpeed = 0;
  if (keys['w']) targetSpeed = 14;
  else if (keys['s']) targetSpeed = -7;
  if (wiggling) targetSpeed = 22;
  player.speed += (targetSpeed - player.speed) * Math.min(1, 3 * dt);

  // move along the heading
  const cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
  const fwd = new THREE.Vector3(Math.sin(player.yaw) * cp, sp, Math.cos(player.yaw) * cp);
  playerFwd.copy(fwd);
  player.pos.addScaledVector(fwd, player.speed * dt);
  const horiz = Math.hypot(player.pos.x, player.pos.z);
  if (horiz > WORLD_R) { const k = WORLD_R / horiz; player.pos.x *= k; player.pos.z *= k; }
  player.pos.y = Math.max(Y_MIN, Math.min(Y_MAX, player.pos.y));

  // apply transform (bank into turns)
  turtle.position.copy(player.pos);
  const bankTarget = Math.max(-0.5, Math.min(0.5, -yawDelta / Math.max(dt, 0.0001) * 0.05));
  bankCur += (bankTarget - bankCur) * Math.min(1, 6 * dt);
  turtle.rotation.set(-player.pitch, player.yaw, bankCur, 'YXZ');

  // spacebar wiggle visuals + shout
  if (wiggling) {
    const p = Math.sin(t * 26);
    turtle.scale.setScalar(1 + Math.abs(p) * 0.14);
    tail.rotation.x = TAIL_BASE_X - 1.5 + p * 0.25;
    tail.position.set(0, -0.5, -1.7);
  } else {
    turtle.scale.x += (1 - turtle.scale.x) * Math.min(1, 10 * dt);
    turtle.scale.y = turtle.scale.z = turtle.scale.x;
    tail.rotation.x += (TAIL_BASE_X - tail.rotation.x) * Math.min(1, 8 * dt);
    tail.position.x += (0 - tail.position.x) * Math.min(1, 8 * dt);
    tail.position.y += (-0.12 - tail.position.y) * Math.min(1, 8 * dt);
    tail.position.z += (-2.12 - tail.position.z) * Math.min(1, 8 * dt);
  }
  if (wiggling !== wiggleShown) { wiggleText.style.display = wiggling ? 'block' : 'none'; wiggleShown = wiggling; }

  // chomp after eating
  if (t < chompUntil) beak.position.y = -0.18 - 0.32 * Math.abs(Math.sin(t * 34));
  else if (beak.position.y !== -0.18) beak.position.y += (-0.18 - beak.position.y) * Math.min(1, 12 * dt);

  // chase camera behind the turtle
  const hf = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  _desired.copy(player.pos).addScaledVector(hf, -7);
  _desired.y += 2.6 - sp * 2.5;
  camera.position.lerp(_desired, Math.min(1, 4 * dt));
  _look.copy(player.pos).addScaledVector(fwd, 4);
  camLook.lerp(_look, Math.min(1, 6 * dt));
  camera.lookAt(camLook);

  // invulnerability shield (start grace + after a hit)
  const inGrace = t < graceUntil;
  shield.visible = inGrace;
  if (inGrace) { shield.material.opacity = 0.1 + Math.abs(Math.sin(t * 8)) * 0.16; shield.scale.setScalar(1 + Math.sin(t * 8) * 0.05); }
  else shield.scale.setScalar(1);

  // plastic bags — bob/spin obstacles; hitting one costs a life
  for (const bag of bags) {
    bag.rotation.y += bag.userData.spin * dt;
    bag.position.y = bag.userData.bobBase + Math.sin(t + bag.userData.bob) * 0.3;
    if (!inGrace && bag.position.distanceTo(player.pos) < TURTLE_R + 0.6 * bag.scale.x + 0.5) {
      lives--; renderLives(lives);
      graceUntil = t + 1.6;
      player.pos.addScaledVector(fwd, -3.5); player.speed *= -0.3;
      if (lives <= 0) { gameOver(); return; }
    }
  }

  // moon jellies — bob & pulse in place; swim into one to eat it (it pops)
  for (const j of jellies) {
    if (j.userData.popping) {
      const k = (t - j.userData.popT) / 0.32;
      j.scale.setScalar(j.userData.baseScale * (1 + k * 1.6));
      j.userData.bellMat.opacity = 0.45 * (1 - k);
      j.userData.gonMat.opacity = 0.6 * (1 - k);
      if (k >= 1) placeJelly(j, player.pos);
      continue;
    }
    j.userData.bell.scale.y = 1 + Math.sin(t * 3 + j.userData.phase) * 0.2;
    j.position.y = j.userData.baseY + Math.sin(t * 0.8 + j.userData.phase) * 0.25;
    j.rotation.y += 0.3 * dt;
    if (j.position.distanceTo(player.pos) < TURTLE_R + 1.0 * j.scale.x) {
      j.userData.popping = true; j.userData.popT = t;
      jelliesEaten++; score += 25; chompUntil = t + 0.45;
      jelliesEl.textContent = jelliesEaten;
    }
  }

  // cheeseburgers dropped by defeated sharks — swim over one to scoff it
  // (+points, and it heals a lost life). They float up and fade if left.
  for (const b of burgers) {
    if (!b.userData.active) continue;
    const age = t - b.userData.t0;
    if (age > 14) { b.userData.active = false; b.visible = false; continue; }
    b.scale.setScalar(0.9 * Math.min(1, age / 0.3));
    b.position.y = b.userData.baseY + 0.4 + Math.sin(t * 1.5 + b.userData.bob) * 0.25;
    b.rotation.y += dt * 1.2;
    if (b.position.distanceTo(player.pos) < TURTLE_R + 0.9) {
      b.userData.active = false; b.visible = false;
      burgersCollected++; score += 60; chompUntil = t + 0.45;
      if (lives < MAX_LIVES) { lives++; renderLives(lives); }
      burgersEl.textContent = burgersCollected;
    }
  }

  // weapons: pose/recoil + firing, then advance any rockets/effects
  updateWeapon(dt, t);
  updateOrdnance(dt, t);
  updateZeus(dt, t);   // friendly shark escorts Friday and hunts the enemies

  score += dt * 3;
  scoreEl.textContent = Math.floor(score);
}

// ---------- Ambient world (seagrass sway, roaming sharks, bubbles) ----------
function renderAmbient(dt, t) {
  for (const cl of grassClusters) {
    for (const blade of cl.userData.blades) {
      blade.rotation.z = Math.sin(t * 1.6 + blade.userData.phase) * blade.userData.sway;
    }
  }

  // peaceful fish — gentle roamers that wander and turn back at the edge
  for (const fish of fishes) {
    const fd = fish.userData;
    fd.dirA += fd.turn * dt;
    fish.position.x += Math.cos(fd.dirA) * fd.speed * dt;
    fish.position.z += Math.sin(fd.dirA) * fd.speed * dt;
    fish.position.y += Math.sin(t * 0.8 + fd.bob) * 0.01;
    if (Math.hypot(fish.position.x, fish.position.z) > WORLD_R) {
      fd.dirA = Math.atan2(-fish.position.z, -fish.position.x);   // head back inward
    }
    fish.rotation.set(0, -fd.dirA, 0);
  }

  // enemy sharks — roam the reef, but hunt Friday while a run is on
  const inGrace = t < graceUntil;
  for (const shark of sharks) {
    const sd = shark.userData;
    if (!sd.alive) {
      if (t > sd.respawnAt) launchShark(shark);
      else continue;
    }
    // red hit-flash when shot, fading out
    const fl = Math.max(0, 1 - (t - sd.hitFlash) / 0.18);
    for (const m of sd.mats) m.emissive.setRGB(fl * 0.8, 0, 0);

    let speed = sd.speed;
    if (running && mode === 'play') {
      const dx = player.pos.x - shark.position.x, dz = player.pos.z - shark.position.z, dy = player.pos.y - shark.position.y;
      const hdist = Math.hypot(dx, dz);
      if (hdist < AGGRO_R) {                          // lock on and chase
        sd.dirA = steerAngle(sd.dirA, Math.atan2(dz, dx), dt * 1.3);
        shark.position.y += Math.sign(dy) * Math.min(Math.abs(dy), SHARK_CHASE * 0.6 * dt);
        speed = SHARK_CHASE;
        if (!inGrace && shark.position.distanceTo(player.pos) < TURTLE_R + sharkRadius(shark) * 0.7) {
          lives--; renderLives(lives);
          graceUntil = t + 1.6;
          player.pos.add(player.pos.clone().sub(shark.position).setLength(3.5));
          if (lives <= 0) gameOver();
        }
      }
    }
    shark.position.x += Math.cos(sd.dirA) * speed * dt;
    shark.position.z += Math.sin(sd.dirA) * speed * dt;
    shark.position.y += Math.sin(t + sd.bob) * 0.006;
    shark.rotation.set(0, -sd.dirA, 0);
    if (Math.hypot(shark.position.x, shark.position.z) > WORLD_R * 1.3) launchShark(shark);
  }

  const bp = bubbleGeo.attributes.position;
  for (let i = 0; i < BUB; i++) {
    let y = bp.getY(i) + dt * 0.6;
    if (y > Y_MAX + 4) y = Y_MIN;
    bp.setY(i, y);
  }
  bp.needsUpdate = true;
}

// hide loading once first frame is ready
document.getElementById('loading').style.display = 'none';
enterWardrobe();   // start on the wardrobe screen
animate();
