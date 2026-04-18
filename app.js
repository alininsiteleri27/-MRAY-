// ====================== DATA LAYER ======================
const DB = {
  get() {
    try { return JSON.parse(localStorage.getItem('bookplatform_books') || '[]'); }
    catch { return []; }
  },
  save(books) {
    try {
      localStorage.setItem('bookplatform_books', JSON.stringify(books));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        toast('⚠️ Depolama alanı doldu! Büyük resim/PDF yerine link kullanın.', 'danger');
      } else {
        toast('Kayıt hatası: ' + e.message, 'danger');
      }
    }
  },
  add(book) {
    const books = this.get();
    book.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    book.createdAt = new Date().toISOString();
    books.push(book);
    this.save(books);
    return book;
  },
  delete(id) { this.save(this.get().filter(b => b.id !== id)); },
  update(id, changes) { this.save(this.get().map(b => b.id === id ? { ...b, ...changes } : b)); },
  toggleFeatured(id) { this.save(this.get().map(b => b.id === id ? { ...b, featured: !b.featured } : b)); }
};

// ====================== SAMPLE DATA ======================
function seedSampleBooks() {
  if (DB.get().length > 0) return;
  const samples = [
    { title: 'Matematik Soru Bankası 9. Sınıf', publisher: 'Palme Yayıncılık', grade: '9', type: 'test', pages: '320', description: 'Üniversite sınavına hazırlık için kapsamlı 9. sınıf matematik soru bankası.', link: '#', image: 'https://placehold.co/400x300/111118/6366f1?text=Matematik+9', featured: true },
    { title: 'Türkçe Ders Anlatımı 8. Sınıf', publisher: 'MEB Yayınları', grade: '8', type: 'ders_anlat', pages: '280', description: 'LGS hazırlığı için 8. sınıf Türkçe ders anlatım kitabı.', link: '#', image: 'https://placehold.co/400x300/111118/8b5cf6?text=Türkçe+8', featured: true },
    { title: 'Fen Bilimleri Ders Kitabı 7. Sınıf', publisher: 'MEB Yayınları', grade: '7', type: 'ders', pages: '250', description: 'MEB onaylı 7. sınıf Fen Bilimleri resmi ders kitabı.', link: '#', image: 'https://placehold.co/400x300/111118/06b6d4?text=Fen+7', featured: false },
    { title: 'İngilizce Hikaye Kitapları Seti', publisher: 'Oxford University Press', grade: '10', type: 'okuma', pages: '150', description: 'Orta seviye İngilizce okuma becerilerini geliştiren hikaye seti.', link: '#', image: 'https://placehold.co/400x300/111118/10b981?text=İngilizce+10', featured: true },
    { title: 'AYT Matematik Deneme Sınavları', publisher: 'Benim Hocam', grade: '12', type: 'deneme', pages: '180', description: '40 adet tam boyutlu AYT Matematik deneme sınavı.', link: '#', image: 'https://placehold.co/400x300/111118/f59e0b?text=AYT+Mat', featured: true },
    { title: 'Sosyal Bilgiler Ders Kitabı 6. Sınıf', publisher: 'MEB Yayınları', grade: '6', type: 'ders', pages: '220', description: '6. sınıf MEB onaylı Sosyal Bilgiler ders kitabı.', link: '#', image: 'https://placehold.co/400x300/111118/ef4444?text=Sosyal+6', featured: false }
  ];
  samples.forEach(b => DB.add(b));
}

// ====================== STATE ======================
let state = {
  activePage: 'home',
  booksCat: 'all',
  searchText: '',
  searchGrade: '',
  searchPublisher: '',
  editingId: null,
  cheatBuffer: ''
};

const TYPE_LABELS = { test: 'Test Kitabı', okuma: 'Okuma Kitabı', ders_anlat: 'Ders Anlatımı', ders: 'Ders Kitabı', deneme: 'Deneme Testi' };
const TYPE_COLORS = { test: '1', okuma: '2', ders_anlat: '3', ders: '4', deneme: '5' };
const GRADE_LABELS = {
  okul_oncesi: 'Okul Öncesi',
  tyt: 'TYT', ayt: 'AYT', tyt_ayt: 'TYT + AYT', kpss: 'KPSS'
};
function gradeLabel(grade) {
  if (!grade) return '—';
  return GRADE_LABELS[grade] || (grade + '. Sınıf');
}

