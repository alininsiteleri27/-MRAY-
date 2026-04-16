/* ═══════════════════════════════════════════════════════════════════
   ArcadeVault — game.js
   ═══════════════════════════════════════════════════════════════════ */

"use strict";

/* ── STATE ─────────────────────────────────────────────────────── */
let state = {
  user: null,
  coins: 0,
  spentCoins: 0,
  library: [],
  sfx: true,
  music: false,
  particles: true,
  dark: true,
  volume: 0.7,
  joinDate: null,
};

/* ── PERSISTENCE ────────────────────────────────────────────────── */
function saveState() {
  localStorage.setItem('av_state', JSON.stringify(state));
}
function loadState() {
  const raw = localStorage.getItem('av_state');
  if (raw) {
    try { Object.assign(state, JSON.parse(raw)); } catch(e) {}
  }
}

/* ── USERS DB (localStorage) ───────────────────────────────────── */
function getUsers() {
  try { return JSON.parse(localStorage.getItem('av_users') || '{}'); } catch { return {}; }
}
function saveUsers(u) { localStorage.setItem('av_users', JSON.stringify(u)); }

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  spawnStars('authStars', 80);
  setupAuthTabs();
  applyTheme();
  applySettings();
  if (state.user) {
    goToMenu();
  } else {
    showScreen('screen-auth');
  }
});

/* ── SCREENS ────────────────────────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ═══════════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════════ */
function setupAuthTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('form-' + tab.dataset.tab).classList.add('active');
      setAuthMsg('');
    });
  });
}

function setAuthMsg(msg, isError = true) {
  const el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.style.color = isError ? 'var(--neon-pink)' : 'var(--neon-green)';
}

function register() {
  const email    = document.getElementById('reg-email').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!email || !username || !password) return setAuthMsg('Tüm alanları doldur!');
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return setAuthMsg('Geçerli bir e-posta gir!');
  if (username.length < 3) return setAuthMsg('Kullanıcı adı en az 3 karakter!');
  if (password.length < 4) return setAuthMsg('Şifre en az 4 karakter!');

  const users = getUsers();
  if (users[username]) return setAuthMsg('Bu kullanıcı adı zaten alınmış!');
  if (Object.values(users).some(u => u.email === email)) return setAuthMsg('Bu e-posta zaten kayıtlı!');

  users[username] = { email, password, joinDate: new Date().toLocaleDateString('tr-TR') };
  saveUsers(users);

  state.user     = { username, email };
  state.coins    = 50;
  state.spentCoins = 0;
  state.library  = [];
  state.joinDate = users[username].joinDate;
  saveState();
  playSound('success');
  setAuthMsg('Kayıt başarılı! Hoşgeldin 🎉', false);
  setTimeout(goToMenu, 900);
}

function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) return setAuthMsg('Tüm alanları doldur!');

  const users = getUsers();
  if (!users[username]) return setAuthMsg('Kullanıcı bulunamadı!');
  if (users[username].password !== password) return setAuthMsg('Yanlış şifre!');

  state.user     = { username, email: users[username].email };
  state.joinDate = users[username].joinDate;
  if (!state.coins) state.coins = 0;
  saveState();
  playSound('success');
  goToMenu();
}

function logout() {
  saveState();
  state.user = null;
  closeAllPanels();
  showScreen('screen-auth');
  spawnStars('authStars', 80);
}

/* ═══════════════════════════════════════════════════════════════
   MENU
═══════════════════════════════════════════════════════════════ */
function goToMenu() {
  showScreen('screen-menu');
  updateCoinDisplay();
  updateTopbarUser();
  spawnStars('menuStars', 120);
  spawnOrbitCoins();
  startCharacterLoop();
  applySettings();
}

function updateCoinDisplay() {
  const el = document.getElementById('coinDisplay');
  if (!el) return;
  el.textContent = state.coins.toLocaleString('tr-TR');
  el.style.animation = 'none';
  requestAnimationFrame(() => { el.style.animation = ''; });
}

