// Accessible site search modal (<dialog>) for EEE Club of HSTU.
const STATIC_PAGES = [
  { title: 'Home', summary: 'EEE Club of HSTU — student engineering club of HSTU.', keywords: 'home wings upcoming stories alumni partners', url: 'index.html' },
  { title: 'Our Story', summary: 'Who we are, mission, vision, values and six engineering wings.', keywords: 'about wings robotics power embedded vlsi signal research', url: 'about.html' },
  { title: 'History', summary: 'From 2004 and one oscilloscope to six wings and 640+ members.', keywords: 'timeline milestones history 2014 volt rush pulse', url: 'history.html' },
  { title: 'Leadership', summary: 'Executive committee, alumni network, advisory panel and taskforce.', keywords: 'president vice president general secretary committee team', url: 'leadership.html' },
  { title: 'Advisory Panel', summary: 'Faculty advisors from the Department of EEE at HSTU.', keywords: 'professors teachers faculty chairman zamil sultan', url: 'advisory.html' },
  { title: 'Alumni Association', summary: 'Register with the EEE Alumni Association to mentor and connect.', keywords: 'graduates directory mentorship internships', url: 'alumni.html' },
  { title: 'Constitution', summary: 'The rules of our circuit — articles, membership, elections and wings.', keywords: 'rules articles agm governance', url: 'constitution.html' },
  { title: 'Upcoming Events', summary: 'Workshops, seminars, field trips and competitions.', keywords: 'calendar countdown bootcamp seminar competition', url: 'events.html' },
  { title: 'Volt Rush 2026', summary: 'Flagship inter-university robotics sprint at Central Field, HSTU.', keywords: 'robotics line follower sumo maze sprint registration', url: 'event.html' },
  { title: 'Event Archive', summary: 'Past workshops, competitions, hackathons and outreach.', keywords: 'past events history archive', url: 'archive.html' },
  { title: 'Notices', summary: 'Deadlines, announcements, lab hours and pinned notices.', keywords: 'announcements deadlines notice board', url: 'notices.html' },
  { title: 'Blog', summary: 'Tutorials, event recaps, research notes and career advice.', keywords: 'articles posts bench tutorials stm32 kicad', url: 'blog.html' },
  { title: 'Pulse Magazine', summary: 'Member-written digital magazine of the EEE Club of HSTU.', keywords: 'issues pdf grid chip magazine', url: 'magazine.html' },
  { title: 'Resources', summary: 'Lecture notes, lab manuals, question banks and starter code.', keywords: 'downloads pdf zip notes exams courses', url: 'resources.html' },
  { title: 'Gallery', summary: 'Photos from workshops, competitions, field trips and club life.', keywords: 'photos images lightbox', url: 'gallery.html' },
  { title: 'Verify Certificate', summary: 'Check the authenticity of a certificate issued by the club.', keywords: 'certificate id qr verification authentic', url: 'verify.html' },
  { title: 'Contact & FAQ', summary: 'Send a message, find the EEE Building, or read the FAQ.', keywords: 'email phone room map faq location dinajpur', url: 'contact.html' },
  { title: 'FAQ', summary: 'Answers about automatic membership, fees, alumni and certificates.', keywords: 'questions answers membership fee', url: 'contact.html#faq' },
  { title: 'Privacy Policy', summary: 'How the club collects and handles forms, Firebase data and analytics.', keywords: 'privacy data cookies analytics firebase', url: 'privacy.html' },
  { title: 'Terms of Service', summary: 'Terms governing use of the site, events, resources and certificates.', keywords: 'terms legal conduct intellectual property', url: 'terms.html' },
  { title: 'Sitemap', summary: 'Complete directory of every page on the website.', keywords: 'pages navigation index', url: 'sitemap.html' },
];

let dialogEl = null;
let inputEl = null;
let resultsEl = null;
let statusEl = null;
let dynamicItems = null;
let loadingPromise = null;
let activeIndex = -1;


function buildItems() {
  const staticEntries = STATIC_PAGES.map((p) => ({
    group: 'Pages',
    title: p.title,
    summary: p.summary,
    keywords: p.keywords,
    url: p.url,
  }));
  return dynamicItems ? staticEntries.concat(dynamicItems) : staticEntries;
}

