/* Admit: event registration and QR check-in portal.
   One script shared by every page. The HTML files hold all the markup; this file only
   adds behaviour: icons, QR placeholders, event data by ?id=, filters, forms, steps, live feed.
   The page is picked from <body data-page="...">. */
'use strict';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- icons: <span data-icon="cal" data-size="15"> becomes an inline SVG ---------- */
const ICONS = {
  cal: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="M12 3v12M6 11l6 6 6-6M4 21h16"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'
};
function icon(name, size = 18) {
  if (name === 'logo') return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 9a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v3a4 4 0 0 0 0 8v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-3a4 4 0 0 0 0-8z" fill="currentColor"/><path d="M11 13h10M11 19h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/></svg>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/* ---------- sample event data (replace with fetch('/api/events/' + id)) ---------- */
const EV = [
  { id: 0, t: 'Ignite Tech Fest 2026', cat: 'Tech', d: '17', m: 'Oct', full: 'Saturday, 17 October 2026', time: '10:00 AM to 6:00 PM', venue: 'Main Auditorium, Block A', cap: 600, left: 212, org: 'Computer Science Society' },
  { id: 1, t: 'HackIPS: 24-hour Hackathon', cat: 'Tech', d: '23', m: 'Oct', full: 'Friday, 23 October 2026', time: '9:00 AM, runs 24 hours', venue: 'Innovation Lab, Block C', cap: 240, left: 38, org: 'Coding Club' },
  { id: 2, t: 'Rangmanch Cultural Night', cat: 'Cultural', d: '01', m: 'Nov', full: 'Sunday, 1 November 2026', time: '6:30 PM to 10:00 PM', venue: 'Open Air Theatre', cap: 1200, left: 640, org: 'Cultural Committee' },
  { id: 3, t: 'Docker & Kubernetes Workshop', cat: 'Workshop', d: '07', m: 'Nov', full: 'Saturday, 7 November 2026', time: '11:00 AM to 3:00 PM', venue: 'Seminar Hall 2', cap: 80, left: 14, org: 'DevOps Guild' },
  { id: 4, t: 'Inter-College Football Cup', cat: 'Sports', d: '12', m: 'Nov', full: 'Thursday, 12 November 2026', time: '4:00 PM to 7:30 PM', venue: 'Main Ground', cap: 500, left: 301, org: 'Sports Council' },
  { id: 5, t: 'Resume Clinic with Alumni', cat: 'Workshop', d: '15', m: 'Nov', full: 'Sunday, 15 November 2026', time: '2:00 PM to 5:00 PM', venue: 'Placement Cell, Block B', cap: 150, left: 97, org: 'Training & Placement Cell' }
];
EV.forEach(e => { e.when = e.full + ', ' + e.time.split(' to ')[0]; e.tid = 'ADM-' + (4000 + e.id * 913).toString(36).toUpperCase() + '-K7' });

/* ---------- event artwork ---------- */
const MOTIF = {
  Tech: '<g stroke="#fff" stroke-opacity=".4" fill="none" stroke-width="2"><path d="M20 170h90l20-40h80l20 30h120"/><path d="M0 60h70l25-30h110"/><circle cx="110" cy="170" r="6"/><circle cx="210" cy="130" r="6"/><circle cx="205" cy="30" r="6"/></g>',
  Cultural: '<g stroke="#fff" stroke-opacity=".4" fill="none" stroke-width="2"><circle cx="320" cy="150" r="30"/><circle cx="320" cy="150" r="60"/><circle cx="320" cy="150" r="90"/><circle cx="320" cy="150" r="120"/></g>',
  Workshop: '<g stroke="#fff" stroke-opacity=".3" stroke-width="10"><path d="M-20 200 120 60M40 220 180 80M100 240 240 100M160 260 300 120M220 280 360 140M280 300 420 160"/></g>',
  Sports: '<g stroke="#fff" stroke-opacity=".45" fill="none" stroke-width="2"><rect x="30" y="30" width="340" height="140" rx="6"/><path d="M200 30v140"/><circle cx="200" cy="100" r="30"/></g>'
};

/* ---------- placeholder QR: looks like a QR, is NOT scannable. Swap for a real signed-token QR. ---------- */
function qrPath(seed, n = 25) {
  let s = seed * 7919 + 13; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const fin = (x, y) => {
    const f = (ox, oy) => { const dx = x - ox, dy = y - oy; if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null; return dx == 0 || dx == 6 || dy == 0 || dy == 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) };
    for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      const r = f(ox, oy); if (r !== null) return r;
      if (x >= ox - 1 && x <= ox + 7 && y >= oy - 1 && y <= oy + 7) return false
    } return undefined
  };
  let d = ''; for (let y = 0; y < n; y++)for (let x = 0; x < n; x++) { let v = fin(x, y); if (v === undefined) v = rnd() > .52; if (v) d += `M${x} ${y}h1v1h-1z` }
  return d;
}

