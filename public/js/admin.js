/* Colors with Kiran — admin dashboard
   Plain JS. Talks to /admin/api/*. Designed to be forgiving and obvious. */
(function () {
  'use strict';

  let D = null;              // bootstrap payload
  let inqStatus = 'all';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  /* --------------------------------------------------------------- toast */
  function toast(msg, isError) {
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' toast--err' : '');
    el.innerHTML = `<svg><use href="#i-${isError ? 'info' : 'check'}"/></svg><span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s';
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }

  /* ----------------------------------------------------------------- api */
  async function api(url, opts = {}) {
    const res = await fetch(url, { credentials: 'same-origin', ...opts });
    if (res.status === 401) {
      toast('Your session expired — reloading the sign-in page.', true);
      setTimeout(() => (location.href = '/admin/login'), 1200);
      throw new Error('unauthorised');
    }
    let json;
    try { json = await res.json(); } catch { throw new Error('Unexpected response from the server.'); }
    if (!res.ok || !json.ok) throw new Error(json.error || 'Something went wrong.');
    return json;
  }

  const apiJSON = (url, method, body) =>
    api(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });

  /* ------------------------------------------------------------ panels */
  function showPanel(name) {
    $$('.panel').forEach((p) => p.classList.toggle('is-active', p.id === 'p-' + name));
    $$('.side__link').forEach((b) => b.classList.toggle('is-active', b.dataset.panel === name));
    if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  $('#sideNav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-panel]');
    if (btn) showPanel(btn.dataset.panel);
  });
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) showPanel(go.dataset.goto);
  });

  /* ------------------------------------------------------------- modals */
  function openModal(id) { $('#' + id).classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function closeModal(el) { el.classList.remove('is-open'); document.body.style.overflow = ''; }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-modal]')) closeModal(e.target.closest('.modal'));
    if (e.target.classList.contains('modal')) closeModal(e.target);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal.is-open').forEach(closeModal);
  });

  /* ==================================================================== */
  /*  RENDERING                                                           */
  /* ==================================================================== */

  function renderStats() {
    const s = D.stats;
    const cards = [
      ['Total designs', s.designs, 0],
      ['Featured', s.featured, 0],
      ['Gallery images', s.gallery, 0],
      ['Categories', s.categories, 0],
      ['New enquiries', s.newInquiries, s.newInquiries > 0],
      ['All enquiries', s.inquiries, 0],
      ['Testimonials', s.testimonials, 0],
      ['In trash', s.trashed, 0],
    ];
    $('#statCards').innerHTML = cards
      .map(([label, n, alert]) => `<div class="stat ${alert ? 'is-alert' : ''}"><b>${n}</b><span>${label}</span></div>`)
      .join('');

    const nn = $('#navNew');
    nn.hidden = !s.newInquiries;
    nn.textContent = s.newInquiries;
    const nt = $('#navTrash');
    nt.hidden = !s.trashed;
    nt.textContent = s.trashed;
  }

  /* ----------------------------------------------------------- designs */
  function designRow(d, mode) {
    const price =
      d.price_type === 'request' ? 'Price on request'
      : d.price_label || '—';
    const acts = mode === 'trash'
      ? `<button class="mini mini--on" data-restore="${d.id}">↩ Restore</button>
         <button class="mini mini--danger" data-purge="${d.id}">Delete forever</button>`
      : `<button class="mini ${d.is_featured ? 'mini--on' : ''}" data-feature="${d.id}">${d.is_featured ? '★ Featured' : '☆ Feature'}</button>
         <button class="mini" data-move="${d.id}">${d.placement === 'portfolio' ? '→ Gallery' : '→ Portfolio'}</button>
         <button class="mini mini--gold" data-edit="${d.id}">Edit</button>
         <button class="mini mini--danger" data-trash="${d.id}">Delete</button>`;

    return `<div class="row" data-name="${esc(d.title.toLowerCase())}">
      <img class="row__img" src="${esc(d.thumb_url)}" alt="" loading="lazy">
      <div class="row__main">
        <div class="row__title">${esc(d.title)}
          ${d.is_featured ? '<span class="badge badge--gold">Featured</span>' : ''}
          ${mode !== 'trash' ? `<span class="badge badge--${d.placement === 'gallery' ? 'gray' : 'leaf'}">${d.placement}</span>` : ''}
        </div>
        <div class="row__meta">${esc(d.category_name || 'Uncategorised')} · ${esc(price)}${d.taken_on ? ' · ' + esc(d.taken_on) : ''}</div>
      </div>
      <div class="row__acts">${acts}</div>
    </div>`;
  }

  function renderDesigns() {
    const port = D.designs.filter((d) => d.placement === 'portfolio');
    const gall = D.designs.filter((d) => d.placement === 'gallery');

    $('#listPortfolio').innerHTML = port.length
      ? port.map((d) => designRow(d, 'portfolio')).join('')
      : `<p class="nothing">No portfolio designs yet. Tap <b>+ Add design</b> to upload your first one.</p>`;

    $('#listGallery').innerHTML = gall.length
      ? gall.map((d) => designRow(d, 'gallery')).join('')
      : `<p class="nothing">Your gallery is empty. Move older designs here from the Portfolio tab, or upload straight to the gallery.</p>`;

    $('#listTrash').innerHTML = D.trash.length
      ? D.trash.map((d) => designRow(d, 'trash')).join('')
      : `<p class="nothing">Trash is empty — nothing has been deleted.</p>`;
  }

  /* -------------------------------------------------------- categories */
  function renderCategories() {
    $('#listCategories').innerHTML = D.categories.length
      ? D.categories.map((c, i) => `
        <div class="row row--noimg">
          <div class="row__main">
            <div class="row__title">${esc(c.emoji || '')} ${esc(c.name)}
              <span class="badge badge--gray">${c.design_count} design${c.design_count === 1 ? '' : 's'}</span></div>
            <div class="row__meta">${esc(c.description || 'No description')} · /portfolio?category=${esc(c.slug)}</div>
          </div>
          <div class="row__acts">
            <button class="mini" data-cat-move="${c.id}" data-dir="up" ${i === 0 ? 'disabled style="opacity:.35"' : ''}>↑</button>
            <button class="mini" data-cat-move="${c.id}" data-dir="down" ${i === D.categories.length - 1 ? 'disabled style="opacity:.35"' : ''}>↓</button>
            <button class="mini mini--gold" data-cat-edit="${c.id}">Rename</button>
            <button class="mini mini--danger" data-cat-del="${c.id}">Delete</button>
          </div>
        </div>`).join('')
      : `<p class="nothing">No categories yet — add your first one above.</p>`;

    // keep the design-modal dropdown in sync
    const sel = $('#dCat');
    const cur = sel.value;
    sel.innerHTML = '<option value="">— Uncategorised —</option>' +
      D.categories.map((c) => `<option value="${c.id}">${esc((c.emoji ? c.emoji + ' ' : '') + c.name)}</option>`).join('');
    sel.value = cur;
  }

  /* ------------------------------------------------------------ pricing */
  function renderPricing() {
    $('#listPricing').innerHTML = D.pricing.length
      ? D.pricing.map((p) => `
        <div class="row row--noimg" style="${p.is_active ? '' : 'opacity:.55'}">
          <div class="row__main" style="display:grid;gap:.4rem">
            <input class="pr-in" data-id="${p.id}" data-f="service" value="${esc(p.service)}"
                   style="font-weight:500;border:1px solid var(--line-soft);border-radius:6px;padding:.4rem .6rem;min-height:38px">
            <div style="display:grid;grid-template-columns:130px 1fr;gap:.4rem">
              <input class="pr-in" data-id="${p.id}" data-f="price_text" value="${esc(p.price_text)}" placeholder="Rs. 0"
                     style="font-family:var(--serif);font-weight:600;color:var(--henna);border:1px solid var(--line-soft);border-radius:6px;padding:.4rem .6rem;min-height:38px">
              <input class="pr-in" data-id="${p.id}" data-f="note" value="${esc(p.note)}" placeholder="Note (optional)"
                     style="font-size:.84rem;border:1px solid var(--line-soft);border-radius:6px;padding:.4rem .6rem;min-height:38px">
            </div>
          </div>
          <div class="row__acts">
            <button class="mini ${p.is_active ? 'mini--on' : ''}" data-pr-toggle="${p.id}">${p.is_active ? 'Visible' : 'Hidden'}</button>
            <button class="mini mini--gold" data-pr-save="${p.id}">Save</button>
            <button class="mini mini--danger" data-pr-del="${p.id}">Delete</button>
          </div>
        </div>`).join('')
      : `<p class="nothing">No price rows yet.</p>`;
  }

  /* ------------------------------------------------------- testimonials */
  function renderTestimonials() {
    $('#listTestimonials').innerHTML = D.testimonials.length
      ? D.testimonials.map((t) => `
        <div class="row" style="${t.is_visible ? '' : 'opacity:.55'}">
          ${t.photo
            ? `<img class="row__img" src="/uploads/thumb/${esc(t.photo)}" alt="" loading="lazy">`
            : `<div class="row__img" style="display:grid;place-items:center;font-family:var(--serif);font-size:1.4rem;color:var(--henna)">${esc(t.name.charAt(0).toUpperCase())}</div>`}
          <div class="row__main">
            <div class="row__title">${esc(t.name)}
              <span class="badge badge--gold">${'★'.repeat(t.rating)}</span>
              ${t.is_visible ? '' : '<span class="badge badge--gray">Hidden</span>'}</div>
            <div class="row__meta">${esc(t.event_type || 'No event')} · ${esc(t.review.slice(0, 90))}${t.review.length > 90 ? '…' : ''}</div>
          </div>
          <div class="row__acts">
            <button class="mini ${t.is_visible ? 'mini--on' : ''}" data-t-toggle="${t.id}">${t.is_visible ? 'Visible' : 'Hidden'}</button>
            <button class="mini mini--gold" data-t-edit="${t.id}">Edit</button>
            <button class="mini mini--danger" data-t-del="${t.id}">Delete</button>
          </div>
        </div>`).join('')
      : `<p class="nothing">No reviews yet — add your first one.</p>`;
  }

  /* ---------------------------------------------------------- inquiries */
  function waHref(num, name) {
    const digits = String(num || '').replace(/\D/g, '').replace(/^0/, '92');
    const msg = `Assalam-o-Alaikum ${name || ''}, thank you for your booking request with Colors with Kiran.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  }

  function inqRow(q, compact) {
    const badge = { new: 'new', read: 'gray', booked: 'booked', archived: 'gray' }[q.status] || 'gray';
    const when = new Date(q.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-PK', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    });
    const bits = [
      q.event_type, q.preferred_date, q.preferred_time, q.category,
      q.people_count ? q.people_count + (Number(q.people_count) === 1 ? ' person' : ' people') : '',
      q.location,
    ].filter(Boolean).join(' · ');

    return `<div class="row row--noimg">
      <div class="row__main">
        <div class="row__title">${esc(q.name)} <span class="badge badge--${badge}">${q.status}</span>
          <span style="font-size:.74rem;color:var(--ink-faint);font-weight:400">${when}</span></div>
        <div class="row__meta">${esc(q.phone)}${bits ? ' · ' + esc(bits) : ''}</div>
        ${q.message && !compact ? `<div class="row__meta" style="margin-top:.35rem;color:var(--ink-soft);white-space:pre-wrap">${esc(q.message)}</div>` : ''}
      </div>
      <div class="row__acts">
        <a class="mini mini--on" href="${waHref(q.whatsapp || q.phone, q.name)}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="mini" href="tel:${esc(String(q.phone).replace(/\s/g, ''))}">Call</a>
        ${compact ? '' : `
          <button class="mini mini--gold" data-inq="${q.id}" data-status="booked">Mark booked</button>
          <button class="mini" data-inq="${q.id}" data-status="archived">Archive</button>
          <button class="mini mini--danger" data-inq-del="${q.id}">Delete</button>`}
      </div>
    </div>`;
  }

  function renderInquiries() {
    const list = inqStatus === 'all' ? D.inquiries : D.inquiries.filter((q) => q.status === inqStatus);
    $('#listInquiries').innerHTML = list.length
      ? list.map((q) => inqRow(q, false)).join('')
      : `<p class="nothing">No ${inqStatus === 'all' ? '' : inqStatus + ' '}enquiries yet. They will appear here the moment someone uses your booking form.</p>`;

    $('#recentInq').innerHTML = D.inquiries.length
      ? D.inquiries.slice(0, 5).map((q) => inqRow(q, true)).join('')
      : `<p class="nothing">No booking requests yet.</p>`;
  }

  $('#inqFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-status]');
    if (!b) return;
    inqStatus = b.dataset.status;
    $$('#inqFilter button').forEach((x) => x.classList.toggle('is-active', x === b));
    renderInquiries();
  });

  /* ==================================================================== */
  /*  SETTINGS FORMS                                                      */
  /* ==================================================================== */

  const FORMS = {
    formBanner: [
      { key: 'banner.enabled', label: 'Show the announcement banner', type: 'checkbox' },
      { key: 'banner.text', label: 'Banner text', hint: 'e.g. "Eid Bookings Are Now Open!"', full: true },
      { key: 'banner.link', label: 'Where it links to', hint: 'Usually /contact', full: true },
    ],
    formHero: [
      { key: 'home.hero_image', label: 'Hero photo', type: 'image', full: true },
      { key: 'home.hero_kicker', label: 'Small line above the headline', full: true },
      { key: 'home.hero_title', label: 'Big headline', type: 'textarea', rows: 2, full: true,
        hint: 'Use <br> to break the line.' },
      { key: 'home.hero_text', label: 'Short paragraph under the headline', type: 'textarea', rows: 3, full: true },
    ],
    formIntro: [
      { key: 'home.intro_title', label: 'Welcome heading', full: true },
      { key: 'home.intro_text', label: 'Welcome paragraph', type: 'textarea', rows: 5, full: true },
    ],
    formAbout: [
      { key: 'about.photo', label: 'Your photo', type: 'image', full: true },
      { key: 'about.heading', label: 'Heading' },
      { key: 'about.subheading', label: 'Subheading' },
      { key: 'about.name', label: 'Your name' },
      { key: 'about.experience', label: 'Experience', hint: 'e.g. 8+ years' },
      { key: 'about.location', label: 'Where you are based', full: true },
      { key: 'about.story', label: 'Your story', type: 'textarea', rows: 10, full: true,
        hint: 'Leave a blank line between paragraphs.' },
      { key: 'about.specialties', label: 'Specialties', type: 'textarea', rows: 6, full: true,
        hint: 'One per line.' },
      { key: 'about.services', label: 'Services', type: 'textarea', rows: 6, full: true,
        hint: 'One per line.' },
    ],
    formContact: [
      { key: 'contact.phone', label: 'Phone number', type: 'tel' },
      { key: 'contact.whatsapp', label: 'WhatsApp number', type: 'tel',
        hint: 'With country code, e.g. +92 300 1234567' },
      { key: 'contact.email', label: 'Email address', type: 'email' },
      { key: 'contact.hours', label: 'Working hours' },
      { key: 'contact.instagram', label: 'Instagram link', type: 'url' },
      { key: 'contact.facebook', label: 'Facebook link', type: 'url' },
      { key: 'contact.area', label: 'Area', hint: 'e.g. Qasimabad' },
      { key: 'contact.city', label: 'City', hint: 'e.g. Hyderabad' },
      { key: 'contact.region', label: 'Province' },
      { key: 'contact.maps_url', label: 'Google Maps link (optional)', type: 'url' },
      { key: 'contact.address', label: 'Full address', full: true },
      { key: 'contact.service_area', label: 'Areas you serve', type: 'textarea', rows: 2, full: true,
        hint: 'Separate with commas.' },
      { key: 'contact.whatsapp_message', label: 'Pre-filled WhatsApp message', type: 'textarea', rows: 3, full: true,
        hint: 'What clients see already typed when they tap a WhatsApp button.' },
    ],
    formSite: [
      { key: 'site.name', label: 'Website name', full: true },
      { key: 'site.tagline', label: 'Tagline', full: true },
      { key: 'site.description', label: 'Search engine description', type: 'textarea', rows: 3, full: true,
        hint: 'Around 150 characters. This is what Google shows under your website name.' },
      { key: 'seo.keywords', label: 'Search keywords', type: 'textarea', rows: 3, full: true,
        hint: 'Separate with commas.' },
    ],
    formPricingNote: [
      { key: 'pricing.note', label: 'Notice under the price table', type: 'textarea', rows: 2, full: true },
      { key: 'pricing.intro', label: 'Intro paragraph above the table', type: 'textarea', rows: 3, full: true },
    ],
  };

  function fieldHTML(f, value) {
    const id = 'f_' + f.key.replace(/\W/g, '_');
    const hint = f.hint ? `<span class="field__hint">${f.hint}</span>` : '';

    if (f.type === 'checkbox') {
      return `<div class="field full"><label class="checkline">
        <input type="checkbox" id="${id}" data-key="${f.key}" ${value === '1' ? 'checked' : ''}>
        ${esc(f.label)}</label>${hint}</div>`;
    }
    if (f.type === 'image') {
      return `<div class="field full"><label>${esc(f.label)}</label>
        <label class="drop" data-img-key="${f.key}">
          <input type="file" accept="image/*" hidden>
          ${value ? `<img src="${esc(value)}" alt="" style="max-height:150px">` : '<svg><use href="#i-image"/></svg>'}
          <b>${value ? 'Tap to replace this photo' : 'Tap to upload a photo'}</b>
          <span>Saved and optimised instantly</span>
        </label>${hint}</div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="field ${f.full ? 'full' : ''}"><label for="${id}">${esc(f.label)}</label>
        <textarea id="${id}" data-key="${f.key}" rows="${f.rows || 4}">${esc(value)}</textarea>${hint}</div>`;
    }
    return `<div class="field ${f.full ? 'full' : ''}"><label for="${id}">${esc(f.label)}</label>
      <input id="${id}" data-key="${f.key}" type="${f.type || 'text'}" value="${esc(value)}">${hint}</div>`;
  }

  function buildForms() {
    Object.entries(FORMS).forEach(([formId, fields]) => {
      const form = $('#' + formId);
      if (!form) return;
      form.className = 'grid2';
      form.innerHTML =
        fields.map((f) => fieldHTML(f, D.settings[f.key] ?? '')).join('') +
        `<div class="full" style="margin-top:.4rem"><button class="btn btn--primary btn--sm" type="submit">Save changes</button></div>`;

      form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = 'Saving…';
        const payload = {};
        $$('[data-key]', form).forEach((el) => {
          payload[el.dataset.key] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
        });
        try {
          const r = await apiJSON('/admin/api/settings', 'POST', payload);
          D.settings = r.settings;
          toast('Saved. Your website is updated.');
        } catch (err) { toast(err.message, true); }
        btn.disabled = false; btn.textContent = 'Save changes';
      };
    });
  }

  /* image-setting uploads */
  document.addEventListener('change', async (e) => {
    const drop = e.target.closest('[data-img-key]');
    if (!drop || !e.target.files || !e.target.files[0]) return;
    const fd = new FormData();
    fd.append('key', drop.dataset.imgKey);
    fd.append('image', e.target.files[0]);
    try {
      const r = await api('/admin/api/settings/image', { method: 'POST', body: fd });
      D.settings[r.key] = r.value;
      const img = drop.querySelector('img');
      if (img) img.src = r.value + '?t=' + Date.now();
      else drop.insertAdjacentHTML('afterbegin', `<img src="${r.value}" alt="" style="max-height:150px">`);
      toast('Photo updated.');
    } catch (err) { toast(err.message, true); }
  });

  /* ==================================================================== */
  /*  ACTIONS                                                             */
  /* ==================================================================== */

  async function refresh(partial) {
    if (partial) Object.assign(D, partial);
    const r = await api('/admin/api/bootstrap');
    D = r;
    renderAll();
  }

  function renderAll() {
    renderStats();
    renderDesigns();
    renderCategories();
    renderPricing();
    renderTestimonials();
    renderInquiries();
  }

  /* ---------------------------------------------------- design modal */
  const dropDesign = $('#dropDesign');
  const dropInput = dropDesign.querySelector('input[type=file]');
  const dropPreview = $('#dropPreview');

  dropInput.addEventListener('change', () => {
    const f = dropInput.files[0];
    if (!f) return;
    dropPreview.src = URL.createObjectURL(f);
    dropPreview.hidden = false;
  });

  $('#dPType').addEventListener('change', (e) => {
    $('#priceValueField').style.display = e.target.value === 'request' ? 'none' : '';
  });

  function openDesignModal(design, defaultPlacement) {
    const form = $('#formDesign');
    form.reset();
    dropPreview.hidden = true;
    dropPreview.src = '';
    $('#mdTitle').textContent = design ? 'Edit design' : 'Add a design';
    form.id.value = design ? design.id : '';

    if (design) {
      form.title.value = design.title;
      form.category_id.value = design.category_id || '';
      form.description.value = design.description || '';
      form.caption.value = design.caption || '';
      form.price_type.value = design.price_type;
      form.price_value.value = design.price_value || '';
      form.placement.value = design.placement;
      form.taken_on.value = design.taken_on || '';
      form.is_featured.checked = !!design.is_featured;
      if (design.thumb_url) { dropPreview.src = design.thumb_url; dropPreview.hidden = false; }
    } else if (defaultPlacement) {
      form.placement.value = defaultPlacement;
    }
    $('#priceValueField').style.display = form.price_type.value === 'request' ? 'none' : '';
    openModal('modalDesign');
  }

  document.addEventListener('click', (e) => {
    const nd = e.target.closest('[data-new-design]');
    if (nd) openDesignModal(null, nd.dataset.placement);
  });

  $('#formDesign').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = $('#saveDesign');
    const id = form.id.value;

    if (!id && !dropInput.files[0]) return toast('Please choose a photo first.', true);

    const fd = new FormData();
    ['title', 'category_id', 'description', 'caption', 'price_type', 'price_value', 'placement', 'taken_on']
      .forEach((k) => fd.append(k, form[k].value));
    fd.append('is_featured', form.is_featured.checked ? '1' : '0');
    if (dropInput.files[0]) fd.append('image', dropInput.files[0]);

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await api(id ? `/admin/api/designs/${id}` : '/admin/api/designs', { method: 'POST', body: fd });
      closeModal($('#modalDesign'));
      await refresh();
      toast(id ? 'Design updated.' : 'Design added to your website.');
    } catch (err) { toast(err.message, true); }
    btn.disabled = false; btn.textContent = 'Save design';
  });

  /* ------------------------------------------------ testimonial modal */
  function openTestimonialModal(t) {
    const form = $('#formTestimonial');
    form.reset();
    $('#mtTitle').textContent = t ? 'Edit review' : 'Add a review';
    form.id.value = t ? t.id : '';
    if (t) {
      form.name.value = t.name;
      form.event_type.value = t.event_type || '';
      form.review.value = t.review;
      form.rating.value = t.rating;
      form.is_visible.checked = !!t.is_visible;
    }
    openModal('modalTestimonial');
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-new-testimonial]')) openTestimonialModal(null);
  });

  $('#formTestimonial').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const id = form.id.value;
    const fd = new FormData();
    ['name', 'event_type', 'review', 'rating'].forEach((k) => fd.append(k, form[k].value));
    fd.append('is_visible', form.is_visible.checked ? '1' : '0');
    if (form.photo.files[0]) fd.append('photo', form.photo.files[0]);
    try {
      await api(id ? `/admin/api/testimonials/${id}` : '/admin/api/testimonials', { method: 'POST', body: fd });
      closeModal($('#modalTestimonial'));
      await refresh();
      toast('Review saved.');
    } catch (err) { toast(err.message, true); }
  });

  /* --------------------------------------------------- category forms */
  $('#formCategory').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await apiJSON('/admin/api/categories', 'POST', {
        name: f.name.value, emoji: f.emoji.value, description: f.description.value,
      });
      f.reset();
      await refresh();
      toast('Category added.');
    } catch (err) { toast(err.message, true); }
  });

  $('#formCategoryEdit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await apiJSON(`/admin/api/categories/${f.id.value}`, 'PATCH', {
        name: f.name.value, emoji: f.emoji.value, description: f.description.value,
      });
      closeModal($('#modalCategory'));
      await refresh();
      toast('Category updated.');
    } catch (err) { toast(err.message, true); }
  });

  $('#formPricing').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await apiJSON('/admin/api/pricing', 'POST', {
        service: f.service.value, price_text: f.price_text.value, note: f.note.value,
      });
      f.reset();
      await refresh();
      toast('Price row added.');
    } catch (err) { toast(err.message, true); }
  });

  $('#formPassword').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      const r = await apiJSON('/admin/api/password', 'POST', {
        password: f.password.value, confirm: f.confirm.value,
      });
      toast(r.message || 'Password changed.');
      setTimeout(() => (location.href = '/admin/login'), 1500);
    } catch (err) { toast(err.message, true); }
  });

  /* ------------------------------------------------- delegated actions */
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    const d = t.dataset;
    try {
      if (d.feature)  { await apiJSON(`/admin/api/designs/${d.feature}/toggle`, 'POST', { field: 'featured' });  await refresh(); return; }
      if (d.move)     { await apiJSON(`/admin/api/designs/${d.move}/toggle`, 'POST', { field: 'placement' });    await refresh(); toast('Design moved.'); return; }
      if (d.edit)     { openDesignModal(D.designs.find((x) => x.id === +d.edit)); return; }

      if (d.trash) {
        const design = D.designs.find((x) => x.id === +d.trash);
        if (!confirm(`Move "${design.title}" to Trash?\n\nIt will be removed from your website but you can restore it any time.`)) return;
        await apiJSON(`/admin/api/designs/${d.trash}/trash`, 'POST');
        await refresh(); toast('Moved to Trash. You can restore it from the Trash tab.'); return;
      }
      if (d.restore)  { await apiJSON(`/admin/api/designs/${d.restore}/restore`, 'POST'); await refresh(); toast('Design restored.'); return; }
      if (d.purge) {
        if (!confirm('Delete this design and its photo FOREVER?\n\nThis cannot be undone.')) return;
        await api(`/admin/api/designs/${d.purge}`, { method: 'DELETE' });
        await refresh(); toast('Deleted permanently.'); return;
      }

      if (d.catMove)  { await apiJSON(`/admin/api/categories/${d.catMove}/move`, 'POST', { direction: d.dir }); await refresh(); return; }
      if (d.catEdit) {
        const c = D.categories.find((x) => x.id === +d.catEdit);
        const f = $('#formCategoryEdit');
        f.id.value = c.id; f.name.value = c.name; f.emoji.value = c.emoji || ''; f.description.value = c.description || '';
        openModal('modalCategory'); return;
      }
      if (d.catDel) {
        const c = D.categories.find((x) => x.id === +d.catDel);
        if (!confirm(`Delete the "${c.name}" category?\n\nYour ${c.design_count} design(s) will NOT be deleted — they just become uncategorised.`)) return;
        const r = await api(`/admin/api/categories/${d.catDel}`, { method: 'DELETE' });
        await refresh(); toast(r.note || 'Category deleted.'); return;
      }

      if (d.prSave) {
        const ins = $$(`.pr-in[data-id="${d.prSave}"]`);
        const body = {};
        ins.forEach((i) => (body[i.dataset.f] = i.value));
        await apiJSON(`/admin/api/pricing/${d.prSave}`, 'PATCH', body);
        await refresh(); toast('Price updated.'); return;
      }
      if (d.prToggle) {
        const p = D.pricing.find((x) => x.id === +d.prToggle);
        await apiJSON(`/admin/api/pricing/${d.prToggle}`, 'PATCH', {
          service: p.service, price_text: p.price_text, note: p.note, is_active: p.is_active ? '0' : '1',
        });
        await refresh(); return;
      }
      if (d.prDel) {
        if (!confirm('Delete this price row?')) return;
        await api(`/admin/api/pricing/${d.prDel}`, { method: 'DELETE' });
        await refresh(); toast('Row deleted.'); return;
      }

      if (d.tToggle)  { await apiJSON(`/admin/api/testimonials/${d.tToggle}/toggle`, 'POST'); await refresh(); return; }
      if (d.tEdit)    { openTestimonialModal(D.testimonials.find((x) => x.id === +d.tEdit)); return; }
      if (d.tDel) {
        if (!confirm('Delete this review permanently?')) return;
        await api(`/admin/api/testimonials/${d.tDel}`, { method: 'DELETE' });
        await refresh(); toast('Review deleted.'); return;
      }

      if (d.inq)      { await apiJSON(`/admin/api/inquiries/${d.inq}`, 'PATCH', { status: d.status }); await refresh(); toast('Updated.'); return; }
      if (d.inqDel) {
        if (!confirm('Delete this enquiry permanently?')) return;
        await api(`/admin/api/inquiries/${d.inqDel}`, { method: 'DELETE' });
        await refresh(); toast('Enquiry deleted.'); return;
      }
    } catch (err) { toast(err.message, true); }
  });

  $('#emptyTrash').addEventListener('click', async () => {
    if (!D.trash.length) return toast('Trash is already empty.');
    if (!confirm(`Permanently delete all ${D.trash.length} design(s) in Trash?\n\nThis cannot be undone.`)) return;
    try {
      const r = await api('/admin/api/trash/empty', { method: 'POST' });
      await refresh();
      toast(`${r.removed} design(s) permanently deleted.`);
    } catch (err) { toast(err.message, true); }
  });

  /* ---------------------------------------------------------- searches */
  function wireSearch(inputId, listId) {
    const input = $('#' + inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      $$('#' + listId + ' .row').forEach((row) => {
        row.style.display = !q || (row.dataset.name || '').includes(q) ? '' : 'none';
      });
    });
  }
  wireSearch('searchPortfolio', 'listPortfolio');
  wireSearch('searchGallery', 'listGallery');

  /* ------------------------------------------------------------- start */
  (async function init() {
    try {
      D = await api('/admin/api/bootstrap');
      renderAll();
      buildForms();
      if (D.user.must_change) $('#pwWarn').hidden = false;
      const hash = location.hash.slice(1);
      if (hash && $('#p-' + hash)) showPanel(hash);
    } catch (err) {
      document.querySelector('.main').innerHTML =
        `<div class="box"><h2>Could not load the dashboard</h2><p class="hint">${esc(err.message)}</p>
         <a class="btn btn--primary btn--sm" href="/admin/login">Sign in again</a></div>`;
    }
  })();
})();
