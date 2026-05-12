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
    document.getElementById('switchThemeBtn').addEventListener('click',  resetTheme);
    document.getElementById('leaderboardBtn').addEventListener('click',  submitScore);
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
    resetStats();
    startTimer();

    // If 4096 was achieved, show theme selector again
    if (!settings.theme) {
        const splash = document.getElementById('themeSplash');
        if (splash) {
            splash.classList.remove('hidden');
            splash.style.display = 'flex';
        }
        return;
    }

    setTimeout(() => {
        applyAwsSkinLabels();
        if (settings.ghostMode) updateGhostHint();
    }, 300);
};
      // Initial apply
      setTimeout(() => {
        applyAwsSkinLabels();
        if (settings.ghostMode) updateGhostHint();
        if (settings.awsSkin) document.body.classList.add('aws-skin-active');
        if (achievement4096Shown) document.body.classList.add('achievement-4096');
      }, 400);

    }, 100);
  }

 function resetStats() {
    stats.moves  = 0;
    stats.merges = 0;
    seenTiles.clear();
    localStorage.removeItem('seenTiles');

    // Full reset including 4096 achievement and theme
    document.body.classList.remove('achievement-4096');
    achievement4096Shown = false;
    localStorage.removeItem('achievement4096');

    // Reset theme back to splash selector
    localStorage.removeItem('cfg_theme');
    settings.theme = null;

    const resets = {
        moveCount:'0', mergeCount:'0',
        efficiencyScore:'—', gameTimer:'00:00'
    };
    Object.entries(resets).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
}

  // ── AWS SKIN LABELS ──
  function applyAwsSkinLabels() {
    document.querySelectorAll('.tile').forEach(tile => {
      tile.querySelectorAll('.aws-label').forEach(l => l.remove());
      if (!settings.awsSkin) return;
      const vc = [...tile.classList].find(c => /^tile-\d+$/.test(c));
      if (!vc) return;
      const value = parseInt(vc.replace('tile-', ''));
      if (!awsLabels[value]) return;
      const label = document.createElement('span');
      label.className   = 'aws-label';
      label.textContent = awsLabels[value];
      tile.appendChild(label);
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
    renderLeaderboard();
  }

  function closeLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.classList.remove('open');
  }

  async function submitScore() {
    const nameInput    = document.getElementById('lbUsername');
    const countryInput = document.getElementById('lbCountry');
    const name         = nameInput    ? nameInput.value.trim()    : '';
    const country      = countryInput ? countryInput.value.trim() : '🌍';

    if (!name) {
      nameInput.focus();
      nameInput.placeholder = 'Enter name first!';
      setTimeout(() => { nameInput.placeholder = 'Your name'; }, 2000);
      return;
    }

    const score = window.gameManager ? window.gameManager.score : 0;
    if (score === 0) {
      const list = document.getElementById('leaderboardList');
      if (list) list.innerHTML = `<div class="lb-loading">Play a game first to submit a score!</div>`;
      return;
    }

    const btn = document.getElementById('lbSubmit');
    if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score, country })
      });
      if (nameInput)    nameInput.value    = '';
      if (countryInput) countryInput.value = '';
      await renderLeaderboard();
    } catch (err) {
      console.error('Submit error:', err);
      const list = document.getElementById('leaderboardList');
      if (list) list.innerHTML = `<div class="lb-loading">Could not save. Check connection.</div>`;
    } finally {
      if (btn) { btn.textContent = 'Submit'; btn.disabled = false; }
    }
  }

  async function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    list.innerHTML = `<div class="lb-loading">Loading...</div>`;

    try {
      const res    = await fetch(API_URL);
      const scores = await res.json();
      const medals     = ['🥇','🥈','🥉'];
      const rankClass  = ['lb-gold','lb-silver','lb-bronze'];

      if (!scores || !scores.length) {
        list.innerHTML = `<div class="lb-loading">No scores yet — be first!</div>`;
        return;
      }

      list.innerHTML = scores.map((s, i) => `
        <div class="lb-entry ${rankClass[i] || ''}">
          <span class="lb-rank">${medals[i] || `#${i+1}`}</span>
          <span class="lb-flag">${s.country || '🌍'}</span>
          <span class="lb-name">${s.name}</span>
          <span class="lb-score">${Number(s.score).toLocaleString()}</span>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<div class="lb-loading">Could not load scores.</div>`;
    }
  }
  // ── BOOT ──
  document.addEventListener('DOMContentLoaded', initSplash);

})();