/* Turns the placeholders in the HTML into real SVG. Safe to call again after changing data attributes. */
function hydrate() {
  $$('[data-icon]').forEach(el => { const t = document.createElement('template'); t.innerHTML = icon(el.dataset.icon, +el.dataset.size || 18); el.replaceWith(t.content.firstChild) });
  $$('[data-motif]').forEach(el => { el.innerHTML = MOTIF[el.dataset.motif] || '' });
  $$('[data-qr]').forEach(el => {
    el.setAttribute('viewBox', '-1 -1 27 27'); el.setAttribute('shape-rendering', 'crispEdges');
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Ticket QR code');
    el.innerHTML = `<path d="${qrPath(+el.dataset.qr)}" fill="#0B1020"/>`;
  });
}

/* ---------- fill an event page or the registration page from EV[id] ---------- */
function bindEvent(e) {
  document.title = (document.body.dataset.page === 'register' ? 'Register for ' : '') + e.t + ' · Admit';
  $$('[data-bind]').forEach(el => { el.textContent = e[el.dataset.bind] });
  $$('[data-art]').forEach(el => { el.style.cssText = `--a:var(--p${e.id % 5 + 1});--b:var(--p${(e.id + 2) % 5 + 1})` });
  $$('[data-motif]').forEach(el => { el.dataset.motif = e.cat });
  $$('[data-ticket-qr]').forEach(el => { el.dataset.qr = e.id * 11 + 3 });
  $$('[data-reg-link]').forEach(a => { a.href = 'register.html?id=' + e.id });
  $$('[data-event-link]').forEach(a => { a.href = 'event.html?id=' + e.id });
  $$('[data-seats]').forEach(el => {
    const hot = e.left / e.cap < .2; el.classList.toggle('hot', hot);
    $('.bar i', el).style.width = Math.round((e.cap - e.left) / e.cap * 100) + '%';
    $('small', el).textContent = (hot ? 'Almost full: ' : '') + e.left + ' of ' + e.cap + ' seats left';
  });
  const team = $('#team-field'); if (team) team.hidden = e.id !== 1;
}

/* ---------- registration steps (1 details, 2 review, 3 ticket) ---------- */
function showStep(n) {
  $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== String(n) });
  $('#form-area').hidden = n === 3;
  $$('[data-form-only]').forEach(x => { x.hidden = n === 3 });
  $$('#stepper .st').forEach((el, i) => {
    el.className = 'st' + (n === i + 1 ? ' on' : '') + (n > i + 1 ? ' done' : '');
    $('i', el).innerHTML = n > i + 1 ? icon('check', 15) : String(i + 1);
  });
  window.scrollTo(0, 0);
}

