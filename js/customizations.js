// ============================================
// 2048 — Custom Features & Themes
// github.com/tweety-KM/2048-game
// ============================================

(function () {

  const settings = {
    theme:     localStorage.getItem('cfg_theme') || null,
    ghostMode: JSON.parse(localStorage.getItem('cfg_ghostMode') || 'false'),
    awsSkin:   JSON.parse(localStorage.getItem('cfg_awsSkin')   || 'false')
  };

  let stats = { moves: 0, merges: 0 };
  let timerInterval = null;
  let timerStart    = null;
  const seenTiles   = new Set(JSON.parse(localStorage.getItem('seenTiles') || '[]'));
  let achievement4096Shown = JSON.parse(localStorage.getItem('achievement4096') || 'false');

  const personalBest = {
    score: parseInt(localStorage.getItem('pb_score') || '0'),
    update(current) {
      if (current > this.score) {
        this.score = current;
        localStorage.setItem('pb_score', current);
        const el = document.getElementById('personalBest');
        if (el) el.textContent = current.toLocaleString();
      }
    }
  };

  const awsLabels = {
    2:'IAM', 4:'S3', 8:'EC2', 16:'RDS', 32:'SQS',
    64:'SNS', 128:'ECS', 256:'ECR', 512:'EKS',
    1024:'Lambda', 2048:'★ AWS ★', 4096:'☁️ ALL'
  };

  const milestoneColors = {
    8:'#00d4ff', 16:'#7b2fff', 32:'#e94560', 64:'#ff6b9d',
    128:'#00ff96', 256:'#ffd700', 512:'#60a5ff',
    1024:'#f5a623', 2048:'#ffffff', 4096:'#c4878f'
  };

  // ── TIMER ──
  function startTimer() {
    stopTimer();
    timerStart = Date.now();
    const el = document.getElementById('gameTimer');
    if (el) el.textContent = '00:00';
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStart) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      const tel = document.getElementById('gameTimer');
      if (tel) tel.textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerStart    = null;
  }

  // ── SPLASH ──
  function initSplash() {
    const splash = document.getElementById('themeSplash');
    if (!splash) return;
    if (settings.theme) {
      splash.style.display = 'none';
      applyTheme(settings.theme);
      initGame();
      return;
    }
    document.getElementById('selectCyber').addEventListener('click',   () => chooseTheme('cyber'));
    document.getElementById('selectGameboy').addEventListener('click', () => chooseTheme('gameboy'));
  }

  function chooseTheme(theme) {
    settings.theme = theme;
    localStorage.setItem('cfg_theme', theme);
    applyTheme(theme);
    const splash = document.getElementById('themeSplash');
    splash.classList.add('hidden');
    setTimeout(() => { splash.style.display = 'none'; initGame(); }, 800);
  }

  function applyTheme(theme) {
    document.body.classList.remove('theme-cyber', 'theme-gameboy');
    document.body.classList.add(`theme-${theme}`);
    if (achievement4096Shown) document.body.classList.add('achievement-4096');
    if (settings.awsSkin) document.body.classList.add('aws-skin-active');
  }

  function resetTheme() {
    localStorage.removeItem('cfg_theme');
    location.reload();
  }

  // ── INIT ──
  function initGame() {
    injectUI();
    document.getElementById('personalBest').textContent =
      personalBest.score.toLocaleString();
    hookGameManager();
    document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('leaderboardModal');
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
        closeLeaderboard();
    }
});
  }

  // ── UI ──
  function injectUI() {
    const container = document.querySelector('.container');
    const aboveGame = document.querySelector('.above-game');
    if (!container || !aboveGame) return;

    const controls = document.createElement('div');
    controls.className = 'custom-controls';
    controls.innerHTML = `
      <button id="ghostModeToggle" class="control-btn ${settings.ghostMode ? 'active' : ''}">👻 Ghost</button>
      <button id="awsSkinToggle"   class="control-btn ${settings.awsSkin   ? 'active' : ''}">☁️ AWS Skin</button>
      <button id="leaderboardBtn"  class="control-btn">🏆 Scores</button>
      <button id="switchThemeBtn"  class="control-btn">🎨 Theme</button>
    `;
    container.insertBefore(controls, aboveGame);

    const statsPanel = document.createElement('div');
    statsPanel.className = 'stats-panel';
    statsPanel.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Moves</span>
        <span class="stat-value" id="moveCount">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Time</span>
        <span class="stat-value" id="gameTimer">00:00</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Merged</span>
        <span class="stat-value" id="mergeCount">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Pts/Move</span>
        <span class="stat-value" id="efficiencyScore">—</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Best</span>
        <span class="stat-value" id="personalBest">0</span>
      </div>
    `;
    container.insertBefore(statsPanel, aboveGame);

    const ghostHint = document.createElement('div');
    ghostHint.id        = 'ghostHint';
    ghostHint.className = 'ghost-hint';
    ghostHint.innerHTML = `👻 Best move: <span id="ghostDirection">calculating...</span>`;
    ghostHint.style.display = settings.ghostMode ? 'block' : 'none';
    container.insertBefore(ghostHint, aboveGame);

    const vStamp = document.createElement('div');
    vStamp.className  = 'version-stamp';
    vStamp.textContent = `build: ${window.BUILD_HASH || 'local-dev'}`;
    container.appendChild(vStamp);

    document.getElementById('ghostModeToggle').addEventListener('click', toggleGhostMode);
document.getElementById('awsSkinToggle').addEventListener('click',   toggleAwsSkin);
document.getElementById('leaderboardBtn').addEventListener('click',  openLeaderboard);
document.getElementById('switchThemeBtn').addEventListener('click',  resetTheme);
document.getElementById('closeLeaderboard').addEventListener('click', closeLeaderboard);
document.getElementById('lbSubmit').addEventListener('click',        submitScore);
  }

  // ── TOGGLES ──
  function toggleGhostMode() {
    settings.ghostMode = !settings.ghostMode;
    localStorage.setItem('cfg_ghostMode', settings.ghostMode);
    const hint = document.getElementById('ghostHint');
    if (hint) hint.style.display = settings.ghostMode ? 'block' : 'none';
    document.getElementById('ghostModeToggle').classList.toggle('active', settings.ghostMode);
    if (settings.ghostMode) updateGhostHint();
  }

  function toggleAwsSkin() {
    settings.awsSkin = !settings.awsSkin;
    localStorage.setItem('cfg_awsSkin', settings.awsSkin);
    document.getElementById('awsSkinToggle').classList.toggle('active', settings.awsSkin);
    // Toggle body class for CSS colour overrides
    document.body.classList.toggle('aws-skin-active', settings.awsSkin);
    applyAwsSkinLabels();
  }

  // ── HOOK GAME MANAGER ──
  function hookGameManager() {
    const wait = setInterval(() => {
      if (!window.gameManager) return;
      clearInterval(wait);
      const gm = window.gameManager;

      startTimer();

      // ── Patch move using InputManager events ──
      // The most reliable hook: patch the actuator's actuate method
      // which is called AFTER every successful move with the new state
      const origActuate = gm.actuator.actuate.bind(gm.actuator);
      let lastScore = 0;
      let moveRegistered = false;

      gm.actuator.actuate = function(grid, metadata) {
        origActuate(grid, metadata);

        // Only count if not a game over/won screen trigger
        if (!metadata.over && !metadata.won) {
          // Count move
          stats.moves++;
          const mc = document.getElementById('moveCount');
          if (mc) mc.textContent = stats.moves;

          // Count merges via score increase
          const currentScore = metadata.score || 0;
          if (currentScore > lastScore) {
            stats.merges++;
            const mrc = document.getElementById('mergeCount');
            if (mrc) mrc.textContent = stats.merges;
          }
          lastScore = currentScore;

          // Efficiency
          if (stats.moves > 0 && currentScore > 0) {
            const ef = document.getElementById('efficiencyScore');
            if (ef) ef.textContent = Math.round(currentScore / stats.moves);
          }

          personalBest.update(currentScore);
        }

        // Stop timer on game over
        if (metadata.over) stopTimer();

        setTimeout(() => {
          scanForNewTiles();
          applyAwsSkinLabels();
          if (settings.ghostMode) updateGhostHint();
        }, 260);
      };

      // ── Patch restart ──
      const origRestart = gm.restart.bind(gm);
gm.restart = function () {
  origRestart();

  // Always do a full reset
  stats.moves  = 0;
  stats.merges = 0;
  seenTiles.clear();
  localStorage.removeItem('seenTiles');

  // Clear 4096 achievement fully
  document.body.classList.remove('achievement-4096');
  achievement4096Shown = false;
  localStorage.removeItem('achievement4096');

  // Clear theme so splash reappears
  localStorage.removeItem('cfg_theme');
  settings.theme = null;

  // Reset all stat displays
  const resets = {
    moveCount:'0', mergeCount:'0',
    efficiencyScore:'—', gameTimer:'00:00'
  };
  Object.entries(resets).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  // Reset timer
  stopTimer();

  // Show theme splash after short delay
  setTimeout(() => {
    const splash = document.getElementById('themeSplash');
    if (splash) {
      document.body.classList.remove('theme-cyber', 'theme-gameboy');
      splash.classList.remove('hidden');
      splash.style.display = 'flex';
      splash.style.opacity = '1';
    }
  }, 200);
};
    }, 100);
  }

 // ── AWS SKIN ICONS ──
  const awsIcons = {
    2: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="22" width="26" height="22" rx="3" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M11 22v-7a8 8 0 0116 0v7" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="19" cy="32" r="3.5" stroke="white" stroke-width="2" fill="none"/>
      <line x1="19" y1="35.5" x2="19" y2="40" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="36" y1="24" x2="52" y2="24" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="36" y1="31" x2="52" y2="31" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="36" y1="38" x2="48" y2="38" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,

    4: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20 L16 48 L40 48 L44 20 Z" stroke="white" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
      <ellipse cx="28" cy="20" rx="16" ry="5" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M20 15 Q28 6 36 15" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="20" cy="15" r="2.5" fill="white"/>
      <circle cx="36" cy="15" r="2.5" fill="white"/>
    </svg>`,

    8: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="12" width="26" height="26" rx="3" stroke="white" stroke-width="2" fill="none" opacity="0.55"/>
      <rect x="10" y="18" width="26" height="26" rx="3" stroke="white" stroke-width="2.5" fill="none"/>
      <rect x="15" y="23" width="16" height="16" rx="2" stroke="white" stroke-width="2" fill="none"/>
      <line x1="17" y1="14" x2="17" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="23" y1="14" x2="23" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="29" y1="14" x2="29" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="17" y1="44" x2="17" y2="48" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="23" y1="44" x2="23" y2="48" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="29" y1="44" x2="29" y2="48" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="6" y1="25" x2="10" y2="25" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="6" y1="31" x2="10" y2="31" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="6" y1="37" x2="10" y2="37" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    16: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="28" cy="22" rx="12" ry="5" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M16 22v12c0 2.8 5.4 5 12 5s12-2.2 12-5V22" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M16 28c0 2.8 5.4 5 12 5s12-2.2 12-5" stroke="white" stroke-width="1.5" fill="none" stroke-dasharray="2 2"/>
      <line x1="8" y1="18" x2="12" y2="22" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="8" y1="22" x2="12" y2="22" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="48" y1="18" x2="44" y2="22" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="48" y1="22" x2="44" y2="22" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="8" y1="38" x2="12" y2="34" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="8" y1="34" x2="12" y2="34" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="48" y1="38" x2="44" y2="34" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="48" y1="34" x2="44" y2="34" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    32: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="20" stroke="white" stroke-width="2.5" fill="none"/>
      <rect x="19" y="19" width="18" height="18" rx="3" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M8 28 L19 28" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M37 28 L48 28" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="14,25 19,28 14,31" fill="white"/>
      <polygon points="42,25 37,28 42,31" fill="white"/>
    </svg>`,

    64: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="28" r="18" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M18 22 L26 22 L22 28 L26 34 L18 34" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="40" y1="20" x2="50" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="40" y1="28" x2="50" y2="28" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="40" y1="36" x2="50" y2="36" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <circle cx="50" cy="20" r="3" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="50" cy="28" r="3" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="50" cy="36" r="3" stroke="white" stroke-width="2" fill="none"/>
      <line x1="40" y1="20" x2="34" y2="24" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="40" y1="28" x2="34" y2="28" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="40" y1="36" x2="34" y2="32" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,

    128: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="28,6 44,15 44,33 28,42 12,33 12,15" stroke="white" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
      <polygon points="28,14 38,20 38,32 28,38 18,32 18,20" stroke="white" stroke-width="2" fill="none" stroke-linejoin="round"/>
    </svg>`,

    256: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="28,6 44,15 44,33 28,42 12,33 12,15" stroke="white" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
      <polygon points="28,14 38,20 38,32 28,38 18,32 18,20" stroke="white" stroke-width="2" fill="none" stroke-linejoin="round"/>
      <path d="M28 20 L28 38 M20 24 L28 20 L36 24" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    512: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="28,6 44,15 44,33 28,42 12,33 12,15" stroke="white" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
      <polygon points="28,14 38,20 38,32 28,38 18,32 18,20" stroke="white" stroke-width="2" fill="none" stroke-linejoin="round"/>
      <text x="22" y="32" font-family="Arial Black, sans-serif" font-size="14" font-weight="900" fill="white">K</text>
    </svg>`,

    1024: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 46 L22 14 L28 28 M28 28 L34 14 L46 46" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    2048: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M38 30 H44 A12 12 0 0 0 32 10 A14 14 0 0 0 10 22 A10 10 0 0 0 14 42 H38" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M22 36 L28 46 L34 36" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 26 Q22 20 28 26 Q34 32 40 26" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,

    4096: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="20" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M28 8 C22 14 19 21 19 28 S22 42 28 48" stroke="white" stroke-width="2" fill="none"/>
      <path d="M28 8 C34 14 37 21 37 28 S34 42 28 48" stroke="white" stroke-width="2" fill="none"/>
      <line x1="8" y1="28" x2="48" y2="28" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="10" y1="19" x2="46" y2="19" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="10" y1="37" x2="46" y2="37" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  };

  function applyAwsSkinLabels() {
    document.querySelectorAll('.tile').forEach(tile => {
      tile.querySelectorAll('.aws-label, .aws-icon').forEach(l => l.remove());
      if (!settings.awsSkin) return;
      const vc = [...tile.classList].find(c => /^tile-\d+$/.test(c));
      if (!vc) return;
      const value = parseInt(vc.replace('tile-', ''));
      if (!awsLabels[value]) return;

      // Inject icon
      if (awsIcons[value]) {
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'aws-icon';
        iconWrapper.innerHTML = awsIcons[value];
        iconWrapper.querySelector('svg').style.cssText = 'width:100%;height:100%';
        tile.querySelector('.tile-inner').prepend(iconWrapper);
      }

      // Inject label
      const label = document.createElement('span');
      label.className   = 'aws-label';
      label.textContent = awsLabels[value];
      tile.querySelector('.tile-inner').appendChild(label);
    });
  }

  // ── MILESTONE ──
  function scanForNewTiles() {
    document.querySelectorAll('.tile').forEach(tile => {
      const vc = [...tile.classList].find(c => /^tile-\d+$/.test(c));
      if (!vc) return;
      const value = parseInt(vc.replace('tile-', ''));
      if (!value || seenTiles.has(value)) return;
      seenTiles.add(value);
      localStorage.setItem('seenTiles', JSON.stringify([...seenTiles]));
      onMilestone(value, tile);
      if (value === 4096 && !achievement4096Shown) {
        achievement4096Shown = true;
        localStorage.setItem('achievement4096', 'true');
        triggerAchievement4096();
      }
    });
  }

  function onMilestone(value, tileEl) {
    const color = milestoneColors[value] || '#ffffff';
    tileEl.classList.add('milestone-flash');
    setTimeout(() => tileEl.classList.remove('milestone-flash'), 600);
    const rect = tileEl.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, color);
  }

  // ── 4096 ──
  function triggerAchievement4096() {
    stopTimer();
    const overlay = document.getElementById('achievementOverlay');
    if (!overlay) return;
    overlay.classList.add('show');
    spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#c4878f', 30);
    spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#ffffff', 20);
    setTimeout(() => {
      document.body.classList.add('achievement-4096');
      overlay.classList.remove('show');
    }, 3500);
  }

  // ── PARTICLES ──
  function spawnParticles(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className         = 'particle';
      p.style.left        = `${x}px`;
      p.style.top         = `${y}px`;
      p.style.backgroundColor = color;
      const angle    = (i / count) * 360;
      const distance = 40 + Math.random() * 60;
      p.style.setProperty('--dx', `${Math.cos(angle * Math.PI / 180) * distance}px`);
      p.style.setProperty('--dy', `${Math.sin(angle * Math.PI / 180) * distance}px`);
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
  }

  // ── GHOST ──
  function updateGhostHint() {
    if (!window.gameManager) return;
    const best   = getBestMove(window.gameManager.grid);
    const arrows = { up:'⬆️', right:'➡️', down:'⬇️', left:'⬅️' };
    const el     = document.getElementById('ghostDirection');
    if (el) el.textContent = best ? `${arrows[best]} ${best.toUpperCase()}` : 'No moves';
  }

  function getBestMove(grid) {
    if (!grid || !grid.cells) return null;
    const size = grid.size;
    const dirs = [
      { name:'up',    dx:0,  dy:-1 },
      { name:'right', dx:1,  dy:0  },
      { name:'down',  dx:0,  dy:1  },
      { name:'left',  dx:-1, dy:0  }
    ];
    let bestMove = null, bestScore = -1;
    dirs.forEach(dir => {
      let score = 0, hasMove = false;
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          const tile = grid.cells[x] && grid.cells[x][y];
          if (!tile) continue;
          const nx = x + dir.dx, ny = y + dir.dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const nb = grid.cells[nx] && grid.cells[nx][ny];
          if (nb && nb.value === tile.value) { score += tile.value * 2; hasMove = true; }
          else if (!nb) { score += 1; hasMove = true; }
        }
      }
      if (hasMove && score > bestScore) { bestScore = score; bestMove = dir.name; }
    });
    return bestMove;
  }
// ============================================
  // LEADERBOARD
  // ============================================
  const API_URL = 'https://sy88ht4y16.execute-api.us-east-1.amazonaws.com/scores';

  function openLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.classList.add('open');

    // Stop ALL keyboard events from reaching the game
    const input = document.getElementById('lbUsername');
    if (input) {
        input.addEventListener('keydown', function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);
        input.addEventListener('keyup', function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);
        input.addEventListener('keypress', function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);
        setTimeout(() => input.focus(), 100);
    }

    renderLeaderboard();
}
 function closeLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.classList.remove('open');

    // Re-enable game keyboard listener
    if (window.gameManager && window.gameManager.inputManager) {
        window.gameManager.inputManager.listen = true;
    }
}
async function submitScore() {
    const nameInput    = document.getElementById('lbUsername');
    const countryInput = document.getElementById('lbCountry');
    const name         = nameInput    ? nameInput.value.trim()    : '';
    const country      = countryInput ? countryInput.value.trim() : '🌍';

    // Highlight input if name is empty
    if (!name) {
        if (nameInput) {
            nameInput.style.borderColor = 'rgba(255,50,50,0.8)';
            nameInput.placeholder = 'Enter your name!';
            nameInput.focus();
            setTimeout(() => {
                nameInput.style.borderColor = '';
                nameInput.placeholder = 'Your name';
            }, 2000);
        }
        return;
    }

    const score = window.gameManager ? window.gameManager.score : 0;

    const btn = document.getElementById('lbSubmit');
    if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

    const list = document.getElementById('leaderboardList');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, score, country })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        if (nameInput)    nameInput.value    = '';
        if (countryInput) countryInput.value = '';

        await renderLeaderboard();

    } catch (err) {
        console.error('Submit error:', err);
        if (list) list.innerHTML = `<div class="lb-loading">Error: ${err.message} — Check F12 console</div>`;
    } finally {
        if (btn) { btn.textContent = 'Submit'; btn.disabled = false; }
    }
}
  async function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    list.innerHTML = `<div class="lb-loading">Loading...</div>`;

    try {
        const res = await fetch(API_URL + '?t=' + Date.now()); // bust cache
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const scores = await res.json();
        const medals    = ['🥇','🥈','🥉'];
        const rankClass = ['lb-gold','lb-silver','lb-bronze'];

        if (!scores || !scores.length) {
            list.innerHTML = `<div class="lb-loading">No scores yet — be first!</div>`;
            return;
        }

        list.innerHTML = scores.map((s, i) => `
            <div class="lb-entry ${rankClass[i] || ''}">
                <span class="lb-rank">${medals[i] || `#${i+1}`}</span>
                <span class="lb-flag">${s.country || '🌍'}</span>
                <span class="lb-name">${s.name || 'Unknown'}</span>
                <span class="lb-score">${Number(s.score || 0).toLocaleString()}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Leaderboard fetch error:', err);
        list.innerHTML = `<div class="lb-loading">Could not load scores — ${err.message}</div>`;
    }
}
  // ── BOOT ──
  document.addEventListener('DOMContentLoaded', initSplash);

})();