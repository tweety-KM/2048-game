// ============================================
// 2048 — Custom Features & Themes
// github.com/tweety-KM/2048-game
// ============================================

(function () {

  // ============================================
  // STATE
  // ============================================
  const settings = {
    theme:     localStorage.getItem('cfg_theme')    || null,
    darkMode:  JSON.parse(localStorage.getItem('cfg_darkMode')  || 'false'),
    ghostMode: JSON.parse(localStorage.getItem('cfg_ghostMode') || 'false'),
    awsSkin:   JSON.parse(localStorage.getItem('cfg_awsSkin')   || 'false')
  };

  let stats = { moves: 0, merges: 0, startTime: Date.now() };
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

  // AWS labels per tile value
  const awsLabels = {
    2:'IAM', 4:'S3', 8:'EC2', 16:'RDS', 32:'SQS',
    64:'SNS', 128:'ECS', 256:'ECR', 512:'EKS',
    1024:'Lambda', 2048:'★ AWS ★', 4096:'☁️ ALL'
  };

  // Milestone particle colours per tile value
  const milestoneColors = {
    8:'#00d4ff', 16:'#7b2fff', 32:'#e94560', 64:'#ff6b9d',
    128:'#00ff96', 256:'#ffd700', 512:'#60a5ff', 1024:'#f5a623',
    2048:'#ffffff', 4096:'#c4878f'
  };

  // ============================================
  // THEME SPLASH
  // ============================================
  function initSplash() {
    const splash = document.getElementById('themeSplash');
    if (!splash) return;

    // If theme already chosen, skip splash
    if (settings.theme) {
      splash.style.display = 'none';
      applyTheme(settings.theme);
      initGame();
      return;
    }

    document.getElementById('selectCyber').addEventListener('click', () => {
      choosetheme('cyber');
    });
    document.getElementById('selectGameboy').addEventListener('click', () => {
      choosetheme('gameboy');
    });
  }

  function choosetheme(theme) {
    settings.theme = theme;
    localStorage.setItem('cfg_theme', theme);
    applyTheme(theme);

    const splash = document.getElementById('themeSplash');
    splash.classList.add('hidden');
    setTimeout(() => {
      splash.style.display = 'none';
      initGame();
    }, 800);
  }

  function applyTheme(theme) {
    document.body.classList.remove('theme-cyber', 'theme-gameboy');
    document.body.classList.add(`theme-${theme}`);
    // Re-apply 4096 if already achieved
    if (achievement4096Shown) {
      document.body.classList.add('achievement-4096');
    }
  }

  // ============================================
  // GAME INIT (runs after theme selected)
  // ============================================
  function initGame() {
    injectUI();
    startTimer();
    document.getElementById('personalBest').textContent =
      personalBest.score.toLocaleString();
    hookGameManager();
  }

  // ============================================
  // INJECT UI
  // ============================================
  function injectUI() {
    const container = document.querySelector('.container');
    const aboveGame = document.querySelector('.above-game');
    if (!container || !aboveGame) return;

    // Buttons
    const controls = document.createElement('div');
    controls.className = 'custom-controls';
    controls.innerHTML = `
      <button id="ghostModeToggle" class="control-btn ${settings.ghostMode ? 'active' : ''}">👻 Ghost</button>
      <button id="awsSkinToggle"   class="control-btn ${settings.awsSkin   ? 'active' : ''}">☁️ AWS Skin</button>
      <button id="switchThemeBtn"  class="control-btn">🎨 Change Theme</button>
    `;
    container.insertBefore(controls, aboveGame);

    // Stats
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

    // Ghost hint
    const ghostHint = document.createElement('div');
    ghostHint.id = 'ghostHint';
    ghostHint.className = 'ghost-hint';
    ghostHint.innerHTML = `👻 Best move: <span id="ghostDirection">calculating...</span>`;
    ghostHint.style.display = settings.ghostMode ? 'block' : 'none';
    container.insertBefore(ghostHint, aboveGame);

    // Version stamp
    const vStamp = document.createElement('div');
    vStamp.className = 'version-stamp';
    vStamp.id = 'versionStamp';
    vStamp.textContent = `build: ${window.BUILD_HASH || 'local-dev'}`;
    container.appendChild(vStamp);

    // Wire buttons
    document.getElementById('ghostModeToggle').addEventListener('click', toggleGhostMode);
    document.getElementById('awsSkinToggle').addEventListener('click',   toggleAwsSkin);
    document.getElementById('switchThemeBtn').addEventListener('click',  resetTheme);
  }

  // ============================================
  // TOGGLE FUNCTIONS
  // ============================================
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
    applyAwsSkin();
  }

  function resetTheme() {
    localStorage.removeItem('cfg_theme');
    location.reload();
  }

  // ============================================
  // TIMER
  // ============================================
  let timerInterval = null;

  function startTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      const el = document.getElementById('gameTimer');
      if (el) el.textContent = `${m}:${s}`;
    }, 1000);

    // Immediately update timer display
    const gt = document.getElementById('gameTimer');
    if (gt) gt.textContent = '00:00';
  }

  function resetStats() {
    stats = { moves: 0, merges: 0, startTime: Date.now() };
    seenTiles.clear();
    localStorage.removeItem('seenTiles');
    ['moveCount','mergeCount','efficiencyScore'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = id === 'efficiencyScore' ? '—' : '0';
    });
    const gt = document.getElementById('gameTimer');
    if (gt) gt.textContent = '00:00';
    // Remove 4096 achievement on new game
    document.body.classList.remove('achievement-4096');
    achievement4096Shown = false;
    localStorage.removeItem('achievement4096');
  }

 // ============================================
  // HOOK INTO GAME MANAGER
  // ============================================
  function hookGameManager() {
    const wait = setInterval(() => {
      if (!window.gameManager) return;
      clearInterval(wait);
      const gm = window.gameManager;

      // Wrap move
      const origMove = gm.move.bind(gm);
      gm.move = function (direction) {
        const scoreBefore = gm.score;
        origMove(direction);
        stats.moves++;

        const mc = document.getElementById('moveCount');
        if (mc) mc.textContent = stats.moves;

        // Count merges by score increase
        const scoreIncrease = gm.score - scoreBefore;
        if (scoreIncrease > 0) {
          stats.merges++;
          const mrc = document.getElementById('mergeCount');
          if (mrc) mrc.textContent = stats.merges;
        }

        if (gm.score > 0 && stats.moves > 0) {
          const ef = document.getElementById('efficiencyScore');
          if (ef) ef.textContent = Math.round(gm.score / stats.moves);
        }

        personalBest.update(gm.score);

        setTimeout(() => {
          scanForNewTiles();
          if (settings.awsSkin)   applyAwsSkin();
          if (settings.ghostMode) updateGhostHint();
        }, 260);
      };

      // Wrap restart — full reset including timer
      const origRestart = gm.restart.bind(gm);
      gm.restart = function () {
        origRestart();
        stats.moves   = 0;
        stats.merges  = 0;
        stats.startTime = Date.now();
        seenTiles.clear();
        localStorage.removeItem('seenTiles');
        document.body.classList.remove('achievement-4096');
        achievement4096Shown = false;
        localStorage.removeItem('achievement4096');

        ['moveCount','mergeCount'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = '0';
        });
        const ef = document.getElementById('efficiencyScore');
        if (ef) ef.textContent = '—';
        const gt = document.getElementById('gameTimer');
        if (gt) gt.textContent = '00:00';

        setTimeout(() => {
          if (settings.awsSkin)   applyAwsSkin();
          if (settings.ghostMode) updateGhostHint();
        }, 300);
      };

      setTimeout(() => {
        if (settings.ghostMode) updateGhostHint();
        if (settings.awsSkin)   applyAwsSkin();
        if (achievement4096Shown) document.body.classList.add('achievement-4096');
      }, 400);
    }, 100);
  }