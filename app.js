// ====================== DATA LAYER ======================
const DB = {
  get() {
    try {
      return JSON.parse(localStorage.getItem('bookplatform_books') || '[]');
    } catch { return []; }
  },
  save(books) {
    localStorage.setItem('bookplatform_books', JSON.stringify(books));
  },
  add(book) {
    const books = this.get();
    book.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    book.createdAt = new Date().toISOString();
    books.push(book);
    this.save(books);
    return book;
  },
  delete(id) {
    const books = this.get().filter(b => b.id !== id);
    this.save(books);
  },
  update(id, changes) {
    const books = this.get().map(b => b.id === id ? { ...b, ...changes } : b);
    this.save(books);
  },
  toggleFeatured(id) {
    const books = this.get().map(b => b.id === id ? { ...b, featured: !b.featured } : b);
    this.save(books);
  }
};

// ====================== SAMPLE BOOKS ======================
function seedSampleBooks() {
  if (DB.get().length > 0) return;
  const samples = [
    {
      title: 'Matematik Soru Bankası 9. Sınıf',
      publisher: 'Palme Yayıncılık',
      grade: '9',
      type: 'test',
      pages: '320',
      description: 'Üniversite sınavına hazırlık için kapsamlı 9. sınıf matematik soru bankası.',
      link: '#',
      image: 'https://via.placeholder.com/400x300/111118/6366f1?text=Matematik+9',
      featured: true
    },
    {
      title: 'Türkçe Ders Anlatımı 8. Sınıf',
      publisher: 'MEB Yayınları',
      grade: '8',
      type: 'ders_anlat',
      pages: '280',
      description: 'LGS hazırlığı için 8. sınıf Türkçe ders anlatım kitabı.',
      link: '#',
      image: 'https://via.placeholder.com/400x300/111118/8b5cf6?text=Türkçe+8',
      featured: true
    },
    {
      title: 'Fen Bilimleri Ders Kitabı 7. Sınıf',
      publisher: 'MEB Yayınları',
      grade: '7',
      type: 'ders',
      pages: '250',
      description: 'MEB onaylı 7. sınıf Fen Bilimleri resmi ders kitabı.',
      link: '#',
      image: 'https://via.placeholder.com/400x300/111118/06b6d4?text=Fen+7',
      featured: false
    },
    {
      title: 'İngilizce Hikaye Kitapları Seti',
      publisher: 'Oxford University Press',
      grade: '10',
      type: 'okuma',
      pages: '150',
      description: 'Orta seviye İngilizce okuma becerilerini geliştiren hikaye kitabı seti.',
      link: '#',
      image: 'https://via.placeholder.com/400x300/111118/10b981?text=İngilizce+10',
      featured: true
    },
    {
      title: 'AYT Matematik Deneme Sınavları',
      publisher: 'Benim Hocam',
      grade: '12',
      type: 'deneme',
      pages: '180',
      description: '40 adet tam boyutlu AYT Matematik deneme sınavı.',
      link: '#',
      image: 'https://via.placeholder.com/400x300/111118/f59e0b?text=AYT+Mat',
      featured: true
    },
    {
      title: 'Sosyal Bilgiler Ders Kitabı 6. Sınıf',
      publisher: 'MEB Yayınları',
      grade: '6',
      type: 'ders',
      pages: '220',
      description: '6. sınıf MEB onaylı Sosyal Bilgiler ders kitabı.',
      link: '#',
      image: 'https://via.placeholder.com/400x300/111118/ef4444?text=Sosyal+6',
      featured: false
    }
  ];
  samples.forEach(b => DB.add(b));
}

// ====================== STATE ======================
let state = {
  filter: { category: 'all', search: '', grade: '', publisher: '' },
  adminOpen: false,
  editingId: null,
  currentModal: null,
  cheatBuffer: ''
};

const CATEGORIES = [
  { id: 'all', label: '🌐 Tümü' },
  { id: 'test', label: '📝 Test Kitabı' },
  { id: 'okuma', label: '📖 Okuma Kitabı' },
  { id: 'ders_anlat', label: '🎓 Ders Anlatımı' },
  { id: 'ders', label: '📚 Ders Kitabı' },
  { id: 'deneme', label: '⏱ Deneme Testi' }
];

const TYPE_LABELS = {
  test: 'Test Kitabı',
  okuma: 'Okuma Kitabı',
  ders_anlat: 'Ders Anlatımı',
  ders: 'Ders Kitabı',
  deneme: 'Deneme Testi'
};

const GRADES = ['1','2','3','4','5','6','7','8','9','10','11','12'];