/* ---------- admin helpers ---------- */
function countUp(el) {
  if (RM) return; const to = +el.dataset.count, t0 = performance.now();
  const step = t => { const p = Math.min(1, (t - t0) / 1100), v = Math.round(to * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString('en-IN'); if (p < 1) requestAnimationFrame(step) };
  requestAnimationFrame(step);
}
const NAMES = ['Ananya Rao', 'Vikram Singh', 'Meera Iyer', 'Rohan Gupta', 'Isha Malhotra', 'Dev Patel', 'Pooja Nair', 'Karan Mehta', 'Tanvi Shah', 'Arjun Reddy'];
let feedN = 5;
function feedItem() {
  const n = NAMES[feedN++ % NAMES.length], dup = feedN % 6 === 0;
  return `<li class="new"><span class="av">${n.split(' ').map(x => x[0]).join('')}</span><span class="nm"><b>${n}</b><small>Just now</small></span><span class="pill${dup ? ' warn' : ''}">${dup ? 'Already used' : 'Valid'}</span></li>`;
}

/* ---------- start ---------- */
function init() {
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const id = Math.min(EV.length - 1, Math.max(0, parseInt(params.get('id'), 10) || 0));
  let role = 'Student', cat = 'All';

  if (page === 'event' || page === 'register') bindEvent(EV[id]);
  hydrate();
  if (page === 'register') {
    const s = parseInt(params.get('step'), 10); if (s >= 1 && s <= 3) showStep(s);
    if (s === 3) { const a = $('.top nav a:nth-child(2)'); a.setAttribute('aria-current', 'page'); $('.top nav a:nth-child(1)').removeAttribute('aria-current') }
  }

  /* one click handler for all the small controls */
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-pw],[data-role],[data-cat],[data-meal],[data-step],#search-btn'); if (!t) return;
    const d = t.dataset;
    if (d.pw !== undefined) { const i = $('#pw'); i.type = i.type === 'password' ? 'text' : 'password'; t.textContent = i.type === 'password' ? 'Show' : 'Hide'; return }
    if (d.role) { role = d.role; $$('[data-role]').forEach(b => b.setAttribute('aria-pressed', b.dataset.role === role)); $('#signin-btn').textContent = 'Sign in as ' + role.toLowerCase(); return }
    if (d.cat) { cat = d.cat; $$('[data-cat]', $('.chips')).forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === cat)); filterEvents(); return }
    if (d.meal) { $$('[data-meal]').forEach(b => b.setAttribute('aria-pressed', b.dataset.meal === d.meal)); return }
    if (d.step) { showStep(+d.step); return }
    if (t.id === 'search-btn') $('#grid').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  });

  function filterEvents() {
    const q = $('#q').value.trim().toLowerCase(); let shown = 0;
    $$('#grid .ev').forEach(c => {
      const ok = (cat === 'All' || c.dataset.cat === cat) && c.textContent.toLowerCase().includes(q);
      c.hidden = !ok; if (ok) shown++;
    });
    $('#empty').hidden = shown > 0;
  }

  if (page === 'home') $('#q').addEventListener('input', filterEvents);


  if (page === 'login') {
    // Allow the login form to submit normally to Flask.
    // Flask will verify the email and password.
  }


  if (page === 'signup') {
    const pw = $('#pw');
    pw.addEventListener('input', () => {
      const v = pw.value; let s = 0;
      if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      $$('.strength i').forEach((i, k) => i.classList.toggle('on', k < s));
      $('#pwh').textContent = ['Use 8+ characters with a number and a symbol.', 'Weak: add more characters.', 'Fair: add a number.', 'Good: add a symbol.', 'Strong password.'][s];
    });
    /* Demo only: replace with a POST to your sign-up endpoint. */
    $('#signup-form').addEventListener('submit', e => { e.preventDefault(); location.href = 'home.html' });
  }

  if (page === 'volunteers') {
    /* Demo data. In the real app: USERS comes from a lookup of registered users (GET /api/users?email=),
       VOLS from GET /api/volunteers, and assign / remove become POST / DELETE calls. */
    const USERS = [
      { name: 'Riya Verma', email: 'riya.verma@college.edu', enroll: '0827CS241001', branch: 'CSIT', year: '3rd year', events: 9 },
      { name: 'Aman Joshi', email: 'aman.joshi@college.edu', enroll: '0827CS221014', branch: 'Computer Science', year: '4th year', events: 12 },
      { name: 'Sneha Patil', email: 'sneha.patil@college.edu', enroll: '0827IT231022', branch: 'Information Technology', year: '3rd year', events: 8 },
      { name: 'Kabir Khan', email: 'kabir.khan@college.edu', enroll: '0827EC231007', branch: 'Electronics', year: '3rd year', events: 6 },
      { name: 'Tanvi Shah', email: 'tanvi.shah@college.edu', enroll: '0827CS241033', branch: 'CSIT', year: '3rd year', events: 7 },
      { name: 'Arjun Reddy', email: 'arjun.reddy@college.edu', enroll: '0827CS231018', branch: 'Computer Science', year: '3rd year', events: 10 },
      { name: 'Pooja Nair', email: 'pooja.nair@college.edu', enroll: '0827IT221009', branch: 'Information Technology', year: '4th year', events: 11 },
      { name: 'Ananya Rao', email: 'ananya.rao@college.edu', enroll: '0827CS231045', branch: 'CSIT', year: '3rd year', events: 5 },
      { name: 'Vikram Singh', email: 'vikram.singh@college.edu', enroll: '0827ME241012', branch: 'Mechanical', year: '2nd year', events: 3 },
      { name: 'Meera Iyer', email: 'meera.iyer@college.edu', enroll: '0827CS241058', branch: 'Computer Science', year: '2nd year', events: 4 },
      { name: 'Rohan Gupta', email: 'rohan.gupta@college.edu', enroll: '0827CE231003', branch: 'Civil', year: '3rd year', events: 2 },
      { name: 'Isha Malhotra', email: 'isha.malhotra@college.edu', enroll: '0827IT241027', branch: 'Information Technology', year: '2nd year', events: 4 },
      { name: 'Dev Patel', email: 'dev.patel@college.edu', enroll: '0827EC221031', branch: 'Electronics', year: '4th year', events: 9 },
      { name: 'Karan Mehta', email: 'karan.mehta@college.edu', enroll: '0827CS251002', branch: 'CSIT', year: '1st year', events: 1 }
    ];
    let VOLS = [
      { email: 'aman.joshi@college.edu', on: true, scans: 312, added: '12 Sep 2026' },
      { email: 'sneha.patil@college.edu', on: true, scans: 287, added: '12 Sep 2026' },
      { email: 'kabir.khan@college.edu', on: true, scans: 41, added: '14 Sep 2026' },
      { email: 'tanvi.shah@college.edu', on: false, scans: 198, added: '21 Sep 2026' },
      { email: 'arjun.reddy@college.edu', on: false, scans: 156, added: '22 Sep 2026' },
      { email: 'pooja.nair@college.edu', on: false, scans: 132, added: '28 Sep 2026' }
    ];
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ini = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const byEmail = e => USERS.find(u => u.email === e);
    const input = $('#email-q'), res = $('#results'), fmsg = $('#find-msg'), modal = $('#modal'), toastEl = $('#toast');
    let justAdded = null, pending = null, undo = null, timer = null;

    const say = (t, c) => { fmsg.textContent = t; fmsg.className = 'msg' + (c ? ' ' + c : '') };

    function stats() {
      $('#st-assigned').textContent = VOLS.length;
      $('#st-duty').textContent = VOLS.filter(v => v.on).length;
      $('#st-scans').textContent = VOLS.reduce((a, v) => a + v.scans, 0).toLocaleString('en-IN');
      $('#vcount').textContent = VOLS.length + (VOLS.length === 1 ? ' volunteer' : ' volunteers');
    }
    function table() {
      const f = $('#vf').value.trim().toLowerCase();
      const rows = VOLS.filter(v => !f || (byEmail(v.email).name + ' ' + v.email).toLowerCase().includes(f));
      $('#vbody').innerHTML = rows.length ? rows.map(v => {
        const u = byEmail(v.email);
        return `<tr${v.email === justAdded ? ' class="new"' : ''}>
          <td><div class="who-cell"><span class="uav">${ini(u.name)}</span><div><b>${esc(u.name)}</b><div class="muted small">${esc(v.email)}</div></div></div></td>
          <td>${v.on ? '<span class="pill">On duty</span>' : '<span class="pill mute">Off duty</span>'}</td>
          <td class="num">${v.scans.toLocaleString('en-IN')}</td>
          <td class="muted">${v.added}</td>
          <td><button class="btn danger sm" type="button" data-remove="${esc(v.email)}" aria-label="Remove ${esc(u.name)} as volunteer">Remove</button></td></tr>`
      }).join('')
        : `<tr><td colspan="5" class="empty-td">${VOLS.length ? 'No volunteer matches that filter.' : 'No volunteers yet. Assign one with the box above.'}</td></tr>`;
      justAdded = null;
    }
    function find() {
      const q = input.value.trim().toLowerCase(); res.innerHTML = '';
      if (q.length < 3) { say('Type at least 3 characters of the registered email.', 'bad'); return }
      const hits = USERS.filter(u => u.email.includes(q)).slice(0, 4);
      if (!hits.length) { say('', ''); res.innerHTML = `<div class="ures none"><div><b>No registered user matches “${esc(input.value.trim())}”</b><div class="muted small">Check the spelling, or ask the student to sign up first. Only registered users can be assigned.</div></div></div>`; return }
      say(hits.length + (hits.length === 1 ? ' registered user found.' : ' registered users found.'), 'ok');
      res.innerHTML = hits.map(u => {
        const v = VOLS.find(x => x.email === u.email);
        return `<div class="ures"><span class="uav big">${ini(u.name)}</span>
          <div class="grow"><b>${esc(u.name)}</b><div class="muted small">${esc(u.email)}</div>
          <div class="muted small">${esc(u.enroll)} · ${esc(u.branch)}, ${u.year} · ${u.events} events registered</div></div>
          ${v ? `<span class="pill">${icon('check', 14)} Already a volunteer</span>` : `<button class="btn primary sm" type="button" data-assign="${esc(u.email)}">Assign as volunteer</button>`}</div>`
      }).join('');
    }
    function toast(msg, canUndo) {
      $('#toast-msg').textContent = msg; $('#toast-undo').hidden = !canUndo; toastEl.hidden = false;
      clearTimeout(timer); timer = setTimeout(() => { toastEl.hidden = true; if (canUndo) undo = null }, 7000);
    }
    const closeModal = () => { modal.hidden = true; pending = null };

    $('#assign-form').addEventListener('submit', e => { e.preventDefault(); find() });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { input.value = ''; res.innerHTML = ''; say('', '') } });
    $('#vf').addEventListener('input', table);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal() });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal() });
    $('#m-cancel').addEventListener('click', closeModal);

    document.addEventListener('click', e => {
      const a = e.target.closest('[data-assign]'), r = e.target.closest('[data-remove]');
      if (a) {
        const email = a.dataset.assign, u = byEmail(email);
        VOLS.unshift({ email, on: false, scans: 0, added: '1 Oct 2026' }); justAdded = email;
        input.value = ''; res.innerHTML = ''; say('', ''); stats(); table();
        toast(u.name + ' is now a volunteer.'); return;
      }
      if (r) {
        pending = r.dataset.remove; const u = byEmail(pending);
        $('#m-text').innerHTML = '<b>' + esc(u.name) + '</b> will lose scanner access right away. Their past scans stay in your records.';
        modal.hidden = false; $('#m-cancel').focus(); return
      }
      if (e.target.closest('#m-confirm') && pending) {
        const i = VOLS.findIndex(v => v.email === pending), u = byEmail(pending);
        undo = { v: VOLS.splice(i, 1)[0], i }; closeModal(); stats(); table(); toast(u.name + ' was removed.', true); return
      }
      if (e.target.closest('#toast-undo') && undo) {
        VOLS.splice(undo.i, 0, undo.v); justAdded = undo.v.email; undo = null; toastEl.hidden = true; stats(); table()
      }
    });

    stats(); table();
  }


  if (page === 'registrations') {
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

    const plural = (n, word) =>
      `${n} ${word}${n === 1 ? '' : 's'}`;

    const listEl = $('#reg-events');
    const detail = $('#reg-detail');
    const rows = $('#stu-rows');
    const search = $('#stu-search');

    let EVENTS = [];
    let current = -1;

    function formatDate(value) {
      if (!value) return 'Date not set';

      const parts = value.split('-');

      if (parts.length !== 3) return value;

      return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      ).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }

    function renderEvents() {
      if (EVENTS.length === 0) {
        listEl.innerHTML = `
          <li class="empty-td">
            No registrations found.
          </li>`;
        return;
      }

      listEl.innerHTML = EVENTS.map(event => `
        <li>
          <button
            class="card reg-ev"
            type="button"
            data-event="${event.id}"
          >
            <span class="reg-ico">
              ${icon('cal', 22)}
            </span>

            <span class="grow">
              <h3>${esc(event.title)}</h3>

              <span class="meta" style="margin-top:4px">
                ${esc(formatDate(event.date))} ·
                ${esc(event.venue || 'Venue not set')}
              </span>

              <small class="muted">
                ${plural(event.students.length, 'registered student')}
              </small>
            </span>

            <span class="chev">
              ${icon('chev', 20)}
            </span>
          </button>
        </li>
      `).join('');
    }

    function drawStudents() {
      const event = EVENTS.find(item => item.id === current);

      if (!event) return;

      const query = search.value.trim().toLowerCase();

      const filtered = event.students.filter(student => {
        const text = [
          student.name,
          student.enrollment_number,
          student.branch,
          student.year
        ].join(' ').toLowerCase();

        return !query || text.includes(query);
      });

      $('#stu-shown').textContent = query
        ? `Showing ${filtered.length} of ${event.students.length}`
        : '';

      rows.innerHTML = filtered.length
        ? filtered.map(student => `
            <li class="stu-row">
              <span class="stu-ico">
                ${icon('user', 20)}
              </span>

              <span class="grow">
                <b>${esc(student.name)}</b>

                <span
                  class="muted small"
                  style="display:block"
                >
                  ${esc(student.branch || 'Branch not provided')}
                  · Year ${esc(student.year ?? 'Not provided')}
                </span>
              </span>

              <span class="enr">
                ${esc(student.enrollment_number || 'Not provided')}
              </span>
            </li>
          `).join('')
        : `
            <li class="empty-td">
              ${event.students.length
          ? 'No students match your search.'
          : 'No students have registered for this event yet.'}
            </li>
          `;
    }

    function show(eventId) {
      current = eventId;

      if (eventId < 0) {
        detail.hidden = true;
        $('#reg-list-screen').hidden = false;
        return;
      }

      const event = EVENTS.find(item => item.id === eventId);

      if (!event) {
        detail.hidden = true;
        $('#reg-list-screen').hidden = false;
        return;
      }

      $('#reg-title').textContent = event.title;

      $('#reg-meta').textContent =
        `${formatDate(event.date)} · ${event.venue || 'Venue not set'}`;

      $('#reg-count').textContent =
        plural(event.students.length, 'student');

      $('#stu-tools').hidden = event.students.length === 0;

      search.value = '';
      drawStudents();

      $('#reg-list-screen').hidden = true;
      detail.hidden = false;
    }

    function route() {
      const match = location.hash.match(/^#event-(\d+)$/);
      const eventId = match ? Number(match[1]) : -1;

      const exists = EVENTS.some(event => event.id === eventId);

      show(exists ? eventId : -1);
      window.scrollTo(0, 0);
    }

    async function loadRegistrations() {
      listEl.innerHTML = `
        <li class="empty-td">
          Loading registrations...
        </li>`;

      try {
        const response = await fetch('/admin/registrations/list', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.status === 401 || response.status === 403) {
          listEl.innerHTML = `
            <li class="empty-td">
              Your admin session may have expired.
              Please log in again.
            </li>`;
          return;
        }

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (
          data.success !== true ||
          !Array.isArray(data.registrations)
        ) {
          throw new Error('Unexpected response from the server.');
        }

        const eventMap = new Map();

        data.registrations.forEach(registration => {
          const event = registration.event;
          const student = registration.student;

          if (!event || !student) return;

          if (!eventMap.has(event.id)) {
            eventMap.set(event.id, {
              id: event.id,
              title: event.title || 'Untitled event',
              date: event.event_date,
              venue: event.venue || '',
              students: []
            });
          }

          eventMap.get(event.id).students.push({
            id: student.id,
            name: student.name || 'Unnamed student',
            enrollment_number: student.enrollment_number,
            branch: student.branch,
            year: student.year
          });
        });

        EVENTS = Array.from(eventMap.values());

        renderEvents();
        route();

      } catch (error) {
        console.error(
          'Failed to load registrations:',
          error
        );

        listEl.innerHTML = `
          <li class="empty-td">
            Could not load registrations.
            Please refresh the page and try again.
          </li>`;
      }
    }

    listEl.addEventListener('click', event => {
      const button = event.target.closest('[data-event]');

      if (!button) return;

      location.hash = `event-${button.dataset.event}`;
    });

    $('#reg-back').addEventListener('click', () => {
      if (location.hash) {
        location.hash = '';
      } else {
        route();
      }
    });

    window.addEventListener('hashchange', route);
    search.addEventListener('input', drawStudents);

    loadRegistrations();
  }


  if (page === 'admin') {
    $$('[data-count]').forEach(countUp);
    setInterval(() => { const f = $('#feed'); f.insertAdjacentHTML('afterbegin', feedItem()); while (f.children.length > 5) f.lastElementChild.remove() }, 3400);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();


// =====================================
// Student Profile Edit Functionality
// =====================================

if (document.body.dataset.page === "profile") {
  const profileForm = document.getElementById("profile-form");
  const editButton = document.getElementById("edit-profile-btn");
  const cancelButton = document.getElementById("cancel-profile-btn");
  const saveButton = document.getElementById("save-profile-btn");
  const actions = document.getElementById("profile-actions");
  const message = document.getElementById("profile-message");

  const editableFields = [
    document.getElementById("pf-name"),
    document.getElementById("pf-enrollment"),
    document.getElementById("pf-branch"),
    document.getElementById("pf-year")
  ];

  // Stop if the profile elements are missing.
  if (
    profileForm &&
    editButton &&
    cancelButton &&
    saveButton &&
    actions &&
    message &&
    editableFields.every(field => field !== null)
  ) {
    let originalValues = {};

    // Enable or disable editing.
    function setEditing(enabled) {
      editableFields.forEach(field => {
        field.readOnly = !enabled;
      });

      actions.hidden = !enabled;
      editButton.hidden = enabled;

      message.textContent = enabled
        ? "Edit your details, then click Save Details or Cancel."
        : "Your account details are read-only. Click Edit Details to make changes.";
    }

    // Edit button.
    editButton.addEventListener("click", function () {
      originalValues = {};

      editableFields.forEach(field => {
        originalValues[field.id] = field.value;
      });

      setEditing(true);
      editableFields[0].focus();
    });

    // Cancel button.
    cancelButton.addEventListener("click", function () {
      editableFields.forEach(field => {
        field.value = originalValues[field.id] ?? "";
      });

      setEditing(false);
    });

    // Save profile details to the Flask backend.
    profileForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!profileForm.reportValidity()) {
        return;
      }

      saveButton.disabled = true;
      cancelButton.disabled = true;
      message.textContent = "Saving your details...";

      const updatedDetails = {
        name: document.getElementById("pf-name").value.trim(),
        branch: document.getElementById("pf-branch").value.trim(),
        year: Number(document.getElementById("pf-year").value),
        enrollment_number: document.getElementById("pf-enrollment").value.trim()
      };

      try {
        const response = await fetch("/events/profile/update", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updatedDetails)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to update your profile."
          );
        }

        // Update the displayed values using the server response.
        document.getElementById("pf-name").value = result.user.name;
        document.getElementById("pf-branch").value = result.user.branch;
        document.getElementById("pf-year").value = result.user.year;
        document.getElementById("pf-enrollment").value =
          result.user.enrollment_number || "";

        // Update the profile heading and initials if present.
        const profileTitle = document.getElementById("pf-title");
        if (profileTitle) {
          profileTitle.textContent = result.user.name || "Your profile";
        }

        const initialsElement = document.getElementById("pf-initials");
        if (initialsElement) {
          initialsElement.textContent = (result.user.name || "?")
            .trim()
            .split(/\s+/)
            .map(word => word[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
        }

        // Save the new values as the baseline for Cancel.
        originalValues = {};
        editableFields.forEach(field => {
          originalValues[field.id] = field.value;
        });

        message.textContent = result.message;
        setEditing(false);

      } catch (error) {
        message.textContent = error.message;
      } finally {
        saveButton.disabled = false;
        cancelButton.disabled = false;
      }
    });

    // Start in view mode.
    setEditing(false);
  }
}
