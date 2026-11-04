/* ============================================================
   INARI LIFE — storefront logic
   Data: js/data.js  (generated from the seller catalogue sheet)
   ============================================================ */
(function () {
  'use strict';

  var DB = (window.INARI && window.INARI.products) || [];
  var META = (window.INARI && window.INARI.meta) || {};
  var PAGE = 30;

  var GROUPS = {
    home: 'Home & Kitchen',
    beauty: 'Beauty & Personal Care',
    tools: 'Tools & Hardware',
    electronics: 'Electronics'
  };

  /* ---------- helpers ---------- */
  var inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  function money(n) { return '\u20B9' + inr.format(Math.round(n)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* % Discount = (MRP - Price) / MRP * 100, guarded for MRP <= 0 and price >= MRP */
  function disc(p) {
    if (!(p.mrp > 0) || !(p.price >= 0) || p.price >= p.mrp) return 0;
    return Math.round(((p.mrp - p.price) / p.mrp) * 100);
  }
  function save(p) { return Math.max(0, p.mrp - p.price); }
  function catLabel(p) { return p.sub || GROUPS[p.grp] || 'Catalogue'; }

  var ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>',
    beauty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.9L19 9.8l-5.1 1.9L12 17l-1.9-5.3L5 9.8l5.1-1.9z"/></svg>',
    tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5a4 4 0 1 0 4.6 5.9L21 10l-3-3-1.6 1.9"/><path d="M13 8 4 17v3h3l9-9"/></svg>',
    electronics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.5h2"/></svg>'
  };

  var TINTS = [
    ['#fdf5ec', '#f3f6fb'], ['#f5f8fd', '#fdf4ea'], ['#fdf7f1', '#eef3fa'],
    ['#f4f7fc', '#faf2e9'], ['#fbf6f0', '#f1f5fb'], ['#f6f9fd', '#fcf3e6']
  ];
  function tint(id) {
    var t = TINTS[id % TINTS.length];
    return 'radial-gradient(120% 100% at 50% 0%,' + t[0] + ' 0%,' + t[1] + ' 100%)';
  }

  /* ---------- image fallback chain ----------
     Rung 1/2: Amazon ASIN image params (plain, then a sized variant).
     Rung 3:   branded placeholder tile.

     NOTE — why DeoDap is NOT an <img> rung any more:
     deodap.in is a Shopify storefront. /catalogsearch/result/?q=… returns 404
     and /search?q=… returns text/html. Pointing an <img> at either one made the
     browser fetch+discard 10 HTML documents per page view and log
     ERR_BLOCKED_BY_ORB every time. The DeoDap route is still wired up, but as a
     real one-click search link (see deodapLink) used on the PDP — by seller SKU
     and by title — instead of a request that can never yield an image. */
  function imgSteps(p) {
    var a = p.asin;
    return [
      'https://images-na.ssl-images-amazon.com/images/P/' + a + '.jpg',
      'https://images-na.ssl-images-amazon.com/images/P/' + a + '._SL500_.jpg'
    ];
  }
  function deodapLink(p, byTitle) {
    var q = byTitle ? p.t.split('|')[0].slice(0, 70) : (p.sku || p.t);
    return 'https://deodap.in/search?q=' + encodeURIComponent(q);
  }

  function armImage(img) {
    if (img.dataset.armed) return;
    img.dataset.armed = '1';
    var p = byId[img.dataset.pid];
    if (!p) return;
    var steps = imgSteps(p);
    var i = 0;
    var thumb = img.parentNode;
    function fail() {
      i++;
      if (i < steps.length) { img.src = steps[i]; }
      else { img.remove(); thumb.classList.add('ph-on'); }
    }
    img.onload = function () {
      /* Amazon answers missing images with a 1x1 transparent GIF */
      if (img.naturalWidth < 5 || img.naturalHeight < 5) { fail(); return; }
      img.classList.add('loaded');
    };
    img.onerror = fail;
    img.src = steps[0];
  }

  var byId = {};
  DB.forEach(function (p) { byId[p.id] = p; });

  /* ---------- placeholder markup ---------- */
  function phHTML(p) {
    return '<div class="thumb-ph" style="background:' + tint(p.id) + '">' +
      '<div><div class="ph-ic">' + (ICON[p.grp] || ICON.home) + '</div>' +
      '<div class="ph-t">' + esc(catLabel(p).slice(0, 30)) + '</div></div></div>';
  }

  function mediaHTML(p, cls) {
    return '<div class="' + cls + '">' + phHTML(p) +
      '<img data-pid="' + p.id + '" alt="' + esc(p.t.slice(0, 110)) + '" loading="lazy" decoding="async">' +
      '</div>';
  }

  /* ---------- card ---------- */
  function cardHTML(p) {
    var d = disc(p);
    return '<article class="card" data-id="' + p.id + '">' +
      '<div class="thumb">' + phHTML(p) +
        '<img data-pid="' + p.id + '" alt="' + esc(p.t.slice(0, 110)) + '" loading="lazy" decoding="async">' +
        (d ? '<span class="badge">' + d + '% OFF</span>' : '') +
        '<button class="peek" data-open="' + p.id + '" aria-label="Quick view ' + esc(p.t.slice(0, 40)) + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="card-body">' +
        '<span class="card-cat">' + esc(catLabel(p)) + '</span>' +
        '<a class="card-title" href="#p=' + p.id + '" data-open="' + p.id + '">' + esc(p.t) + '</a>' +
        '<div class="price-row"><span class="p-now">' + money(p.price) + '</span>' +
          '<span class="p-mrp">' + money(p.mrp) + '</span>' +
          (d ? '<span class="p-off">' + d + '% off</span>' : '') +
        '</div>' +
        '<span class="card-sku">SKU ' + esc(p.sku) + '</span>' +
        '<a class="buy" href="' + esc(p.url) + '" target="_blank" rel="noopener sponsored nofollow">Buy now on Amazon ' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>' +
      '</div>' +
    '</article>';
  }

  /* ---------- render a container, then arm images when visible ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { io.unobserve(e.target); armImage(e.target); }
    });
  }, { rootMargin: '260px' }) : null;

  function paint(el, list) {
    el.innerHTML = list.map(cardHTML).join('');
    var imgs = el.querySelectorAll('img[data-pid]');
    for (var i = 0; i < imgs.length; i++) { io ? io.observe(imgs[i]) : armImage(imgs[i]); }
  }

  /* ============================================================
     SECTIONS
     ============================================================ */

  /* Deal of the Day — ranked by discount % then rupee savings */
  var deals = DB.slice().sort(function (a, b) {
    return (disc(b) - disc(a)) || (save(b) - save(a)) || (a.price - b.price);
  }).slice(0, 10);
  paint(document.getElementById('dealRow'), deals);

  /* Focus products — handpicked: deepest-stocked line per sub-category,
     capped so no single category dominates */
  (function focus() {
    var best = {};
    DB.forEach(function (p) {
      var k = catLabel(p);
      if (!best[k] || p.qty > best[k].qty) best[k] = p;
    });
    var pick = Object.keys(best).map(function (k) { return best[k]; })
      .sort(function (a, b) { return b.qty - a.qty; });
    /* keep the eight strongest, then re-spread across the four groups */
    var seen = {}, out = [];
    pick.forEach(function (p) { if (!seen[p.grp] && out.length < 8) { seen[p.grp] = 1; out.push(p); } });
    pick.forEach(function (p) { if (out.length < 8 && out.indexOf(p) < 0) out.push(p); });
    paint(document.getElementById('focusGrid'), out.slice(0, 8));
  })();

  /* New arrivals — the sheet's open-date order, newest first */
  (function arrivals() {
    var list = DB.slice().sort(function (a, b) {
      var da = (a.date || ''), dbb = (b.date || '');
      return da < dbb ? 1 : da > dbb ? -1 : a.id - b.id;
    }).slice(0, 8);
    paint(document.getElementById('newGrid'), list);
  })();

  /* ============================================================
     CATALOGUE — tabs, chips, search, sort, load more
     ============================================================ */
  var state = { grp: 'all', sub: 'all', q: '', sort: 'featured', shown: PAGE };
  var tabsEl = document.getElementById('tabs');
  var chipsEl = document.getElementById('chips');
  var gridEl = document.getElementById('grid');
  var countEl = document.getElementById('count');
  var moreEl = document.getElementById('more');

  function countBy(g) { return DB.filter(function (p) { return p.grp === g; }).length; }

  function buildTabs() {
    var html = '<button class="tab on" role="tab" aria-selected="true" data-grp="all">All products <span class="n">' + DB.length + '</span></button>';
    Object.keys(GROUPS).forEach(function (g) {
      html += '<button class="tab" role="tab" aria-selected="false" data-grp="' + g + '">' + GROUPS[g] +
        ' <span class="n">' + countBy(g) + '</span></button>';
    });
    tabsEl.innerHTML = html;
  }

  function buildChips() {
    var pool = DB.filter(function (p) { return state.grp === 'all' || p.grp === state.grp; });
    var counts = {};
    pool.forEach(function (p) { counts[catLabel(p)] = (counts[catLabel(p)] || 0) + 1; });
    var subs = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    if (state.sub !== 'all' && !counts[state.sub]) state.sub = 'all';
    var html = '<button class="chip' + (state.sub === 'all' ? ' on' : '') + '" data-sub="all">All sub-categories</button>';
    subs.forEach(function (s) {
      if (counts[s] < 2 && s !== state.sub) return;
      html += '<button class="chip' + (state.sub === s ? ' on' : '') + '" data-sub="' + esc(s) + '">' + esc(s) + ' · ' + counts[s] + '</button>';
    });
    chipsEl.innerHTML = html;
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var terms = q ? q.split(/\s+/) : [];
    var out = DB.filter(function (p) {
      if (state.grp !== 'all' && p.grp !== state.grp) return false;
      if (state.sub !== 'all' && catLabel(p) !== state.sub) return false;
      if (!terms.length) return true;
      var hay = (p.t + ' ' + p.sku + ' ' + p.asin + ' ' + p.cat + ' ' + p.d).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) > -1; });
    });
    var s = state.sort;
    out.sort(function (a, b) {
      if (s === 'price-asc') return a.price - b.price;
      if (s === 'price-desc') return b.price - a.price;
      if (s === 'az') return a.t.localeCompare(b.t);
      if (s === 'savings') return (save(b) - save(a)) || (disc(b) - disc(a));
      return a.id - b.id; /* featured = catalogue order */
    });
    return out;
  }

  function renderCatalog() {
    var list = filtered();
    var slice = list.slice(0, state.shown);
    if (!list.length) {
      gridEl.innerHTML = '';
      gridEl.insertAdjacentHTML('afterend',
        '<div class="empty" id="emptyState"><b>No products match that search</b>' +
        '<span>Try a shorter phrase, a seller SKU, or clear the category filter.</span></div>');
      countEl.innerHTML = '<b>0</b> products';
      moreEl.style.display = 'none';
      return;
    }
    var empty = document.getElementById('emptyState');
    if (empty) empty.remove();

    paint(gridEl, slice);
    var label = state.q.trim()
      ? '<b>' + list.length + '</b> result' + (list.length === 1 ? '' : 's') + ' for “' + esc(state.q.trim()) + '”'
      : 'Showing <b>' + slice.length + '</b> of <b>' + list.length + '</b> products';
    countEl.innerHTML = label + (state.sub !== 'all' ? ' · ' + esc(state.sub) : '');
    moreEl.style.display = slice.length < list.length ? '' : 'none';
    moreEl.textContent = 'Load more products (' + (list.length - slice.length) + ' left)';
  }

  buildTabs(); buildChips(); renderCatalog();

  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-grp]'); if (!b) return;
    state.grp = b.dataset.grp; state.shown = PAGE; state.sub = 'all';
    [].forEach.call(tabsEl.children, function (t) {
      var on = t === b; t.classList.toggle('on', on); t.setAttribute('aria-selected', on);
    });
    buildChips(); renderCatalog();
  });

  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sub]'); if (!b) return;
    state.sub = b.dataset.sub; state.shown = PAGE;
    buildChips(); renderCatalog();
  });

  document.getElementById('sort').addEventListener('change', function (e) {
    state.sort = e.target.value; state.shown = PAGE; renderCatalog();
  });

  moreEl.addEventListener('click', function () {
    state.shown += PAGE; renderCatalog();
  });

  /* search */
  var qEl = document.getElementById('q');
  var qClear = document.getElementById('qClear');
  var t;
  qEl.addEventListener('input', function () {
    qClear.classList.toggle('on', !!qEl.value);
    clearTimeout(t);
    t = setTimeout(function () {
      state.q = qEl.value; state.shown = PAGE; renderCatalog();
    }, 150);
  });
  qEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      state.q = qEl.value; state.shown = PAGE; renderCatalog();
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (e.key === 'Escape') { qEl.value = ''; qClear.classList.remove('on'); state.q = ''; renderCatalog(); }
  });
  qClear.addEventListener('click', function () {
    qEl.value = ''; qClear.classList.remove('on'); state.q = ''; state.shown = PAGE;
    renderCatalog(); qEl.focus();
  });

  /* jump links from header / banners / footer */
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-jump]');
    if (!j) return;
    e.preventDefault();
    state.grp = j.dataset.jump; state.sub = 'all'; state.q = ''; state.shown = PAGE;
    qEl.value = ''; qClear.classList.remove('on');
    buildChips(); renderCatalog();
    [].forEach.call(tabsEl.children, function (t) {
      var on = t.dataset.grp === state.grp; t.classList.toggle('on', on); t.setAttribute('aria-selected', on);
    });
    document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ============================================================
     PDP MODAL
     ============================================================ */
  var modal = document.getElementById('modal');
  var pdpEl = document.getElementById('pdp');
  var lastFocus = null;

  function bullets(p) {
    var out = [];
    var src = (p.d || '').replace(/\s+/g, ' ').trim();
    if (src) {
      out = src.split(/(?<=[.!?])\s+/).filter(function (s) { return s.length > 24; }).slice(0, 4);
    }
    if (out.length < 3) {
      /* no (or thin) description: mine the title's own clauses, e.g. "X | Y | Z" */
      var segs = p.t.replace(/\s*\|\s*/g, ' | ').split('|')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 12 && !/^inari life$/i.test(s); });
      segs.slice(1).forEach(function (s) { if (out.length < 4) out.push(s.replace(/^[–—-]\s*/, '')); });
    }
    if (out.length < 3) {
      out.push('Catalogued under ' + catLabel(p) + ' — ' + GROUPS[p.grp] + '.');
      out.push('Sold and fulfilled through Amazon.in with tracked delivery.');
      out.push('Listed at ' + disc(p) + '% below MRP — save ' + money(save(p)) + ' per unit.');
    }
    return out.slice(0, 4).map(function (s) {
      s = s.trim();
      return s.length > 210 ? s.slice(0, 207).trim() + '…' : s;
    });
  }

  function openPDP(id) {
    var p = byId[id]; if (!p) return;
    lastFocus = document.activeElement;
    var d = disc(p);
    var feats = bullets(p).map(function (b) {
      return '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg><span>' + esc(b) + '</span></li>';
    }).join('');

    pdpEl.innerHTML =
      '<div class="pdp-media">' + mediaHTML(p, 'pdp-thumb') +
        '<div class="pdp-meta">' +
          '<div><span>Seller SKU</span><b>' + esc(p.sku) + '</b></div>' +
          '<div><span>ASIN</span><b>' + esc(p.asin) + '</b></div>' +
          '<div><span>Category</span><b>' + esc(catLabel(p)) + '</b></div>' +
          '<div><span>Listed</span><b>' + esc((p.date || '').split(' ')[0] || '—') + '</b></div>' +
        '</div>' +
        '<div class="pdp-alt">Image not available? <a href="' + esc(deodapLink(p)) + '" target="_blank" rel="noopener nofollow">Search DeoDap by seller SKU</a> <a href="' + esc(deodapLink(p, true)) + '" target="_blank" rel="noopener nofollow">by product title</a></div>' +
      '</div>' +
      '<div class="pdp-body">' +
        '<div class="pdp-crumb">' + esc(p.cat) + '</div>' +
        '<h3 id="pdpTitle">' + esc(p.t) + '</h3>' +
        '<div class="pdp-price">' +
          '<span class="now">' + money(p.price) + '</span>' +
          '<span class="mrp">MRP ' + money(p.mrp) + '</span>' +
          (d ? '<span class="save">' + d + '% off · save ' + money(save(p)) + '</span>' : '') +
        '</div>' +
        (p.d ? '<div class="pdp-desc">' + esc(p.d) + '</div>' : '<div class="pdp-desc">Full description is available on the Amazon listing for this product.</div>') +
        '<ul class="pdp-feats">' + feats + '</ul>' +
        '<div class="pdp-plain" style="margin-bottom:16px">Price breakdown: MRP ' + money(p.mrp) +
          ' − discount ' + money(save(p)) + ' (' + d + '%) = selling price ' + money(p.price) + '.</div>' +
        '<div class="pdp-actions">' +
          '<a class="btn btn-primary amz" href="' + esc(p.url) + '" target="_blank" rel="noopener sponsored nofollow">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-1.6 8.5H8.2L6 6z"/><path d="M6 6 5 3H2.5"/><circle cx="9" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/></svg>' +
            'BUY NOW ON AMAZON</a>' +
          '<button class="btn btn-outline" data-close>Keep browsing</button>' +
        '</div>' +
        '<div class="pdp-note">Sold, invoiced and delivered by Amazon.in sellers — Prime-eligible where shown at checkout. Inari Life does not process payment on this site; the button above opens the live listing.</div>' +
      '</div>';

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var im = pdpEl.querySelector('img[data-pid]');
    if (im) { im.dataset.armed = ''; armImage(im); }
    var c = modal.querySelector('.modal-close'); if (c) c.focus();
    try { history.replaceState(null, '', '#p=' + id); } catch (err) {}
  }

  function closePDP() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); openPDP(+o.dataset.open); return; }
    if (e.target.closest('[data-close]')) closePDP();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePDP(); });

  /* deep link support: #p=42 */
  (function deepLink() {
    var m = /#p=(\d+)/.exec(location.hash);
    if (m) setTimeout(function () { openPDP(+m[1]); }, 120);
  })();

  /* ============================================================
     BANNER CAROUSEL
     ============================================================ */
  (function carousel() {
    var slides = [].slice.call(document.querySelectorAll('.slide'));
    var dotsEl = document.getElementById('dots');
    var i = 0, timer;

    dotsEl.innerHTML = slides.map(function (_, n) {
      return '<button data-dot="' + n + '" aria-label="Go to banner ' + (n + 1) + '"' + (n === 0 ? ' class="on"' : '') + '></button>';
    }).join('');

    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
      [].forEach.call(dotsEl.children, function (d, k) { d.classList.toggle('on', k === i); });
    }
    function auto() { clearInterval(timer); timer = setInterval(function () { go(i + 1); }, 7000); }

    document.getElementById('next').addEventListener('click', function () { go(i + 1); auto(); });
    document.getElementById('prev').addEventListener('click', function () { go(i - 1); auto(); });
    dotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dot]'); if (!b) return;
      go(+b.dataset.dot); auto();
    });
    var wrap = document.getElementById('slides');
    wrap.addEventListener('mouseenter', function () { clearInterval(timer); });
    wrap.addEventListener('mouseleave', auto);
    auto();
  })();

  /* ============================================================
     SMALL UI BITS
     ============================================================ */
  (function clock() {
    var el = document.getElementById('countdown');
    function tick() {
      var now = new Date();
      var end = new Date(now); end.setHours(23, 59, 59, 999);
      var s = Math.max(0, Math.floor((end - now) / 1000));
      var h = String(Math.floor(s / 3600)).padStart(2, '0');
      var m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      var ss = String(s % 60).padStart(2, '0');
      el.textContent = h + ':' + m + ':' + ss;
    }
    tick(); setInterval(tick, 1000);
  })();

  document.getElementById('yr').textContent = String(new Date().getFullYear());
  var synced = document.getElementById('syncedAt');
  if (synced && META.count) {
    synced.textContent = META.count + ' SKUs · catalogue dated ' + (META.updated || '');
  }
  var catalogSub = document.getElementById('catalogSub');
  if (catalogSub && META.count) {
    catalogSub.textContent = META.count + ' live SKUs with pricing from the seller sheet. Every card links directly to its Amazon.in listing.';
  }
})();