// ====================== DOM HELPERS ======================
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function toast(msg, type = 'default') {
  const container = $('toast');
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  const icons = { default: 'ℹ️', success: '✅', danger: '❌' };
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span>${msg}`;
  container.appendChild(el);
  setTimeout(() => { el.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, 3200);
}

// ====================== RENDER BOOKS ======================
function getTypeColor(type) {
  const colors = { test: '1', okuma: '2', ders_anlat: '3', ders: '4', deneme: '5' };
  return colors[type] || '1';
}

function makeBookCard(book, delay = 0) {
  const typeLabel = TYPE_LABELS[book.type] || book.type;
  const img = book.imageData || book.image || `https://via.placeholder.com/400x300/111118/6366f1?text=${encodeURIComponent(book.title.slice(0,15))}`;
  return `
  <div class="book-card reveal" style="animation-delay:${delay}ms" onclick="openModal('${book.id}')">
    <div class="book-img-wrap">
      <img src="${img}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/400x300/0d0d12/6366f1?text=📚'"/>
      <span class="book-badge">${typeLabel}</span>
      ${book.featured ? '<span class="book-featured-badge">⭐ Öne Çıkan</span>' : ''}
      <div class="book-overlay">
        <button class="book-overlay-btn">Kitaba Eriş</button>
      </div>
    </div>
    <div class="book-info">
      <div class="book-title">${book.title}</div>
      <div class="book-meta">
        <span class="meta-tag grade-color-${getTypeColor(book.type)}">${book.grade}. Sınıf</span>
        <span class="meta-tag">${book.publisher}</span>
      </div>
      <div class="book-stats">
        <span class="book-stat">📄 ${book.pages} sayfa</span>
      </div>
    </div>
  </div>`;
}

function renderBooks() {
  const grid = $('books-grid');
  const noResults = $('no-results');
  const { category, search, grade, publisher } = state.filter;
  let books = DB.get();

  if (category !== 'all') books = books.filter(b => b.type === category);
  if (grade) books = books.filter(b => b.grade === grade);
  if (publisher) books = books.filter(b => b.publisher.toLowerCase().includes(publisher.toLowerCase()));
  if (search) {
    const q = search.toLowerCase();
    books = books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.publisher.toLowerCase().includes(q) ||
      b.grade.includes(q) ||
      (TYPE_LABELS[b.type] || '').toLowerCase().includes(q)
    );
  }

  if (books.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
    grid.innerHTML = books.map((b, i) => makeBookCard(b, i * 60)).join('');
    revealCards();
  }

  // update stats
  updateLiveStats();
}

function renderFeatured() {
  const carousel = $('featured-carousel');
  const featured = DB.get().filter(b => b.featured);
  if (!carousel) return;
  if (featured.length === 0) {
    carousel.innerHTML = `<div class="empty-state" style="min-width:100%"><div class="empty-state-icon">⭐</div><p>Öne çıkan kitap yok</p></div>`;
    return;
  }
  carousel.innerHTML = featured.map((b, i) => makeBookCard(b, i * 80)).join('');
  revealCards();
}

function updateLiveStats() {
  const books = DB.get();
  const el = id => document.getElementById(id);
  if (el('stat-total')) el('stat-total').textContent = books.length;
  if (el('stat-featured')) el('stat-featured').textContent = books.filter(b => b.featured).length;
  const types = new Set(books.map(b => b.type));
  if (el('stat-cats')) el('stat-cats').textContent = types.size;
  const publishers = new Set(books.map(b => b.publisher));
  if (el('stat-pubs')) el('stat-pubs').textContent = publishers.size;
}

