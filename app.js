// ================================
// EDUHUB - EĞİTİM PLATFORMU APP
// ================================

// Firebase Configuration - Daha sonra doldurulacak
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD36TC6n4kR6wBoiownR7L2iCQyBrAwq1k",
  authDomain: "a-79192.firebaseapp.com",
  databaseURL: "https://a-79192-default-rtdb.firebaseio.com",
  projectId: "a-79192",
  storageBucket: "a-79192.firebasestorage.app",
  messagingSenderId: "29833951990",
  appId: "1:29833951990:web:36cda4e2ce8fb9ef4b4ad7",
  measurementId: "G-7J1189L9M6"
};

// Initialize Firebase (Şimdilik devre dışı)
// firebase.initializeApp(firebaseConfig);
// const auth = firebase.auth();
// const db = firebase.firestore();
// const storage = firebase.storage();

// ================================
// GLOBAL STATE
// ================================
let currentUser = null;
let isAdmin = false;
let isTeacher = false;
let darkMode = false;
let soundEnabled = true;
let musicEnabled = false;
let currentTool = 'pen';
let drawing = false;
let lastUsernameChange = null;
let blockedUsers = [];
let messages = [];
let currentTest = null;

// Demo data
const demoUsers = [
    { id: '1', username: 'admin', role: 'admin', avatar: 'https://via.placeholder.com/100/6366f1/ffffff?text=A', bio: 'Site Yöneticisi', birthdate: '1990-01-01', points: 9999 },
    { id: '2', username: 'ogretmen1', role: 'teacher', avatar: 'https://via.placeholder.com/100/10b981/ffffff?text=O', bio: 'Matematik Öğretmeni', birthdate: '1985-05-15', points: 5000 },
    { id: '3', username: 'ogrenci1', role: 'student', avatar: 'https://via.placeholder.com/100/ec4899/ffffff?text=S', bio: '12. Sınıf Öğrencisi', birthdate: '2007-08-20', points: 1200 }
];

// ================================
// INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
    showLoading();
    setTimeout(() => {
        hideLoading();
        checkAuthState();
    }, 2000);

    initEmojiPicker();
    initYKSCountdown();
    loadSettings();
    initCanvas();
});

function showLoading() {
    document.getElementById('loading-screen').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 500);
}

// ================================
// AUTHENTICATION
// ================================
function showAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('forgot-form').classList.add('hidden');

    if (tab === 'login') document.getElementById('login-form').classList.remove('hidden');
    else if (tab === 'register') document.getElementById('register-form').classList.remove('hidden');
}

function showForgotPassword() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('forgot-form').classList.remove('hidden');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.target;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Login Form
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    // Demo login - Gerçek uygulamada Firebase Auth kullanılacak
    const user = demoUsers.find(u => u.username === username);

    if (user && password.length >= 6) {
        currentUser = user;
        isAdmin = user.role === 'admin';
        isTeacher = user.role === 'teacher' || user.role === 'admin';

        showToast('Başarıyla giriş yapıldı!', 'success');
        showMainApp();
        updateUI();
    } else {
        showToast('Kullanıcı adı veya şifre hatalı!', 'error');
        shakeElement(document.getElementById('login-form'));
    }
});

// Register Form
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const birthdate = document.getElementById('reg-birthdate').value;
    const avatarFile = document.getElementById('reg-avatar').files[0];

    if (password.length < 6) {
        showToast('Şifre en az 6 karakter olmalı!', 'error');
        return;
    }

    // Demo registration
    const newUser = {
        id: Date.now().toString(),
        username: username,
        email: email,
        role: 'student',
        bio: 'Henüz açıklama eklenmemiş.',
        birthdate: birthdate,
        points: 0,
        avatar: 'https://via.placeholder.com/100/6366f1/ffffff?text=' + username.charAt(0).toUpperCase(),
        zodiac: calculateZodiac(birthdate)
    };

    currentUser = newUser;
    showToast('Kayıt başarılı! Hoş geldiniz.', 'success');
    showMainApp();
    updateUI();
});

