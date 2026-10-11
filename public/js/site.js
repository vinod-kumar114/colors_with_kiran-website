/* Colors with Kiran — public site behaviour
   Vanilla JS, no dependencies, ~4 KB. */
(function () {
  'use strict';

  /* ------------------------------------------------- mobile navigation */
  const burger = document.getElementById('burger');
  const burgerClose = document.getElementById('burgerClose');
  const drawer = document.getElementById('mobileNav');

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    if (burger) burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger && burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
  burgerClose && burgerClose.addEventListener('click', () => setDrawer(false));
  drawer && drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setDrawer(false)));

  /* ------------------------------------------ category filter (no reload) */
  const grid = document.getElementById('designGrid');
  const chips = document.querySelectorAll('.chip[data-filter]');
  const noResults = document.getElementById('noResults');

  function applyFilter(slug, push) {
    if (!grid) return;
    let shown = 0;
    grid.querySelectorAll('.grid-item').forEach((item) => {
      const match = slug === 'all' || item.dataset.category === slug;
      item.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    chips.forEach((c) => {
      const on = c.dataset.filter === slug;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
    });
    if (noResults) noResults.hidden = shown !== 0;

    // Rebuild the lightbox list so prev/next only walks visible items.
    collectLightboxItems();

    if (push) {
      const url = slug === 'all' ? location.pathname : `${location.pathname}?category=${slug}`;
      history.replaceState({ slug }, '', url);
    }
  }

  chips.forEach((chip) =>
    chip.addEventListener('click', () => applyFilter(chip.dataset.filter, true))
  );

  if (grid && chips.length) {
    const initial = new URLSearchParams(location.search).get('category') || 'all';
    if (initial !== 'all') applyFilter(initial, false);
  }

  /* -------------------------------------------------------- lightbox */
  const lb = document.getElementById('lightbox');
  let items = [];
  let idx = 0;
  let lastFocus = null;

  const $ = (id) => document.getElementById(id);

  function collectLightboxItems() {
    items = Array.from(document.querySelectorAll('[data-lightbox]')).filter((el) => {
      const host = el.closest('.grid-item') || el;
      return host.style.display !== 'none';
    });
  }

  function waFor(title, category) {
    let base = '';
    try {
      base = JSON.parse(document.getElementById('waBase').textContent).base;
    } catch (e) {
      return '#';
    }
    const extra = `\n\nI am interested in the "${title}" design${category ? ` (${category})` : ''}.`;
    return base + encodeURIComponent(extra);
  }

  function show(i) {
    if (!items.length) return;
    idx = (i + items.length) % items.length;
    const el = items[idx];
    const d = el.dataset;

    $('lbImg').src = d.full;
    $('lbImg').alt = d.title + (d.cat ? ' — ' + d.cat : '') + ' mehndi design';
    $('lbTitle').textContent = d.title || '';
    $('lbCat').textContent = d.cat || '';
    $('lbPrice').textContent = d.price || '';
    $('lbDate').textContent = d.date || '';
    $('lbDesc').textContent = d.desc || '';
    $('lbBook').href = waFor(d.title, d.cat);
    $('lbMore').href = d.url || '#';
    $('lbMore').style.display = d.url ? '' : 'none';
    $('lbCount').textContent = `${idx + 1} / ${items.length}`;

    // preload neighbours so prev/next feels instant
    [items[(idx + 1) % items.length], items[(idx - 1 + items.length) % items.length]].forEach((n) => {
      if (n && n.dataset.full) new Image().src = n.dataset.full;
    });
  }

  function openLb(i) {
    if (!lb) return;
    lastFocus = document.activeElement;
    lb.hidden = false;
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    show(i);
    $('lbClose').focus();
  }

  function closeLb() {
    if (!lb) return;
    lb.classList.remove('is-open');
    lb.hidden = true;
    document.body.style.overflow = '';
    $('lbImg').src = '';
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lightbox]');
    if (trigger) {
      e.preventDefault();
      collectLightboxItems();
      openLb(items.indexOf(trigger));
    }
  });

  if (lb) {
    $('lbClose').addEventListener('click', closeLb);
    $('lbPrev').addEventListener('click', () => show(idx - 1));
    $('lbNext').addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });

    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });

    // swipe on touch devices
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 55) show(dx > 0 ? idx - 1 : idx + 1);
      x0 = null;
    }, { passive: true });
  }

  collectLightboxItems();

  /* -------------------------------------------------- reveal on scroll */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveals.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in');
              io.unobserve(entry.target);
            }
          });
        },
        // Generous bottom margin: sections reveal just before they scroll in,
        // and anything within one screen of the fold is already visible.
        { rootMargin: '0px 0px 25% 0px', threshold: 0.01 }
      );
      reveals.forEach((el) => io.observe(el));

      // Failsafe — if something never gets observed (odd layouts, printing,
      // a crawler that renders but does not scroll), show it anyway.
      setTimeout(() => {
        document.querySelectorAll('.reveal:not(.is-in)').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 2) el.classList.add('is-in');
        });
      }, 1600);
      window.addEventListener('beforeprint', () =>
        document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'))
      );
    }
  }

  /* ------------------------------ keep the date picker from going stale */
  const dateInput = document.getElementById('preferred_date');
  if (dateInput && !dateInput.min) dateInput.min = new Date().toISOString().slice(0, 10);
})();
