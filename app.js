// ═══════════════════════════════════════════════════════════════════
//  STUDYHUB — app.js
//  Firebase bağlantısı boş bırakıldı. Kendi config'ini ekle.
// ═══════════════════════════════════════════════════════════════════

// ─── FIREBASE IMPORTS — KENDİ PAKETLERINI BURAYA EKLE ───────────
// import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
//          sendPasswordResetEmail, onAuthStateChanged, signOut } from "firebase/auth";
// import { getFirestore, doc, setDoc, getDoc, updateDoc, collection,
//          query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── APP STATE ──────────────────────────────────────────────────
const State = {
  user: null,         // { uid, username, email, role, avatar, bio, birthdate, score, solved, usernameChangedAt, blocked:[] }
  users: {},          // uid → userdata cache
  currentPage: 'chat',
  sidebar: false,
  notifications: [],
  dmTarget: null,     // { uid, username }
  currentTest: null,  // { id, title, questions:[], answers:{} }
  uploadType: null,
  timer: { interval: null, seconds: 0, running: false },
  drawing: { canvas: null, ctx: null, painting: false, tool: 'pen' },
  settings: { darkMode: true, accentColor: '#f0c040', notifSound: true, msgSound: true, bgMusic: false, fontSize: 14 },
  blocked: [],
  yksDate: null,
};

// ─── THEME ACCENTS ──────────────────────────────────────────────
const ACCENT_COLORS = [
  { color: '#f0c040', rgb: '240,192,64'  },
  { color: '#4f9eff', rgb: '79,158,255'  },
  { color: '#ff6b9d', rgb: '255,107,157' },
  { color: '#4caf7d', rgb: '76,175,125'  },
  { color: '#ff8c42', rgb: '255,140,66'  },
  { color: '#a78bfa', rgb: '167,139,250' },
];

// ─── ZODIAC ─────────────────────────────────────────────────────
function getZodiac(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const m = d.getMonth() + 1, day = d.getDate();
  const signs = [
    [1,20,'♒ Kova'],[2,19,'♓ Balık'],[3,21,'♈ Koç'],[4,20,'♉ Boğa'],
    [5,21,'♊ İkizler'],[6,21,'♋ Yengeç'],[7,23,'♌ Aslan'],[8,23,'♍ Başak'],
    [9,23,'♎ Terazi'],[10,23,'♏ Akrep'],[11,22,'♐ Yay'],[12,22,'♑ Oğlak'],
    [12,31,'♒ Kova'],
  ];
  for (const [sm, sd, name] of signs) {
    if (m < sm || (m === sm && day <= sd)) return name;
  }
  return '♒ Kova';
}

// ─── LOCAL STORAGE HELPERS (Firebase yerine şimdilik) ───────────
const LS = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { localStorage.setItem(k, JSON.stringify(v)); },
  del: (k) => { localStorage.removeItem(k); },
};

// ─── INIT ────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  buildEmojiPicker();
  buildCalculator();
  buildColorSwatches();
  buildFormulas('math');
  loadYKSDate();
  startYKSCounter();

  // Try auto-login from localStorage (replace with onAuthStateChanged in Firebase)
  const saved = LS.get('sh_user');
  if (saved) {
    State.user = saved;
    enterApp();
  }
});

// ═══════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════
function switchAuth(form) {
  ['login-form','register-form','reset-form'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(`${form}-form`).classList.add('active');
}

async function handleLogin() {
  const u = val('login-username'), p = val('login-password');
  if (!u || !p) return toast('Kullanıcı adı ve şifre gir.', 'error');

  // ── FIREBASE: signInWithEmailAndPassword(auth, email, password) ──
  // Şimdilik localStorage demo:
  const users = LS.get('sh_users') || {};
  const found = Object.values(users).find(x => (x.username === u || x.email === u) && x.password === p);
  if (!found) return toast('Kullanıcı adı veya şifre yanlış.', 'error');
  State.user = { ...found };
  delete State.user.password;
  LS.set('sh_user', State.user);
  enterApp();
}

async function handleRegister() {
  const username = val('reg-username').trim();
  const email = val('reg-email').trim();
  const birthdate = val('reg-birthdate');
  const pw = val('reg-password');
  const pw2 = val('reg-password2');

  if (!username || !email || !birthdate || !pw) return toast('Tüm alanları doldur.', 'error');
  if (pw !== pw2) return toast('Şifreler eşleşmiyor.', 'error');
  if (pw.length < 6) return toast('Şifre en az 6 karakter olmalı.', 'error');

  // ── FIREBASE: createUserWithEmailAndPassword ──
  const users = LS.get('sh_users') || {};
  const exists = Object.values(users).find(x => x.username === username || x.email === email);
  if (exists) return toast('Bu kullanıcı adı veya e-posta zaten kullanımda.', 'error');

  const uid = 'u_' + Date.now();
  const isFirst = Object.keys(users).length === 0; // İlk kayıt → admin

  const newUser = {
    uid, username, email, birthdate, password: pw,
    role: isFirst ? 'admin' : 'student',
    avatar: null, bio: '', score: 0, solved: 0,
    joinDate: new Date().toISOString(),
    usernameChangedAt: null, blocked: [],
  };
  users[uid] = newUser;
  LS.set('sh_users', users);

  State.user = { ...newUser };
  delete State.user.password;
  LS.set('sh_user', State.user);
  toast('Kayıt başarılı! 🎉', 'success');
  enterApp();
}

async function handlePasswordReset() {
  const email = val('reset-email');
  if (!email) return toast('E-posta adresini gir.', 'error');
  // ── FIREBASE: sendPasswordResetEmail(auth, email) ──
  toast('Şifre sıfırlama e-postası gönderildi (Firebase ile çalışır).', 'success');
}

function handleLogout() {
  // ── FIREBASE: signOut(auth) ──
  LS.del('sh_user');
  State.user = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-overlay').classList.add('active');
  switchAuth('login');
}

function togglePassword(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ─── Enter App ───────────────────────────────────────────────────
function enterApp() {
  document.getElementById('auth-overlay').classList.remove('active');
  document.getElementById('app').classList.remove('hidden');
  updateTopbar();
  setupAdminUI();
  loadPage('chat');
  loadNotifications();
  updateYKSCounter();
  loadBlockedList();
  toast(`Hoş geldin, ${State.user.username}! 👋`, 'success');
}

function updateTopbar() {
  const u = State.user;
  document.getElementById('topbar-username').textContent = u.username;
  renderAvatar(document.getElementById('topbar-avatar'), u);
}

function setupAdminUI() {
  if (['admin','teacher'].includes(State.user.role)) {
    document.getElementById('admin-section').classList.remove('hidden');
  }
}

// ═══════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));

  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.add('active');

  const navItem = document.querySelector(`[data-page="${name}"]`);
  if (navItem) navItem.classList.add('active');

  State.currentPage = name;
  loadPage(name);

  // Close sidebar on mobile
  if (window.innerWidth <= 768) toggleSidebar(false);
}

function loadPage(name) {
  switch(name) {
    case 'chat':       initChat(); break;
    case 'tests':      loadContent('tests'); break;
    case 'testbooks':  loadContent('testbooks'); break;
    case 'exams':      loadContent('exams'); break;
    case 'rankings':   loadRankings(); break;
    case 'teachers':   loadTeachers(); break;
    case 'writings':   loadContent('writings'); break;
    case 'schedule':   loadContent('schedule'); break;
    case 'photos':     loadPhotos(); break;
    case 'schoolteachers': loadSchoolTeachers(); break;
    case 'admin-users': loadAdminUsers(); break;
  }
}

function toggleSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const open = force !== undefined ? force : !State.sidebar;
  State.sidebar = open;
  sidebar.classList.toggle('open', open);
  overlay.classList.toggle('hidden', !open);
}