// Forgot Password
document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;

    // Demo - Gerçek uygulamada Firebase şifre sıfırlama
    showToast('Şifre sıfırlama linki e-posta adresinize gönderildi!', 'success');
    showAuthTab('login');
});

function checkAuthState() {
    // Firebase auth state listener buraya eklenecek
    // auth.onAuthStateChanged(user => { ... });
}

function showMainApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    loadMessages();
}

function logout() {
    currentUser = null;
    isAdmin = false;
    isTeacher = false;
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
    showToast('Çıkış yapıldı', 'info');
}

// ================================
// UI UPDATES
// ================================
function updateUI() {
    if (!currentUser) return;

    // Update header
    document.getElementById('header-username').textContent = currentUser.username;
    document.getElementById('header-avatar').src = currentUser.avatar;

    // Update profile panel
    document.getElementById('profile-name').textContent = currentUser.username;
    document.getElementById('profile-avatar').src = currentUser.avatar;
    document.getElementById('profile-role').textContent = getRoleText(currentUser.role);
    document.getElementById('profile-bio').textContent = currentUser.bio;
    document.getElementById('profile-zodiac').textContent = 'Burç: ' + (currentUser.zodiac || calculateZodiac(currentUser.birthdate));

    // Show admin elements
    if (isAdmin) {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
    }
}

function getRoleText(role) {
    const roles = {
        'admin': 'Yönetici',
        'teacher': 'Öğretmen',
        'student': 'Öğrenci'
    };
    return roles[role] || 'Öğrenci';
}

// ================================
// PANEL TOGGLES
// ================================
function toggleProfile() {
    const panel = document.getElementById('profile-panel');
    panel.classList.toggle('active');
    document.getElementById('menu-panel').classList.remove('active');
}

function toggleMenu() {
    const panel = document.getElementById('menu-panel');
    panel.classList.toggle('active');
    document.getElementById('profile-panel').classList.remove('active');
}

function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    panel.classList.toggle('active');
    document.getElementById('menu-panel').classList.remove('active');
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.classList.toggle('active');
    document.getElementById('menu-panel').classList.remove('active');
}

function toggleFAB() {
    const fab = document.querySelector('.main-fab');
    const menu = document.querySelector('.fab-menu');
    fab.classList.toggle('active');
    menu.classList.toggle('active');
}

// ================================
// PROFILE FUNCTIONS
// ================================
function editBio() {
    const newBio = prompt('Yeni açıklamanızı girin:', currentUser.bio);
    if (newBio && newBio.trim()) {
        currentUser.bio = newBio.trim();
        document.getElementById('profile-bio').textContent = currentUser.bio;
        showToast('Açıklama güncellendi!', 'success');
    }
}

function changeUsername() {
    const now = Date.now();
    if (lastUsernameChange && now - lastUsernameChange < 7 * 24 * 60 * 60 * 1000) {
        const daysLeft = Math.ceil((7 * 24 * 60 * 60 * 1000 - (now - lastUsernameChange)) / (24 * 60 * 60 * 1000));
        showToast(`Kullanıcı adınızı değiştirmek için ${daysLeft} gün beklemelisiniz!`, 'error');
        return;
    }

    const newUsername = prompt('Yeni kullanıcı adınızı girin (haftada 1 kez değiştirilebilir):', currentUser.username);
    if (newUsername && newUsername.trim() && newUsername.trim() !== currentUser.username) {
        currentUser.username = newUsername.trim();
        lastUsernameChange = now;
        updateUI();
        showToast('Kullanıcı adı güncellendi!', 'success');
    }
}

function resetPassword() {
    const email = prompt('Şifre sıfırlama linki için e-posta adresinizi girin:', currentUser.email || '');
    if (email) {
        // Firebase şifre sıfırlama
        showToast('Şifre sıfırlama linki gönderildi!', 'success');
    }
}