async function loadDynamicContent() {
  if (dynamicItems) return dynamicItems;
  const db = window.EEEDB;
  // Keep dynamicItems null until the DB module is ready so we retry later.
  if (!db || !db.configured) return null;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const results = await Promise.allSettled([
        db.getBlogs(),
        db.getEvents(),
        db.getNotices(),
        db.getMembers(),
        db.getResources(),
        db.getFaqs(),
        db.getMagazines(),
      ]);
      const val = (i) => (results[i].status === 'fulfilled' && Array.isArray(results[i].value) ? results[i].value : []);
      const collected = [];

      val(0).forEach((b) => {
        collected.push({
          group: 'Blog',
          title: b.title || 'Untitled post',
          summary: b.excerpt || '',
          keywords: [b.tag, b.author].filter(Boolean).join(' '),
          url: `post.html?id=${encodeURIComponent(b.id)}`,
        });
      });

      val(1).forEach((ev) => {
        collected.push({
          group: 'Events',
          title: ev.title || 'Event',
          summary: [ev.venue, ev.summary].filter(Boolean).join(' · '),
          keywords: ev.type || '',
          url: window.EEESafeUrl(ev.link, 'events.html'),
        });
      });

      val(2).forEach((n) => {
        collected.push({
          group: 'Notices',
          title: n.title || 'Notice',
          summary: n.body || '',
          keywords: [n.category, n.noticeDate].filter(Boolean).join(' '),
          url: 'notices.html',
        });
      });

      val(3).forEach((m) => {
        const cat = String(m.category || 'executive');
        collected.push({
          group: 'Leadership',
          title: m.name || 'Member',
          summary: [m.role, m.subtitle].filter(Boolean).join(' · '),
          keywords: cat,
          url: `leadership.html#${encodeURIComponent(cat)}`,
        });
      });

      val(4).forEach((r) => {
        collected.push({
          group: 'Resources',
          title: r.title || 'Resource',
          summary: [r.course, r.fileType, r.size].filter(Boolean).join(' · '),
          keywords: r.kind || '',
          url: 'resources.html',
        });
      });

      val(5).forEach((f) => {
        collected.push({
          group: 'FAQ',
          title: f.question || 'FAQ',
          summary: f.answer || '',
          keywords: 'faq question',
          url: 'contact.html#faq',
        });
      });

      val(6).forEach((m) => {
        collected.push({
          group: 'Magazine',
          title: m.title ? `Pulse #${m.issueNumber || ''} — ${m.title}` : 'Pulse Magazine',
          summary: [m.season, m.summary].filter(Boolean).join(' · '),
          keywords: 'pulse magazine issue',
          url: 'magazine.html',
        });
      });

      // Never memoise an empty index: leave it null so the next open retries.
      // A transient error also leaves it null, so dynamic results are not disabled.
      if (collected.length > 0) dynamicItems = collected;
      return dynamicItems;
    })()
      .catch((err) => {
        console.warn('Search index load failed:', err);
        return null;
      })
      .finally(() => {
        loadingPromise = null;
      });
  }
  return loadingPromise;
}

// Load the dynamic index once the Firestore module announces itself, and
// re-run the current query if the dialog is already open.
window.addEventListener('eeedb:ready', () => {
  if (dynamicItems) return;
  loadDynamicContent().then((items) => {
    if (items && dialogEl && dialogEl.open) renderResults(inputEl ? inputEl.value : '');
  });
});

function setActive(index) {
  if (!resultsEl) return;
  const links = Array.from(resultsEl.querySelectorAll('a.search-hit'));
  links.forEach((a) => a.classList.remove('active'));
  if (links.length === 0) {
    activeIndex = -1;
    return;
  }
  activeIndex = ((index % links.length) + links.length) % links.length;
  const target = links[activeIndex];
  target.classList.add('active');
  target.scrollIntoView({ block: 'nearest' });
}

