/* ═══════════════════════════════════════════════
   ŞAHIKALI – APP.JS
   Firebase Realtime Database entegrasyonu
   ═══════════════════════════════════════════════ */

// ── FIREBASE INIT ──
const firebaseConfig = {
  apiKey: "AIzaSyDuKLuoePZ6mNsKhQBGXumxMwF0UKTQvc8",
  authDomain: "oyun-75056.firebaseapp.com",
  databaseURL: "https://oyun-75056-default-rtdb.firebaseio.com",
  projectId: "oyun-75056",
  storageBucket: "oyun-75056.firebasestorage.app",
  messagingSenderId: "980660244755",
  appId: "1:980660244755:web:47889c4b6637ab05cdcae6",
  measurementId: "G-J9RKPSVT8B"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const booksRef = db.ref("books");

// ── STATE ──
let allBooks = [];
let favorites = JSON.parse(localStorage.getItem("sahikali_favorites") || "[]");
let isAdmin = false;
let currentFilter = { cat: "", grade: "", subject: "", search: "", section: "home" };
let currentTheme = localStorage.getItem("sahikali_theme") || "dark";

// ── ADMIN PASSWORD (obfuscated, not in HTML) ──
const _ap = atob("MTY1ODAwOTM3NzY=");

// ── THEME ──
function applyTheme(t) {
  currentTheme = t;
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("sahikali_theme", t);
  document.getElementById("themeToggle").textContent =
    t === "dark" ? "🌙" : t === "pink" ? "🌸" : t === "digital" ? "💻" : "🌿";
  document.querySelectorAll(".theme-card").forEach(c => {
    c.classList.toggle("active", c.dataset.theme === t);
  });
}
applyTheme(currentTheme);

// ── FIREBASE: LOAD BOOKS ──
function loadBooks() {
  showLoading();
  booksRef.on("value", snap => {
    allBooks = [];
    snap.forEach(child => {
      allBooks.push({ id: child.key, ...child.val() });
    });
    // Count stat
    document.getElementById("statBooks").textContent = allBooks.length;
    renderAll();
  });
}

function showLoading() {
  document.getElementById("featuredGrid").innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  document.getElementById("allBooksGrid").innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

// ── RENDER HELPERS ──
function filterBooks() {
  return allBooks.filter(b => {
    const q = currentFilter.search.toLowerCase();
    const matchSearch = !q ||
      (b.title || "").toLowerCase().includes(q) ||
      (b.publisher || "").toLowerCase().includes(q) ||
      (b.subject || "").toLowerCase().includes(q);
    const matchCat = !currentFilter.cat || b.category === currentFilter.cat;
    const matchGrade = !currentFilter.grade || String(b.grade) === String(currentFilter.grade);
    const matchSub = !currentFilter.subject || b.subject === currentFilter.subject;
    return matchSearch && matchCat && matchGrade && matchSub;
  });
}

function buildCard(book) {
  const isFav = favorites.includes(book.id);
  const coverHtml = book.cover
    ? `<img class="book-cover" src="${escHtml(book.cover)}" alt="${escHtml(book.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="book-cover-placeholder" style="display:none">📖</div>`
    : `<div class="book-cover-placeholder">📖</div>`;

  const tags = [];
  if (book.grade) tags.push(book.grade + ". Sınıf");
  if (book.subject) tags.push(capFirst(book.subject));
  if (book.category) tags.push(catLabel(book.category));

  const tagsHtml = tags.map(t => `<span class="book-tag">${escHtml(t)}</span>`).join("");
  const featuredBadge = book.featured === true || book.featured === "true"
    ? `<div class="featured-badge">⭐ Öne Çıkan</div>` : "";

  const deleteBtn = isAdmin
    ? `<button class="btn-delete" onclick="deleteBook('${book.id}',event)" title="Sil">🗑</button>` : "";

  return `
  <div class="book-card" onclick="openBookDetail('${book.id}')">
    ${featuredBadge}
    ${coverHtml}
    <div class="book-info">
      <div class="book-title">${escHtml(book.title)}</div>
      ${book.publisher ? `<div class="book-publisher">${escHtml(book.publisher)}</div>` : ""}
      <div class="book-tags">${tagsHtml}</div>
    </div>
    <div class="book-actions">
      <a class="btn-access" href="${escHtml(book.link || "#")}" target="_blank" rel="noopener" onclick="event.stopPropagation()">📥 Kitaba Ulaş</a>
      <button class="btn-fav ${isFav ? "active" : ""}" onclick="toggleFav('${book.id}',event)" title="Favorilere Ekle">${isFav ? "⭐" : "☆"}</button>
      ${deleteBtn}
    </div>
  </div>`;
}

function renderAll() {
  const filtered = filterBooks();

  // Featured section
  const featured = allBooks.filter(b => b.featured === true || b.featured === "true").slice(0, 8);
  const fg = document.getElementById("featuredGrid");
  fg.innerHTML = featured.length
    ? featured.map(buildCard).join("")
    : `<div class="empty-state">Henüz öne çıkan kitap yok.</div>`;

  // Favorites section
  const favBooks = allBooks.filter(b => favorites.includes(b.id));
  const favG = document.getElementById("favoritesGrid");
  favG.innerHTML = favBooks.length
    ? favBooks.map(buildCard).join("")
    : `<div class="empty-state">Henüz favori eklemediniz. Kitap kartındaki ⭐ ikonuna tıklayın.</div>`;

  // All books
  const ag = document.getElementById("allBooksGrid");
  const noRes = document.getElementById("noResults");
  document.getElementById("resultCount").textContent = `${filtered.length} kitap`;
  if (filtered.length === 0) {
    ag.innerHTML = "";
    noRes.classList.remove("hidden");
  } else {
    noRes.classList.add("hidden");
    ag.innerHTML = filtered.map(buildCard).join("");
  }
}

// ── FAVORITE TOGGLE ──
window.toggleFav = function(id, event) {
  event.stopPropagation();
  const idx = favorites.indexOf(id);
  if (idx > -1) favorites.splice(idx, 1);
  else favorites.push(id);
  localStorage.setItem("sahikali_favorites", JSON.stringify(favorites));
  renderAll();
};

// ── BOOK DETAIL MODAL ──
window.openBookDetail = function(id) {
  const book = allBooks.find(b => b.id === id);
  if (!book) return;
  const inner = document.getElementById("bookDetailInner");
  const coverHtml = book.cover
    ? `<img src="${escHtml(book.cover)}" alt="${escHtml(book.title)}" style="width:100%;border-radius:8px;" onerror="this.parentElement.innerHTML='<div style=\'font-size:60px;text-align:center;padding:20px\'>📖</div>'">`
    : `<div style="font-size:60px;text-align:center;padding:20px">📖</div>`;

  inner.innerHTML = `
    <div class="book-detail-cover">${coverHtml}</div>
    <div class="book-detail-info">
      <div class="book-detail-title">${escHtml(book.title)}</div>
      <div class="book-detail-meta">
        ${book.publisher ? `<div class="book-detail-meta-row"><span class="key">Yayınevi</span><span>${escHtml(book.publisher)}</span></div>` : ""}
        ${book.grade ? `<div class="book-detail-meta-row"><span class="key">Sınıf</span><span>${escHtml(String(book.grade))}. Sınıf</span></div>` : ""}
        ${book.subject ? `<div class="book-detail-meta-row"><span class="key">Ders</span><span>${capFirst(book.subject)}</span></div>` : ""}
        ${book.category ? `<div class="book-detail-meta-row"><span class="key">Kategori</span><span>${catLabel(book.category)}</span></div>` : ""}
      </div>
      <a class="btn-access-large" href="${escHtml(book.link || "#")}" target="_blank" rel="noopener">📥 Kitaba Ulaş</a>
    </div>`;
  openModal("bookModal");
};

// ── DELETE BOOK (admin) ──
window.deleteBook = function(id, event) {
  event.stopPropagation();
  if (!isAdmin) return;
  if (!confirm("Bu kitabı silmek istediğinizden emin misiniz?")) return;
  booksRef.child(id).remove();
};

// ── UPLOAD BOOK ──
document.getElementById("uploadBookBtn").addEventListener("click", async () => {
  const title = document.getElementById("uTitle").value.trim();
  const grade = document.getElementById("uGrade").value;
  const category = document.getElementById("uCategory").value;
  const subject = document.getElementById("uSubject").value;
  const publisher = document.getElementById("uPublisher").value.trim();
  const cover = document.getElementById("uCover").value.trim();
  const link = document.getElementById("uLink").value.trim();
  const featured = document.getElementById("uFeatured").value === "true";
  const errEl = document.getElementById("uploadError");

  if (!title) { showUploadError("Kitap adı zorunludur."); return; }
  if (!category) { showUploadError("Kategori seçmelisiniz."); return; }
  if (!link) { showUploadError("İndirme linki zorunludur."); return; }

  errEl.classList.add("hidden");

  const btn = document.getElementById("uploadBookBtn");
  btn.textContent = "Yükleniyor…";
  btn.disabled = true;

  try {
    await booksRef.push({
      title, grade, category, subject, publisher, cover, link, featured,
      createdAt: Date.now()
    });
    closeModal("uploadModal");
    clearUploadForm();
    alert("✅ Kitap başarıyla eklendi!");
  } catch (err) {
    showUploadError("Firebase hatası: " + err.message);
  } finally {
    btn.textContent = "📤 Kitabı Yükle";
    btn.disabled = false;
  }
});

function showUploadError(msg) {
  const el = document.getElementById("uploadError");
  el.textContent = "❌ " + msg;
  el.classList.remove("hidden");
}

function clearUploadForm() {
  ["uTitle","uGrade","uCategory","uSubject","uPublisher","uCover","uLink"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("uFeatured").value = "false";
  document.getElementById("uploadError").classList.add("hidden");
}

// ── ADMIN LOGIN ──
document.getElementById("adminUploadBtn").addEventListener("click", () => {
  if (isAdmin) {
    openModal("uploadModal");
  } else {
    document.getElementById("adminPasswordInput").value = "";
    document.getElementById("adminError").classList.add("hidden");
    openModal("adminModal");
  }
});

document.getElementById("adminLoginBtn").addEventListener("click", () => {
  const pw = document.getElementById("adminPasswordInput").value;
  if (pw === _ap) {
    isAdmin = true;
    closeModal("adminModal");
    openModal("uploadModal");
    renderAll(); // Show delete buttons
  } else {
    document.getElementById("adminError").classList.remove("hidden");
    document.getElementById("adminPasswordInput").value = "";
  }
});

document.getElementById("adminPasswordInput").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("adminLoginBtn").click();
});

// ── SEARCH & FILTER ──
let searchTimer;
document.getElementById("searchInput").addEventListener("input", e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentFilter.search = e.target.value;
    renderAll();
  }, 250);
});