function showRanking() {
    closeAllPanels();
    document.getElementById('ranking-modal').classList.add('active');
    loadRanking();
}

// ================================
// YKS COUNTDOWN
// ================================
function initYKSCountdown() {
    // YKS 2026: 20-21 Haziran 2026 - TYT 20 Haziran 2026 10:15
    const yksDate = new Date('2026-06-20T10:15:00');

    function updateCountdown() {
        const now = new Date();
        const diff = yksDate - now;

        if (diff <= 0) {
            document.getElementById('yks-timer').textContent = 'YKS başladı! Başarılar!';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('yks-timer').textContent = 
            `TYT'ye ${days} gün ${hours} saat ${minutes} dk ${seconds} sn`;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ================================
// CHAT FUNCTIONS
// ================================
function initEmojiPicker() {
    const emojis = ['😀', '😂', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🎉', '🔥', 
                    '😭', '😡', '👏', '🙏', '💪', '📚', '✅', '❌', '⭐', '💯',
                    '🤣', '😍', '🥳', '😴', '🤯', '👀', '🎓', '💡', '📝', '🎯'];

    const picker = document.getElementById('emoji-picker');
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.onclick = () => insertEmoji(emoji);
        picker.appendChild(span);
    });
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    picker.classList.toggle('hidden');
    document.getElementById('attach-menu').classList.add('hidden');
}

function insertEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.value += emoji;
    document.getElementById('emoji-picker').classList.add('hidden');
    input.focus();
}

function showAttachMenu() {
    const menu = document.getElementById('attach-menu');
    menu.classList.toggle('hidden');
    document.getElementById('emoji-picker').classList.add('hidden');
}

function attachFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            sendMessage(`📎 Dosya: ${file.name}`);
        }
    };
    input.click();
    document.getElementById('attach-menu').classList.add('hidden');
}

function attachImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                sendMessageWithImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
    document.getElementById('attach-menu').classList.add('hidden');
}