// ═══════════════════════════════════════════════════════════════════
//  PANELS & MODALS
// ═══════════════════════════════════════════════════════════════════
function openPanel(id) {
  closeAllPanels();
  document.getElementById(id).classList.remove('hidden');
  if (id === 'profile-panel') fillProfilePanel();
  if (id === 'settings-panel') fillSettingsPanel();
}
function closePanel(id) { document.getElementById(id).classList.add('hidden'); }
function closeAllPanels() {
  ['profile-panel','settings-panel'].forEach(id => closePanel(id));
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ═══════════════════════════════════════════════════════════════════
//  PROFILE PANEL
// ═══════════════════════════════════════════════════════════════════
function fillProfilePanel() {
  const u = State.user;
  renderAvatar(document.getElementById('panel-avatar'), u, true);
  document.getElementById('panel-username').textContent = u.username;
  document.getElementById('panel-role-badge').textContent = roleLabel(u.role);
  document.getElementById('panel-zodiac').textContent = getZodiac(u.birthdate);
  document.getElementById('panel-bio').value = u.bio || '';
  document.getElementById('p-score').textContent = u.score || 0;
  document.getElementById('p-solved').textContent = u.solved || 0;
  updateRankDisplay();
}

function updateRankDisplay() {
  const users = Object.values(LS.get('sh_users') || {});
  const sorted = users.sort((a,b) => (b.score||0) - (a.score||0));
  const rank = sorted.findIndex(u => u.uid === State.user.uid) + 1;
  document.getElementById('p-rank').textContent = `#${rank}`;
}

function roleLabel(role) {
  return { admin: '👑 Yönetici', teacher: '🎓 Öğretmen', student: '📚 Öğrenci' }[role] || '📚 Öğrenci';
}

function saveBioDraft() {} // auto-save trigger if needed
function saveBio() {
  const bio = document.getElementById('panel-bio').value.trim();
  State.user.bio = bio;
  LS.set('sh_user', State.user);
  persistUser();
  toast('Açıklama kaydedildi.', 'success');
}

function triggerAvatarUpload() { document.getElementById('avatar-input').click(); }
function handleAvatarUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const data = ev.target.result;
    State.user.avatar = data;
    LS.set('sh_user', State.user);
    persistUser();
    renderAvatar(document.getElementById('panel-avatar'), State.user, true);
    renderAvatar(document.getElementById('topbar-avatar'), State.user);
    toast('Profil fotoğrafı güncellendi.', 'success');
    // ── FIREBASE: Storage'a yükle, URL kaydet ──
  };
  reader.readAsDataURL(file);
}

function changeUsername() {
  const newName = document.getElementById('new-username-input').value.trim();
  if (!newName) return toast('Yeni kullanıcı adı gir.', 'error');
  if (newName.length < 3) return toast('Kullanıcı adı en az 3 karakter olmalı.', 'error');

  const last = State.user.usernameChangedAt;
  if (last) {
    const diff = Date.now() - new Date(last).getTime();
    const week = 7 * 24 * 60 * 60 * 1000;
    if (diff < week) {
      const remaining = Math.ceil((week - diff) / (24*60*60*1000));
      return toast(`Kullanıcı adını değiştirmek için ${remaining} gün beklemelisin.`, 'error');
    }
  }

  const users = LS.get('sh_users') || {};
  const taken = Object.values(users).find(u => u.username === newName && u.uid !== State.user.uid);
  if (taken) return toast('Bu kullanıcı adı zaten alınmış.', 'error');

  State.user.username = newName;
  State.user.usernameChangedAt = new Date().toISOString();
  LS.set('sh_user', State.user);
  persistUser();
  updateTopbar();
  document.getElementById('panel-username').textContent = newName;
  toast('Kullanıcı adı değiştirildi! ✅', 'success');
  // ── FIREBASE: updateDoc ──
}

// ─── View other user's profile ───────────────────────────────────
let _modalUserId = null;
function openUserProfile(uid) {
  const users = LS.get('sh_users') || {};
  const u = users[uid]; if (!u) return;
  _modalUserId = uid;

  renderAvatar(document.getElementById('modal-user-avatar'), u, true);
  document.getElementById('modal-user-username').textContent = u.username;
  document.getElementById('modal-user-role').textContent = roleLabel(u.role);
  document.getElementById('modal-user-zodiac').textContent = getZodiac(u.birthdate);
  document.getElementById('modal-user-bio').textContent = u.bio || 'Açıklama yok.';
  document.getElementById('modal-user-score').textContent = u.score || 0;
  document.getElementById('modal-user-solved').textContent = u.solved || 0;

  const allUsers = Object.values(users).sort((a,b) => (b.score||0) - (a.score||0));
  const rank = allUsers.findIndex(x => x.uid === uid) + 1;
  document.getElementById('modal-user-rank').textContent = `#${rank}`;

  openModal('user-profile-modal');
}
function openDMFromModal() {
  if (!_modalUserId) return;
  const users = LS.get('sh_users') || {};
  const u = users[_modalUserId];
  if (u) { closeModal('user-profile-modal'); openDMModal(_modalUserId, u.username); }
}
function blockUserFromModal() {
  if (!_modalUserId) return;
  blockUser(_modalUserId);
  closeModal('user-profile-modal');
}