function renderResults(rawQuery) {
  if (!resultsEl || !statusEl) return;
  const q = String(rawQuery || '').trim().toLowerCase();
  const all = buildItems();

  let matches;
  if (!q) {
    matches = all.filter((item) => item.group === 'Pages').slice(0, 10);
    statusEl.textContent = 'Quick links · type to search everything';
  } else {
    matches = all.filter((item) => {
      const hay = `${item.title}\n${item.summary}\n${item.keywords}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 24);
    statusEl.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'}`;
  }

  activeIndex = -1;
  if (matches.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'mu';
    empty.style.cssText = 'padding: 28px 8px; text-align: center; margin: 0;';
    empty.textContent = `No matches found for “${rawQuery.trim()}”.`;
    resultsEl.replaceChildren(empty);
    return;
  }

  const grouped = new Map();
  matches.forEach((hit) => {
    if (!grouped.has(hit.group)) grouped.set(hit.group, []);
    grouped.get(hit.group).push(hit);
  });

  const frag = document.createDocumentFragment();
  grouped.forEach((hits, groupName) => {
    const lbl = document.createElement('div');
    lbl.className = 'm search-group-lbl';
    lbl.textContent = groupName;
    frag.appendChild(lbl);

    hits.forEach((hit) => {
      const a = document.createElement('a');
      a.className = 'search-hit';
      a.href = window.EEESafeUrl(hit.url, 'index.html');
      a.addEventListener('click', () => {
        if (dialogEl && dialogEl.open) dialogEl.close();
      });

      const b = document.createElement('b');
      b.textContent = hit.title;
      a.appendChild(b);

      if (hit.summary) {
        const sm = document.createElement('small');
        sm.textContent = hit.summary;
        a.appendChild(sm);
      }
      frag.appendChild(a);
    });
  });

  resultsEl.replaceChildren(frag);
  if (q) setActive(0);
}

function ensureDialog() {
  if (dialogEl) return dialogEl;

  dialogEl = document.createElement('dialog');
  dialogEl.id = 'site-search-dialog';
  dialogEl.className = 'search-dialog';
  dialogEl.setAttribute('closedby', 'any');
  dialogEl.setAttribute('aria-labelledby', 'site-search-title');

  const h1 = document.createElement('h1');
  h1.id = 'site-search-title';
  h1.className = 'sr-only';
  h1.textContent = 'Search EEE Club of HSTU';

  const top = document.createElement('div');
  top.className = 'search-top';

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('width', '20');
  icon.setAttribute('height', '20');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', '#8A8F98');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('aria-hidden', 'true');
  const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circ.setAttribute('cx', '11');
  circ.setAttribute('cy', '11');
  circ.setAttribute('r', '7');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M20 20l-3.5-3.5');
  icon.append(circ, path);

  inputEl = document.createElement('input');
  inputEl.type = 'search';
  inputEl.setAttribute('aria-label', 'Search site');
  inputEl.setAttribute('autofocus', '');
  inputEl.placeholder = 'Search pages, blogs, events, notices, resources…';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'search-close';
  closeBtn.setAttribute('aria-label', 'Close search');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => dialogEl.close());

  top.append(icon, inputEl, closeBtn);

  resultsEl = document.createElement('div');
  resultsEl.className = 'search-body';

  const foot = document.createElement('div');
  foot.className = 'search-foot m';
  statusEl = document.createElement('span');
  statusEl.textContent = 'Quick links';
  const hints = document.createElement('span');
  hints.textContent = '↑↓ navigate · Enter open · Esc close';
  foot.append(statusEl, hints);

  dialogEl.append(h1, top, resultsEl, foot);
  document.body.appendChild(dialogEl);

  // Light-dismiss fallback for browsers without <dialog closedby>
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e) => {
      const r = dialogEl.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialogEl.addEventListener('pointerdown', (e) => { pressedOutside = outside(e); });
    dialogEl.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e)) dialogEl.close();
    });
  }

  inputEl.addEventListener('input', () => renderResults(inputEl.value));

  dialogEl.addEventListener('keydown', (e) => {
    const links = Array.from(resultsEl.querySelectorAll('a.search-hit'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (links.length) setActive(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (links.length) setActive(activeIndex - 1);
    } else if (e.key === 'Enter' && document.activeElement === inputEl) {
      const target = links[activeIndex >= 0 ? activeIndex : 0];
      if (target) {
        e.preventDefault();
        dialogEl.close();
        location.href = target.getAttribute('href') || 'index.html';
      }
    }
  });

  dialogEl.addEventListener('close', () => {
    dialogEl.returnValue = '';
  });

  return dialogEl;
}

export async function openSearch(initialQuery = '') {
  const dlg = ensureDialog();
  if (!dlg.open) {
    dlg.showModal();
  }
  inputEl.value = initialQuery;
  inputEl.focus();
  renderResults(inputEl.value);

  if (!dynamicItems) {
    statusEl.textContent = 'Loading club index…';
    await loadDynamicContent();
    if (dlg.open) renderResults(inputEl.value);
  }
}