document.getElementById("gradeFilter").addEventListener("change", e => {
  currentFilter.grade = e.target.value;
  renderAll();
});
document.getElementById("subjectFilter").addEventListener("change", e => {
  currentFilter.subject = e.target.value;
  renderAll();
});

// ── SIDEBAR NAV ──
document.querySelectorAll(".nav-item[data-section]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    const sec = el.dataset.section;
    setActiveNav(el);
    if (sec === "home") {
      showSections(["heroSection","featuredSection","favoritesSection","allBooksSection"]);
      currentFilter.cat = ""; renderAll();
    } else if (sec === "favorites") {
      showSections(["favoritesSection"]);
    } else if (sec === "recent") {
      currentFilter.cat = ""; renderAll();
      showSections(["allBooksSection"]);
    } else if (sec === "all") {
      showSections(["allBooksSection"]);
    }
    closeSidebarMobile();
  });
});

document.querySelectorAll(".cat-item").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    currentFilter.cat = el.dataset.cat;
    setActiveNav(el);
    currentFilter.search = ""; currentFilter.grade = ""; currentFilter.subject = "";
    document.getElementById("searchInput").value = "";
    document.getElementById("gradeFilter").value = "";
    document.getElementById("subjectFilter").value = "";
    renderAll();
    showSections(["allBooksSection"]);
    closeSidebarMobile();
  });
});