// ═══════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════
function loadSettings() {
  const saved = LS.get('sh_settings');
  if (saved) Object.assign(State.settings, saved);
  applySettings();
}
function applySettings() {
  const s = State.settings;
  document.documentElement.setAttribute('data-theme', s.darkMode ? 'dark' : 'light');
  document.documentElement.style.setProperty('--accent', s.accentColor);
  const rgb = ACCENT_COLORS.find(a => a.color === s.accentColor)?.rgb || '240,192,64';
  document.documentElement.style.setProperty('--accent-rgb', rgb);
  document.documentElement.style.fontSize = s.fontSize + 'px';
}
function saveSettings() {
  LS.set('sh_settings', State.settings);
  applySettings();
}
function fillSettingsPanel() {
  const s = State.settings;
  const dmToggle = document.getElementById('dark-mode-toggle');
  if (dmToggle) dmToggle.checked = s.darkMode;
  document.getElementById('notif-sound-toggle').checked = s.notifSound;
  document.getElementById('msg-sound-toggle').checked = s.msgSound;
  document.getElementById('bg-music-toggle').checked = s.bgMusic;
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === s.accentColor);
  });
}
function toggleDarkMode(el) {
  State.settings.darkMode = el.checked;
  saveSettings();
}
function toggleSetting(key, el) {
  State.settings[key] = el.checked;
  saveSettings();
}
function setFontSize(v) {
  State.settings.fontSize = parseInt(v);
  saveSettings();
}
function toggleBgMusic(el) {
  State.settings.bgMusic = el.checked;
  document.getElementById('music-select-row').style.display = el.checked ? 'flex' : 'none';
  saveSettings();
}
function changeBgMusic(v) { /* implement audio playback */ }
function buildColorSwatches() {
  const wrap = document.getElementById('color-swatches'); if (!wrap) return;
  ACCENT_COLORS.forEach(a => {
    const s = document.createElement('div');
    s.className = 'swatch';
    s.style.background = a.color;
    s.dataset.color = a.color;
    s.addEventListener('click', () => {
      State.settings.accentColor = a.color; saveSettings();
      document.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
    });
    wrap.appendChild(s);
  });
}