// ====================== MODAL ======================
function openModal(id) {
  const book = DB.get().find(b => b.id === id);
  if (!book) return;
  state.currentModal = id;
  const img = book.imageData || book.image || `https://via.placeholder.com/400x300/0d0d12/6366f1?text=📚`;
  $('modal-title').textContent = book.title;
  $('modal-img').src = img;
  $('modal-img').alt = book.title;
  $('modal-type').textContent = TYPE_LABELS[book.type] || book.type;
  $('modal-grade').textContent = book.grade + '. Sınıf';
  $('modal-publisher').textContent = book.publisher;
  $('modal-pages').textContent = book.pages + ' Sayfa';
  $('modal-desc').textContent = book.description || 'Açıklama bulunmuyor.';

  const btn = $('modal-access-btn');
  if (book.link && book.link !== '#') {
    btn.href = book.link;
    btn.target = '_blank';
    btn.textContent = '🔗 Kitabı Aç';
  } else if (book.pdfData) {
    btn.href = book.pdfData;
    btn.target = '_blank';
    btn.textContent = '📄 PDF\'yi Aç';
  } else {
    btn.href = '#';
    btn.textContent = '🔒 Link Mevcut Değil';
  }

  $('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  state.currentModal = null;
}

// ====================== ADMIN PANEL ======================
function openAdmin() {
  $('admin-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
  state.adminOpen = true;
  renderAdminBooks();
}

function closeAdmin() {
  $('admin-panel').classList.remove('open');
  document.body.style.overflow = '';
  state.adminOpen = false;
  state.editingId = null;
  resetAdminForm();
}

function switchAdminTab(tabId) {
  $$('.admin-tab').forEach(t => t.classList.remove('active'));
  $$('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  $(`section-${tabId}`).classList.add('active');
  if (tabId === 'list') renderAdminBooks();
}

function renderAdminBooks() {
  const list = $('admin-books-list');
  const books = DB.get();
  if (books.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>Kitap bulunamadı</h3><p>Yeni kitap ekleyin</p></div>`;
    return;
  }
  list.innerHTML = books.map(b => {
    const img = b.imageData || b.image || `https://via.placeholder.com/60x80/111118/6366f1?text=📚`;
    return `
    <div class="admin-book-item">
      <img class="admin-book-thumb" src="${img}" alt="${b.title}" onerror="this.src='https://via.placeholder.com/60x80/0d0d12/6366f1?text=📚'"/>
      <div class="admin-book-details">
        <div class="admin-book-name">${b.title}</div>
        <div class="admin-book-sub">${b.grade}. Sınıf · ${b.publisher} · ${TYPE_LABELS[b.type] || b.type}</div>
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
  renderAdminBooks();
  renderFeatured();
  updateLiveStats();
  toast('Öne çıkan durumu güncellendi!', 'success');
}

function adminDeleteBook(id) {
  if (!confirm('Bu kitabı silmek istediğinize emin misiniz?')) return;
  DB.delete(id);
  renderAdminBooks();
  renderBooks();
  renderFeatured();
  toast('Kitap silindi.', 'danger');
}

function adminEditBook(id) {
  const book = DB.get().find(b => b.id === id);
  if (!book) return;
  state.editingId = id;

  // Switch to add tab
  switchAdminTab('add');

  // Fill form
  $('f-title').value = book.title;
  $('f-publisher').value = book.publisher;
  $('f-grade').value = book.grade;
  $('f-type').value = book.type;
  $('f-pages').value = book.pages;
  $('f-link').value = book.link || '';
  $('f-desc').value = book.description || '';
  $('f-featured').checked = book.featured || false;

  if (book.imageData) {
    const prev = $('img-preview');
    prev.src = book.imageData;
    prev.parentElement.classList.add('show');
  }

  $('form-title-label').textContent = '✏️ Kitabı Düzenle';
  $('btn-submit-form').textContent = 'Güncelle';
}

function resetAdminForm() {
  $('book-form').reset();
  state.editingId = null;
  $('form-title-label').textContent = '➕ Yeni Kitap Ekle';
  $('btn-submit-form').textContent = 'Kitabı Ekle';
  $('img-preview').parentElement.classList.remove('show');
  $('pdf-name').textContent = '';
  $('img-name').textContent = '';
  window._pdfData = null;
  window._imgData = null;
}

// ====================== FORM SUBMISSION ======================
function setupAdminForm() {
  const form = $('book-form');
  let pdfData = null, imgData = null;
  window._pdfData = null;
  window._imgData = null;

  // PDF upload
  $('f-pdf').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    $('pdf-name').textContent = file.name;
    const reader = new FileReader();
    reader.onload = ev => { window._pdfData = ev.target.result; };
    reader.readAsDataURL(file);
  });

  // Image upload
  $('f-image').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    $('img-name').textContent = file.name;
    const reader = new FileReader();
    reader.onload = ev => {
      window._imgData = ev.target.result;
      const prev = $('img-preview');
      prev.src = ev.target.result;
      prev.parentElement.classList.add('show');
    };
    reader.readAsDataURL(file);
  });

  // Form submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const title = $('f-title').value.trim();
    const publisher = $('f-publisher').value.trim();
    const grade = $('f-grade').value;
    const type = $('f-type').value;
    const pages = $('f-pages').value.trim();
    const link = $('f-link').value.trim();
    const desc = $('f-desc').value.trim();
    const featured = $('f-featured').checked;

    if (!title || !publisher || !grade || !type) {
      toast('Lütfen zorunlu alanları doldurun!', 'danger');
      return;
    }

    const bookData = {
      title, publisher, grade, type, pages, link, description: desc, featured,
      pdfData: window._pdfData || null,
      imageData: window._imgData || null,
      image: window._imgData ? null : (link ? null : `https://via.placeholder.com/400x300/111118/6366f1?text=${encodeURIComponent(title.slice(0,12))}`)
    };

    if (state.editingId) {
      // Preserve old image/pdf if not updated
      const old = DB.get().find(b => b.id === state.editingId);
      if (!bookData.imageData && old) bookData.imageData = old.imageData;
      if (!bookData.pdfData && old) bookData.pdfData = old.pdfData;
      if (!bookData.image && old && !bookData.imageData) bookData.image = old.image;
      DB.update(state.editingId, bookData);
      toast('Kitap güncellendi!', 'success');
    } else {
      DB.add(bookData);
      toast('Kitap başarıyla eklendi!', 'success');
    }

    resetAdminForm();
    renderBooks();
    renderFeatured();
    renderAdminBooks();
    updateLiveStats();
  });
}

// ====================== SEARCH & FILTER ======================
function setupSearch() {
  $('search-input').addEventListener('input', function () {
    state.filter.search = this.value;
    renderBooks();
  });
  $('filter-grade').addEventListener('change', function () {
    state.filter.grade = this.value;
    renderBooks();
  });
  $('filter-publisher').addEventListener('input', function () {
    state.filter.publisher = this.value;
    renderBooks();
  });
  $('nav-search-input').addEventListener('input', function () {
    state.filter.search = this.value;
    $('search-input').value = this.value;
    document.getElementById('all-books').scrollIntoView({ behavior: 'smooth' });
    renderBooks();
  });
}

function setupCategoryFilter() {
  $$('.cat-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      state.filter.category = this.dataset.cat;
      renderBooks();
    });
  });
}

