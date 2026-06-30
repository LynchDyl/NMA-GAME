# 🐢 Friday's Ocean Dash

An open-world 3D browser game inspired by **Friday the green sea turtle** at the
**National Marine Aquarium in Plymouth** (run by the **Ocean Conservation Trust**).

Open `index.html` for the landing page, or go straight to `dodge.html`.

## The game

**You are Friday.** Dress him up in a GTA-style **wardrobe** (cowboy hat, beer
helmet, fez, top hat, party hat, captain's cap, crown, sombrero, propeller
beanie, pirate tricorn, snorkel mask, halo…), then **freely explore an open
ocean** in 3D:

- **Find & eat the glowing moon jellies** — swim into one and it pops (and Friday
  chomps).
- **Avoid the drifting plastic bags** — bumping one costs a life (you have three).
  A nod to the real threat marine litter poses to sea turtles.
- Sharks roam the reef, seagrass sways, light shafts and bubbles drift past.

**How to play**
- Open `dodge.html` in a modern browser (WebGL required), or serve the folder
  over HTTP and visit `/dodge.html`.
- **`W`** swim forward · **`S`** reverse.
- **Mouse** (or **`A`/`D`** + **`↑`/`↓`**) to steer — full omnidirectional swimming.
- **`SPACE`** for a cheeky wiggle ("plane time baby!").

Files: `index.html`, `dodge.html`, `dodge.js`, and `vendor/three.module.js`.

### Why Three.js is vendored

The game uses [Three.js](https://threejs.org) (`r160`). Instead of loading it
from a CDN at runtime, the module build is **vendored** into `vendor/` and
referenced via an ES module import map. This keeps the game fully
self-contained — it works offline and in locked-down networks with no external
requests. Three.js is MIT licensed.

---

No build tooling is required — just open `dodge.html` or serve the directory
with any static file server (e.g. `python3 -m http.server`).