// ─── Block / Unblock ─────────────────────────────────────────────
function blockUser(uid) {
  const users = LS.get('sh_users') || {};
  const target = users[uid];
  if (!target) return;
  if (!State.blocked.includes(uid)) {
    State.blocked.push(uid);
    State.user.blocked = State.blocked;
    LS.set('sh_user', State.user);
    persistUser();
    toast(`${target.username} engellendi.`, 'success');
    loadBlockedList();
  }
}
function unblockUser(uid) {
  State.blocked = State.blocked.filter(x => x !== uid);
  State.user.blocked = State.blocked;
  LS.set('sh_user', State.user);
  persistUser();
  toast('Engel kaldırıldı.', 'success');
  loadBlockedList();
}
function loadBlockedList() {
  State.blocked = State.user?.blocked || [];
  const wrap = document.getElementById('blocked-list'); if (!wrap) return;
  const users = LS.get('sh_users') || {};
  if (!State.blocked.length) { wrap.innerHTML = '<small style="color:var(--text-muted)">Engellenen kullanıcı yok.</small>'; return; }
  wrap.innerHTML = State.blocked.map(uid => {
    const u = users[uid];
    return `<div class="blocked-item"><span>${u?.username || uid}</span><button class="unblock-btn" onclick="unblockUser('${uid}')">Engeli Kaldır</button></div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
//  YKS COUNTER
// ═══════════════════════════════════════════════════════════════════
function loadYKSDate() {
  const saved = LS.get('sh_yksdate');
  if (saved) {
    State.yksDate = new Date(saved);
    const input = document.getElementById('yks-date-input');
    if (input) input.value = saved;
  }
}
function setYKSDate(v) {
  State.yksDate = new Date(v);
  LS.set('sh_yksdate', v);
  updateYKSCounter();
}
function startYKSCounter() {
  updateYKSCounter();
  setInterval(updateYKSCounter, 60000);
}
function updateYKSCounter() {
  const el = document.getElementById('yks-days'); if (!el) return;
  if (!State.yksDate) { el.textContent = '?'; return; }
  const now = new Date();
  const diff = Math.ceil((State.yksDate - now) / (1000 * 60 * 60 * 24));
  el.textContent = diff > 0 ? diff : (diff === 0 ? 'Bugün!' : 'Bitti');
}

// ═══════════════════════════════════════════════════════════════════
//  GLOBAL CHAT
// ═══════════════════════════════════════════════════════════════════
let chatAttach = null;

function initChat() {
  loadChatMessages();
  // ── FIREBASE: onSnapshot(chatRef, ...) ──
}

function loadChatMessages() {
  const msgs = LS.get('sh_chat') || [];
  const container = document.getElementById('chat-messages');
  // Keep welcome msg
  const welcome = container.querySelector('.chat-welcome');
  container.innerHTML = '';
  if (welcome) container.appendChild(welcome);

  msgs.forEach(m => renderChatMessage(m));
  container.scrollTop = container.scrollHeight;
  // Update online count (random for demo)
  document.getElementById('online-count').textContent = Math.floor(Math.random() * 8) + 1;
}

function renderChatMessage(msg) {
  const container = document.getElementById('chat-messages'); if (!container) return;
  if (State.blocked.includes(msg.uid)) return; // blocked

  const isOwn = msg.uid === State.user?.uid;
  const div = document.createElement('div');
  div.className = `chat-msg${isOwn ? ' own' : ''}`;

  let contentHtml = '';
  if (msg.type === 'image') {
    contentHtml = `<img src="${sanitize(msg.content)}" alt="resim" />`;
  } else if (msg.type === 'file') {
    contentHtml = `<a href="${sanitize(msg.content)}" target="_blank">📎 ${sanitize(msg.filename)}</a>`;
  } else {
    contentHtml = sanitize(msg.content);
  }

  const roleClass = msg.role === 'admin' ? 'role-admin' : msg.role === 'teacher' ? 'role-teacher' : '';

  div.innerHTML = `
    <div class="msg-avatar" onclick="openUserProfile('${msg.uid}')">
      <div class="avatar" id="chatavatar-${msg.uid}">${avatarContent(msg)}</div>
    </div>
    <div>
      <div class="msg-meta">
        <span class="msg-username ${roleClass}" onclick="openUserProfile('${msg.uid}')">${sanitize(msg.username)}</span>
        <span>${msg.role === 'admin' ? '👑' : msg.role === 'teacher' ? '🎓' : ''}</span>
        <span>${formatTime(msg.timestamp)}</span>
      </div>
      <div class="msg-bubble">${contentHtml}</div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function avatarContent(u) {
  if (u.avatar) return `<img src="${u.avatar}" />`;
  return (u.username || '?')[0].toUpperCase();
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.innerText.trim();
  if (!text && !chatAttach) return;

  const msg = {
    uid: State.user.uid,
    username: State.user.username,
    role: State.user.role,
    avatar: State.user.avatar,
    timestamp: new Date().toISOString(),
    type: chatAttach ? chatAttach.type : 'text',
    content: chatAttach ? chatAttach.data : text,
    filename: chatAttach?.name || null,
  };

  const msgs = LS.get('sh_chat') || [];
  msgs.push(msg);
  // Keep last 500
  if (msgs.length > 500) msgs.splice(0, msgs.length - 500);
  LS.set('sh_chat', msgs);

  renderChatMessage(msg);
  input.innerText = '';
  clearAttach();

  if (State.settings.msgSound) playSound('msg');
  // ── FIREBASE: addDoc(chatRef, {...msg, timestamp: serverTimestamp()}) ──
}

function triggerFileUpload() { document.getElementById('file-input').click(); }
function triggerGifUpload() {
  const url = prompt('GIF URL gir:');
  if (!url) return;
  chatAttach = { type: 'image', data: url, name: 'gif' };
  showAttachPreview('🖼️ GIF ekli');
}

function handleFileAttach(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const isImg = file.type.startsWith('image/');
    chatAttach = {
      type: isImg ? 'image' : 'file',
      data: ev.target.result,
      name: file.name,
    };
    showAttachPreview(`${isImg ? '🖼️' : '📎'} ${file.name}`);
    // ── FIREBASE: Storage'a yükle, URL al ──
  };
  reader.readAsDataURL(file);
}
function showAttachPreview(label) {
  document.getElementById('attach-name').textContent = label;
  document.getElementById('attach-preview').classList.remove('hidden');
}
function clearAttach() {
  chatAttach = null;
  document.getElementById('attach-preview').classList.add('hidden');
  document.getElementById('file-input').value = '';
}

// ─── Emoji Picker ────────────────────────────────────────────────
const EMOJIS = ['😀','😂','🥰','😍','🤔','😎','🥳','😅','🤩','😤','👍','👏','🙌','✨','🔥','💯','❤️','💙','💚','💛','🧡','💜','🎉','🎊','🎯','📚','✏️','📝','🔬','🔭','⭐','🌟','💡','🏆','🥇','🎓','📖','🖊️','🧮','📐','📏'];
function buildEmojiPicker() {
  const grid = document.getElementById('emoji-grid'); if (!grid) return;
  EMOJIS.forEach(e => {
    const span = document.createElement('span');
    span.textContent = e;
    span.addEventListener('click', () => insertEmoji(e));
    grid.appendChild(span);
  });
}
function toggleEmojiPicker() {
  document.getElementById('emoji-picker').classList.toggle('hidden');
}
function insertEmoji(e) {
  const input = document.getElementById('chat-input');
  input.innerText += e;
  input.focus();
}

// ═══════════════════════════════════════════════════════════════════
//  CONTENT (Tests, Books, Exams, Writings, Schedule)
// ═══════════════════════════════════════════════════════════════════
function loadContent(type) {
  const data = LS.get(`sh_${type}`) || [];
  const gridId = `${type}-grid`;
  const grid = document.getElementById(gridId); if (!grid) return;

  if (!data.length) {
    grid.innerHTML = '<div class="empty-state">Henüz içerik eklenmemiş.</div>';
    return;
  }

  grid.innerHTML = data.map(item => `
    <div class="content-card" onclick="openContent('${type}', '${item.id}')">
      <span class="card-subject">${item.subject || ''}</span>
      <h3 class="card-title">${sanitize(item.title)}</h3>
      <p class="card-desc">${sanitize(item.desc || '')}</p>
      <div class="card-meta">
        <span>${item.questionCount ? item.questionCount + ' soru' : ''}</span>
        <span>${formatDate(item.createdAt)}</span>
      </div>
      <button class="card-action">${type === 'tests' || type === 'exams' ? '🚀 Çöz' : '📖 Aç'}</button>
    </div>
  `).join('');
  // ── FIREBASE: getDocs(collection(db, type)) ──
}

function filterContent(type, q) {
  const data = (LS.get(`sh_${type}`) || []).filter(item =>
    item.title.toLowerCase().includes(q.toLowerCase()) ||
    (item.subject || '').toLowerCase().includes(q.toLowerCase())
  );
  const gridId = `${type}-grid`;
  const grid = document.getElementById(gridId); if (!grid) return;
  grid.innerHTML = data.map(item => `
    <div class="content-card" onclick="openContent('${type}', '${item.id}')">
      <span class="card-subject">${item.subject || ''}</span>
      <h3 class="card-title">${sanitize(item.title)}</h3>
      <p class="card-desc">${sanitize(item.desc || '')}</p>
      <button class="card-action">${type === 'tests' || type === 'exams' ? '🚀 Çöz' : '📖 Aç'}</button>
    </div>
  `).join('') || '<div class="empty-state">Sonuç bulunamadı.</div>';
}

function openContent(type, id) {
  const data = LS.get(`sh_${type}`) || [];
  const item = data.find(x => x.id === id); if (!item) return;

  if ((type === 'tests' || type === 'exams') && item.questions?.length) {
    openTestSolver(item);
  } else if (item.fileUrl) {
    window.open(item.fileUrl, '_blank');
  } else {
    toast('İçerik bulunamadı.', 'error');
  }
}

// ─── Test Solver ─────────────────────────────────────────────────
function openTestSolver(test) {
  State.currentTest = { ...test, answers: {}, startTime: Date.now() };
  document.getElementById('solver-title').textContent = test.title;
  renderQuestions(test.questions);
  showPage('test-solver');
  resetTimer();
}

function renderQuestions(questions) {
  const container = document.getElementById('test-questions');
  container.innerHTML = questions.map((q, i) => `
    <div class="question-card" id="qcard-${i}">
      <div class="question-num">Soru ${i+1}</div>
      ${q.image ? `<img src="${sanitize(q.image)}" style="max-width:100%;border-radius:8px;margin-bottom:1rem;" />` : ''}
      <div class="question-text">${sanitize(q.q)}</div>
      <div class="question-options">
        ${q.options.map((opt, j) => `
          <button class="option-btn" onclick="selectAnswer(${i}, ${j})" id="opt-${i}-${j}">
            <span class="option-letter">${'ABCDE'[j]}</span>
            ${sanitize(opt)}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
  updateAnswerSummary(questions.length);
}

function selectAnswer(qi, oi) {
  State.currentTest.answers[qi] = oi;
  // Clear other options
  const q = State.currentTest.questions[qi];
  q.options.forEach((_, j) => {
    const btn = document.getElementById(`opt-${qi}-${j}`);
    if (btn) btn.classList.remove('selected');
  });
  const selected = document.getElementById(`opt-${qi}-${oi}`);
  if (selected) selected.classList.add('selected');
  updateAnswerSummary(State.currentTest.questions.length);
}

function updateAnswerSummary(total) {
  const wrap = document.getElementById('answer-summary');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = `ans-dot${State.currentTest?.answers[i] !== undefined ? ' filled' : ''}`;
    dot.textContent = i + 1;
    dot.onclick = () => document.getElementById(`qcard-${i}`)?.scrollIntoView({behavior:'smooth'});
    wrap.appendChild(dot);
  }
}

function submitTest() {
  if (!State.currentTest) return;
  const { questions, answers } = State.currentTest;
  let correct = 0, wrong = 0, empty = 0;

  questions.forEach((q, i) => {
    const ans = answers[i];
    const optBtns = q.options.map((_, j) => document.getElementById(`opt-${i}-${j}`));
    if (ans === undefined) {
      empty++;
    } else if (ans === q.answer) {
      correct++;
      optBtns[ans]?.classList.add('correct');
    } else {
      wrong++;
      optBtns[ans]?.classList.add('wrong');
      optBtns[q.answer]?.classList.add('correct');
    }
  });

  const puan = correct * 4 - wrong;
  const net = Math.max(0, puan);

  // Update user score
  State.user.score = (State.user.score || 0) + net;
  State.user.solved = (State.user.solved || 0) + 1;
  LS.set('sh_user', State.user);
  persistUser();

  // Show result
  document.getElementById('result-content').innerHTML = `
    <div class="result-score">${net.toFixed(1)}</div>
    <p style="color:var(--text-muted);margin:.5rem 0">Net Puan</p>
    <div class="result-details">
      <div class="result-stat"><span class="result-correct">${correct}</span><small>Doğru</small></div>
      <div class="result-stat"><span class="result-wrong">${wrong}</span><small>Yanlış</small></div>
      <div class="result-stat"><span class="result-empty">${empty}</span><small>Boş</small></div>
    </div>
    <p style="margin-top:1.5rem;color:var(--text-secondary);font-size:.88rem">
      Süre: ${formatSeconds(Math.floor((Date.now() - State.currentTest.startTime) / 1000))}
    </p>
  `;
  openModal('result-modal');
  if (State.settings.notifSound) playSound('success');
  // ── FIREBASE: save result ──
}

// ─── Solver Tools ────────────────────────────────────────────────
function toggleDrawingMode() {
  const panel = document.getElementById('drawing-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) initCanvas();
  toggleToolBtn(0);
}
function toggleCalculator() {
  document.getElementById('calc-panel').classList.toggle('hidden'); toggleToolBtn(1);
}
function toggleFormulas() {
  document.getElementById('formula-panel').classList.toggle('hidden'); toggleToolBtn(2);
}
function toggleTimer() {
  document.getElementById('timer-panel').classList.toggle('hidden'); toggleToolBtn(3);
}
function toggleToolBtn(idx) {
  const btns = document.querySelectorAll('.solver-tools .tool-btn');
  if (btns[idx]) btns[idx].classList.toggle('active');
}

// ─── Canvas Drawing ──────────────────────────────────────────────
function initCanvas() {
  const canvas = document.getElementById('drawing-canvas');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width - 2;
  canvas.height = 260;
  State.drawing.canvas = canvas;
  State.drawing.ctx = canvas.getContext('2d');

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e.touches[0]); });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
  canvas.addEventListener('touchend', stopDraw);
}
function getPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function startDraw(e) {
  State.drawing.painting = true;
  const { x, y } = getPos(e, State.drawing.canvas);
  State.drawing.ctx.beginPath();
  State.drawing.ctx.moveTo(x, y);
}
function draw(e) {
  if (!State.drawing.painting) return;
  const ctx = State.drawing.ctx;
  const { x, y } = getPos(e, State.drawing.canvas);
  const color = document.getElementById('pen-color').value;
  const size = document.getElementById('pen-size').value;
  if (State.drawing.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = size * 3;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}
function stopDraw() { State.drawing.painting = false; }
function setDrawTool(t) { State.drawing.tool = t; }
function clearCanvas() {
  if (State.drawing.ctx) State.drawing.ctx.clearRect(0, 0, State.drawing.canvas.width, State.drawing.canvas.height);
}

// ─── Calculator ──────────────────────────────────────────────────
function buildCalculator() {
  const btns = [
    'C','±','%','÷',
    '7','8','9','×',
    '4','5','6','-',
    '1','2','3','+',
    '0','.','⌫','=',
  ];
  const wrap = document.getElementById('calc-buttons'); if (!wrap) return;
  btns.forEach(b => {
    const btn = document.createElement('button');
    btn.className = `calc-btn${['÷','×','-','+'].includes(b) ? ' op' : b === '=' ? ' eq' : ''}`;
    btn.textContent = b;
    btn.addEventListener('click', () => calcPress(b));
    wrap.appendChild(btn);
  });
}
let calcExpr = '';
function calcPress(b) {
  const display = document.getElementById('calc-display');
  if (b === 'C') { calcExpr = ''; display.value = ''; return; }
  if (b === '⌫') { calcExpr = calcExpr.slice(0,-1); display.value = calcExpr; return; }
  if (b === '=') {
    try {
      const expr = calcExpr.replace(/×/g,'*').replace(/÷/g,'/');
      const result = Function('"use strict"; return (' + expr + ')')();
      display.value = result;
      calcExpr = String(result);
    } catch { display.value = 'Hata'; calcExpr = ''; }
    return;
  }
  if (b === '±') { calcExpr = calcExpr.startsWith('-') ? calcExpr.slice(1) : '-' + calcExpr; display.value = calcExpr; return; }
  if (b === '%') { try { calcExpr = String(parseFloat(calcExpr) / 100); display.value = calcExpr; } catch {} return; }
  calcExpr += b;
  display.value = calcExpr;
}

// ─── Formulas ────────────────────────────────────────────────────
const FORMULAS = {
  math: `
    <strong>Alan:</strong><br>
    Kare: A = a²<br>
    Dikdörtgen: A = a×b<br>
    Üçgen: A = (a×h)/2<br>
    Daire: A = π×r²<br>
    <br><strong>Çevre:</strong><br>
    Kare: Ç = 4a<br>
    Dikdörtgen: Ç = 2(a+b)<br>
    Daire: Ç = 2πr<br>
    <br><strong>Köklü İfadeler:</strong><br>
    √(a×b) = √a × √b<br>
    √(a/b) = √a / √b<br>
    <br><strong>Üslü İfadeler:</strong><br>
    aⁿ × aᵐ = aⁿ⁺ᵐ<br>
    aⁿ / aᵐ = aⁿ⁻ᵐ<br>
    (aⁿ)ᵐ = aⁿˣᵐ
  `,
  physics: `
    <strong>Mekanik:</strong><br>
    F = m × a (Newton 2. Kanun)<br>
    W = m × g (Ağırlık)<br>
    v = v₀ + a×t<br>
    x = v₀t + ½at²<br>
    v² = v₀² + 2ax<br>
    <br><strong>Enerji:</strong><br>
    Ek = ½mv²<br>
    Ep = mgh<br>
    P = W/t (Güç)<br>
    <br><strong>Elektrik:</strong><br>
    V = I × R (Ohm Kanunu)<br>
    P = V × I<br>
    Q = I × t
  `,
  chemistry: `
    <strong>Mol Hesaplamaları:</strong><br>
    n = m / M (mol = kütle/mol kütlesi)<br>
    n = N / Nₐ (Avogadro)<br>
    Nₐ = 6.02 × 10²³<br>
    <br><strong>Gaz Kanunları:</strong><br>
    PV = nRT (İdeal Gaz)<br>
    R = 0.082 L·atm/mol·K<br>
    <br><strong>Asit-Baz:</strong><br>
    pH = -log[H⁺]<br>
    pH + pOH = 14<br>
    Kw = 1×10⁻¹⁴
  `,
};
function buildFormulas(subject) { showFormulas(subject); }
function showFormulas(subject) {
  const wrap = document.getElementById('formula-content'); if (!wrap) return;
  wrap.innerHTML = FORMULAS[subject] || '';
  document.querySelectorAll('.ftab').forEach((t,i) => {
    t.classList.toggle('active', ['math','physics','chemistry'][i] === subject);
  });
}

// ─── Timer ───────────────────────────────────────────────────────
function startTimer() {
  if (State.timer.running) return;
  State.timer.running = true;
  State.timer.interval = setInterval(() => {
    State.timer.seconds++;
    document.getElementById('timer-display').textContent = formatSeconds(State.timer.seconds);
  }, 1000);
}
function pauseTimer() {
  clearInterval(State.timer.interval); State.timer.running = false;
}
function resetTimer() {
  pauseTimer(); State.timer.seconds = 0;
  const el = document.getElementById('timer-display');
  if (el) el.textContent = '00:00';
}
function formatSeconds(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════════════════════════
//  RANKINGS
// ═══════════════════════════════════════════════════════════════════
function loadRankings() {
  const users = Object.values(LS.get('sh_users') || {});
  const sorted = users.filter(u => u.role !== 'banned').sort((a,b) => (b.score||0) - (a.score||0));
  document.getElementById('total-users-count').textContent = `Toplam: ${users.length} kullanıcı`;
  renderRankingsTable(sorted);
  // ── FIREBASE: query users by score ──
}
function renderRankingsTable(users) {
  const tbody = document.getElementById('rankings-body'); if (!tbody) return;
  tbody.innerHTML = users.map((u,i) => `
    <tr class="rank-${i+1}">
      <td>${i+1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="avatar" style="width:28px;height:28px;font-size:.7rem">${(u.username||'?')[0].toUpperCase()}</div>
          ${sanitize(u.username)}
          <span style="font-size:.7rem;color:var(--text-muted)">${u.role === 'admin' ? '👑' : u.role === 'teacher' ? '🎓' : ''}</span>
        </div>
      </td>
      <td style="color:var(--accent);font-weight:700">${u.score || 0}</td>
      <td>${u.score ? Math.round((u.score / ((u.solved||1)*4))*100) + '%' : '—'}</td>
      <td>${u.solved || 0}</td>
      <td><span class="rank-link" onclick="openUserProfile('${u.uid}')">Profil</span></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty-state">Henüz kullanıcı yok.</td></tr>';
}
function filterRankings(q) {
  const users = Object.values(LS.get('sh_users') || {});
  const filtered = users.filter(u => u.username.toLowerCase().includes(q.toLowerCase())).sort((a,b) => (b.score||0) - (a.score||0));
  renderRankingsTable(filtered);
}

// ═══════════════════════════════════════════════════════════════════
//  TEACHERS
// ═══════════════════════════════════════════════════════════════════
function loadTeachers() {
  const users = Object.values(LS.get('sh_users') || {}).filter(u => u.role === 'teacher' || u.role === 'admin');
  const grid = document.getElementById('teachers-grid'); if (!grid) return;
  if (!users.length) { grid.innerHTML = '<div class="empty-state">Henüz öğretmen yok.</div>'; return; }
  grid.innerHTML = users.map(u => `
    <div class="teacher-card" onclick="openUserProfile('${u.uid}')">
      <div class="teacher-avatar">${u.avatar ? `<img src="${u.avatar}" />` : (u.username||'?')[0].toUpperCase()}</div>
      <div class="teacher-name">${sanitize(u.username)}</div>
      <div class="teacher-subject">${u.role === 'admin' ? '👑 Yönetici' : '🎓 Öğretmen'}</div>
      <button class="teacher-dm-btn" onclick="event.stopPropagation();openDMModal('${u.uid}','${sanitize(u.username)}')">💬 Mesaj Gönder</button>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════
//  PHOTOS
// ═══════════════════════════════════════════════════════════════════
function loadPhotos() {
  const photos = LS.get('sh_photos') || [];
  const grid = document.getElementById('photos-grid'); if (!grid) return;
  if (!photos.length) { grid.innerHTML = '<div class="empty-state">Henüz fotoğraf yok.</div>'; return; }
  grid.innerHTML = photos.map(p => `
    <div class="photo-item" onclick="window.open('${p.url}','_blank')">
      <img src="${p.url}" alt="${sanitize(p.title)}" />
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════
//  SCHOOL TEACHERS
// ═══════════════════════════════════════════════════════════════════
function loadSchoolTeachers() {
  const data = LS.get('sh_schoolteachers') || [];
  const grid = document.getElementById('schoolteachers-grid'); if (!grid) return;
  if (!data.length) { grid.innerHTML = '<div class="empty-state">Henüz okul öğretmeni eklenmemiş.</div>'; return; }
  grid.innerHTML = data.map(t => `
    <div class="teacher-card">
      <div class="teacher-avatar">${t.avatar ? `<img src="${t.avatar}" />` : '👨‍🏫'}</div>
      <div class="teacher-name">${sanitize(t.name)}</div>
      <div class="teacher-subject">${sanitize(t.subject)}</div>
      ${t.bio ? `<p style="font-size:.8rem;color:var(--text-secondary);margin-top:.5rem">${sanitize(t.bio)}</p>` : ''}
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════
//  DM (Direct Message)
// ═══════════════════════════════════════════════════════════════════
function openDMModal(uid, username) {
  State.dmTarget = { uid, username };
  document.getElementById('dm-modal-title').textContent = `💬 ${username}`;
  loadDMHistory(uid);
  openModal('dm-modal');
  // ── FIREBASE: onSnapshot(dmRef) ──
}
function loadDMHistory(uid) {
  const key = getDMKey(State.user?.uid, uid);
  const msgs = LS.get(`sh_dm_${key}`) || [];
  const container = document.getElementById('dm-messages');
  container.innerHTML = msgs.map(m => `
    <div class="dm-msg${m.senderUid === State.user?.uid ? ' own' : ''}">
      <div class="dm-bubble">${sanitize(m.text)}</div>
      <small>${formatTime(m.timestamp)}</small>
    </div>
  `).join('') || '<div style="text-align:center;color:var(--text-muted);font-size:.85rem">Henüz mesaj yok.</div>';
  container.scrollTop = container.scrollHeight;
}
function getDMKey(a, b) {
  if (!a || !b) return 'admin';
  return [a, b].sort().join('_');
}
function handleDMKey(e) {
  if (e.key === 'Enter') { e.preventDefault(); sendDM(); }
}
function sendDM() {
  const input = document.getElementById('dm-input');
  const text = input.value.trim(); if (!text) return;
  const { uid } = State.dmTarget;
  const msg = { senderUid: State.user.uid, receiverUid: uid, text, timestamp: new Date().toISOString() };

  const key = getDMKey(State.user.uid, uid);
  const msgs = LS.get(`sh_dm_${key}`) || [];
  msgs.push(msg);
  LS.set(`sh_dm_${key}`, msgs);

  const container = document.getElementById('dm-messages');
  const div = document.createElement('div');
  div.className = 'dm-msg own';
  div.innerHTML = `<div class="dm-bubble">${sanitize(text)}</div><small>Şimdi</small>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  input.value = '';
  // ── FIREBASE: addDoc(dmRef, msg) ──
}

// ═══════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════
function loadNotifications() {
  const notifs = LS.get(`sh_notifs_${State.user?.uid}`) || [];
  const global = LS.get('sh_notifs_all') || [];
  State.notifications = [...global, ...notifs].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  renderNotifications();
  // ── FIREBASE: onSnapshot(notifRef) ──
}
function renderNotifications() {
  const list = document.getElementById('notif-list'); if (!list) return;
  const badge = document.getElementById('notif-badge');
  const unread = State.notifications.filter(n => !n.read).length;

  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  if (!State.notifications.length) {
    list.innerHTML = '<p class="empty-state">Henüz bildirim yok.</p>';
    return;
  }
  list.innerHTML = State.notifications.map(n => `
    <div class="notif-item${n.isAdmin ? ' admin' : ''}">
      <strong>${sanitize(n.title || 'Duyuru')}</strong>
      <p>${sanitize(n.message)}</p>
      <small>${formatTime(n.timestamp)}</small>
    </div>
  `).join('');
}
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('hidden');
  // Mark all read
  State.notifications.forEach(n => n.read = true);
  LS.set(`sh_notifs_${State.user?.uid}`, State.notifications.filter(n => !n.isGlobal));
  document.getElementById('notif-badge').classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════════
//  BROADCAST (Admin)
// ═══════════════════════════════════════════════════════════════════
function openBroadcastModal() {
  openModal('broadcast-modal');
  document.getElementById('broadcast-target').onchange = function() {
    document.getElementById('broadcast-user-select').classList.toggle('hidden', this.value !== 'dm');
  };
}
function sendBroadcast() {
  const target = val('broadcast-target');
  const message = val('broadcast-message');
  if (!message) return toast('Mesaj yaz.', 'error');

  const notif = {
    id: Date.now().toString(),
    title: '📢 Yönetici Duyurusu',
    message, isAdmin: true,
    timestamp: new Date().toISOString(), read: false,
  };

  if (target === 'all') {
    notif.isGlobal = true;
    const global = LS.get('sh_notifs_all') || [];
    global.unshift(notif);
    LS.set('sh_notifs_all', global);
    // Reload local notifs
    loadNotifications();
    toast('Duyuru tüm kullanıcılara gönderildi.', 'success');
  } else {
    const username = val('broadcast-username');
    const users = LS.get('sh_users') || {};
    const target = Object.values(users).find(u => u.username === username);
    if (!target) return toast('Kullanıcı bulunamadı.', 'error');
    const key = `sh_notifs_${target.uid}`;
    const existing = LS.get(key) || [];
    existing.unshift(notif);
    LS.set(key, existing);
    toast(`Mesaj ${username} kullanıcısına gönderildi.`, 'success');
  }
  closeModal('broadcast-modal');
  document.getElementById('broadcast-message').value = '';
  // ── FIREBASE: addDoc(notifRef, notif) ──
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN — USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
function loadAdminUsers() {
  if (!['admin'].includes(State.user?.role)) return;
  const users = Object.values(LS.get('sh_users') || {});
  renderAdminUsers(users);
}
function filterAdminUsers(q) {
  const users = Object.values(LS.get('sh_users') || {}).filter(u => u.username.toLowerCase().includes(q.toLowerCase()));
  renderAdminUsers(users);
}
function renderAdminUsers(users) {
  const tbody = document.getElementById('admin-users-body'); if (!tbody) return;
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${sanitize(u.username)}</td>
      <td>${sanitize(u.email)}</td>
      <td>
        <select class="role-select" onchange="changeUserRole('${u.uid}', this.value)" ${u.uid === State.user.uid ? 'disabled' : ''}>
          <option value="student" ${u.role==='student'?'selected':''}>Öğrenci</option>
          <option value="teacher" ${u.role==='teacher'?'selected':''}>Öğretmen</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Yönetici</option>
          <option value="banned" ${u.role==='banned'?'selected':''}>Banlı</option>
        </select>
      </td>
      <td>${formatDate(u.joinDate)}</td>
      <td>
        <button class="btn-sm" onclick="openDMModal('${u.uid}','${sanitize(u.username)}')">💬 DM</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-state">Kullanıcı yok.</td></tr>';
}
function changeUserRole(uid, role) {
  const users = LS.get('sh_users') || {};
  if (users[uid]) {
    users[uid].role = role;
    LS.set('sh_users', users);
    toast('Rol güncellendi.', 'success');
    // ── FIREBASE: updateDoc(userRef, { role }) ──
  }
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN / TEACHER — UPLOAD
// ═══════════════════════════════════════════════════════════════════
function openUploadModal(type) {
  if (!['admin','teacher'].includes(State.user?.role)) return toast('Bu işlem için yetkiniz yok.', 'error');
  State.uploadType = type;

  const titles = {
    test: '📝 Test Ekle', testbook: '📖 Test Kitabı Ekle', exam: '🎯 Deneme Ekle',
    writing: '✍️ Yazılı/Senaryo Ekle', schedule: '📅 Ders Programı Ekle',
    photo: '🖼️ Fotoğraf Ekle', schoolteacher: '🏫 Okul Öğretmeni Ekle',
  };
  document.getElementById('upload-modal-title').textContent = titles[type] || 'İçerik Ekle';

  // Show/hide question input
  const showQ = ['test','exam'].includes(type);
  document.getElementById('upload-questions-section').classList.toggle('hidden', !showQ);

  // Clear form
  ['upload-title','upload-desc','upload-questions'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('upload-file').value = '';

  openModal('upload-modal');
}
function submitUpload() {
  const type = State.uploadType;
  const title = val('upload-title');
  const subject = val('upload-subject');
  const desc = val('upload-desc');
  if (!title) return toast('Başlık gir.', 'error');

  const item = { id: Date.now().toString(), title, subject, desc, createdBy: State.user.uid, createdAt: new Date().toISOString() };

  if (['test','exam'].includes(type)) {
    const qText = val('upload-questions');
    if (qText) {
      try {
        item.questions = JSON.parse(qText);
        item.questionCount = item.questions.length;
      } catch { return toast('Sorular geçerli JSON formatında değil.', 'error'); }
    }
  }

  if (type === 'schoolteacher') {
    const file = document.getElementById('upload-file').files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = LS.get('sh_schoolteachers') || [];
        data.push({ id: item.id, name: title, subject, bio: desc, avatar: e.target.result });
        LS.set('sh_schoolteachers', data);
        toast('Okul öğretmeni eklendi.', 'success');
        closeModal('upload-modal');
      };
      reader.readAsDataURL(file);
      return;
    }
    const data = LS.get('sh_schoolteachers') || [];
    data.push({ id: item.id, name: title, subject, bio: desc });
    LS.set('sh_schoolteachers', data);
    toast('Okul öğretmeni eklendi.', 'success');
    closeModal('upload-modal');
    return;
  }

  if (type === 'photo') {
    const file = document.getElementById('upload-file').files[0];
    if (!file) return toast('Fotoğraf seç.', 'error');
    const reader = new FileReader();
    reader.onload = (e) => {
      const photos = LS.get('sh_photos') || [];
      photos.push({ id: item.id, title, url: e.target.result });
      LS.set('sh_photos', photos);
      toast('Fotoğraf eklendi.', 'success');
      closeModal('upload-modal');
    };
    reader.readAsDataURL(file);
    return;
  }

  // File handling
  const file = document.getElementById('upload-file').files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      item.fileUrl = e.target.result;
      saveContent(type, item);
    };
    reader.readAsDataURL(file);
    // ── FIREBASE: Storage upload ──
  } else {
    saveContent(type, item);
  }
}
function saveContent(type, item) {
  const key = `sh_${type}s`;
  const data = LS.get(key) || [];
  data.unshift(item);
  LS.set(key, data);
  toast('İçerik eklendi! ✅', 'success');
  closeModal('upload-modal');
  if (State.currentPage === type + 's') loadContent(type + 's');
  // ── FIREBASE: addDoc ──
}

// ═══════════════════════════════════════════════════════════════════
//  AVATAR
// ═══════════════════════════════════════════════════════════════════
function renderAvatar(el, u, large = false) {
  if (!el) return;
  if (u?.avatar) {
    el.innerHTML = `<img src="${u.avatar}" alt="avatar" />`;
  } else {
    el.innerHTML = (u?.username || '?')[0].toUpperCase();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
function val(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  return el.value || '';
}
function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'2-digit' });
}
function toast(msg, type = 'default') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast${type !== 'default' ? ' '+type : ''}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'msg') { osc.frequency.value = 880; gain.gain.value = 0.1; }
    if (type === 'success') { osc.frequency.value = 1047; gain.gain.value = 0.15; }
    osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}
function persistUser() {
  const users = LS.get('sh_users') || {};
  if (State.user?.uid && users[State.user.uid]) {
    const pw = users[State.user.uid].password;
    users[State.user.uid] = { ...State.user, password: pw };
    LS.set('sh_users', users);
  }
  // ── FIREBASE: updateDoc(userRef, {...userData}) ──
}

// ─── Close panels on backdrop ────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllPanels();
    ['user-profile-modal','dm-modal','broadcast-modal','upload-modal','result-modal'].forEach(closeModal);
    document.getElementById('emoji-picker').classList.add('hidden');
  }
});
document.addEventListener('click', (e) => {
  const picker = document.getElementById('emoji-picker');
  if (picker && !picker.contains(e.target) && !e.target.closest('.tool-btn')) {
    picker.classList.add('hidden');
  }
  const notifPanel = document.getElementById('notif-panel');
  if (notifPanel && !notifPanel.contains(e.target) && !e.target.closest('.notif-btn')) {
    notifPanel.classList.add('hidden');
  }
});
