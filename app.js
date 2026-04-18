// ═══════════════════════════════════════════
//  ŞAHİKALİ — App Logic
// ═══════════════════════════════════════════

const STORAGE_KEY = 'sahikali_books';

const CAT_ICONS = {
  'Matematik': '📐', 'Fen Bilimleri': '⚛️', 'Türkçe / Edebiyat': '📖',
  'Tarih / Sosyal': '🗺️', 'Yabancı Dil': '🌍', 'Fen Lisesi': '🔬',
  'YKS / TYT / AYT': '🎯', 'LGS': '📏', 'Okuma Kitabı': '📚', 'Diğer': '📂'
};

// ── STATE ──────────────────────────────────
let books = [];
let currentSec = 'anasayfa';
let selectedCat = null;
let selectedPub = null;
let activeColor = '#E85D5D';
let activeTool = 'pen';
let drawingEnabled = false;
let isDrawing = false;
let lastX = 0, lastY = 0;
let currentModal = null;
let selectedCoverColor = 'c1';
let pdfBlobs = {};
let homeFilterPub = null;

// ── INIT ───────────────────────────────────
function init() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { books = JSON.parse(raw); } catch(e) { books = []; } }

  // nav
  document.querySelectorAll('.nav-btn[data-sec]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.sec));
  });

  // search
  document.getElementById('searchInput').addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q.length > 0) {
      showSection('anasayfa');
      renderHomeGrid(books.filter(b =>
        b.title.toLowerCase().includes(q.toLowerCase()) ||
        (b.author||'').toLowerCase().includes(q.toLowerCase()) ||
        (b.pub||'').toLowerCase().includes(q.toLowerCase()) ||
        (b.cat||'').toLowerCase().includes(q.toLowerCase())
      ));
    } else {
      renderHomeGrid(books);
    }
  });

  // cover colors
  document.querySelectorAll('.cc').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.cc').forEach(c => c.classList.remove('on'));
      el.classList.add('on');
      selectedCoverColor = el.dataset.c;
    });
  });

  // source type toggle
  document.getElementById('fType').addEventListener('change', e => {
    document.getElementById('fLinkWrap').style.display = e.target.value === 'link' ? '' : 'none';
    document.getElementById('fPdfWrap').style.display = e.target.value === 'pdf' ? '' : 'none';
  });

  // pdf file select in admin
  document.getElementById('fPdfFile').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) document.getElementById('fPdfName').textContent = f.name;
  });

  // pdf reader file input
  document.getElementById('pdfInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) openPDFFile(f, f.name);
  });

  // color picker
  document.querySelectorAll('.col-dot').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.col-dot').forEach(c => c.classList.remove('on'));
      el.classList.add('on');
      activeColor = el.dataset.color;
    });
  });

  // brush size
  const bsz = document.getElementById('brushSize');
  bsz.addEventListener('input', () => {
    document.getElementById('brushSizeVal').textContent = bsz.value;
  });

  // canvas setup
  setupCanvas();

  renderAll();
}