function attachGIF() {
    const gifUrl = prompt('GIF URL'sini yapıştırın:');
    if (gifUrl) {
        sendMessage(`![GIF](${gifUrl})`);
    }
    document.getElementById('attach-menu').classList.add('hidden');
}

function handleMessageKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage(content = null) {
    const input = document.getElementById('message-input');
    const message = content || input.value.trim();

    if (!message) return;

    const messageData = {
        id: Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        content: message,
        timestamp: new Date(),
        type: 'text'
    };

    messages.push(messageData);
    displayMessage(messageData);

    if (!content) input.value = '';

    // Scroll to bottom
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessageWithImage(imageUrl) {
    const messageData = {
        id: Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        content: imageUrl,
        timestamp: new Date(),
        type: 'image'
    };

    messages.push(messageData);
    displayMessage(messageData);
}

function displayMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const isOwn = message.userId === currentUser.id;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;

    let contentHtml = '';
    if (message.type === 'image') {
        contentHtml = `<img src="${message.content}" alt="Resim">`;
    } else {
        contentHtml = `<div class="message-content">${escapeHtml(message.content)}</div>`;
    }

    messageDiv.innerHTML = `
        <div class="message-header">
            <img src="${message.avatar}" alt="${message.username}">
            <span>${escapeHtml(message.username)}</span>
        </div>
        ${contentHtml}
        <div class="message-time">${formatTime(message.timestamp)}</div>
    `;

    chatMessages.appendChild(messageDiv);
}

function loadMessages() {
    // Demo messages
    const demoMessages = [
        {
            id: 1,
            userId: '2',
            username: 'ogretmen1',
            avatar: 'https://via.placeholder.com/100/10b981/ffffff?text=O',
            content: 'Herkese başarılar! YKS'ye hazırlık devam ediyor. Sorularınızı buradan sorabilirsiniz. 📚',
            timestamp: new Date(Date.now() - 3600000),
            type: 'text'
        },
        {
            id: 2,
            userId: '3',
            username: 'ogrenci1',
            avatar: 'https://via.placeholder.com/100/ec4899/ffffff?text=S',
            content: 'Teşekkürler hocam! Matematik denemesi çok faydalı oldu. 💯',
            timestamp: new Date(Date.now() - 1800000),
            type: 'text'
        }
    ];

    messages = demoMessages;
    messages.forEach(m => displayMessage(m));
}

// ================================
// TEST & EXAM FUNCTIONS
// ================================
function openTests() {
    closeAllPanels();
    showToast('Testler yükleniyor...', 'info');
    // Test listesi modalı açılacak
    openTestModal('TYT Matematik Denemesi 1');
}

function openTestBooks() {
    closeAllPanels();
    showToast('Test kitapları yükleniyor...', 'info');
}

function openExams() {
    closeAllPanels();
    showToast('Deneme sınavları yükleniyor...', 'info');
}

function openTestModal(testTitle) {
    document.getElementById('test-title').textContent = testTitle;
    document.getElementById('test-modal').classList.add('active');
    loadTestQuestions();
}

function loadTestQuestions() {
    const container = document.getElementById('test-container');
    container.innerHTML = '';

    // Demo sorular
    const questions = [
        {
            id: 1,
            question: 'Aşağıdaki sayılardan hangisi asal sayıdır?',
            options: ['15', '17', '21', '27'],
            correct: 1
        },
        {
            id: 2,
            question: 'Bir üçgenin iç açıları toplamı kaç derecedir?',
            options: ['90°', '180°', '270°', '360°'],
            correct: 1
        },
        {
            id: 3,
            question: 'x² - 4 = 0 denkleminin çözüm kümesi nedir?',
            options: ['{-2, 2}', '{-4, 4}', '{2}', '{-2}'],
            correct: 0
        }
    ];

    questions.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'test-question';
        qDiv.innerHTML = `
            <h4>Soru ${index + 1}: ${escapeHtml(q.question)}</h4>
            <div class="test-options">
                ${q.options.map((opt, i) => `
                    <label class="test-option">
                        <input type="radio" name="q${q.id}" value="${i}">
                        <span>${String.fromCharCode(65 + i)}) ${escapeHtml(opt)}</span>
                    </label>
                `).join('')}
            </div>
        `;
        container.appendChild(qDiv);
    });

    // Add selection listeners
    document.querySelectorAll('.test-option').forEach(opt => {
        opt.addEventListener('click', function() {
            this.parentElement.querySelectorAll('.test-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input').checked = true;
        });
    });
}

function submitTest() {
    let correct = 0;
    let total = 0;

    document.querySelectorAll('.test-question').forEach(q => {
        total++;
        const selected = q.querySelector('input:checked');
        if (selected) {
            // Demo scoring
            if (Math.random() > 0.5) correct++;
        }
    });

    const score = Math.round((correct / total) * 100);
    currentUser.points = (currentUser.points || 0) + score;

    showToast(`Test tamamlandı! Puanınız: ${score}`, score >= 50 ? 'success' : 'warning');
    closeModal('test-modal');
    updateUI();
}

// ================================
// DRAWING CANVAS
// ================================
function initCanvas() {
    const canvas = document.getElementById('drawing-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    canvas.addEventListener('mousedown', (e) => {
        drawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!drawing) return;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();

        [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    canvas.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('mouseout', () => drawing = false);

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        drawing = true;
        [lastX, lastY] = [touch.clientX - rect.left, touch.clientY - rect.top];
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!drawing) return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        ctx.stroke();

        [lastX, lastY] = [touch.clientX - rect.left, touch.clientY - rect.top];
    });

    canvas.addEventListener('touchend', () => drawing = false);
}

function selectTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tool-btn').classList.add('active');

    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');

    switch(tool) {
        case 'pen':
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = 2;
            break;
        case 'highlighter':
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = 15;
            ctx.globalAlpha = 0.3;
            break;
        case 'eraser':
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 20;
            break;
    }
}

