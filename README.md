# 🐢 Friday's Ocean Dash

An open-world 3D browser game inspired by **Friday the green sea turtle** at the
**National Marine Aquarium in Plymouth** (run by the **Ocean Conservation Trust**).

Open `index.html` for the landing page, or go straight to `dodge.html`.

## The game

**You are Friday.** Dress him up in a GTA-style **wardrobe** (cowboy hat, beer
helmet, fez, top hat, party hat, captain's cap, crown, sombrero, propeller
beanie, pirate tricorn, snorkel mask, halo…), pick a **loadout** (AK-47, katana,
taser, shiv or rocket launcher — Friday grips and fires each one), then **freely
explore an open ocean** in 3D:

- **Find & eat the glowing moon jellies** — swim into one and it pops (and Friday
  chomps).
- **Avoid the drifting plastic bags** — bumping one costs a life (you have three).
  A nod to the real threat marine litter poses to sea turtles.
- **The sharks are the bad guys.** They hunt Friday — blast them with your weapon
  and each one drops a **cheeseburger** 🍔 that you can scoff for points (and it
  heals a lost life).
- Shoals of fish roam the reef, seagrass sways, light shafts and bubbles drift past.

**How to play**
- Open `dodge.html` in a modern browser (WebGL required), or serve the folder
  over HTTP and visit `/dodge.html`.
- **`W`** swim forward · **`S`** reverse.
- **Mouse** (or **`A`/`D`** + **`↑`/`↓`**) to steer — full omnidirectional swimming.
- **`SPACE`** for a cheeky wiggle ("plane time baby!").
- **Click** (hold) or **`F`** to attack with the equipped weapon.

Files: `index.html`, `dodge.html`, `dodge.js`, `vendor/three.module.js` and
`vendor/models.js` (the baked shark/fish meshes).

### The shark & fish models

The shark and the three reef fish are real Blender meshes (exported as Wavefront
OBJ, in `assets/models/`). To keep the game self-contained — no runtime `fetch`,
works offline and from `file://`, exactly like the vendored Three.js — they're
quantised and **baked into `vendor/models.js`** by `tools/bake_models.py`, which
decodes synchronously in the browser. Each instance gets an independent
"swimming" wiggle injected into its vertex shader (standing in for a skeleton).
Re-run the bake after replacing a model:

```
python3 tools/bake_models.py
```

### Why Three.js is vendored

The game uses [Three.js](https://threejs.org) (`r160`). Instead of loading it
from a CDN at runtime, the module build is **vendored** into `vendor/` and
referenced via an ES module import map. This keeps the game fully
self-contained — it works offline and in locked-down networks with no external
requests. Three.js is MIT licensed.

---

No build tooling is required — just open `dodge.html` or serve the directory
with any static file server (e.g. `python3 -m http.server`).