function updateTopbarUser() {
  const username = state.user?.username || '?';
  document.getElementById('topbar-username').textContent = username;
  const initial = username[0].toUpperCase();
  document.getElementById('avatarMini').textContent = initial;
  document.getElementById('profileAvatarBig').textContent = initial;
}

/* Character speech loop */
const speeches = [
  'Bugün ne oynamak istersin? 🎮',
  'Flappy Bird\'de yeni rekor kır! 🐦',
  'Glow Hockey\'de kazanmak kolay... değil 😅',
  `Birikimin: ${() => state.coins} puan 🪙`,
  'Yeni oyunlar seni bekliyor! 🚀',
  'Oyna, kazan, büyü! ⚡',
  'Epic Quest çok yakında... 👀',
];
let speechIdx = 0;
function startCharacterLoop() {
  const el = document.getElementById('charSpeechText');
  const screenEl = document.getElementById('charScreenText');
  if (!el || !screenEl) return;
  const msgs = [
    'Bugün ne oynamak istersin? 🎮',
    `Birikimin: ${state.coins} puan 🪙`,
    'Flappy Bird\'de rekor kır! 🐦',
    'Hockey\'de gol at! 🏒',
    'Premium oyunlar seni bekliyor! 🚀',
    'Oyna, kazan, büyü! ⚡',
  ];
  const screenMsgs = ['HI!', 'PLAY', 'WIN!', ':)', '🪙', 'GG!'];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % msgs.length;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = msgs[i].replace('${state.coins}', state.coins);
      el.style.opacity = '1';
      el.style.transition = 'opacity 0.5s';
    }, 300);
    screenEl.textContent = screenMsgs[i % screenMsgs.length];
  }, 4000);
}

/* Orbit coins */
function spawnOrbitCoins() {
  const orbit = document.getElementById('coinOrbit');
  if (!orbit) return;
  orbit.innerHTML = '';
  const count = 4;
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    coin.className = 'orbit-coin';
    coin.textContent = '🪙';
    const angle = (i / count) * 360;
    const rad = (angle * Math.PI) / 180;
    const r = 62;
    coin.style.left = (50 + r * Math.cos(rad) - 11) + 'px';
    coin.style.top  = (50 + r * Math.sin(rad) - 11) + 'px';
    orbit.appendChild(coin);
  }
}