function changePenColor() {
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = document.getElementById('pen-color').value;
    ctx.globalAlpha = 1;
}

function changePenSize() {
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = document.getElementById('pen-size').value;
}

function clearCanvas() {
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function toggleCalculator() {
    document.getElementById('calculator-modal').classList.add('active');
}

// ================================
// CALCULATOR
// ================================
let calcExpression = '';

function calcAppend(value) {
    calcExpression += value;
    document.getElementById('calc-display').value = calcExpression;
}

function calcClear() {
    calcExpression = '';
    document.getElementById('calc-display').value = '';
}

function calcBackspace() {
    calcExpression = calcExpression.slice(0, -1);
    document.getElementById('calc-display').value = calcExpression;
}

function calcCalculate() {
    try {
        const result = eval(calcExpression);
        calcExpression = result.toString();
        document.getElementById('calc-display').value = calcExpression;
    } catch (e) {
        document.getElementById('calc-display').value = 'Hata';
        calcExpression = '';
    }
}

// ================================
// RANKING FUNCTIONS
// ================================
function loadRanking() {
    const list = document.getElementById('ranking-list');
    list.innerHTML = '';

    // Sort users by points
    const sortedUsers = [...demoUsers].sort((a, b) => (b.points || 0) - (a.points || 0));

    sortedUsers.forEach((user, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';

        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.onclick = () => viewUserProfile(user);
        item.innerHTML = `
            <div class="rank-number ${rankClass}">${rank}</div>
            <div class="ranking-info">
                <img src="${user.avatar}" alt="${user.username}">
                <div class="ranking-details">
                    <h4>${escapeHtml(user.username)}</h4>
                    <p>${getRoleText(user.role)}</p>
                </div>
            </div>
            <div class="ranking-score">${user.points || 0} Puan</div>
        `;
        list.appendChild(item);
    });

    document.getElementById('total-users').textContent = sortedUsers.length;
}

function searchRanking() {
    const search = document.getElementById('ranking-search').value.toLowerCase();
    document.querySelectorAll('.ranking-item').forEach(item => {
        const username = item.querySelector('h4').textContent.toLowerCase();
        item.style.display = username.includes(search) ? 'flex' : 'none';
    });
}

function viewUserProfile(user) {
    const modal = document.getElementById('user-profile-modal');
    const content = document.getElementById('view-profile-content');

    content.innerHTML = `
        <div class="profile-view-header">
            <img src="${user.avatar}" alt="${user.username}">
            <h3>${escapeHtml(user.username)}</h3>
            <p>${getRoleText(user.role)}</p>
            <p>Burç: ${user.zodiac || calculateZodiac(user.birthdate)}</p>
        </div>
        <div class="profile-view-body">
            <h4>Hakkında</h4>
            <p>${escapeHtml(user.bio || 'Henüz açıklama eklenmemiş.')}</p>
            <h4>Puanlar</h4>
            <p>Toplam: ${user.points || 0} puan</p>
        </div>
    `;

    modal.classList.add('active');
}

// ================================
// ADMIN PANEL
// ================================
function openAdminPanel() {
    if (!isAdmin) {
        showToast('Bu işlem için yönetici yetkisi gerekiyor!', 'error');
        return;
    }
    document.getElementById('admin-modal').classList.add('active');
}

function showAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    event.target.closest('.admin-tab').classList.add('active');

    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`admin-${tab}`).classList.remove('hidden');

    if (tab === 'users') loadUserManagement();
}