// ====================== DOM ======================
const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);

// ====================== SPA NAVIGATION ======================
function showPage(name) {
  if (state.activePage === name) return;
  state.activePage = name;

  // hide all pages
  $$('.page').forEach(p => p.classList.remove('active'));

  // show target
  const target = $(`page-${name}`);
  if (target) {
    requestAnimationFrame(() => target.classList.add('active'));
    // scroll inner content to top
    const inner = target.querySelector('.page-inner');
    if (inner) inner.scrollTop = 0;
    target.scrollTop = 0;
  }

  // update nav buttons
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  const nbtn = $(`nav-${name === 'books' ? 'books' : name === 'featured' ? 'featured' : name === 'search' ? 'search-page' : 'home'}`);
  if (nbtn) nbtn.classList.add('active');

  // re-render on switch
  if (name === 'featured') renderFeatured();
  if (name === 'books') renderBooks();
  if (name === 'search') { renderSearch(); setTimeout(() => $('search-input') && $('search-input').focus(), 200); }
  if (name === 'home') updateLiveStats();
}

// Called from home page quick-category cards
function goToCategory(cat) {
  showPage('books');
  state.booksCat = cat;
  // update cat buttons after render
  setTimeout(() => {
    $$('.cat-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    renderBooks();
  }, 50);
}

window.showPage = showPage;
window.goToCategory = goToCategory;

// ====================== BOOK CARD HTML ======================
function makeBookCard(book, delay = 0) {
  const typeLabel = TYPE_LABELS[book.type] || book.type;
  const img = book.imageData || book.image || `https://placehold.co/400x300/111118/6366f1?text=${encodeURIComponent(book.title.slice(0,12))}`;
  const col = TYPE_COLORS[book.type] || '1';
  return `
  <div class="book-card" style="animation-delay:${delay}ms" onclick="openModal('${book.id}')" role="listitem" tabindex="0">
    <div class="book-img-wrap">
      <img src="${img}" alt="${book.title}" loading="lazy" onerror="this.src='https://placehold.co/400x300/0d0d12/6366f1?text=📚'"/>
      <span class="book-badge">${typeLabel}</span>
      ${book.featured ? '<span class="book-featured-badge">⭐ Öne Çıkan</span>' : ''}
      <div class="book-overlay"><button class="book-overlay-btn">Kitaba Eriş</button></div>
    </div>
    <div class="book-info">
      <div class="book-title">${book.title}</div>
      <div class="book-meta">
        <span class="meta-tag grade-color-${col}">${gradeLabel(book.grade)}</span>
        <span class="meta-tag">${book.publisher}</span>
      </div>
      <div class="book-stat">📄 ${book.pages || '?'} sayfa</div>
    </div>
  </div>`;
}

// ====================== RENDER FUNCTIONS ======================
function renderFeatured() {
  const grid = $('featured-carousel');
  if (!grid) return;
  const featured = DB.get().filter(b => b.featured);
  if (featured.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⭐</div><h3>Öne çıkan kitap yok</h3><p>Admin panelinden kitapları öne çıkarın.</p></div>`;
    return;
  }
  grid.innerHTML = featured.map((b, i) => makeBookCard(b, i * 60)).join('');
}

function renderBooks() {
  const grid = $('books-grid');
  const noRes = $('no-results');
  if (!grid) return;
  let books = DB.get();
  if (state.booksCat !== 'all') books = books.filter(b => b.type === state.booksCat);
  if (books.length === 0) {
    grid.innerHTML = '';
    noRes.style.display = 'block';
  } else {
    noRes.style.display = 'none';
    grid.innerHTML = books.map((b, i) => makeBookCard(b, i * 50)).join('');
  }
}

function renderSearch() {
  const grid = $('search-grid');
  const noRes = $('no-results-search');
  const hint = $('search-empty-hint');
  if (!grid) return;

  const q = state.searchText.trim();
  const grade = state.searchGrade;
  const pub = state.searchPublisher.trim().toLowerCase();

  if (!q && !grade && !pub) {
    grid.innerHTML = '';
    noRes.style.display = 'none';
    hint.style.display = 'block';
    return;
  }
  hint.style.display = 'none';

  let books = DB.get();
  if (grade) books = books.filter(b => b.grade === grade);
  if (pub) books = books.filter(b => b.publisher.toLowerCase().includes(pub));
  if (q) {
    const ql = q.toLowerCase();
    books = books.filter(b =>
      b.title.toLowerCase().includes(ql) ||
      b.publisher.toLowerCase().includes(ql) ||
      b.grade.includes(ql) ||
      (TYPE_LABELS[b.type] || '').toLowerCase().includes(ql)
    );
  }

  if (books.length === 0) {
    grid.innerHTML = '';
    noRes.style.display = 'block';
  } else {
    noRes.style.display = 'none';
    grid.innerHTML = books.map((b, i) => makeBookCard(b, i * 50)).join('');
  }
}

function updateLiveStats() {
  const books = DB.get();
  if ($('stat-total')) $('stat-total').textContent = books.length;
  if ($('stat-featured')) $('stat-featured').textContent = books.filter(b => b.featured).length;
  if ($('stat-cats')) $('stat-cats').textContent = new Set(books.map(b => b.type)).size;
  if ($('stat-pubs')) $('stat-pubs').textContent = new Set(books.map(b => b.publisher)).size;
}

// ====================== MODAL ======================
function openModal(id) {
  const book = DB.get().find(b => b.id === id);
  if (!book) return;
  const img = book.imageData || book.image || `https://placehold.co/400x300/0d0d12/6366f1?text=📚`;
  $('modal-title').textContent = book.title;
  $('modal-img').src = img;
  $('modal-type').textContent = TYPE_LABELS[book.type] || book.type;
  $('modal-grade').textContent = gradeLabel(book.grade);
  $('modal-publisher').textContent = book.publisher;
  $('modal-pages').textContent = (book.pages || '?') + ' Sayfa';
  $('modal-desc').textContent = book.description || 'Açıklama bulunmuyor.';

  const btn = $('modal-access-btn');
  if (book.pdfData) { btn.href = book.pdfData; btn.target = '_blank'; btn.textContent = '📄 PDF\'yi Aç'; }
  else if (book.link && book.link !== '#') { btn.href = book.link; btn.target = '_blank'; btn.textContent = '🔗 Kitabı Aç'; }
  else { btn.href = '#'; btn.textContent = '🔒 Link Mevcut Değil'; }

  $('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  $('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ====================== ADMIN ======================
function openAdmin() {
  $('admin-panel').classList.add('open');
  renderAdminBooks();
}
function closeAdmin() {
  $('admin-panel').classList.remove('open');
  state.editingId = null;
  resetAdminForm();
}

function switchAdminTab(tabId) {
  $$('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  $$('.admin-section').forEach(s => s.classList.toggle('active', s.id === `section-${tabId}`));
  if (tabId === 'list') renderAdminBooks();
}

function renderAdminBooks() {
  const list = $('admin-books-list');
  const books = DB.get();
  if (books.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>Kitap yok</h3><p>Yeni kitap ekleyin</p></div>`;
    return;
  }
  list.innerHTML = books.map(b => {
    const img = b.imageData || b.image || `https://placehold.co/52x70/111118/6366f1?text=📚`;
    return `
    <div class="admin-book-item">
      <img class="admin-book-thumb" src="${img}" alt="${b.title}" onerror="this.src='https://placehold.co/52x70/0d0d12/6366f1?text=📚'"/>
      <div class="admin-book-details">
        <div class="admin-book-name">${b.title}</div>
        <div class="admin-book-sub">${gradeLabel(b.grade)} · ${b.publisher} · ${TYPE_LABELS[b.type] || b.type}</div>
      </div>
      <div class="admin-book-actions">
        <button class="btn-icon featured ${b.featured ? 'active' : ''}" title="Öne Çıkar" onclick="adminToggleFeatured('${b.id}')">⭐</button>
        <button class="btn-icon edit" title="Düzenle" onclick="adminEditBook('${b.id}')">✏️</button>
        <button class="btn-icon danger" title="Sil" onclick="adminDeleteBook('${b.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function adminToggleFeatured(id) {
  DB.toggleFeatured(id);
  renderAdminBooks(); renderFeatured(); updateLiveStats();
  toast('Öne çıkan durumu güncellendi!', 'success');
}
function adminDeleteBook(id) {
  if (!confirm('Bu kitabı silmek istediğinize emin misiniz?')) return;
  DB.delete(id);
  renderAdminBooks(); renderBooks(); renderFeatured(); renderSearch(); updateLiveStats();
  toast('Kitap silindi.', 'danger');
}
function adminEditBook(id) {
  const book = DB.get().find(b => b.id === id);
  if (!book) return;
  state.editingId = id;
  switchAdminTab('add');
  $('f-title').value = book.title;
  $('f-publisher').value = book.publisher;
  $('f-type').value = book.type;
  // Sınıf alanını tipe göre göster/gizle
  const isOkuma = book.type === 'okuma';
  $('grade-field').style.display = isOkuma ? 'none' : '';
  $('f-grade').value = isOkuma ? '' : (book.grade || '');
  $('f-pages').value = book.pages || '';
  $('f-link').value = book.link || '';
  $('f-desc').value = book.description || '';
  $('f-featured').checked = !!book.featured;
  if (book.imageData) { $('img-preview').src = book.imageData; $('img-preview-wrap').classList.add('show'); }
  $('form-title-label').textContent = '✏️ Kitabı Düzenle';
  $('btn-submit-form').textContent = 'Güncelle';
}
function resetAdminForm() {
  $('book-form').reset();
  state.editingId = null;
  $('form-title-label').textContent = '➕ Yeni Kitap Ekle';
  $('btn-submit-form').textContent = 'Kitabı Ekle';
  $('img-preview-wrap').classList.remove('show');
  $('pdf-name').textContent = '';
  $('img-name').textContent = '';
  window._pdfData = null;
  window._imgData = null;
}

// ====================== ADMIN FORM ======================
function setupAdminForm() {
  window._pdfData = null;
  window._imgData = null;

  $('f-pdf').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    // PDF base64 localStorage'a sığmaz — sadece adını göster, link girilmesini iste
    $('pdf-name').textContent = '⚠️ PDF yerine aşağıya link girin: ' + file.name;
    toast('PDF dosyaları çok büyük olduğu için direkt yüklenemez. Lütfen PDF\'i bir sisteme yükleyip linkini girin.', 'danger');
    window._pdfData = null; // base64 saklamıyoruz
    e.target.value = '';
  });

  $('f-image').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    $('img-name').textContent = file.name;
    // Resmi canvas ile sıkıştır (max 400x300, kalite 0.7)
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_W = 400, MAX_H = 300;
      let w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.72);
      URL.revokeObjectURL(url);
      window._imgData = compressed;
      $('img-preview').src = compressed;
      $('img-preview-wrap').classList.add('show');
      // Boyut uyarısı
      const kb = Math.round(compressed.length * 0.75 / 1024);
      if (kb > 200) toast(`Resim ${kb}KB — çok fazla resim eklenirse depolama dolabilir.`, 'default');
    };
    img.src = url;
  });

  $('book-form').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('f-title').value.trim();
    const publisher = $('f-publisher').value.trim();
    const grade = $('f-grade').value;
    const type = $('f-type').value;
    const pages = $('f-pages').value.trim();
    const link = $('f-link').value.trim();
    const desc = $('f-desc').value.trim();
    const featured = $('f-featured').checked;

    const isOkuma = type === 'okuma';
    if (!title || !publisher || !type) {
      toast('Lütfen zorunlu alanları doldurun!', 'danger'); return;
    }
    if (!isOkuma && !grade) {
      toast('Lütfen sınıf seçin!', 'danger'); return;
    }

    const imgVal = window._imgData;
    const imgFallback = `https://placehold.co/400x300/111118/6366f1?text=${encodeURIComponent(title.slice(0,12))}`;

    const bookData = { title, publisher, grade, type, pages, link, description: desc, featured,
      pdfData: null, // PDF base64 saklanmıyor — link kullan
      imageData: imgVal || null,
      image: imgVal ? null : imgFallback
    };

    if (state.editingId) {
      const old = DB.get().find(b => b.id === state.editingId);
      if (!bookData.imageData && old) { bookData.imageData = old.imageData; bookData.image = old.image; }
      if (!bookData.pdfData && old) bookData.pdfData = old.pdfData;
      DB.update(state.editingId, bookData);
      toast('Kitap güncellendi!', 'success');
    } else {
      DB.add(bookData);
      toast('Kitap başarıyla eklendi!', 'success');
    }

    resetAdminForm();
    renderBooks(); renderFeatured(); renderSearch(); renderAdminBooks(); updateLiveStats();
  });

  $('btn-reset-form').addEventListener('click', resetAdminForm);

  // Okuma kitabı seçilince sınıf alanını gizle
  function toggleGradeField() {
    const isOkuma = $('f-type').value === 'okuma';
    const gradeField = $('grade-field');
    gradeField.style.display = isOkuma ? 'none' : '';
    if (isOkuma) $('f-grade').value = '';
  }
  $('f-type').addEventListener('change', toggleGradeField);
}

// ====================== SEARCH SETUP ======================
function setupSearch() {
  // nav search → go to search page and fill
  $('nav-search-input').addEventListener('input', function () {
    state.searchText = this.value;
    $('search-input').value = this.value;
    showPage('search');
    renderSearch();
  });

  $('search-input').addEventListener('input', function () {
    state.searchText = this.value;
    $('nav-search-input').value = this.value;
    renderSearch();
  });
  $('filter-grade').addEventListener('change', function () {
    state.searchGrade = this.value; renderSearch();
  });
  $('filter-publisher').addEventListener('input', function () {
    state.searchPublisher = this.value; renderSearch();
  });
}

// ====================== CATEGORY FILTER ======================
function setupCategoryFilter() {
  $$('.cat-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      state.booksCat = this.dataset.cat;
      renderBooks();
    });
  });
}

// ====================== ADMIN TABS ======================
function setupAdminTabs() {
  $$('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function () { switchAdminTab(this.dataset.tab); });
  });
}