// ── SAVE ───────────────────────────────────
function save() {
  const toSave = books.map(b => {
    const copy = {...b};
    if (copy.pdfBlobKey) delete copy.pdfBlobKey; // don't persist blob keys
    return copy;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

// ── RENDER ─────────────────────────────────
function renderAll() {
  updateStats();
  renderHomeFilter();
  renderHomeGrid(books);
  renderCats();
  renderPubs();
  renderAdminList();
}

function updateStats() {
  const pubs = [...new Set(books.map(b => b.pub).filter(Boolean))];
  const cats = [...new Set(books.map(b => b.cat).filter(Boolean))];
  document.getElementById('bookCount').textContent = books.length;
  document.getElementById('statBooks').textContent = books.length;
  document.getElementById('statPubs').textContent = pubs.length;
  document.getElementById('statCats').textContent = cats.length;
  document.getElementById('adminCount').textContent = books.length;
}

function renderHomeFilter() {
  const pubs = [...new Set(books.map(b => b.pub).filter(Boolean))];
  const row = document.getElementById('homeFilter');
  let html = `<button class="filter-btn ${!homeFilterPub ? 'on' : ''}" onclick="setHomeFilter(null)">Tümü</button>`;
  pubs.forEach(p => {
    html += `<button class="filter-btn ${homeFilterPub === p ? 'on' : ''}" onclick="setHomeFilter('${p.replace(/'/g,"\\'")}')"> ${p}</button>`;
  });
  row.innerHTML = html;
}

function setHomeFilter(pub) {
  homeFilterPub = pub;
  renderHomeFilter();
  renderHomeGrid(pub ? books.filter(b => b.pub === pub) : books);
}

function renderHomeGrid(list) {
  const grid = document.getElementById('homeGrid');
  const empty = document.getElementById('homeEmpty');
  if (!list || list.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = list.map(b => bookCardHTML(b)).join('');
}

function bookCardHTML(b) {
  return `<div class="bcard" onclick="openModal('${b.id}')">
    <div class="bcover ${b.cover || 'c1'}">
      <span class="pub-label">${b.pub || ''}</span>
    </div>
    <div class="binfo">
      <div class="btitle">${b.title}</div>
      <div class="bauthor">${b.author || '—'}</div>
      <span class="btag tag-cat">${b.cat || 'Genel'}</span>
      ${b.pub ? `<span class="btag tag-pub">${b.pub}</span>` : ''}
    </div>
  </div>`;
}

function renderCats() {
  const cats = {};
  books.forEach(b => { if (b.cat) cats[b.cat] = (cats[b.cat]||0) + 1; });
  const grid = document.getElementById('catGrid');
  if (Object.keys(cats).length === 0) {
    grid.innerHTML = '<p style="color:var(--text3);font-size:13px;">Henüz kategori yok.</p>';
    return;
  }
  grid.innerHTML = Object.entries(cats).map(([cat, cnt]) =>
    `<div class="cat-card ${selectedCat === cat ? 'on' : ''}" onclick="filterByCat('${cat.replace(/'/g,"\\'")}')">
      <div class="cat-ico">${CAT_ICONS[cat] || '📂'}</div>
      <div class="cat-name">${cat}</div>
      <div class="cat-cnt">${cnt} kitap</div>
    </div>`
  ).join('');
  filterByCat(selectedCat || Object.keys(cats)[0], false);
}

function filterByCat(cat, update = true) {
  selectedCat = cat;
  if (update) renderCats();
  const filtered = books.filter(b => b.cat === cat);
  document.getElementById('catBooksGrid').innerHTML = filtered.length
    ? filtered.map(b => bookCardHTML(b)).join('')
    : '<p style="color:var(--text3);font-size:13px;padding:8px 0;">Bu kategoride kitap yok.</p>';
}

function renderPubs() {
  const pubs = {};
  books.forEach(b => { if (b.pub) pubs[b.pub] = (pubs[b.pub]||0) + 1; });
  const grid = document.getElementById('pubGrid');
  if (Object.keys(pubs).length === 0) {
    grid.innerHTML = '<p style="color:var(--text3);font-size:13px;">Henüz yayın eklenmedi.</p>';
    return;
  }
  grid.innerHTML = Object.entries(pubs).map(([pub, cnt]) =>
    `<div class="pub-card ${selectedPub === pub ? 'on' : ''}" onclick="filterByPub('${pub.replace(/'/g,"\\'")}')">
      <div class="pub-dot"></div>
      <div>
        <div class="pub-name">${pub}</div>
        <div class="pub-cnt">${cnt} kitap</div>
      </div>
    </div>`
  ).join('');
  filterByPub(selectedPub || Object.keys(pubs)[0], false);
}

function filterByPub(pub, update = true) {
  selectedPub = pub;
  if (update) renderPubs();
  const filtered = books.filter(b => b.pub === pub);
  document.getElementById('pubBooksGrid').innerHTML = filtered.length
    ? filtered.map(b => bookCardHTML(b)).join('')
    : '<p style="color:var(--text3);font-size:13px;padding:8px 0;">Bu yayından kitap yok.</p>';
}

function renderAdminList() {
  const list = document.getElementById('adminBookList');
  if (books.length === 0) {
    list.innerHTML = '<p style="color:var(--text3);font-size:13px;">Henüz kitap eklenmedi.</p>';
    return;
  }
  list.innerHTML = books.map(b => `
    <div class="admin-book-row">
      <div class="abr-cover ${b.cover || 'c1'}"></div>
      <div class="abr-info">
        <div class="abr-title">${b.title}</div>
        <div class="abr-meta">${b.pub || '—'} · ${b.cat || '—'} · ${b.type === 'pdf' ? 'PDF' : 'Link'}</div>
      </div>
      <button class="abr-del" onclick="deleteBook('${b.id}')">Sil</button>
    </div>
  `).join('');
}

// ── ADD BOOK ───────────────────────────────
async function addBook() {
  const title = document.getElementById('fTitle').value.trim();
  const author = document.getElementById('fAuthor').value.trim();
  const cat = document.getElementById('fCat').value;
  const pub = document.getElementById('fPub').value.trim();
  const type = document.getElementById('fType').value;
  const link = document.getElementById('fLink').value.trim();
  const pdfFile = document.getElementById('fPdfFile').files[0];

  if (!title) { alert('Kitap adı gerekli!'); return; }
  if (!cat) { alert('Kategori seç!'); return; }
  if (!pub) { alert('Yayın adı gerekli!'); return; }
  if (type === 'link' && !link) { alert('Bağlantı URL gir!'); return; }
  if (type === 'pdf' && !pdfFile) { alert('PDF dosyası seç!'); return; }

  const id = 'book_' + Date.now();
  const book = { id, title, author, cat, pub, type, cover: selectedCoverColor };

  if (type === 'pdf' && pdfFile) {
    const blobUrl = URL.createObjectURL(pdfFile);
    pdfBlobs[id] = blobUrl;
    book.pdfBlobKey = id;
    book.fileName = pdfFile.name;
  } else {
    book.link = link;
  }

  books.unshift(book);
  save();
  renderAll();

  // reset form
  document.getElementById('fTitle').value = '';
  document.getElementById('fAuthor').value = '';
  document.getElementById('fCat').value = '';
  document.getElementById('fPub').value = '';
  document.getElementById('fLink').value = '';
  document.getElementById('fPdfFile').value = '';
  document.getElementById('fPdfName').textContent = 'Dosya seçmek için tıkla';
  showSection('anasayfa');
}

function deleteBook(id) {
  if (!confirm('Bu kitabı silmek istediğine emin misin?')) return;
  books = books.filter(b => b.id !== id);
  if (pdfBlobs[id]) { URL.revokeObjectURL(pdfBlobs[id]); delete pdfBlobs[id]; }
  save();
  renderAll();
}

// ── MODAL ──────────────────────────────────
function openModal(id) {
  const b = books.find(x => x.id === id);
  if (!b) return;
  currentModal = b;
  document.getElementById('modalCover').className = 'modal-cover ' + (b.cover || 'c1');
  document.getElementById('modalPub').textContent = b.pub || '';
  document.getElementById('modalTitle').textContent = b.title;
  document.getElementById('modalAuthor').textContent = b.author || '';
  document.getElementById('modalTags').innerHTML =
    `<span class="btag tag-cat">${b.cat || 'Genel'}</span>` +
    (b.pub ? `<span class="btag tag-pub">${b.pub}</span>` : '') +
    `<span class="btag tag-cat">${b.type === 'pdf' ? 'PDF' : 'Link'}</span>`;

  const readBtn = document.getElementById('modalReadBtn');
  const linkBtn = document.getElementById('modalLinkBtn');
  readBtn.style.display = (b.type === 'pdf' || b.pdfBlobKey) ? '' : 'none';
  linkBtn.style.display = b.link ? '' : 'none';
  if (!readBtn.style.display && !linkBtn.style.display) readBtn.style.display = '';

  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function openLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openFromModal() {
  if (!currentModal) return;
  closeModal();
  const b = currentModal;
  if (b.pdfBlobKey && pdfBlobs[b.pdfBlobKey]) {
    openPDFUrl(pdfBlobs[b.pdfBlobKey], b.title);
  } else if (b.link) {
    openPDFUrl(b.link, b.title);
  }
  showSection('reader');
}

function openLinkFromModal() {
  if (!currentModal || !currentModal.link) return;
  closeModal();
  openLink(currentModal.link);
}

// ── READER ────────────────────────────────
function openPDFFile(file, name) {
  const url = URL.createObjectURL(file);
  openPDFUrl(url, name);
}

function openPDFUrl(url, name) {
  document.getElementById('readerDrop').style.display = 'none';
  document.getElementById('readerActive').style.display = 'flex';
  document.getElementById('pdfFrame').src = url;
  document.getElementById('readerTitle').textContent = name || 'PDF Okuyucu';
  showSection('reader');
  setTimeout(resizeCanvas, 300);
}

function closeReader() {
  document.getElementById('readerDrop').style.display = 'flex';
  document.getElementById('readerActive').style.display = 'none';
  document.getElementById('pdfFrame').src = '';
  clearCanvas();
  drawingEnabled = false;
  document.getElementById('drawCanvas').className = '';
  document.getElementById('toolDraw').classList.remove('on');
}

// ── CANVAS / DRAWING ──────────────────────
function setupCanvas() {
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');

  canvas.addEventListener('mousedown', e => { if (!drawingEnabled) return; isDrawing = true; const r = canvas.getBoundingClientRect(); lastX = e.clientX - r.left; lastY = e.clientY - r.top; });
  canvas.addEventListener('mousemove', e => {
    if (!isDrawing || !drawingEnabled) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    draw(ctx, lastX, lastY, x, y);
    lastX = x; lastY = y;
  });
  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('mouseleave', () => isDrawing = false);

  // touch
  canvas.addEventListener('touchstart', e => {
    if (!drawingEnabled) return;
    e.preventDefault(); isDrawing = true;
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    lastX = t.clientX - r.left; lastY = t.clientY - r.top;
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    if (!isDrawing || !drawingEnabled) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const x = t.clientX - r.left, y = t.clientY - r.top;
    draw(ctx, lastX, lastY, x, y);
    lastX = x; lastY = y;
  }, { passive: false });
  canvas.addEventListener('touchend', () => isDrawing = false);
}

function draw(ctx, x1, y1, x2, y2) {
  const sz = parseInt(document.getElementById('brushSize').value);
  ctx.lineWidth = activeTool === 'underline' ? 4 : sz;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (activeTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else if (activeTool === 'underline') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = activeColor;
    y1 = Math.round(y1 / 24) * 24 + 20;
    y2 = Math.round(y2 / 24) * 24 + 20;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = activeColor;
  }

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function resizeCanvas() {
  const canvas = document.getElementById('drawCanvas');
  const wrap = document.getElementById('canvasWrap');
  canvas.width = wrap.offsetWidth;
  canvas.height = wrap.offsetHeight;
}

function setTool(tool) {
  activeTool = tool;
  ['pen','underline','eraser'].forEach(t => {
    const btn = document.getElementById('tool' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle('on', t === tool);
  });
  const canvas = document.getElementById('drawCanvas');
  if (tool === 'eraser') canvas.style.cursor = 'cell';
  else canvas.style.cursor = 'crosshair';
  if (!drawingEnabled) enableDraw();
}

function toggleDraw() {
  drawingEnabled ? disableDraw() : enableDraw();
}

function enableDraw() {
  drawingEnabled = true;
  const canvas = document.getElementById('drawCanvas');
  canvas.className = activeTool === 'eraser' ? 'erasing' : 'drawing';
  document.getElementById('toolDraw').classList.add('on');
}

function disableDraw() {
  drawingEnabled = false;
  document.getElementById('drawCanvas').className = '';
  document.getElementById('toolDraw').classList.remove('on');
}

function clearCanvas() {
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ── NAV ───────────────────────────────────
function showSection(id) {
  if (id === 'admin' && !adminUnlocked) {
    openKonami();
    return;
  }
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-sec="${id}"]`);
  if (btn) btn.classList.add('active');
  currentSec = id;
  if (id === 'kategoriler') renderCats();
  if (id === 'yayinlar') renderPubs();
  if (id === 'admin') renderAdminList();
  window.scrollTo(0, 0);
}

// ── KONAMI ────────────────────────────────
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyS','KeyA'];
let konamiProgress = 0;
let konamiTimer = null;
let adminUnlocked = false;

function openKonami() {
  konamiProgress = 0;
  updateKonamiUI();
  document.getElementById('konamiHint').textContent = 'Gizli kombinasyonu gir';
  document.getElementById('konamiHint').style.color = 'var(--text3)';
  document.getElementById('konamiOverlay').classList.add('open');
}

function closeKonami() {
  document.getElementById('konamiOverlay').classList.remove('open');
  konamiProgress = 0;
  updateKonamiUI();
}

function updateKonamiUI() {
  for (let i = 0; i < 10; i++) {
    const el = document.getElementById('kk' + i);
    if (!el) continue;
    el.classList.remove('active','done');
    if (i < konamiProgress) el.classList.add('done');
    else if (i === konamiProgress) el.classList.add('active');
  }
}

function handleKonamiKey(e) {
  if (!document.getElementById('konamiOverlay').classList.contains('open')) return;
  if (e.code === 'Escape') { closeKonami(); return; }
  clearTimeout(konamiTimer);

  if (e.code === KONAMI[konamiProgress]) {
    konamiProgress++;
    updateKonamiUI();
    if (konamiProgress === KONAMI.length) {
      document.getElementById('konamiHint').textContent = '✓ Erişim sağlandı';
      document.getElementById('konamiHint').style.color = '#5DE89A';
      adminUnlocked = true;
      document.getElementById('adminIndicator').style.display = '';
      setTimeout(() => { closeKonami(); showSection('admin'); }, 700);
    } else {
      konamiTimer = setTimeout(() => {
        konamiProgress = 0; updateKonamiUI();
        document.getElementById('konamiHint').textContent = 'Süre doldu, tekrar dene';
        document.getElementById('konamiHint').style.color = 'var(--accent)';
        setTimeout(() => {
          document.getElementById('konamiHint').textContent = 'Gizli kombinasyonu gir';
          document.getElementById('konamiHint').style.color = 'var(--text3)';
        }, 1200);
      }, 3000);
    }
  } else {
    konamiProgress = 0; updateKonamiUI();
    document.getElementById('konamiHint').textContent = 'Yanlış tuş! Baştan başla';
    document.getElementById('konamiHint').style.color = 'var(--accent)';
    setTimeout(() => {
      document.getElementById('konamiHint').textContent = 'Gizli kombinasyonu gir';
      document.getElementById('konamiHint').style.color = 'var(--text3)';
    }, 1000);
  }
}

// Logo'ya 5x hızlı tıklama → mobil erişim
let logoTaps = 0; let logoTapTimer = null;
function handleLogoTap() {
  logoTaps++;
  clearTimeout(logoTapTimer);
  logoTapTimer = setTimeout(() => { logoTaps = 0; }, 1500);
  if (logoTaps >= 5) { logoTaps = 0; openKonami(); }
}

// Klavye dinleyici
window.addEventListener('keydown', handleKonamiKey);

// showSection guard — admin'e doğrudan erişimi engelle
const _originalShowSection = showSection;

// ── START ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  init();
  // Logo tıklama
  document.querySelector('.logo-mark').style.cursor = 'pointer';
  document.querySelector('.logo-mark').addEventListener('click', handleLogoTap);
  document.querySelector('.logo-text').addEventListener('click', handleLogoTap);
});
window.addEventListener('resize', resizeCanvas);
