# 🐢 Friday the Turtle Games

Two browser games inspired by **Friday the green sea turtle** at the
**National Marine Aquarium in Plymouth**.

---

## 1. Scrub Friday the Turtle! — `index.html`

Friday's shell keeps getting colonised by *Aptasia* anemones — your job is to
scrub them all off and keep him healthy!

**How to play**
- Open `index.html` in any modern browser (or serve the folder over HTTP).
- Click / tap each pink **Aptasia** spot to scrub it off Friday's shell.
- Clear every spot to **level up** — more spots appear and the timer gets
  shorter each round.
- Rack up the highest score before time runs out!

Files: `index.html`, `style.css`, `game.js` — plain HTML/CSS/JS, no build step.

---

## 2. Friday's Ocean Dash — `dodge.html`

A 3D game: **you are Friday**, swimming the open ocean, and it's full of
discarded plastic bags. Steer to dodge every bag — the longer you swim, the
faster it gets. A nod to the real threat marine litter poses to sea turtles.

**How to play**
- Open `dodge.html` in a modern browser (WebGL required), or serve the folder
  over HTTP and visit `/dodge.html`.
- **Move:** `W` `A` `S` `D` / arrow keys, or move the mouse / drag on touch.
- Avoid the translucent plastic bags. Hit one and it's game over.
- Score climbs the longer you survive; difficulty ramps up over time.

Files: `dodge.html`, `dodge.js`, and `vendor/three.module.js`.

### Why Three.js is vendored

The 3D game uses [Three.js](https://threejs.org) (`r160`). Instead of loading
it from a CDN at runtime, the module build is **vendored** into `vendor/` and
referenced via an ES module import map. This keeps the game fully
self-contained — it works offline and in locked-down networks with no external
requests. Three.js is MIT licensed.

---

No build tooling is required for either game — just open the HTML files or
serve the directory with any static file server (e.g. `python3 -m http.server`).