function setUploadType(type) {
    document.querySelectorAll('.upload-type-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function addQuestion() {
    const container = document.getElementById('questions-list');
    const qNum = container.children.length + 1;

    const qDiv = document.createElement('div');
    qDiv.className = 'question-box';
    qDiv.innerHTML = `
        <h5>Soru ${qNum}</h5>
        <input type="text" placeholder="Soru metni" class="question-text">
        <div class="question-options">
            <input type="text" placeholder="A seçeneği">
            <input type="text" placeholder="B seçeneği">
            <input type="text" placeholder="C seçeneği">
            <input type="text" placeholder="D seçeneği">
            <input type="text" placeholder="E seçeneği">
        </div>
        <select class="correct-answer">
            <option value="0">A</option>
            <option value="1">B</option>
            <option value="2">C</option>
            <option value="3">D</option>
            <option value="4">E</option>
        </select>
    `;
    container.appendChild(qDiv);
}

function loadUserManagement() {
    const list = document.getElementById('users-list');
    list.innerHTML = '';

    demoUsers.forEach(user => {
        if (user.id === currentUser.id) return;

        const item = document.createElement('div');
        item.className = 'user-item';
        item.innerHTML = `
            <div class="user-info">
                <img src="${user.avatar}" alt="${user.username}">
                <div>
                    <h4>${escapeHtml(user.username)}</h4>
                    <p>${getRoleText(user.role)}</p>
                </div>
            </div>
            <div class="user-actions">
                ${user.role !== 'teacher' ? `<button class="role-btn teacher" onclick="makeTeacher('${user.id}')">Öğretmen Yap</button>` : ''}
                ${user.role !== 'admin' ? `<button class="role-btn admin" onclick="makeAdmin('${user.id}')">Admin Yap</button>` : ''}
                <button class="role-btn remove" onclick="removeUser('${user.id}')">Kaldır</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function searchUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    document.querySelectorAll('.user-item').forEach(item => {
        const username = item.querySelector('h4').textContent.toLowerCase();
        item.style.display = username.includes(search) ? 'flex' : 'none';
    });
}

function makeTeacher(userId) {
    const user = demoUsers.find(u => u.id === userId);
    if (user) {
        user.role = 'teacher';
        showToast(`${user.username} artık öğretmen!`, 'success');
        loadUserManagement();
    }
}

function makeAdmin(userId) {
    const user = demoUsers.find(u => u.id === userId);
    if (user) {
        user.role = 'admin';
        showToast(`${user.username} artık yönetici!`, 'success');
        loadUserManagement();
    }
}

function removeUser(userId) {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

    const index = demoUsers.findIndex(u => u.id === userId);
    if (index > -1) {
        demoUsers.splice(index, 1);
        showToast('Kullanıcı kaldırıldı', 'success');
        loadUserManagement();
    }
}

// ================================
// SETTINGS
// ================================
function loadSettings() {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedSound = localStorage.getItem('soundEnabled') !== 'false';

    if (savedDarkMode) toggleDarkMode(true);
    document.getElementById('sound-toggle').checked = savedSound;
}

function toggleDarkMode(force = null) {
    darkMode = force !== null ? force : !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem('darkMode', darkMode);

    if (!force) showToast(darkMode ? 'Karanlık mod aktif' : 'Aydınlık mod aktif', 'info');
}

function toggleSound() {
    soundEnabled = document.getElementById('sound-toggle').checked;
    localStorage.setItem('soundEnabled', soundEnabled);
    showToast(soundEnabled ? 'Ses efektleri açık' : 'Ses efektleri kapalı', 'info');
}

function toggleMusic() {
    musicEnabled = document.getElementById('music-toggle').checked;
    showToast(musicEnabled ? 'Müzik açık (demo)' : 'Müzik kapalı', 'info');
}

function showBlockedUsers() {
    if (blockedUsers.length === 0) {
        showToast('Henüz engellenen kullanıcı yok', 'info');
        return;
    }
    // Blocked users list modal
}

// ================================
// MENU FUNCTIONS
// ================================
function openBestScores() {
    closeAllPanels();
    showToast('En iyi dereceler yükleniyor...', 'info');
    showRanking();
}

function openTeachers() {
    closeAllPanels();
    showToast('Öğretmenler listesi yükleniyor...', 'info');
}

function openAdminDM() {
    closeAllPanels();
    showToast('Yönetici DM açılıyor...', 'info');
}

function openWritings() {
    closeAllPanels();
    showToast('Yazılılar yükleniyor...', 'info');
}

function openScenarios() {
    closeAllPanels();
    showToast('Senaryolar yükleniyor...', 'info');
}

function openSchedule() {
    closeAllPanels();
    showToast('Ders programı yükleniyor...', 'info');
}

function openSchoolPhotos() {
    closeAllPanels();
    showToast('Okul fotoğrafları yükleniyor...', 'info');
}

function openSchoolTeachers() {
    closeAllPanels();
    showToast('Okul öğretmenleri yükleniyor...', 'info');
}

function manageData(type) {
    const area = document.getElementById('data-management-area');
    area.innerHTML = `
        <h4>${type.toUpperCase()} Yönetimi</h4>
        <p>Bu bölümde ${type} verilerini ekleyebilir, düzenleyebilir ve silebilirsiniz.</p>
        <button class="btn primary" onclick="addDataEntry('${type}')">
            <i class="fas fa-plus"></i> Yeni Ekle
        </button>
    `;
}

function addDataEntry(type) {
    showToast(`${type} için yeni kayıt ekleme modalı açılacak`, 'info');
}

// ================================
// UTILITY FUNCTIONS
// ================================
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeAllPanels() {
    document.querySelectorAll('.side-panel').forEach(panel => {
        panel.classList.remove('active');
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function calculateZodiac(birthdate) {
    if (!birthdate) return 'Belirsiz';

    const date = new Date(birthdate);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    const zodiacSigns = [
        { sign: 'Oğlak', start: [1, 1], end: [1, 19] },
        { sign: 'Kova', start: [1, 20], end: [2, 18] },
        { sign: 'Balık', start: [2, 19], end: [3, 20] },
        { sign: 'Koç', start: [3, 21], end: [4, 19] },
        { sign: 'Boğa', start: [4, 20], end: [5, 20] },
        { sign: 'İkizler', start: [5, 21], end: [6, 20] },
        { sign: 'Yengeç', start: [6, 21], end: [7, 22] },
        { sign: 'Aslan', start: [7, 23], end: [8, 22] },
        { sign: 'Başak', start: [8, 23], end: [9, 22] },
        { sign: 'Terazi', start: [9, 23], end: [10, 22] },
        { sign: 'Akrep', start: [10, 23], end: [11, 21] },
        { sign: 'Yay', start: [11, 22], end: [12, 21] },
        { sign: 'Oğlak', start: [12, 22], end: [12, 31] }
    ];

    for (let z of zodiacSigns) {
        if ((month === z.start[0] && day >= z.start[1]) || 
            (month === z.end[0] && day <= z.end[1])) {
            return z.sign;
        }
    }
    return 'Belirsiz';
}

// ================================
// NOTIFICATIONS (ADMIN)
// ================================
document.getElementById('notif-type')?.addEventListener('change', function() {
    const specificGroup = document.getElementById('specific-user-group');
    specificGroup.classList.toggle('hidden', this.value !== 'specific');
});

document.getElementById('notif-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('notif-type').value;
    const title = document.getElementById('notif-title').value;
    const message = document.getElementById('notif-message').value;

    if (type === 'all') {
        showToast(`Tüm kullanıcılara bildirim gönderildi: ${title}`, 'success');
    } else {
        const username = document.getElementById('notif-username').value;
        showToast(`${username} kullanıcısına bildirim gönderildi: ${title}`, 'success');
    }

    document.getElementById('notif-form').reset();
});

// ================================
// KEYBOARD SHORTCUTS
// ================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        closeAllPanels();
    }
});

// ================================
// WINDOW RESIZE
// ================================
window.addEventListener('resize', () => {
    const canvas = document.getElementById('drawing-canvas');
    if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
});

// Demo notifications
setTimeout(() => {
    if (currentUser) {
        showToast('Yeni bir deneme sınavı eklendi: TYT Matematik Denemesi 2', 'info');
    }
}, 10000);

console.log('EduHub App initialized successfully! 🎓');