document.querySelector(".see-all").addEventListener("click", e => {
  e.preventDefault();
  currentFilter.cat = "";
  renderAll();
  showSections(["allBooksSection"]);
});

function setActiveNav(el) {
  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
  el.classList.add("active");
}

function showSections(ids) {
  const allSecs = ["heroSection","featuredSection","favoritesSection","allBooksSection"];
  allSecs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = ids.includes(id) ? "" : "none";
  });
}

// ── MODAL HELPERS ──
function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}
window.openModal = openModal;
window.closeModal = closeModal;

document.querySelectorAll(".modal-close, [data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.close || btn.closest(".modal-overlay")?.id;
    if (target) closeModal(target);
  });
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Sidebar buttons
document.getElementById("howToBtn").addEventListener("click", e => {
  e.preventDefault(); openModal("howToModal"); closeSidebarMobile();
});
document.getElementById("contactBtn").addEventListener("click", e => {
  e.preventDefault(); openModal("contactModal"); closeSidebarMobile();
});
document.getElementById("settingsBtn").addEventListener("click", e => {
  e.preventDefault(); openModal("settingsModal"); closeSidebarMobile();
});

// Theme cards
document.querySelectorAll(".theme-card[data-theme]").forEach(btn => {
  btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
});
document.getElementById("themeToggle").addEventListener("click", () => {
  openModal("settingsModal");
});

// ── MOBILE SIDEBAR ──
const hamburger = document.getElementById("hamburger");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("visible");
});
sidebarOverlay.addEventListener("click", closeSidebarMobile);

function closeSidebarMobile() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("visible");
}

// ── UTILS ──
function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function capFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function catLabel(cat) {
  const map = {
    "ders-kitabi":"Ders Kitabı","ders-anlatim":"Ders Anlatım","deneme":"Deneme Testi",
    "soru-bankasi":"Soru Bankası","foy":"Föy","hikaye":"Hikaye","ansiklopedi":"Ansiklopedi",
    "tyt":"TYT","ayt":"AYT","tyt-ayt":"TYT+AYT","kpss":"KPSS"
  };
  return map[cat] || capFirst(cat);
}

// Animate stat counter
function animateCounter(el, target) {
  if (isNaN(target)) return;
  let cur = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(timer);
  }, 30);
}

// ── INIT ──
loadBooks();

// Animate stat counters after load
booksRef.once("value", snap => {
  const count = snap.numChildren();
  setTimeout(() => animateCounter(document.getElementById("statBooks"), count), 300);
});