// ====================== SCROLL REVEAL ======================
function revealCards() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });

  $$('.reveal').forEach(el => {
    if (!el.classList.contains('visible')) observer.observe(el);
  });
}

// ====================== CHEAT CODE ======================
function setupCheatCode() {
  const SECRET = '16580093776';
  document.addEventListener('keypress', function (e) {
    state.cheatBuffer += e.key;
    if (state.cheatBuffer.length > SECRET.length) {
      state.cheatBuffer = state.cheatBuffer.slice(-SECRET.length);
    }
    if (state.cheatBuffer === SECRET) {
      state.cheatBuffer = '';
      openAdmin();
      showCheatHint('🔓 Admin Paneli Açıldı!');
    }
  });
}

function showCheatHint(msg) {
  const hint = document.createElement('div');
  hint.className = 'cheat-hint';
  hint.textContent = msg;
  document.body.appendChild(hint);
  requestAnimationFrame(() => hint.classList.add('show'));
  setTimeout(() => {
    hint.classList.remove('show');
    setTimeout(() => hint.remove(), 500);
  }, 2500);
}

// ====================== NAVBAR SCROLL ======================
function setupNavbar() {
  const navbar = $('navbar');
  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 30
      ? '0 4px 30px rgba(0,0,0,0.5)'
      : 'none';
  });
}

// ====================== MOBILE NAV ======================
function setupMobileNav() {
  const hamburger = $('hamburger');
  const mobileNav = $('mobile-nav');
  if (!hamburger) return;
  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('show');
  });
}

// ====================== SMOOTH SCROLL ======================
function setupSmoothLinks() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

// ====================== INIT ======================
document.addEventListener('DOMContentLoaded', () => {
  seedSampleBooks();
  renderFeatured();
  renderBooks();
  updateLiveStats();
  setupAdminForm();
  setupSearch();
  setupCategoryFilter();
  setupCheatCode();
  setupNavbar();
  setupSmoothLinks();

  // Modal close
  $('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  $('modal-close').addEventListener('click', closeModal);

  // Admin close
  $('admin-close').addEventListener('click', closeAdmin);

  // Admin tabs
  $$('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      switchAdminTab(this.dataset.tab);
    });
  });

  // Admin form reset
  $('btn-reset-form').addEventListener('click', resetAdminForm);

  // Scroll reveal on scroll
  document.addEventListener('scroll', revealCards, { passive: true });
  revealCards();
});

// Expose to window for inline onclick
window.openModal = openModal;
window.closeModal = closeModal;
window.openAdmin = openAdmin;
window.closeAdmin = closeAdmin;
window.adminDeleteBook = adminDeleteBook;
window.adminEditBook = adminEditBook;
window.adminToggleFeatured = adminToggleFeatured;
window.switchAdminTab = switchAdminTab;
