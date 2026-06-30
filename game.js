(() => {
  const stage = document.getElementById('stage');
  const spotsLayer = document.getElementById('spots-layer');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const levelEl = document.getElementById('level');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const startBtn = document.getElementById('start-btn');
  const sponge = document.getElementById('sponge');
  const turtleWrap = document.getElementById('turtle-wrap');

  const ROUND_SECONDS = 30;
  const SHELL_BOUNDS = { cx: 50, cy: 50, rx: 36, ry: 30 }; // % of stage, roughly the shell area

  let score = 0;
  let level = 1;
  let timeLeft = ROUND_SECONDS;
  let timerId = null;
  let spotsRemaining = 0;
  let running = false;

  function aptasiaSpotSVG() {
    return `<svg viewBox="0 0 40 40">
      <circle cx="20" cy="26" r="9" fill="#d6336c"/>
      ${Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = 20 + Math.cos(angle) * 9;
        const y1 = 26 + Math.sin(angle) * 9;
        const x2 = 20 + Math.cos(angle) * 18;
        const y2 = 26 + Math.sin(angle) * 18 - 4;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f06292" stroke-width="3" stroke-linecap="round"/>`;
      }).join('')}
    </svg>`;
  }

  function randomShellPoint() {
    // sample a random point within an ellipse for natural shell placement
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    const x = SHELL_BOUNDS.cx + Math.cos(t) * r * SHELL_BOUNDS.rx;
    const y = SHELL_BOUNDS.cy + Math.sin(t) * r * SHELL_BOUNDS.ry;
    return { x, y };
  }

  function spawnSpots(count) {
    spotsLayer.innerHTML = '';
    spotsRemaining = count;
    for (let i = 0; i < count; i++) {
      const { x, y } = randomShellPoint();
      const spot = document.createElement('div');
      spot.className = 'aptasia';
      spot.style.left = x + '%';
      spot.style.top = y + '%';
      spot.style.animationDelay = (Math.random() * 1.4) + 's';
      spot.innerHTML = aptasiaSpotSVG();
      spot.addEventListener('click', onScrub);
      spotsLayer.appendChild(spot);
    }
  }

  function onScrub(e) {
    const spot = e.currentTarget;
    if (spot.classList.contains('scrubbed') || !running) return;
    spot.classList.add('scrubbed');
    score += 10 * level;
    spotsRemaining -= 1;
    scoreEl.textContent = score;
    showFloatText(spot.style.left, spot.style.top, '+' + (10 * level));

    if (spotsRemaining <= 0) {
      levelUp();
    }
  }

  function showFloatText(left, top, text) {
    const el = document.createElement('div');
    el.id = 'splash-msg';
    el.style.left = left;
    el.style.top = top;
    el.textContent = text;
    spotsLayer.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  function levelUp() {
    level += 1;
    levelEl.textContent = level;
    timeLeft = Math.max(15, ROUND_SECONDS - level * 2);
    timeEl.textContent = timeLeft;
    spawnSpots(4 + level * 2);
  }

  function tick() {
    timeLeft -= 1;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      endGame();
    }
  }

  function startGame() {
    score = 0;
    level = 1;
    timeLeft = ROUND_SECONDS;
    scoreEl.textContent = score;
    levelEl.textContent = level;
    timeEl.textContent = timeLeft;
    running = true;
    overlay.classList.add('hidden');
    spawnSpots(4 + level * 2);
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    running = false;
    clearInterval(timerId);
    overlayTitle.textContent = 'Time\'s Up!';
    overlayText.textContent = `Friday says thanks! You scored ${score} points and reached level ${level}. Aptasia removed keeps Friday's shell healthy at the National Marine Aquarium.`;
    startBtn.textContent = 'Scrub Again';
    overlay.classList.remove('hidden');
  }

  startBtn.addEventListener('click', startGame);

  // sponge cursor follow (desktop only, decorative)
  if (window.matchMedia('(pointer: fine)').matches) {
    sponge.style.display = 'block';
    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      sponge.style.left = (e.clientX - rect.left) + 'px';
      sponge.style.top = (e.clientY - rect.top) + 'px';
    });
    stage.addEventListener('mouseleave', () => { sponge.style.display = 'none'; });
    stage.addEventListener('mouseenter', () => { sponge.style.display = 'block'; });
  }
})();