/* Stars */
function spawnStars(containerId, count) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!state.particles) return;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      animation-duration:${Math.random()*3+2}s;
      animation-delay:${Math.random()*4}s;
    `;
    container.appendChild(star);
  }
}

/* ═══════════════════════════════════════════════════════════════
   PANELS
═══════════════════════════════════════════════════════════════ */
function openProfile() {
  updateProfilePanel();
  document.getElementById('panel-profile').classList.add('open');
  document.getElementById('overlay').classList.add('active');
}
function openSettings() {
  syncSettingsUI();
  document.getElementById('panel-settings').classList.add('open', 'right');
  document.getElementById('overlay').classList.add('active');
}
function closePanel(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
}
function closeAllPanels() {
  document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('open'));
  document.getElementById('overlay').classList.remove('active');
}

function updateProfilePanel() {
  const u = state.user;
  if (!u) return;
  document.getElementById('pi-username').textContent = u.username;
  document.getElementById('pi-email').textContent = u.email;
  document.getElementById('pi-coins').textContent = state.coins + ' 🪙';
  document.getElementById('pi-spent').textContent = (state.spentCoins || 0) + ' 🪙';
  document.getElementById('pi-games').textContent = (state.library || []).length;
  document.getElementById('pi-date').textContent = state.joinDate || '—';
  document.getElementById('profileAvatarBig').textContent = u.username[0].toUpperCase();

  const libEl = document.getElementById('libraryList');
  if (!state.library || state.library.length === 0) {
    libEl.innerHTML = '<p class="empty-lib">Henüz oyun satın almadın.</p>';
  } else {
    libEl.innerHTML = state.library.map(g =>
      `<div class="library-item">✅ ${g}</div>`
    ).join('');
  }
}

function syncSettingsUI() {
  document.getElementById('darkModeToggle').checked  = state.dark;
  document.getElementById('sfxToggle').checked       = state.sfx;
  document.getElementById('musicToggle').checked     = state.music;
  document.getElementById('particlesToggle').checked = state.particles;
  document.getElementById('volumeSlider').value      = Math.round(state.volume * 100);
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS ACTIONS
═══════════════════════════════════════════════════════════════ */
function toggleDarkMode() {
  state.dark = document.getElementById('darkModeToggle').checked;
  applyTheme();
  saveState();
  showToast(state.dark ? '🌙 Dark mode açık' : '☀️ Light mode açık');
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.dark ? 'dark' : 'light');
}

function toggleSFX() {
  state.sfx = document.getElementById('sfxToggle').checked;
  saveState();
  showToast(state.sfx ? '🔊 Ses efektleri açık' : '🔇 Ses efektleri kapalı');
}
function toggleMusic() {
  state.music = document.getElementById('musicToggle').checked;
  saveState();
  showToast(state.music ? '🎵 Müzik açık' : '🎵 Müzik kapalı');
}
function setVolume(v) {
  state.volume = v / 100;
  saveState();
}
function toggleParticles() {
  state.particles = document.getElementById('particlesToggle').checked;
  saveState();
  spawnStars('menuStars', 120);
  showToast(state.particles ? '✨ Parçacıklar açık' : '✨ Parçacıklar kapalı');
}
function applySettings() {
  applyTheme();
}

/* ═══════════════════════════════════════════════════════════════
   COINS & SHOP
═══════════════════════════════════════════════════════════════ */
function addCoins(amount, x, y) {
  state.coins += amount;
  saveState();
  updateCoinDisplay();
  if (x && y) burstCoins(x, y, amount);
  showToast(`+${amount} 🪙 puan kazandın!`);
}

function buyGame(name, price, cardId) {
  if ((state.library || []).includes(name)) {
    showToast('Bu oyun zaten kütüphanende!'); return;
  }
  if (state.coins < price) {
    showToast(`⚠️ Yeterli puan yok! Gerekli: ${price} 🪙`); return;
  }
  state.coins    -= price;
  state.spentCoins = (state.spentCoins || 0) + price;
  state.library  = [...(state.library || []), name];
  saveState();
  updateCoinDisplay();

  const card = document.getElementById(cardId);
  if (card) {
    card.classList.add('owned');
    const btn = card.querySelector('.shop-btn');
    if (btn) { btn.textContent = '✅ Sahipsin'; btn.disabled = true; }
  }
  playSound('buy');
  burstCoins(window.innerWidth / 2, window.innerHeight / 2, 0);
  showToast(`🎉 "${name}" satın alındı!`);
}

/* ═══════════════════════════════════════════════════════════════
   GAMES
═══════════════════════════════════════════════════════════════ */
function openGame(type) {
  if (type === 'flappy') {
    showScreen('screen-flappy');
    initFlappy();
  } else if (type === 'hockey') {
    showScreen('screen-hockey');
    initHockey();
  }
}
function closeGame(type) {
  if (type === 'flappy') stopFlappy();
  if (type === 'hockey') stopHockey();
  goToMenu();
}

/* ═══════════════════════════════════════════════════════════════
   FLAPPY BIRD
═══════════════════════════════════════════════════════════════ */
let flappy = {
  canvas: null, ctx: null,
  animId: null, running: false,
  bird: { x: 80, y: 200, vy: 0, radius: 14 },
  pipes: [],
  score: 0, coinsEarned: 0,
  gravity: 0.42, jumpForce: -8.5,
  pipeGap: 145, pipeWidth: 52,
  pipeSpeed: 2.4, pipeInterval: 120,
  frameCount: 0,
  bgX: 0,
};

function initFlappy() {
  const canvas = document.getElementById('flappy-canvas');
  const area   = document.getElementById('flappy-area');
  canvas.width  = Math.min(area.clientWidth, 480);
  canvas.height = area.clientHeight || 520;
  flappy.canvas = canvas;
  flappy.ctx    = canvas.getContext('2d');
  resetFlappy();
  document.getElementById('flappy-overlay').style.display = 'flex';
  document.getElementById('flappy-gameover').style.display = 'none';

  // Input
  canvas._flappyHandler = (e) => { e.preventDefault(); if (flappy.running) jump(); };
  canvas.addEventListener('pointerdown', canvas._flappyHandler);
  document.addEventListener('keydown', flappy._keyHandler = (e) => {
    if (e.code === 'Space' && flappy.running) { e.preventDefault(); jump(); }
  });
}

function resetFlappy() {
  const c = flappy.canvas;
  flappy.bird     = { x: 80, y: c.height / 2, vy: 0, radius: 14 };
  flappy.pipes    = [];
  flappy.score    = 0;
  flappy.coinsEarned = 0;
  flappy.frameCount  = 0;
  flappy.bgX = 0;
  document.getElementById('flappy-score').textContent = 0;
  document.getElementById('flappy-coins-earned').textContent = 0;
}

function startFlappy() {
  resetFlappy();
  document.getElementById('flappy-overlay').style.display = 'none';
  document.getElementById('flappy-gameover').style.display = 'none';
  flappy.running = true;
  if (flappy.animId) cancelAnimationFrame(flappy.animId);
  flappyLoop();
}

function stopFlappy() {
  flappy.running = false;
  if (flappy.animId) cancelAnimationFrame(flappy.animId);
  if (flappy.canvas) {
    flappy.canvas.removeEventListener('pointerdown', flappy.canvas._flappyHandler);
  }
  document.removeEventListener('keydown', flappy._keyHandler);
}

function jump() {
  flappy.bird.vy = flappy.jumpForce;
  playSound('jump');
}

function flappyLoop() {
  if (!flappy.running) return;
  flappy.animId = requestAnimationFrame(flappyLoop);
  updateFlappy();
  drawFlappy();
}

function updateFlappy() {
  const b = flappy.bird;
  const c = flappy.canvas;
  flappy.frameCount++;
  flappy.bgX = (flappy.bgX - 0.5) % c.width;

  // Bird physics
  b.vy += flappy.gravity;
  b.y  += b.vy;

  // Ground / ceiling
  if (b.y + b.radius > c.height - 30 || b.y - b.radius < 0) {
    gameOverFlappy(); return;
  }

  // Spawn pipes
  if (flappy.frameCount % flappy.pipeInterval === 0) {
    const minY = 60;
    const maxY = c.height - flappy.pipeGap - 60;
    const gapY = Math.random() * (maxY - minY) + minY;
    flappy.pipes.push({ x: c.width + 10, gapY, passed: false });
  }

  // Move & check pipes
  for (let i = flappy.pipes.length - 1; i >= 0; i--) {
    const p = flappy.pipes[i];
    p.x -= flappy.pipeSpeed;

    // Score
    if (!p.passed && p.x + flappy.pipeWidth < b.x) {
      p.passed = true;
      flappy.score++;
      flappy.coinsEarned += 5;
      addCoins(5);
      playSound('score');
      document.getElementById('flappy-score').textContent  = flappy.score;
      document.getElementById('flappy-coins-earned').textContent = flappy.coinsEarned;
    }

    // Collision
    const inX = b.x + b.radius > p.x && b.x - b.radius < p.x + flappy.pipeWidth;
    const inTop = b.y - b.radius < p.gapY;
    const inBot = b.y + b.radius > p.gapY + flappy.pipeGap;
    if (inX && (inTop || inBot)) { gameOverFlappy(); return; }

    if (p.x + flappy.pipeWidth < 0) flappy.pipes.splice(i, 1);
  }
}

function drawFlappy() {
  const ctx = flappy.ctx;
  const c   = flappy.canvas;
  const b   = flappy.bird;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, c.height);
  sky.addColorStop(0, '#87ceeb');
  sky.addColorStop(0.7, '#6ab4e8');
  sky.addColorStop(1, '#4a8cc4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, c.width, c.height);

  // Clouds (simple)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  drawCloud(ctx, (flappy.bgX * 0.3 + 80) % (c.width + 80) - 40, 60, 60, 30);
  drawCloud(ctx, (flappy.bgX * 0.2 + 250) % (c.width + 100) - 50, 100, 80, 35);
  drawCloud(ctx, (flappy.bgX * 0.15 + 420) % (c.width + 90) - 45, 45, 70, 28);

  // Pipes
  flappy.pipes.forEach(p => {
    // Top pipe
    const tGrad = ctx.createLinearGradient(p.x, 0, p.x + flappy.pipeWidth, 0);
    tGrad.addColorStop(0, '#2d8a2d');
    tGrad.addColorStop(0.4, '#4db84d');
    tGrad.addColorStop(1, '#1a5c1a');
    ctx.fillStyle = tGrad;
    ctx.fillRect(p.x, 0, flappy.pipeWidth, p.gapY);
    // Cap
    ctx.fillStyle = '#3da03d';
    ctx.fillRect(p.x - 4, p.gapY - 20, flappy.pipeWidth + 8, 20);
    ctx.strokeStyle = '#1a5c1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 4, p.gapY - 20, flappy.pipeWidth + 8, 20);

    // Bottom pipe
    ctx.fillStyle = tGrad;
    ctx.fillRect(p.x, p.gapY + flappy.pipeGap, flappy.pipeWidth, c.height);
    ctx.fillStyle = '#3da03d';
    ctx.fillRect(p.x - 4, p.gapY + flappy.pipeGap, flappy.pipeWidth + 8, 20);
    ctx.strokeStyle = '#1a5c1a';
    ctx.strokeRect(p.x - 4, p.gapY + flappy.pipeGap, flappy.pipeWidth + 8, 20);
  });

  // Ground
  ctx.fillStyle = '#5a8a3a';
  ctx.fillRect(0, c.height - 30, c.width, 30);
  ctx.fillStyle = '#7ab05a';
  ctx.fillRect(0, c.height - 30, c.width, 8);

  // Bird body
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.min(Math.max(b.vy * 0.05, -0.5), 0.9));

  // Body
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.ellipse(0, 0, b.radius + 2, b.radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e0a800';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wing
  ctx.fillStyle = '#ff9900';
  ctx.beginPath();
  ctx.ellipse(-4, 4, 10, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(6, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(7, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(8, -5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.moveTo(b.radius, 0);
  ctx.lineTo(b.radius + 10, -3);
  ctx.lineTo(b.radius + 10, 3);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Score HUD
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(c.width / 2 - 50, 12, 100, 36);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(flappy.score, c.width / 2, 38);
  ctx.textAlign = 'start';
}

function drawCloud(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.arc(x, y, h * 0.8, 0, Math.PI * 2);
  ctx.arc(x + w * 0.3, y - h * 0.2, h, 0, Math.PI * 2);
  ctx.arc(x + w * 0.7, y, h * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function gameOverFlappy() {
  flappy.running = false;
  playSound('die');
  document.getElementById('flappy-final-score').textContent = flappy.score;
  document.getElementById('flappy-final-coins').textContent = flappy.coinsEarned;
  document.getElementById('flappy-gameover').style.display = 'flex';
}

/* ═══════════════════════════════════════════════════════════════
   GLOW HOCKEY
═══════════════════════════════════════════════════════════════ */
let hockey = {
  canvas: null, ctx: null,
  animId: null, running: false,
  ball: { x: 300, y: 250, vx: 4, vy: 3, radius: 12 },
  player: { x: 300, y: 430, radius: 36 },
  ai:     { x: 300, y: 70,  radius: 36 },
  scoreP: 0, scoreAI: 0, coinsEarned: 0,
  maxScore: 5,
  targetX: 300,
};

function initHockey() {
  const canvas = document.getElementById('hockey-canvas');
  const area   = document.getElementById('hockey-area');
  canvas.width  = Math.min(area.clientWidth, 480);
  canvas.height = area.clientHeight || 520;
  hockey.canvas = canvas;
  hockey.ctx    = canvas.getContext('2d');
  resetHockey();
  document.getElementById('hockey-overlay').style.display = 'flex';
  document.getElementById('hockey-gameover').style.display = 'none';

  // Mouse/touch tracking
  const rect = () => canvas.getBoundingClientRect();
  canvas._hMove = (e) => {
    if (!hockey.running) return;
    const r = rect();
    let cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    cx = Math.max(hockey.player.radius, Math.min(canvas.width - hockey.player.radius, cx));
    hockey.player.x = cx;
  };
  canvas.addEventListener('mousemove', canvas._hMove);
  canvas.addEventListener('touchmove', canvas._hMove, { passive: true });
}

function resetHockey() {
  const c = hockey.canvas;
  hockey.ball   = { x: c.width / 2, y: c.height / 2, vx: (Math.random() > 0.5 ? 1 : -1) * 4, vy: 3.5, radius: 12 };
  hockey.player = { x: c.width / 2, y: c.height - 70, radius: 36 };
  hockey.ai     = { x: c.width / 2, y: 70,            radius: 36 };
  hockey.scoreP = 0; hockey.scoreAI = 0; hockey.coinsEarned = 0;
  updateHockeyScoreDisplay();
}

function startHockey() {
  resetHockey();
  document.getElementById('hockey-overlay').style.display = 'none';
  document.getElementById('hockey-gameover').style.display = 'none';
  hockey.running = true;
  if (hockey.animId) cancelAnimationFrame(hockey.animId);
  hockeyLoop();
}

function stopHockey() {
  hockey.running = false;
  if (hockey.animId) cancelAnimationFrame(hockey.animId);
  if (hockey.canvas) {
    hockey.canvas.removeEventListener('mousemove', hockey.canvas._hMove);
    hockey.canvas.removeEventListener('touchmove', hockey.canvas._hMove);
  }
}

function hockeyLoop() {
  if (!hockey.running) return;
  hockey.animId = requestAnimationFrame(hockeyLoop);
  updateHockey();
  drawHockey();
}

function updateHockey() {
  const c = hockey.canvas;
  const b = hockey.ball;
  const p = hockey.player;
  const ai = hockey.ai;

  // Ball move
  b.x += b.vx;
  b.y += b.vy;

  // Wall bounce
  if (b.x - b.radius < 0)         { b.x = b.radius;            b.vx = Math.abs(b.vx); }
  if (b.x + b.radius > c.width)   { b.x = c.width - b.radius;  b.vx = -Math.abs(b.vx); }

  // Goals
  if (b.y - b.radius < 0) {
    // Player scores!
    hockey.scoreP++;
    hockey.coinsEarned += 10;
    addCoins(10);
    playSound('goal');
    document.getElementById('hockey-coins-earned').textContent = hockey.coinsEarned;
    updateHockeyScoreDisplay();
    if (hockey.scoreP >= hockey.maxScore) { gameOverHockey(true); return; }
    resetBall(1);
  }
  if (b.y + b.radius > c.height) {
    // AI scores
    hockey.scoreAI++;
    playSound('die');
    updateHockeyScoreDisplay();
    if (hockey.scoreAI >= hockey.maxScore) { gameOverHockey(false); return; }
    resetBall(-1);
  }

  // Paddle collisions
  collidePaddle(b, p);
  collidePaddle(b, ai);

  // AI movement (adaptive)
  const aiSpeed = 2.8 + hockey.scoreAI * 0.2;
  if (b.vy < 0) {
    // Ball coming toward AI
    ai.x += (b.x - ai.x) * 0.06;
  } else {
    // Return to center
    ai.x += (c.width / 2 - ai.x) * 0.04;
  }
  ai.x = Math.max(ai.radius, Math.min(c.width - ai.radius, ai.x));
  ai.y = 70;

  // Increase speed slightly over time
  const maxSpeed = 9;
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  if (speed < 4) {
    b.vx *= 1.02; b.vy *= 1.02;
  }
  if (speed > maxSpeed) {
    b.vx = (b.vx / speed) * maxSpeed;
    b.vy = (b.vy / speed) * maxSpeed;
  }
}

function collidePaddle(ball, paddle) {
  const dx = ball.x - paddle.x;
  const dy = ball.y - paddle.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = ball.radius + paddle.radius;
  if (dist < minDist) {
    const nx = dx / dist;
    const ny = dy / dist;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const boost = Math.min(speed * 1.05, 9);
    ball.vx = nx * boost;
    ball.vy = ny * boost;
    // Push out
    ball.x = paddle.x + nx * (minDist + 1);
    ball.y = paddle.y + ny * (minDist + 1);
    playSound('hit');
  }
}

function resetBall(dir) {
  const c = hockey.canvas;
  hockey.ball = {
    x: c.width / 2,
    y: c.height / 2,
    vx: (Math.random() > 0.5 ? 1 : -1) * 4,
    vy: dir * 4,
    radius: 12,
  };
}

function updateHockeyScoreDisplay() {
  document.getElementById('hockey-score-display').textContent =
    `Sen: ${hockey.scoreP} — AI: ${hockey.scoreAI}`;
}

function drawHockey() {
  const ctx = hockey.ctx;
  const c   = hockey.canvas;
  const b   = hockey.ball;

  // BG
  ctx.fillStyle = '#000820';
  ctx.fillRect(0, 0, c.width, c.height);

  // Center line
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(0,150,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, c.height / 2);
  ctx.lineTo(c.width, c.height / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Center circle
  ctx.strokeStyle = 'rgba(0,150,255,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.width / 2, c.height / 2, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Goals
  const gw = c.width * 0.4;
  const gx = (c.width - gw) / 2;
  // Top goal (player scores here)
  ctx.strokeStyle = 'rgba(0,255,136,0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(gx, 4); ctx.lineTo(gx + gw, 4);
  ctx.stroke();
  // Bottom goal (AI scores here)
  ctx.strokeStyle = 'rgba(255,60,60,0.6)';
  ctx.beginPath();
  ctx.moveTo(gx, c.height - 4); ctx.lineTo(gx + gw, c.height - 4);
  ctx.stroke();

  // Rink border glow
  ctx.strokeStyle = 'rgba(0,150,255,0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, c.width - 4, c.height - 4);

  // AI paddle
  drawPaddle(ctx, hockey.ai.x, hockey.ai.y, hockey.ai.radius, '#ff4488', '#ff0066');
  // Player paddle
  drawPaddle(ctx, hockey.player.x, hockey.player.y, hockey.player.radius, '#00ffcc', '#00aaff');

  // Ball glow
  const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 3);
  grd.addColorStop(0, 'rgba(255,255,255,0.3)');
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius * 3, 0, Math.PI * 2);
  ctx.fill();

  // Ball
  const ballGrd = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.radius);
  ballGrd.addColorStop(0, '#ffffff');
  ballGrd.addColorStop(0.4, '#aaeeff');
  ballGrd.addColorStop(1, '#0066ff');
  ctx.fillStyle = ballGrd;
  ctx.shadowColor = '#00aaff';
  ctx.shadowBlur  = 16;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Score text
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 28px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hockey.scoreP, c.width / 2, c.height - 16);
  ctx.fillText(hockey.scoreAI, c.width / 2, 28);
  ctx.textAlign = 'start';
}

function drawPaddle(ctx, x, y, r, colorA, colorB) {
  const grd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.3, colorA);
  grd.addColorStop(1, colorB);
  ctx.shadowColor  = colorA;
  ctx.shadowBlur   = 20;
  ctx.fillStyle    = grd;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle  = '#fff';
  ctx.lineWidth    = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner ring
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
}

function gameOverHockey(playerWon) {
  hockey.running = false;
  const title  = document.getElementById('hockey-result-title');
  const detail = document.getElementById('hockey-result-detail');
  title.textContent  = playerWon ? '🏆 Kazandın!' : '😭 Kaybettin!';
  detail.textContent = `Skor: ${hockey.scoreP} — ${hockey.scoreAI} | Kazanılan: ${hockey.coinsEarned} 🪙`;
  document.getElementById('hockey-gameover').style.display = 'flex';
}

/* ═══════════════════════════════════════════════════════════════
   SOUND (Web Audio API)
═══════════════════════════════════════════════════════════════ */
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return audioCtx;
}

function playSound(type) {
  if (!state.sfx) return;
  const ctx = getAudio();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(state.volume * 0.15, ctx.currentTime);

  switch (type) {
    case 'jump':
      o.type = 'sine';
      o.frequency.setValueAtTime(400, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.start(); o.stop(ctx.currentTime + 0.15);
      break;
    case 'score':
      o.type = 'square';
      o.frequency.setValueAtTime(523, ctx.currentTime);
      o.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
      o.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
      break;
    case 'die':
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(400, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.4);
      break;
    case 'goal':
      o.type = 'sine';
      [523, 659, 784, 1047].forEach((f, i) => {
        o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.1);
      });
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.start(); o.stop(ctx.currentTime + 0.5);
      break;
    case 'hit':
      o.type = 'square';
      o.frequency.setValueAtTime(200, ctx.currentTime);
      g.gain.setValueAtTime(state.volume * 0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      o.start(); o.stop(ctx.currentTime + 0.08);
      break;
    case 'success':
      o.type = 'sine';
      o.frequency.setValueAtTime(440, ctx.currentTime);
      o.frequency.setValueAtTime(550, ctx.currentTime + 0.1);
      o.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.4);
      break;
    case 'buy':
      o.type = 'sine';
      [330, 440, 550, 660, 880].forEach((f, i) => {
        o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);
      });
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.start(); o.stop(ctx.currentTime + 0.5);
      break;
  }
}

/* ═══════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════ */
let toastTimeout = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ═══════════════════════════════════════════════════════════════
   COIN BURST FX
═══════════════════════════════════════════════════════════════ */
function burstCoins(cx, cy, amount) {
  if (!state.particles) return;
  const container = document.getElementById('coin-burst');
  const count = Math.min(Math.floor(amount / 5) + 3, 10);
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    coin.className = 'burst-coin';
    coin.textContent = '🪙';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist  = 60 + Math.random() * 60;
    coin.style.left = cx + 'px';
    coin.style.top  = cy + 'px';
    coin.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    coin.style.setProperty('--ty', Math.sin(angle) * dist - 40 + 'px');
    coin.style.animationDelay = Math.random() * 0.2 + 's';
    container.appendChild(coin);
    setTimeout(() => coin.remove(), 1200);
  }
}

/* ═══════════════════════════════════════════════════════════════
   RESIZE HANDLER
═══════════════════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  if (document.getElementById('screen-flappy').classList.contains('active')) {
    initFlappy();
  }
  if (document.getElementById('screen-hockey').classList.contains('active')) {
    initHockey();
  }
});
