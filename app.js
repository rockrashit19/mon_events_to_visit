// ============================================================
// MON ПЛАТФОРМА — ОБЩАЯ ЛОГИКА
// ============================================================

function debounce(fn, delay = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function normalizeStr(str) {
  return (str || '').toLowerCase().replace(/ё/g, 'е').replace(/й/g, 'и');
}

function matchesSearch(text, query) {
  if (!query) return true;
  return normalizeStr(text).includes(normalizeStr(query));
}

const MONTHS_CONFIG = [
  { key: 'jan-2026', label: 'Январь 2026' },
  { key: 'feb-2026', label: 'Февраль 2026' },
  { key: 'mar-2026', label: 'Март 2026' },
  { key: 'apr-2026', label: 'Апрель 2026' },
  { key: 'may-2026', label: 'Май 2026' },
  { key: 'jun-2026', label: 'Июнь 2026' },
  { key: 'jul-2026', label: 'Июль 2026' },
  { key: 'aug-2026', label: 'Август 2026' },
  { key: 'sep-2026', label: 'Сентябрь 2026' },
  { key: 'oct-2026', label: 'Октябрь 2026' },
  { key: 'nov-2026', label: 'Ноябрь 2026' },
  { key: 'dec-2026', label: 'Декабрь 2026' },
];

const CITY_LABELS = {
  moscow: 'Москва', spb: 'Санкт-Петербург',
  'russia-other': 'Другие города РФ',
  online: 'Онлайн', international: 'Зарубежье',
  samara: 'Самара', novosibirsk: 'Новосибирск',
  kazan: 'Казань', crimea: 'Крым', ekb: 'Екатеринбург',
  sochi: 'Сочи', nn: 'Нижний Новгород', minsk: 'Минск',
};

const CITY_ORDER = ['moscow','spb','russia-other','online','international'];

const IMPORTANCE_LABELS = { high: 'Обязательно', medium: 'Рекомендуется', low: 'По возможности' };

const IMPORTANCE_OPTIONS = [
  { key: 'high',   label: '🔴 Обязательно' },
  { key: 'medium', label: '🟠 Рекомендуется' },
  { key: 'low',    label: '🟢 По возможности' },
];

const CATEGORIES_CONFIG = [
  { key: 'host',         label: 'Ведущие',          icon: '🎤', className: 'cat-host' },
  { key: 'band',         label: 'Кавер-группы',     icon: '🎸', className: 'cat-band' },
  { key: 'show',         label: 'Шоу',              icon: '✨', className: 'cat-show' },
  { key: 'venue-loft',   label: 'Лофты',            icon: '🏭', className: 'cat-venue' },
  { key: 'venue-rest',   label: 'Рестораны',        icon: '🍽️', className: 'cat-venue' },
  { key: 'venue-palace', label: 'Дворцы и усадьбы', icon: '🏛️', className: 'cat-venue' },
  { key: 'venue-art',    label: 'Арт-пространства', icon: '🎨', className: 'cat-venue' },
  { key: 'interactive',  label: 'Интерактив',       icon: '🕹️', className: 'cat-interactive' },
];

// ─── Хелперы ──────────────────────────────────────────────

function buildSelect(id, options, allLabel) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="all">${allLabel}</option>` +
    options.map(o => `<option value="${o.key}">${o.label}</option>`).join('');
}

function getUniqueCities(data) {
  const seen = new Set();
  const result = [];
  data.forEach(ev => {
    if (ev.city && !seen.has(ev.city)) {
      seen.add(ev.city);
      result.push({ key: ev.city, label: CITY_LABELS[ev.city] || ev.city });
    }
  });
  result.sort((a, b) => {
    const ai = CITY_ORDER.indexOf(a.key);
    const bi = CITY_ORDER.indexOf(b.key);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.label.localeCompare(b.label, 'ru');
  });
  return result;
}

function getCatConfig(key) {
  return CATEGORIES_CONFIG.find(c => c.key === key) || { label: key, icon: '📦', className: 'cat-host' };
}

// ─── Рендер карточки события ──────────────────────────────

function renderEventCard(ev) {
  const imp  = ev.importance || 'low';
  const city = CITY_LABELS[ev.city] || ev.city || '';

  const footerItems = [];
  if (ev.recommended)       footerItems.push(`<span class="event-recommended">👥 ${ev.recommended}</span>`);
  if (ev.naom_participation) footerItems.push(`<span class="event-naom">⭐ MON: ${ev.naom_participation}</span>`);
  if (ev.link)              footerItems.push(`<a href="${ev.link}" target="_blank" class="event-link">Подробнее ↗</a>`);

  const tagsHtml = ev.tags?.length
    ? `<div class="event-tags">${ev.tags.map(t => `<span class="event-tag">${t}</span>`).join('')}</div>`
    : '';

  return `
    <div class="event-card importance-${imp}">
      <div class="event-card-top">
        <div class="event-title">${ev.title}</div>
        <span class="importance-badge ${imp}">${IMPORTANCE_LABELS[imp]}</span>
      </div>
      <div class="event-meta">
        <div class="event-meta-item"><span class="event-meta-icon">📅</span><span>${ev.date}</span></div>
        ${city ? `<div class="event-meta-item"><span class="event-meta-icon">📍</span><span>${city}</span></div>` : ''}
      </div>
      ${ev.description ? `<div class="event-description">${ev.description}</div>` : ''}
      ${tagsHtml}
      ${footerItems.length ? `<div class="event-footer">${footerItems.join('')}</div>` : ''}
    </div>`;
}

// ─── Страница мероприятий ─────────────────────────────────

function initEventsPage() {
  if (!window.EVENTS_DATA) return;

  const state = { search: '', month: 'all', city: 'all', importance: 'all' };

  const featuredEl    = document.getElementById('featured-grid');
  const allEventsEl   = document.getElementById('all-events');
  const resultsInfoEl = document.getElementById('results-info');
  const noResultsEl   = document.getElementById('no-results');
  const featuredSect  = document.getElementById('featured-section');

  // Строим select динамически из реальных данных
  buildSelect('filter-city', getUniqueCities(EVENTS_DATA), 'Все города');
  buildSelect('filter-month', MONTHS_CONFIG.filter(m => EVENTS_DATA.some(e => e.month === m.key)), 'Все месяцы');
  buildSelect('filter-importance', IMPORTANCE_OPTIONS, 'Любая важность');

  const selCity       = document.getElementById('filter-city');
  const selMonth      = document.getElementById('filter-month');
  const selImportance = document.getElementById('filter-importance');
  const searchInput   = document.getElementById('search-input');
  const resetBtn      = document.getElementById('btn-reset');

  if (selCity)       selCity.addEventListener('change',       e => { state.city       = e.target.value; render(); });
  if (selMonth)      selMonth.addEventListener('change',      e => { state.month      = e.target.value; render(); });
  if (selImportance) selImportance.addEventListener('change', e => { state.importance = e.target.value; render(); });
  if (searchInput)   searchInput.addEventListener('input', debounce(e => { state.search = e.target.value.trim(); render(); }, 250));

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.search = ''; state.month = 'all'; state.city = 'all'; state.importance = 'all';
      if (searchInput)   searchInput.value   = '';
      if (selCity)       selCity.value       = 'all';
      if (selMonth)      selMonth.value      = 'all';
      if (selImportance) selImportance.value = 'all';
      render();
    });
  }

  function render() {
    const filtered = EVENTS_DATA.filter(ev => {
      if (state.month      !== 'all' && ev.month      !== state.month)      return false;
      if (state.city       !== 'all' && ev.city       !== state.city)       return false;
      if (state.importance !== 'all' && ev.importance !== state.importance) return false;
      if (state.search) {
        const text = [ev.title, ev.description, ev.city, ev.tags?.join(' '), ev.recommended].join(' ');
        if (!matchesSearch(text, state.search)) return false;
      }
      return true;
    });

    const isFiltered = state.search || state.month !== 'all' || state.city !== 'all' || state.importance !== 'all';

    if (featuredSect) featuredSect.style.display = isFiltered ? 'none' : '';
    if (featuredEl && !isFiltered) {
      const featured = EVENTS_DATA.filter(e => e.is_featured);
      featuredEl.innerHTML = featured.map(renderEventCard).join('');
    }

    if (allEventsEl) {
      allEventsEl.innerHTML = '';
      MONTHS_CONFIG.forEach(m => {
        const evs = filtered.filter(e => e.month === m.key);
        if (!evs.length) return;
        const plural = n => n === 1 ? 'событие' : (n < 5 ? 'события' : 'событий');
        const sec = document.createElement('div');
        sec.className = 'month-section';
        sec.innerHTML = `
          <div class="month-header" onclick="toggleMonth(this)">
            <div class="month-header-left">
              <div class="month-dot"></div>
              <div class="month-name">${m.label}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="month-count">${evs.length} ${plural(evs.length)}</span>
              <span class="month-toggle">▾</span>
            </div>
          </div>
          <div class="events-grid">${evs.map(renderEventCard).join('')}</div>`;
        allEventsEl.appendChild(sec);
      });
    }

    if (resultsInfoEl) resultsInfoEl.innerHTML = `Найдено: <strong>${filtered.length}</strong> из ${EVENTS_DATA.length}`;
    if (noResultsEl)   noResultsEl.classList.toggle('show', filtered.length === 0);
  }

  render();
}

function toggleMonth(header) {
  const section   = header.nextElementSibling;
  const collapsed = header.classList.toggle('collapsed');
  section.style.display = collapsed ? 'none' : '';
}

// ─── Рендер карточки подрядчика ──────────────────────────

function renderContractorCard(c) {
  const cat = getCatConfig(c.category);
  const highlights = c.highlights?.length
    ? `<ul class="contractor-highlights">${c.highlights.map(h => `<li>${h}</li>`).join('')}</ul>`
    : '';
  const footer = [];
  if (c.price)      footer.push(`<span class="contractor-price">${c.price}</span>`);
  if (c.experience) footer.push(`<span class="contractor-experience">Опыт: ${c.experience}</span>`);
  if (c.website)    footer.push(`<a href="${c.website}" target="_blank" class="event-link">Сайт ↗</a>`);
  const clients = c.clients ? `<div class="contractor-clients">Клиенты: ${c.clients}</div>` : '';
  const tags = c.tags?.length
    ? `<div class="event-tags">${c.tags.map(t => `<span class="event-tag">${t}</span>`).join('')}</div>`
    : '';
  return `
    <div class="contractor-card">
      <div class="contractor-card-top">
        <div class="contractor-name">${c.name}</div>
        <span class="category-badge ${cat.className}">${cat.label}</span>
      </div>
      ${c.description ? `<div class="contractor-description">${c.description}</div>` : ''}
      ${highlights}${clients}${tags}
      ${footer.length ? `<div class="contractor-footer">${footer.join('')}</div>` : ''}
    </div>`;
}

// ─── Страница подрядчиков ────────────────────────────────

function initContractorsPage() {
  if (!window.CONTRACTORS_DATA) return;

  const state = { search: '', category: 'all' };

  const gridEl      = document.getElementById('contractors-output');
  const resultsEl   = document.getElementById('results-info');
  const noResultsEl = document.getElementById('no-results');

  const usedCats = CATEGORIES_CONFIG.filter(c => CONTRACTORS_DATA.some(ct => ct.category === c.key));
  buildSelect('filter-category', usedCats.map(c => ({ key: c.key, label: c.icon + ' ' + c.label })), 'Все категории');

  const selCategory = document.getElementById('filter-category');
  const searchInput = document.getElementById('search-input');
  const resetBtn    = document.getElementById('btn-reset');

  if (selCategory) selCategory.addEventListener('change', e => { state.category = e.target.value; render(); });
  if (searchInput) searchInput.addEventListener('input', debounce(e => { state.search = e.target.value.trim(); render(); }, 250));

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.search = ''; state.category = 'all';
      if (searchInput)  searchInput.value  = '';
      if (selCategory)  selCategory.value  = 'all';
      render();
    });
  }

  function render() {
    const filtered = CONTRACTORS_DATA.filter(c => {
      if (state.category !== 'all' && c.category !== state.category) return false;
      if (state.search) {
        const text = [c.name, c.description, c.clients, c.tags?.join(' ')].join(' ');
        if (!matchesSearch(text, state.search)) return false;
      }
      return true;
    });

    if (gridEl) {
      const byCategory = {};
      filtered.forEach(c => {
        if (!byCategory[c.category]) byCategory[c.category] = [];
        byCategory[c.category].push(c);
      });
      gridEl.innerHTML = '';
      CATEGORIES_CONFIG.forEach(cat => {
        const items = byCategory[cat.key];
        if (!items?.length) return;
        const sec = document.createElement('div');
        sec.className = 'category-section';
        sec.innerHTML = `
          <div class="category-header">
            <div class="category-icon">${cat.icon}</div>
            <div class="category-title">${cat.label}</div>
          </div>
          <div class="contractors-grid">${items.map(renderContractorCard).join('')}</div>`;
        gridEl.appendChild(sec);
      });
    }

    if (resultsEl)   resultsEl.innerHTML = `Найдено: <strong>${filtered.length}</strong> из ${CONTRACTORS_DATA.length}`;
    if (noResultsEl) noResultsEl.classList.toggle('show', filtered.length === 0);
  }

  render();
}

// ─── Инициализация ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (path.endsWith(href) || (href === 'index.html' && (path === '/' || path.endsWith('/')))) {
      link.classList.add('active');
    }
  });
  if (document.getElementById('events-page'))      initEventsPage();
  if (document.getElementById('contractors-page')) initContractorsPage();
});
