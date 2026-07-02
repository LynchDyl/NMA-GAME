// Reef Rumble — a lightweight Mortal-Kombat-style 2D fighting game.
// Zeus the zebra shark vs Friday the turtle. No build tooling, no assets:
// characters are rendered with canvas primitives + emoji glyphs.

(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  const ARENA_W = 960, ARENA_H = 540;
  const FLOOR_Y = 440;
  const WALL_L = 60, WALL_R = ARENA_W - 60;
  const GRAVITY = 2600;
  const JUMP_VELOCITY = -880;
  const WALK_SPEED = 250;
  const BODY_RADIUS = 32; // half-distance fighters can close to (must stay under every move's range)
  const ROUND_TIME = 60;
  const ROUNDS_TO_WIN = 2;

  const DODGE_SPEED = 780;
  const DODGE_DURATION = 320;  // ms, total roll animation
  const DODGE_IFRAME = 210;    // ms, invulnerable portion of the roll
  const DODGE_COOLDOWN = 480;  // ms before another dodge is allowed
  const PARRY_WINDOW = 150;    // ms — block within this long of pressing = perfect block
  const FATALITY_DURATION = 2700;
  const FINISH_PROMPT_DURATION = 2200;

  const MOVES = {
    zeus: {
      punch:   { name: 'Bite',        dmg: 6,  startup: 90,  active: 80,  recovery: 170, range: 82,  push: 70,  chip: 0.15 },
      kick:    { name: 'Tail Slap',   dmg: 10, startup: 150, active: 90,  recovery: 230, range: 96,  push: 130, chip: 0.15 },
      special: { name: 'Frenzy Dash', dmg: 18, startup: 200, active: 180, recovery: 320, range: 160, push: 210, chip: 0.2, dash: 820 },
    },
    friday: {
      punch:   { name: 'Flipper Jab', dmg: 5,  startup: 80,  active: 80,  recovery: 150, range: 74,  push: 55,  chip: 0.15 },
      kick:    { name: 'Shell Stomp', dmg: 9,  startup: 140, active: 90,  recovery: 220, range: 88,  push: 115, chip: 0.15 },
      special: { name: 'Shell Spin',  dmg: 16, startup: 180, active: 260, recovery: 300, range: 104, push: 170, chip: 0.2, armor: true },
    },
  };

  const FIGHTER_META = {
    zeus:   { emoji: '🦈', displayName: 'Zeus',   tagline: 'the Zebra Shark', color: '#8fb3d9', aura: 'rgba(143,179,217,0.35)' },
    friday: { emoji: '🐢', displayName: 'Friday', tagline: 'the Turtle',      color: '#3ecf8e', aura: 'rgba(62,207,142,0.35)' },
  };

  const FINISHERS = {
    zeus:   { name: 'Reef Frenzy', flashColor: '#eaffff', tint: '255,120,120' },
    friday: { name: 'Shell Slam',  flashColor: '#e8fff0', tint: '120,255,170' },
  };
  const FINISH_STAMP = 'REEF-ALITY!';

  // ---------------------------------------------------------------- input
  const held = new Set();
  const queued = new Set(); // edge-triggered actions consumed once per press

  const P1_KEYS = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', punch: 'KeyF', kick: 'KeyG', special: 'KeyH', dodge: 'KeyE' };
  const P2_KEYS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', punch: 'KeyK', kick: 'KeyL', special: 'Semicolon', dodge: 'Slash' };
  const GAME_KEYS = new Set([...Object.values(P1_KEYS), ...Object.values(P2_KEYS), 'Escape']);

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.code === 'Escape') { returnToMenu(); return; }
    held.add(e.code);
    if (!e.repeat) queued.add(e.code);
  });
  window.addEventListener('keyup', (e) => { held.delete(e.code); });
  window.addEventListener('blur', () => { held.clear(); queued.clear(); });

  function readInput(keys) {
    return {
      left: held.has(keys.left),
      right: held.has(keys.right),
      down: held.has(keys.down),
      jump: queued.has(keys.up),
      punch: queued.has(keys.punch),
      kick: queued.has(keys.kick),
      special: queued.has(keys.special),
      dodge: queued.has(keys.dodge),
    };
  }

  const NO_INPUT = { left: false, right: false, down: false, jump: false, punch: false, kick: false, special: false, dodge: false };

  // -------------------------------------------------------------- fighter
  function makeFighter(kind, x, facing, controls, isCPU) {
    const meta = FIGHTER_META[kind];
    return {
      kind, ...meta,
      x, y: FLOOR_Y, vx: 0, vy: 0, facing,
      hp: 100, maxHp: 100, displayHp: 100, wins: 0,
      state: 'idle', // idle | walk | jump | block | dodge | attack | hitstun | ko
      grounded: true,
      attack: null, hasHit: false,
      hitstunTimer: 0,
      dodgeTimer: 0, dodgeCooldown: 0, blockHeldFor: 0,
      flashTimer: 0, tiltTimer: 0, parryGlow: 0,
      controls, isCPU,
      aiTimer: 0, aiInput: { ...NO_INPUT },
    };
  }

  let p1, p2, effects, match;

  function resetFighters() {
    p1.x = 300; p1.y = FLOOR_Y; p1.vx = 0; p1.vy = 0; p1.facing = 1;
    p1.hp = p1.maxHp; p1.displayHp = p1.maxHp; p1.state = 'idle'; p1.attack = null;
    p1.hitstunTimer = 0; p1.dodgeTimer = 0; p1.dodgeCooldown = 0; p1.blockHeldFor = 0;
    p2.x = 660; p2.y = FLOOR_Y; p2.vx = 0; p2.vy = 0; p2.facing = -1;
    p2.hp = p2.maxHp; p2.displayHp = p2.maxHp; p2.state = 'idle'; p2.attack = null;
    p2.hitstunTimer = 0; p2.dodgeTimer = 0; p2.dodgeCooldown = 0; p2.blockHeldFor = 0;
    effects.particles.length = 0;
    effects.shake = 0;
  }

  // ---------------------------------------------------------------- setup
  const startScreen = document.getElementById('start-screen');
  const endScreen = document.getElementById('end-screen');
  let mode = '2p';
  let playerFighter = 'zeus';

  document.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      mode = btn.dataset.mode;
      document.getElementById('fighter-choice').classList.toggle('hidden', mode !== '1p');
      document.getElementById('p1-tag').textContent = mode === '1p' && playerFighter === 'friday' ? 'CPU' : 'Player 1';
      document.getElementById('p2-tag').textContent = mode === '1p' && playerFighter === 'zeus' ? 'CPU' : (mode === '1p' ? 'Player 1' : 'Player 2');
    });
  });

  document.querySelectorAll('.fighter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fighter-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      playerFighter = btn.dataset.fighter;
      document.getElementById('p1-tag').textContent = playerFighter === 'friday' ? 'CPU' : 'Player 1';
      document.getElementById('p2-tag').textContent = playerFighter === 'zeus' ? 'CPU' : 'Player 1';
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    const p1IsCPU = mode === '1p' && playerFighter === 'friday';
    const p2IsCPU = mode === '1p' && playerFighter === 'zeus';
    p1 = makeFighter('zeus', 300, 1, P1_KEYS, p1IsCPU);
    p2 = makeFighter('friday', 660, -1, P2_KEYS, p2IsCPU);
    effects = { particles: [], shake: 0 };
    match = { phase: 'intro', round: 1, timer: ROUND_TIME, introTimer: 2000, endTimer: 0, bannerMain: 'ROUND 1', bannerSub: '', lastReason: null, finisher: null };
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    held.clear(); queued.clear();
    requestAnimationFrame(loop);
  });

  document.getElementById('rematch-btn').addEventListener('click', () => {
    p1.wins = 0; p2.wins = 0;
    resetFighters();
    match = { phase: 'intro', round: 1, timer: ROUND_TIME, introTimer: 2000, endTimer: 0, bannerMain: 'ROUND 1', bannerSub: '', lastReason: null, finisher: null };
    endScreen.classList.add('hidden');
  });

  document.getElementById('menu-btn').addEventListener('click', returnToMenu);

  function returnToMenu() {
    if (!match) return;
    match.phase = 'menu';
    endScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
  }

  // ----------------------------------------------------------------- ai
  function updateAI(f, opp, dt) {
    f.aiTimer -= dt;
    const dist = Math.abs(opp.x - f.x);
    const inAttackRange = dist < 130;
    if (f.aiTimer <= 0) {
      f.aiTimer = 220 + Math.random() * 260;
      const input = { ...NO_INPUT };
      if (opp.state === 'attack' && dist < 150 && Math.random() < 0.6) {
        // react: sometimes block, sometimes roll through it
        if (Math.random() < 0.45) input.dodge = true;
        else input.down = true;
      } else if (inAttackRange) {
        const r = Math.random();
        if (r < 0.32) input.punch = true;
        else if (r < 0.56) input.kick = true;
        else if (r < 0.72) input.special = true;
        else if (r < 0.85) input.down = true;
        else if (r < 0.93) input.dodge = true;
        // else whiff / reposition
      } else {
        if (opp.x < f.x) input.left = true; else input.right = true;
        if (Math.random() < 0.08) input.jump = true;
      }
      f.aiInput = input;
    }
    return f.aiInput;
  }

  // -------------------------------------------------------------- update
  function tryStartAttack(f, opp, type) {
    if (f.state === 'attack' || f.state === 'hitstun' || f.state === 'dodge' || !f.grounded) return;
    const move = MOVES[f.kind][type];
    f.state = 'attack';
    f.facing = opp.x >= f.x ? 1 : -1;
    f.attack = { type, move, phase: 'startup', elapsed: 0 };
    f.hasHit = false;
    f.vx = 0;
  }

  function tryStartDodge(f, opp, input) {
    if (f.state === 'attack' || f.state === 'hitstun' || f.state === 'dodge' || !f.grounded || f.dodgeCooldown > 0) return;
    let dir;
    if (input.left && !input.right) dir = -1;
    else if (input.right && !input.left) dir = 1;
    else dir = opp.x >= f.x ? -1 : 1; // no direction held: hop away from opponent
    f.state = 'dodge';
    f.dodgeTimer = 0;
    f.vx = dir * DODGE_SPEED;
    f.vy = 0;
  }

  function pushParticle(p) {
    effects.particles.push({ total: p.life, ...p });
  }

  function applyDamage(defender, attacker, move) {
    const facingAttacker = (attacker.x < defender.x && defender.facing === -1) || (attacker.x > defender.x && defender.facing === 1);
    const blocking = defender.state === 'block' && facingAttacker;
    const perfectBlock = blocking && defender.blockHeldFor <= PARRY_WINDOW;

    if (perfectBlock) {
      // sophisticated parry: no damage, no chip, and the attacker gets punished
      defender.flashTimer = 140;
      defender.parryGlow = 260;
      attacker.state = 'hitstun';
      attacker.hitstunTimer = 340;
      attacker.attack = null;
      attacker.vx = (attacker.x > defender.x ? 1 : -1) * 170;
      attacker.vy = -120;
      attacker.flashTimer = 100;
      pushParticle({ x: (attacker.x + defender.x) / 2, y: defender.y - 100, life: 480, text: 'PERFECT BLOCK!', color: '#ffd166', big: true });
      effects.shake = 12;
      return;
    }

    // super armor: a defender mid-way through their own armored special shrugs off
    // hitstun and knockback (but still takes damage) instead of getting interrupted.
    const armored = defender.state === 'attack' && defender.attack && defender.attack.move.armor;
    let dmg = move.dmg;
    let push = move.push;
    if (blocking) {
      dmg = Math.max(1, Math.round(move.dmg * move.chip));
      push *= 0.4;
      defender.flashTimer = 120;
    } else if (armored) {
      push = 0;
      defender.flashTimer = 160;
    } else {
      defender.state = 'hitstun';
      defender.hitstunTimer = 260 + move.dmg * 6;
      defender.flashTimer = 160;
      defender.tiltTimer = 200;
    }
    defender.hp = Math.max(0, defender.hp - dmg);
    if (!armored) {
      defender.vx = (defender.x > attacker.x ? 1 : -1) * push;
      if (!blocking) defender.vy = -160;
    }
    pushParticle({ x: (attacker.x + defender.x) / 2, y: defender.y - 90, life: 260, dmg, blocked: blocking });
    effects.shake = move.dmg >= 15 ? 14 : 6;
  }

  function updateFighter(f, opp, input, dt) {
    const wasBlocking = f.state === 'block';

    // face opponent when not locked into an attack/hitstun/knockout/dodge
    if (f.state !== 'attack' && f.state !== 'hitstun' && f.state !== 'ko' && f.state !== 'dodge') {
      f.facing = opp.x >= f.x ? 1 : -1;
    }

    if (f.state === 'ko') {
      f.vx *= Math.max(0, 1 - dt / 150);
    } else if (f.state === 'dodge') {
      f.dodgeTimer += dt;
      f.vx *= Math.max(0, 1 - dt / 220);
      if (f.dodgeTimer >= DODGE_DURATION) {
        f.state = f.grounded ? 'idle' : 'jump';
        f.dodgeCooldown = DODGE_COOLDOWN;
      }
    } else if (f.state === 'hitstun') {
      f.hitstunTimer -= dt;
      if (f.hitstunTimer <= 0) f.state = f.grounded ? 'idle' : 'jump';
    } else if (f.state === 'attack') {
      const a = f.attack;
      a.elapsed += dt;
      if (a.phase === 'startup' && a.elapsed >= a.move.startup) {
        a.phase = 'active'; a.elapsed = 0;
        if (a.type === 'special' && a.move.dash) f.vx = f.facing * a.move.dash * (a.move.armor ? 0.15 : 1);
      } else if (a.phase === 'active') {
        if (!f.hasHit) {
          const dist = Math.abs(opp.x - f.x);
          const facingRight = f.facing === 1 && opp.x >= f.x;
          const facingLeft = f.facing === -1 && opp.x <= f.x;
          if (dist <= a.move.range && (facingRight || facingLeft) && opp.state !== 'ko') {
            const dodged = opp.state === 'dodge' && opp.dodgeTimer < DODGE_IFRAME;
            f.hasHit = true;
            if (dodged) {
              pushParticle({ x: opp.x, y: opp.y - 90, life: 340, text: 'DODGED!', color: '#9fe8ff' });
            } else {
              applyDamage(opp, f, a.move);
            }
          }
        }
        if (a.elapsed >= a.move.active) { a.phase = 'recovery'; a.elapsed = 0; }
      } else if (a.phase === 'recovery') {
        if (a.elapsed >= a.move.recovery) { f.state = 'idle'; f.attack = null; }
      }
    } else {
      // free movement / block / crouch / idle / walk / jump
      const canAct = f.grounded;
      f.state = 'idle';
      if (input.down && canAct) {
        f.state = 'block';
      }
      if (canAct && !input.down) {
        if (input.left && !input.right) { f.vx = -WALK_SPEED; f.state = 'walk'; }
        else if (input.right && !input.left) { f.vx = WALK_SPEED; f.state = 'walk'; }
        else f.vx = 0;
      } else if (canAct) {
        f.vx = 0;
      }
      if (canAct && input.jump) {
        f.vy = JUMP_VELOCITY;
        f.grounded = false;
        f.state = 'jump';
      }
      if (!f.grounded) f.state = 'jump';

      if (canAct && !input.down) {
        if (input.dodge) tryStartDodge(f, opp, input);
        else if (input.punch) tryStartAttack(f, opp, 'punch');
        else if (input.kick) tryStartAttack(f, opp, 'kick');
        else if (input.special) tryStartAttack(f, opp, 'special');
      }
    }

    // track how long block has been continuously held, for the perfect-block window
    f.blockHeldFor = f.state === 'block' ? (wasBlocking ? f.blockHeldFor + dt : dt) : 0;

    // physics
    if (!f.grounded || f.vy !== 0) {
      f.vy += GRAVITY * dt / 1000;
      f.y += f.vy * dt / 1000;
      if (f.y >= FLOOR_Y) { f.y = FLOOR_Y; f.vy = 0; f.grounded = true; if (f.state === 'jump') f.state = 'idle'; }
      else f.grounded = false;
    }
    f.x += f.vx * dt / 1000;
    // friction for knockback drift when not actively walking
    if (f.state === 'hitstun' || f.state === 'attack') {
      f.vx *= Math.max(0, 1 - dt / 180);
    }
    f.x = Math.max(WALL_L, Math.min(WALL_R, f.x));

    if (f.flashTimer > 0) f.flashTimer -= dt;
    if (f.tiltTimer > 0) f.tiltTimer -= dt;
    if (f.parryGlow > 0) f.parryGlow -= dt;
    if (f.dodgeCooldown > 0) f.dodgeCooldown -= dt;
    f.displayHp += (f.hp - f.displayHp) * Math.min(1, dt / 220);
  }

  function resolveCollision(a, b) {
    const dist = b.x - a.x;
    const min = BODY_RADIUS * 2;
    if (Math.abs(dist) < min && Math.abs(a.y - b.y) < 20) {
      const overlap = (min - Math.abs(dist)) / 2;
      const dir = dist >= 0 ? 1 : -1;
      a.x -= dir * overlap;
      b.x += dir * overlap;
      a.x = Math.max(WALL_L, Math.min(WALL_R, a.x));
      b.x = Math.max(WALL_L, Math.min(WALL_R, b.x));
    }
  }

  // ----------------------------------------------------------- round flow
  function endRound(winner, reason) {
    match.phase = 'roundend';
    match.endTimer = 2200;
    match.lastReason = reason;
    if (winner) {
      winner.wins++;
      match.bannerMain = reason === 'time' ? "TIME'S UP" : 'K.O.!';
      match.bannerSub = `${winner.displayName} wins the round!`;
    } else {
      match.bannerMain = "TIME'S UP";
      match.bannerSub = 'Draw round — go again!';
    }
  }

  function showMatchEnd(winner) {
    match.phase = 'matchend';
    document.getElementById('end-title').textContent = `🏆 ${winner.displayName.toUpperCase()} WINS THE MATCH!`;
    document.getElementById('end-sub').textContent = `${p1.displayName} ${p1.wins} — ${p2.wins} ${p2.displayName}`;
    endScreen.classList.remove('hidden');
  }

  function beginFinisher(winner, loser) {
    match.phase = 'finish-prompt';
    match.finisher = { winner, loser, promptTimer: FINISH_PROMPT_DURATION, playTimer: 0, tickTimer: 0 };
    loser.state = 'ko';
    loser.vx = 0;
  }

  function startNextRound() {
    const matchOver = p1.wins >= ROUNDS_TO_WIN || p2.wins >= ROUNDS_TO_WIN;
    if (matchOver) {
      const winner = p1.wins > p2.wins ? p1 : p2;
      const loser = winner === p1 ? p2 : p1;
      if (match.lastReason === 'ko') beginFinisher(winner, loser);
      else showMatchEnd(winner);
      return;
    }
    match.round++;
    resetFighters();
    match.phase = 'intro';
    match.introTimer = 2000;
    match.timer = ROUND_TIME;
    match.bannerMain = `ROUND ${match.round}`;
    match.bannerSub = '';
  }

  function update(dt) {
    if (!match || match.phase === 'menu' || match.phase === 'matchend') return;

    if (match.phase === 'intro') {
      match.introTimer -= dt;
      match.bannerMain = match.introTimer > 800 ? `ROUND ${match.round}` : 'FIGHT!';
      if (match.introTimer <= 0) { match.phase = 'fighting'; }
      updateFighter(p1, p2, NO_INPUT, dt);
      updateFighter(p2, p1, NO_INPUT, dt);
      resolveCollision(p1, p2);
    } else if (match.phase === 'roundend') {
      match.endTimer -= dt;
      updateFighter(p1, p2, NO_INPUT, dt);
      updateFighter(p2, p1, NO_INPUT, dt);
      if (match.endTimer <= 0) startNextRound();
    } else if (match.phase === 'fighting') {
      match.timer -= dt / 1000;
      if (match.timer <= 0) {
        match.timer = 0;
        let winner = null;
        if (p1.hp > p2.hp) winner = p1; else if (p2.hp > p1.hp) winner = p2;
        endRound(winner, 'time');
      } else {
        const in1 = p1.isCPU ? updateAI(p1, p2, dt) : readInput(p1.controls);
        const in2 = p2.isCPU ? updateAI(p2, p1, dt) : readInput(p2.controls);
        updateFighter(p1, p2, in1, dt);
        updateFighter(p2, p1, in2, dt);
        resolveCollision(p1, p2);

        if (p1.hp <= 0 || p2.hp <= 0) {
          const winner = p1.hp <= 0 && p2.hp <= 0 ? null : (p1.hp <= 0 ? p2 : p1);
          if (p1.hp <= 0) p1.state = 'ko';
          if (p2.hp <= 0) p2.state = 'ko';
          endRound(winner, 'ko');
        }
      }
    } else if (match.phase === 'finish-prompt') {
      const fin = match.finisher;
      fin.promptTimer -= dt;
      updateFighter(p1, p2, NO_INPUT, dt);
      updateFighter(p2, p1, NO_INPUT, dt);
      const winnerTriggered = fin.winner.controls && queued.has(fin.winner.controls.special);
      const cpuReady = fin.winner.isCPU && fin.promptTimer <= FINISH_PROMPT_DURATION - 900;
      if (winnerTriggered || cpuReady || fin.promptTimer <= 0) {
        match.phase = 'fatality';
        fin.playTimer = 0;
        fin.tickTimer = 0;
      }
    } else if (match.phase === 'fatality') {
      const fin = match.finisher;
      fin.playTimer += dt;
      fin.tickTimer -= dt;
      updateFighter(p1, p2, NO_INPUT, dt);
      updateFighter(p2, p1, NO_INPUT, dt);
      const t = fin.playTimer / FATALITY_DURATION;
      if (t < 0.42 && fin.tickTimer <= 0) {
        fin.tickTimer = 140;
        const tint = FINISHERS[fin.winner.kind].tint;
        pushParticle({ x: fin.loser.x + (Math.random() - 0.5) * 50, y: fin.loser.y - 80 + (Math.random() - 0.5) * 40, life: 260, emoji: '💥' });
        fin.loser.flashTimer = 160;
        effects.shake = 9;
      } else if (t >= 0.58 && fin.tickTimer <= 0) {
        fin.tickTimer = 90;
        pushParticle({ x: Math.random() * ARENA_W, y: -10, life: 1400, emoji: Math.random() < 0.5 ? '✨' : '🫧', drift: 60 + Math.random() * 60, sway: Math.random() * 2 });
      }
      if (fin.playTimer >= FATALITY_DURATION) showMatchEnd(fin.winner);
    }

    for (let i = effects.particles.length - 1; i >= 0; i--) {
      const p = effects.particles[i];
      p.life -= dt;
      if (p.drift) p.y += p.drift * dt / 1000;
      if (p.life <= 0) effects.particles.splice(i, 1);
    }
    if (effects.shake > 0) effects.shake = Math.max(0, effects.shake - dt / 16);

    queued.clear();
  }

  // -------------------------------------------------------------- render
  const bubbles = Array.from({ length: 18 }, () => ({
    x: Math.random() * ARENA_W, y: Math.random() * ARENA_H, r: 2 + Math.random() * 4, speed: 10 + Math.random() * 20,
  }));

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, ARENA_H);
    g.addColorStop(0, '#04263f'); g.addColorStop(0.55, '#0a3d62'); g.addColorStop(1, '#1e6091');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    // distant reef arch silhouettes
    ctx.fillStyle = 'rgba(2,20,34,0.5)';
    ctx.beginPath(); ctx.ellipse(140, FLOOR_Y + 40, 160, 90, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(820, FLOOR_Y + 50, 200, 110, 0, Math.PI, 0); ctx.fill();

    // bubbles
    ctx.fillStyle = 'rgba(200,240,255,0.25)';
    for (const b of bubbles) {
      b.y -= b.speed * (1 / 60);
      if (b.y < -10) { b.y = ARENA_H + 10; b.x = Math.random() * ARENA_W; }
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }

    // floor
    const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, ARENA_H);
    fg.addColorStop(0, '#123a52'); fg.addColorStop(1, '#0a2233');
    ctx.fillStyle = fg;
    ctx.fillRect(0, FLOOR_Y, ARENA_W, ARENA_H - FLOOR_Y);
    ctx.strokeStyle = 'rgba(120,200,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(ARENA_W, FLOOR_Y); ctx.stroke();
  }

  function drawFighter(f) {
    ctx.save();
    ctx.translate(f.x, f.y);

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 6, 40, 10, 0, 0, Math.PI * 2); ctx.fill();

    // aura (glows gold briefly on a perfect block)
    ctx.fillStyle = f.parryGlow > 0 ? 'rgba(255,209,102,0.5)' : f.aura;
    ctx.beginPath(); ctx.arc(0, -70, f.parryGlow > 0 ? 70 : 60, 0, Math.PI * 2); ctx.fill();

    let bob = 0, squashX = 1, squashY = 1, rot = 0, alpha = 1;
    if (f.state === 'walk') bob = Math.sin(performance.now() / 90) * 4;
    if (f.state === 'jump') squashY = 1.08;
    if (f.state === 'block') squashX = 0.92;
    if (f.state === 'dodge') {
      const p = f.dodgeTimer / DODGE_DURATION;
      squashX = 1.25; squashY = 0.82;
      bob = Math.sin(p * Math.PI) * -10;
      alpha = f.dodgeTimer < DODGE_IFRAME ? 0.55 : 0.85; // ghostly while invulnerable
    }
    if (f.state === 'attack') {
      const a = f.attack;
      if (a.phase === 'startup') { squashX = 0.9; squashY = 1.06; }
      else if (a.phase === 'active') { squashX = 1.2; squashY = 0.92; }
    }
    if (f.state === 'hitstun') { rot = f.facing * -0.15; squashX = 0.95; }
    if (f.state === 'ko') { rot = Math.PI / 2 * f.facing; bob = 30; }

    ctx.globalAlpha = alpha;
    ctx.translate(0, -78 + bob);
    ctx.rotate(rot);
    ctx.scale(f.facing * squashX, squashY);

    if (f.parryGlow > 0) {
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 30;
    } else if (f.flashTimer > 0) {
      ctx.shadowColor = '#ff5b5b';
      ctx.shadowBlur = 24;
    }
    ctx.font = '86px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.emoji, 0, 0);
    ctx.restore();
  }

  function drawParticles() {
    for (const p of effects.particles) {
      const t = 1 - p.life / p.total;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.drift ? Math.min(1, p.life / 400) : 1 - t);
      if (p.text) {
        ctx.font = `900 ${p.big ? 26 : 18}px Segoe UI`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#06283a';
        ctx.strokeText(p.text, p.x, p.y - t * 26);
        ctx.fillStyle = p.color || '#eaf6ff';
        ctx.fillText(p.text, p.x, p.y - t * 26);
      } else {
        ctx.font = `${28 + t * 14}px sans-serif`;
        ctx.textAlign = 'center';
        if (p.sway !== undefined) {
          ctx.fillText(p.emoji, p.x + Math.sin(performance.now() / 300 + p.sway) * 14, p.y);
        } else {
          ctx.fillText(p.blocked ? '🛡️' : p.emoji || '💥', p.x, p.y - t * 30);
        }
        if (p.dmg != null) {
          ctx.font = 'bold 16px Segoe UI';
          ctx.fillStyle = p.blocked ? '#9fe8ff' : '#ffd166';
          ctx.fillText(`-${p.dmg}`, p.x, p.y - 34 - t * 30);
        }
      }
      ctx.restore();
    }
  }

  function drawHealthBar(f, x, alignRight) {
    const w = 300, h = 22;
    ctx.save();
    ctx.translate(x, 18);
    if (alignRight) ctx.translate(-w, 0);

    ctx.font = 'bold 15px Segoe UI';
    ctx.fillStyle = '#eaf6ff';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillText(`${f.emoji} ${f.displayName.toUpperCase()}`, alignRight ? w : 0, -4);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 6, w, h);
    const pct = Math.max(0, f.displayHp / f.maxHp);
    const barW = (w - 4) * pct;
    const barX = alignRight ? w - 2 - barW : 2;
    const hue = pct > 0.5 ? 130 : pct > 0.2 ? 45 : 0;
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
    ctx.fillRect(barX, 8, barW, h - 4);
    ctx.strokeStyle = 'rgba(120,200,255,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 6, w, h);

    // round-win pips
    for (let i = 0; i < ROUNDS_TO_WIN; i++) {
      const px = alignRight ? w - 12 - i * 16 : 12 + i * 16;
      ctx.beginPath();
      ctx.arc(px, h + 16, 5, 0, Math.PI * 2);
      ctx.fillStyle = i < f.wins ? '#ffd166' : 'rgba(255,255,255,0.25)';
      ctx.fill();
    }

    // dodge-ready pip (small blue dot) — sophistication cue for players
    ctx.beginPath();
    ctx.arc(alignRight ? -8 : w + 8, h + 16, 4, 0, Math.PI * 2);
    ctx.fillStyle = f.dodgeCooldown > 0 ? 'rgba(159,232,255,0.25)' : '#9fe8ff';
    ctx.fill();
    ctx.restore();
  }

  function drawHUD() {
    drawHealthBar(p1, 24, false);
    drawHealthBar(p2, ARENA_W - 24, true);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px Segoe UI';
    ctx.fillStyle = '#eaf6ff';
    ctx.fillText(Math.ceil(match.timer), ARENA_W / 2, 34);
    ctx.font = 'bold 12px Segoe UI';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`ROUND ${match.round}`, ARENA_W / 2, 50);
    ctx.restore();
  }

  function drawBanner() {
    if (match.phase !== 'intro' && match.phase !== 'roundend') return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff170';
    ctx.strokeStyle = '#06283a';
    ctx.lineWidth = 6;
    ctx.font = '900 54px Segoe UI';
    ctx.strokeText(match.bannerMain, ARENA_W / 2, ARENA_H / 2 - 10);
    ctx.fillText(match.bannerMain, ARENA_W / 2, ARENA_H / 2 - 10);
    if (match.bannerSub) {
      ctx.font = 'bold 22px Segoe UI';
      ctx.lineWidth = 4;
      ctx.strokeText(match.bannerSub, ARENA_W / 2, ARENA_H / 2 + 30);
      ctx.fillStyle = '#eaf6ff';
      ctx.fillText(match.bannerSub, ARENA_W / 2, ARENA_H / 2 + 30);
    }
    ctx.restore();
  }

  function drawFinishPrompt(fin) {
    const pulse = 1 + Math.sin(performance.now() / 140) * 0.05;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.translate(ARENA_W / 2, ARENA_H / 2 - 20);
    ctx.scale(pulse, pulse);
    ctx.font = '900 50px Segoe UI';
    ctx.strokeStyle = '#3a0606';
    ctx.lineWidth = 7;
    const label = `FINISH ${fin.loser.displayName.toUpperCase()}!`;
    ctx.strokeText(label, 0, 0);
    const grad = ctx.createLinearGradient(-220, 0, 220, 0);
    grad.addColorStop(0, '#ffd166'); grad.addColorStop(0.5, '#ff5b3d'); grad.addColorStop(1, '#ffd166');
    ctx.fillStyle = grad;
    ctx.fillText(label, 0, 0);
    ctx.restore();

    if (!fin.winner.isCPU) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px Segoe UI';
      ctx.fillStyle = 'rgba(234,246,255,0.85)';
      ctx.fillText('press SPECIAL to finish it', ARENA_W / 2, ARENA_H / 2 + 34);
      ctx.restore();
    }
  }

  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function drawFatalityScene(fin) {
    const t = Math.min(1, fin.playTimer / FATALITY_DURATION);
    const { winner, loser } = fin;
    const flashEnd = 0.58;
    const info = FINISHERS[winner.kind];

    // --- stage A/B: loser still visible, gets shaken & flashed ---
    if (t < flashEnd) {
      ctx.save();
      ctx.translate(loser.x, loser.y);
      const shake = Math.sin(performance.now() / 35) * (t < 0.42 ? 4 : 1);
      ctx.translate(shake, -78);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.42) / (flashEnd - 0.42));
      ctx.rotate(loser.facing * -0.2);
      if (loser.flashTimer > 0) { ctx.shadowColor = '#ff5b5b'; ctx.shadowBlur = 26; }
      ctx.font = '86px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(loser.emoji, 0, 0);
      ctx.restore();
    }

    // --- winner: lunges during stage A, victory pose after ---
    ctx.save();
    let wx = winner.x, wy = winner.y - 78, wScale = 1;
    if (t < 0.42) {
      const lungePhase = (t / 0.42 * 6) % 1;
      wx += winner.facing * Math.sin(lungePhase * Math.PI) * 30;
    } else {
      wScale = 1 + Math.sin(performance.now() / 220) * 0.05 + Math.min(0.12, (t - 0.42) * 0.3);
    }
    ctx.translate(wx, wy);
    ctx.scale(winner.facing * wScale, wScale);
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = t > 0.42 ? 22 : 0;
    ctx.font = '86px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(winner.emoji, 0, 0);
    ctx.restore();

    // --- flash overlay at the transition moment ---
    if (t >= 0.34 && t < flashEnd) {
      const localT = (t - 0.34) / (flashEnd - 0.34);
      const alpha = Math.sin(Math.min(1, localT) * Math.PI);
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = info.flashColor;
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);
      ctx.restore();
    }

    // --- lingering tinted vignette through the whole sequence ---
    ctx.save();
    ctx.globalAlpha = 0.35;
    const vg = ctx.createRadialGradient(ARENA_W / 2, ARENA_H / 2, 140, ARENA_W / 2, ARENA_H / 2, 520);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(${info.tint},0.4)`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    ctx.restore();

    // --- stamp stage ---
    if (t >= flashEnd) {
      const localT = (t - flashEnd) / (1 - flashEnd);
      const pop = Math.min(1, localT / 0.3);
      const scale = easeOutBack(pop);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.translate(ARENA_W / 2, ARENA_H / 2 - 30);
      ctx.rotate(-0.06);
      ctx.scale(scale, scale);
      ctx.font = '900 64px Segoe UI';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#3a0606';
      ctx.strokeText(FINISH_STAMP, 0, 0);
      const grad = ctx.createLinearGradient(-260, 0, 260, 0);
      grad.addColorStop(0, '#ffd166'); grad.addColorStop(0.5, '#ff3d3d'); grad.addColorStop(1, '#ffd166');
      ctx.fillStyle = grad;
      ctx.fillText(FINISH_STAMP, 0, 0);
      ctx.restore();

      if (localT > 0.35) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (localT - 0.35) / 0.25);
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Segoe UI';
        ctx.fillStyle = '#eaf6ff';
        ctx.fillText(`${winner.displayName}'s ${info.name}!`, ARENA_W / 2, ARENA_H / 2 + 40);
        ctx.restore();
      }
    }
  }

  function render() {
    ctx.save();
    if (effects && effects.shake > 0) {
      ctx.translate((Math.random() - 0.5) * effects.shake, (Math.random() - 0.5) * effects.shake);
    }
    drawBackground();
    if (p1 && p2) {
      if (match && match.phase === 'fatality') {
        drawFatalityScene(match.finisher);
      } else {
        const order = p1.x <= p2.x ? [p1, p2] : [p2, p1];
        for (const f of order) drawFighter(f);
      }
      drawParticles();
    }
    ctx.restore();

    if (match && match.phase !== 'menu') {
      if (match.phase !== 'fatality') drawHUD();
      if (match.phase === 'finish-prompt') drawFinishPrompt(match.finisher);
      else drawBanner();
    }
  }

  // ----------------------------------------------------------------- loop
  let last = 0;
  function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(50, ts - last);
    last = ts;
    if (match && match.phase !== 'menu') {
      update(dt);
      render();
      requestAnimationFrame(loop);
    } else {
      last = 0;
    }
  }

  // idle background render before a match starts
  drawBackground();
})();