// ====================== CHEAT CODE ======================
function setupCheatCode() {
  const SECRET = '16580093776';
  document.addEventListener('keypress', e => {
    state.cheatBuffer += e.key;
    if (state.cheatBuffer.length > SECRET.length) state.cheatBuffer = state.cheatBuffer.slice(-SECRET.length);
    if (state.cheatBuffer === SECRET) {
      state.cheatBuffer = '';
      openAdmin();
      showCheatHint('🔓 Admin Paneli Açıldı!');
    }
  });
}
function showCheatHint(msg) {
  const h = document.createElement('div');
  h.className = 'cheat-hint'; h.textContent = msg;
  document.body.appendChild(h);
  requestAnimationFrame(() => h.classList.add('show'));
  setTimeout(() => { h.classList.remove('show'); setTimeout(() => h.remove(), 500); }, 2500);
}

// ====================== TOAST ======================
function toast(msg, type = 'default') {
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  const icons = { default: 'ℹ️', success: '✅', danger: '❌' };
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span>${msg}`;
  $('toast').appendChild(el);
  setTimeout(() => { el.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ====================== INIT ======================
document.addEventListener('DOMContentLoaded', () => {
  seedSampleBooks();
  updateLiveStats();
  setupAdminForm();
  setupSearch();
  setupCategoryFilter();
  setupAdminTabs();
  setupCheatCode();

  // Modal
  $('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });
  $('modal-close').addEventListener('click', closeModal);

  // Admin
  $('admin-close').addEventListener('click', closeAdmin);

  // Show home on start
  showPage('home');
});

// Expose globals
