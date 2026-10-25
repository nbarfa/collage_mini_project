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
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
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
    $('#signup-form').addEventListener('submit', async e => {
      e.preventDefault();

      const form = e.currentTarget;
      const button = form.querySelector('button[type="submit"]');

      const name = form.querySelector('[name="name"]').value.trim();
      const email = form.querySelector('[name="email"]').value.trim();
      const password = form.querySelector('[name="password"]').value;
      const branch = form.querySelector('[name="branch"]')?.value.trim() || '';
      const year = form.querySelector('[name="year"]')?.value || '';
      const enrollmentNumber =
        form.querySelector('[name="enrollment_number"]')?.value.trim() || '';

      // Display signup errors inside the signup page.
      function showSignupError(message) {
        let container = document.querySelector('#signup-message');

        if (!container) {
          container = document.createElement('div');
          container.id = 'signup-message';
          container.className = 'flash-container';

          const heading = form.querySelector('h1');
          if (heading) {
            heading.insertAdjacentElement('afterend', container);
          } else {
            form.prepend(container);
          }
        }

        container.replaceChildren();

        const box = document.createElement('div');
        box.className = 'flash-message flash-error';
        box.setAttribute('role', 'alert');

        const text = document.createElement('span');
        text.textContent = message;

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'flash-close';
        close.setAttribute('aria-label', 'Close notification');
        close.textContent = '×';
        close.addEventListener('click', () => box.remove());

        box.append(text, close);
        container.appendChild(box);
      }

      if (button) {
        button.disabled = true;
        button.textContent = 'Creating account...';
      }

      try {
        const response = await fetch('/auth/signup', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role: 'student',
            branch,
            year,
            enrollment_number: enrollmentNumber
          })
        });

        const data = await response.json();

        // Registered email: redirect to login with an error message.
        if (
          response.status === 409 &&
          data.error &&
          data.error.toLowerCase().includes('email already exists')
        ) {
          window.location.href =
            `/auth/login?signup_error=${encodeURIComponent(data.error)}`;
          return;
        }

        // Any other error stays on the signup page.
        if (!response.ok) {
          showSignupError(data.error || 'Unable to create account.');
          return;
        }

        // Successful signup: redirect to login with a success message.
        window.location.href =
          `/auth/login?signup_message=${encodeURIComponent(data.message || 'Account created successfully. Please log in.')}`;

      } catch (error) {
        showSignupError(
          'Unable to connect to the server. Please try again.'
        );

        console.error('Signup error:', error);

      } finally {
        if (button && document.body.dataset.page === 'signup') {
          button.disabled = false;
          button.textContent = 'Create account';
        }
      }
    });

  }

  if (page === 'volunteers') {
    /* Demo data. In the real app: USERS comes from a lookup of registered users (GET /api/users?email=),
       VOLS from GET /api/volunteers, and assign / remove become POST / DELETE calls. */
    const USERS = [];
    let VOLS = [];
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ini = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const byEmail = e => USERS.find(u => u.email === e);
    const input = $('#email-q'), res = $('#results'), fmsg = $('#find-msg'), modal = $('#modal'), toastEl = $('#toast');
    let justAdded = null, pending = null, undo = null, timer = null;

    const say = (t, c) => { fmsg.textContent = t; fmsg.className = 'msg' + (c ? ' ' + c : '') };


    function stats() {
      const assigned = $('#st-assigned');
      const duty = $('#st-duty');
      const scans = $('#st-scans');
      const count = $('#vcount');

      if (assigned) {
        assigned.textContent = VOLS.length;
      }

      if (duty) {
        duty.textContent = VOLS.filter(v => v.on).length;
      }

      if (scans) {
        scans.textContent = VOLS
          .reduce((total, v) => total + (Number(v.scans) || 0), 0)
          .toLocaleString('en-IN');
      }

      if (count) {
        count.textContent = VOLS.length +
          (VOLS.length === 1 ? ' volunteer' : ' volunteers');
      }
    }

    function table() {
      const f = $('#vf').value.trim().toLowerCase();
      const rows = VOLS.filter(v =>
        !f || ((v.name || byEmail(v.email).name || "") + " " + v.email)
          .toLowerCase()
          .includes(f)
      );
      $('#vbody').innerHTML = rows.length ? rows.map(v => {
        const u = {
          ...byEmail(v.email),
          ...v,
          name: v.name || byEmail(v.email).name || "Unnamed user"
        };
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

    async function loadVolunteers() {
      try {
        const response = await fetch("/admin/volunteers/list");

        if (!response.ok) {
          throw new Error("Failed to load volunteers.");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || "Failed to load volunteers.");
        }

        VOLS = (data.volunteers || []).map(v => ({
          ...v,
          on: false,
          scans: 0,
          added: v.assigned_at
            ? new Date(v.assigned_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })
            : "—"
        }));

        stats();
        table();

      } catch (error) {
        console.error("Volunteer loading error:", error);
        say(error.message, "bad");
      }
    }

    async function find() {
      const email = input.value.trim();

      res.innerHTML = "";

      if (!email || !email.includes("@")) {
        say("Enter the registered user's full email address.", "bad");
        return;
      }

      try {
        const response = await fetch(
          `/admin/volunteers/search?email=${encodeURIComponent(email)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          say(data.message || "No registered user found.", "bad");
          return;
        }

        const user = data.user;

        res.innerHTML = `
            <div class="ures">
                <div class="grow">
                    <b>${esc(user.name || "Unnamed user")}</b>
                    <div class="muted small">${esc(user.email)}</div>
                    <div class="muted small">Role: ${esc(user.role)}</div>
                </div>

                ${user.already_assigned
            ? '<span class="pill">Already a volunteer</span>'
            : `<button
                            class="btn primary sm"
                            type="button"
                            data-assign="${esc(user.email)}">
                            Assign as volunteer
                          </button>`
          }
            </div>
        `;

        say("Registered user found.", "ok");
      } catch (error) {
        console.error("User search error:", error);
        say("Could not search users. Please try again.", "bad");
      }
    }

    function toast(msg, canUndo) {
      const toastMessage = $('#toast-msg');
      const undoButton = $('#toast-undo');

      // If the toast elements don't exist, skip the notification.
      if (!toastMessage) {
        console.log(msg);
        return;
      }

      toastMessage.textContent = msg;

      if (undoButton) {
        undoButton.hidden = !canUndo;
      }

      if (toastEl) {
        toastEl.hidden = false;
      }

      clearTimeout(timer);

      timer = setTimeout(() => {
        if (toastEl) {
          toastEl.hidden = true;
        }

        if (canUndo) {
          undo = null;
        }
      }, 7000);
    }

    const closeModal = () => { modal.hidden = true; pending = null };

    $('#assign-form').addEventListener('submit', e => { e.preventDefault(); find() });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { input.value = ''; res.innerHTML = ''; say('', '') } });
    $('#vf').addEventListener('input', table);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal() });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal() });
    const cancelButton = $('#m-cancel');

    if (cancelButton) {
      cancelButton.addEventListener('click', closeModal);
    }


    document.addEventListener('click', async e => {
      const a = e.target.closest('[data-assign]');
      const r = e.target.closest('[data-remove]');

      // ASSIGN VOLUNTEER
      if (a) {
        const email = a.dataset.assign;

        a.disabled = true;

        try {
          const response = await fetch('/admin/volunteers/assign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Could not assign volunteer.');
          }

          justAdded = email;

          input.value = '';
          res.innerHTML = '';
          say('', '');

          await loadVolunteers();

          toast((data.volunteer?.name || email) + ' is now a volunteer.');

        } catch (error) {
          console.error('Assign volunteer error:', error);
          say(error.message, 'bad');
        } finally {
          a.disabled = false;
        }

        return;
      }

      // OPEN REMOVE CONFIRMATION
      if (r) {
        pending = r.dataset.remove;

        const volunteer = VOLS.find(v => v.email === pending);
        const name = volunteer?.name || byEmail(pending).name || pending;

        $('#m-text').innerHTML =
          '<b>' + esc(name) + '</b> will lose scanner access right away. ' +
          'Their past scans stay in your records.';

        modal.hidden = false;

        const cancelButton = $('#m-cancel');
        if (cancelButton) {
          cancelButton.focus();
        }

        return;
      }


      // CONFIRM REMOVE VOLUNTEER
      if (e.target.closest('#confirm-remove') && pending) {
        const email = pending;
        const volunteer = VOLS.find(v => v.email === email);
        console.log("Volunteer selected for removal:", volunteer);
        console.log("Assignment ID:", volunteer?.assignment_id);

        if (!volunteer) {
          say('Volunteer not found. Please reload the list.', 'bad');
          closeModal();
          return;
        }

        // Use the database assignment ID, not the email.
        if (!volunteer.assignment_id) {
          say('Assignment ID is missing. Reload the volunteer list.', 'bad');
          closeModal();
          return;
        }

        const confirmButton = $('#confirm-remove');
        confirmButton.disabled = true;

        try {
          const response = await fetch(
            `/admin/volunteers/${volunteer.assignment_id}/remove`,
            { method: 'DELETE' }
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Could not remove volunteer.');
          }

          closeModal();

          await loadVolunteers();

          toast(data.message || 'Volunteer access removed successfully.');

        } catch (error) {
          console.error('Remove volunteer error:', error);
          say(error.message, 'bad');
        } finally {
          confirmButton.disabled = false;
        }

        return;
      }

      // UNDO IS DISABLED FOR DATABASE REMOVALS.
      // Restoring a removed assignment requires a new backend assignment request.
      if (e.target.closest('#toast-undo')) {
        undo = null;
        toastEl.hidden = true;
      }
    });


    loadVolunteers();
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


  /* ---------- volunteer dashboard: current and upcoming events, event details, ticket scanner ---------- */
  if (page === 'volunteer-dashboard') {
    /* Real event data loaded from the Flask backend. */
    let NOW = new Date();
    let EVENTS = [];

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      MON = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
    const esc = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c],
      );
    const ini = (n) =>
      n
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    const tm = (d) => {
      let h = d.getHours();
      const m = d.getMinutes(),
        ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
    };
    const dl = (d) =>
      DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()];
    const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const sameDay = (a, b) => sod(a).getTime() === sod(b).getTime();
    const when = (e) => tm(e.start);
    const status = (e) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(e.start);
      eventDate.setHours(0, 0, 0, 0);
      if (eventDate < today) return 'past';
      if (eventDate.getTime() === today.getTime()) return 'live';
      return 'upcoming';
    };
    const byId = (id) => EVENTS.find((e) => e.id === id);
    const pct = (e) => (e.reg ? Math.round((e.in / e.reg) * 100) : 0);
    const startsIn = (e) => {
      const n = Math.round((sod(e.start) - sod(NOW)) / 864e5);
      return n === 0
        ? 'Starts today at ' + tm(e.start)
        : n === 1
          ? 'Starts tomorrow'
          : 'Starts in ' + n + ' days';
    };
    const art = (e) =>
      `--a:var(--p${(e.id % 5) + 1});--b:var(--p${((e.id + 2) % 5) + 1})`;

    /* ----- sample tickets (8 per event). Real tickets are signed tokens read from the QR. ----- */
    const PEOPLE = [
      ['Riya Verma', '0827CS241001'],
      ['Aarav Sharma', '0808C1241172'],
      ['Diya Verma', '0808C1241173'],
      ['Kabir Patel', '0827EC231007'],
      ['Ishita Joshi', '0827IT231022'],
      ['Rohan Mehta', '0827CS231018'],
      ['Meera Gupta', '0827CS241058'],
      ['Vihaan Iyer', '0827ME241012'],
    ];
    const pool = (e) =>
      PEOPLE.map((p, i) => ({
        id:
          'ADM-' +
          (0x4a10 + e * 977 + i * 313).toString(16).toUpperCase() +
          '-K' +
          (i + 3),
        name: p[0],
        enroll: p[1],
        event: e,
      }));
    const TICKETS = [0, 1, 2, 3, 4].flatMap(pool);
    const state = {};
    function ensureEventState(eventId) {
      if (!state[eventId]) state[eventId] = { used: {}, recent: [] };
      return state[eventId];
    }
    let clock = 12 * 60 + 30;
    const clk = () =>
      tm(new Date(2026, 9, 11, Math.floor(clock / 60), clock % 60));

    /* ----- list screen ----- */
    const liveCard = (
      e,
    ) => `<li><button class="card vd-ev live" type="button" data-open="${e.id}">
      <span class="grow"><span class="pill vd-live"><span class="live-dot"></span>Live now</span>
      <h3>${esc(e.t)}</h3>
      <span class="meta">${icon('clock', 15)}${when(e)}</span>
      <span class="meta">${icon('pin', 15)}${esc(e.venue)}</span>
      <span class="seats"><span class="bar"><i style="width:${pct(e)}%"></i></span><small>${e.in} of ${e.reg} checked in</small></span></span>
      <span class="chev">${icon('chev', 20)}</span></button></li>`;
    const upCard = (
      e,
    ) => `<li><button class="card vd-ev" type="button" data-open="${e.id}">
      <span class="dchip"><b>${String(e.start.getDate()).padStart(2, '0')}</b><span>${MON[e.start.getMonth()]}</span></span>
      <span class="grow"><h3>${esc(e.t)}</h3>
      <span class="meta">${icon('clock', 15)}${tm(e.start)} · ${startsIn(e)}</span>
      <span class="meta">${icon('pin', 15)}${esc(e.venue)}</span></span>
      <span class="chev">${icon('chev', 20)}</span></button></li>`;
    function drawList() {
      const vis = EVENTS.filter((e) => status(e) !== 'past').sort(
        (a, b) => a.start - b.start,
      );
      const live = vis.filter((e) => status(e) === 'live'),
        up = vis.filter((e) => status(e) === 'upcoming');
      $('#live-count').textContent = live.length;
      $('#up-count').textContent = up.length;
      $('#live-list').innerHTML = live.length
        ? live.map(liveCard).join('')
        : '<li class="vd-empty card">Nothing is happening right now. Your next event is listed below.</li>';
      $('#up-list').innerHTML = up.length
        ? up.map(upCard).join('')
        : '<li class="vd-empty card">No upcoming events yet.</li>';
    }

    /* ----- detail screen ----- */
    const fact = (i, k, v) =>
      `<div class="fact">${icon(i, 20)}<div><b>${k}</b><span>${esc(v)}</span></div></div>`;
    function drawDetail(e) {
      const live = status(e) === 'live';
      const dateText = sameDay(e.start, e.end)
        ? dl(e.start)
        : dl(e.start) + ' to ' + dl(e.end);
      const nums = live
        ? `<div><b>${e.reg}</b><span>Registered</span></div><div><b>${e.in}</b><span>Checked in</span></div><div><b>${e.reg - e.in}</b><span>Still to arrive</span></div>`
        : `<div><b>${e.reg}</b><span>Registered so far</span></div>`;
      $('#vd-detail-body').innerHTML = `
        <div class="banner" style="${art(e)}"><svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${MOTIF[e.cat]}</svg>
          <div class="date"><b>${String(e.start.getDate()).padStart(2, '0')}</b><span>${MON[e.start.getMonth()]}</span></div><span class="tag">${e.cat}</span></div>
        <div class="vd-title"><h1 data-focus>${esc(e.t)}</h1>${live ? '<span class="pill vd-live"><span class="live-dot"></span>Live now</span>' : '<span class="pill info">Upcoming</span>'}</div>
        <div class="facts">${fact('cal', 'Date', dateText)}${fact('clock', 'Time', when(e))}${fact('pin', 'Venue', e.venue)}${fact('users', 'Organised by', e.org)}</div>
        <section class="card vd-prog"><h2>${live ? 'Check-in so far' : 'Registrations'}</h2><div class="vd-nums">${nums}</div>${live ? `<div class="bar"><i style="width:${pct(e)}%"></i></div>` : ''}</section>
        <div class="blk"><h2>Notes for volunteers</h2><ul class="vd-notes">
          <li>Scan every ticket at the entrance, one student at a time.</li>
          <li>Green means let them in. Amber or red means stop and send them to the organiser.</li>
          <li>If the camera can't read a QR code, type the ticket ID instead.</li></ul></div>
        ${live
          ? `<button class="btn primary wide vd-scan" type="button" data-scan="${e.id}">${icon('scan', 22)} Scan tickets</button>`
          : `<div><button class="btn primary wide vd-scan" type="button" disabled>${icon('lock', 20)} Scan tickets</button><p class="hint vd-lock">Scanning opens when this event starts, on ${dl(e.start)} at ${tm(e.start)}.</p></div>`
        }`;
    }

    /* ----- scanner screen ----- */
    let sc = null;
    const KINDS = {
      ok: ['ok', 'check'],
      warn: ['warn', 'alert'],
      bad: ['bad', 'x'],
    };
    const count = () => {
      if (sc) $('#sc-count').textContent = sc.in + ' / ' + sc.reg + ' checked in';
    };
    const hint = () => {
      const hintElement = $('#sc-hint');
      if (!hintElement || !sc) return;
      const eventState = ensureEventState(sc.id);
      const n = pool(sc.id).find((p) => !eventState.used[p.id]);
      hintElement.textContent = n ? n.id : 'none left';
    };
    const idle = () => {
      $('#sc-result').innerHTML =
        `<div class="vd-res idle"><span class="vd-ic">${icon('scan', 24)}</span><div><b class="vd-rt">Ready to scan</b><div class="muted small">Hold a ticket QR code inside the frame.</div></div></div>`;
    };
    function result(kind, title, name, line) {
      const k = KINDS[kind];
      $('#sc-result').innerHTML =
        `<div class="vd-res ${k[0]}"><span class="vd-ic">${icon(k[1], 26)}</span><div><b class="vd-rt">${esc(title)}</b>${name ? `<div class="vd-rn">${esc(name)}</div>` : ''}<div class="muted small">${esc(line)}</div></div></div>`;
    }
    function drawRecent() {
      const r = ensureEventState(sc.id).recent;
      $('#sc-recent').innerHTML = r.length
        ? r
          .map(
            (x) =>
              `<li><span class="av">${ini(x.name)}</span><span class="nm"><b>${esc(x.name)}</b><small>${esc(x.sub)} · ${x.time}</small></span><span class="pill${x.cls === 'ok' ? '' : ' ' + x.cls}">${x.label}</span></li>`,
          )
          .join('')
        : '<li class="muted small" style="padding:6px">Tickets you scan will be listed here.</li>';
    }
    function log(name, sub, cls, label) {
      const r = ensureEventState(sc.id).recent;
      r.unshift({ name, sub, cls, label, time: clk() });
      if (r.length > 5) r.pop();
      drawRecent();
    }
    async function check(raw) {
      const token = String(raw || "").trim();

      if (!token) {
        result(
          "bad",
          "Enter a ticket ID",
          "",
          "Enter the actual QR token from the ticket."
        );
        return;
      }

      if (!sc || !Number.isInteger(Number(sc.id))) {
        result(
          "bad",
          "No event selected",
          "",
          "Select an event before checking a ticket."
        );
        return;
      }

      try {
        const response = await fetch(
          `/admin/volunteer/events/${Number(sc.id)}/scan`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ token })
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          const messages = {
            invalid_ticket: "Invalid Ticket",
            already_scanned: "QR Already Scanned",
            wrong_event: "Ticket belongs to another event",
            event_finished: "This event has already passed",
            unauthorized: "Please log in again",
            forbidden: "Volunteer access is required",
            event_not_found: "Event not found",
            missing_token: "Enter a ticket ID"
          };

          const message =
            messages[data.code] ||
            data.message ||
            "Unable to validate ticket.";

          result(
            data.code === "already_scanned" ? "warn" : "bad",
            message,
            "",
            data.message || "The server could not validate this ticket."
          );

          return;
        }

        const student = data.student || {};

        result(
          "ok",
          "Confirmed",
          student.name || "Student",
          [
            student.enrollment_number || "",
            student.branch || "",
            student.year || "",
            data.event?.title || sc.t
          ].filter(Boolean).join(" · ")
        );

      } catch (error) {
        console.error("Manual ticket validation failed:", error);

        result(
          "bad",
          "Connection error",
          "",
          "Could not contact the server. Check your connection and try again."
        );
      }
    }


    let cameraStream = null;
    let cameraFrame = null;
    let scanBusy = false;
    let scanPausedUntil = 0;
    let lastScannedToken = "";
    let lastScannedAt = 0;

    function stopVolunteerCamera() {
      if (cameraFrame !== null) {
        cancelAnimationFrame(cameraFrame);
        cameraFrame = null;
      }

      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }

      const video = document.querySelector("#sc-camera");

      if (video) {
        video.srcObject = null;
      }
    }

    function showVolunteerScanMessage(message, type = "info") {
      const result = document.querySelector("#sc-result");

      if (!result) return;

      result.replaceChildren();

      const box = document.createElement("div");
      box.className = "card panel";
      box.setAttribute("role", "status");
      box.style.padding = "16px";
      box.style.marginTop = "12px";
      box.style.whiteSpace = "pre-line";

      if (type === "success") {
        box.style.borderColor = "#20c997";
      } else if (type === "error") {
        box.style.borderColor = "#ef4444";
      }

      box.textContent = message;
      result.appendChild(box);
    }

    async function submitRealTicketToken(token) {
      token = String(token || "").trim();

      if (!token || scanBusy) return;

      scanBusy = true;
      scanPausedUntil = Date.now() + 1800;

      try {
        if (!sc || !Number.isInteger(Number(sc.id))) {
          throw new Error("Please select an event first.");
        }

        const response = await fetch(
          `/admin/volunteer/events/${Number(sc.id)}/scan`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ token })
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          const messages = {
            invalid_ticket: "Invalid Ticket.",
            already_scanned: "QR Already Scanned.",
            wrong_event: "Ticket belongs to another event.",
            event_finished: "This event has already passed.",
            unauthorized: "Please log in again.",
            forbidden: "Volunteer access is required."
          };

          showVolunteerScanMessage(
            messages[data.code] ||
            data.message ||
            "Unable to validate this ticket.",
            "error"
          );

          scanPausedUntil = Date.now() + 2000;
          scanBusy = false;
          return;
        }

        const student = data.student || {};

        showVolunteerScanMessage(
          `✓ Confirmed\n\n` +
          `Student: ${student.name || "Not available"}\n` +
          `Enrollment: ${student.enrollment_number || "Not available"}\n` +
          `Branch: ${student.branch || "Not available"}\n` +
          `Year: ${student.year || "Not available"}`,
          "success"
        );

        lastScannedToken = token;
        lastScannedAt = Date.now();

        // Prevent another scan while the confirmation is displayed.
        scanPausedUntil = Date.now() + 5000;

        // Resume automatically after five seconds.
        setTimeout(() => {
          scanBusy = false;
          scanPausedUntil = Date.now();

          const result = document.querySelector("#sc-result");
          if (result) result.replaceChildren();
        }, 5000);

      } catch (error) {
        console.error("Ticket scan failed:", error);

        showVolunteerScanMessage(
          error.message || "Unable to contact the server.",
          "error"
        );

        scanPausedUntil = Date.now() + 2000;
        scanBusy = false;
      }
    }

    async function startVolunteerCamera() {
      const video = document.querySelector("#sc-camera");
      const message = document.querySelector("#sc-camera-message");

      if (!video) {
        console.error("Camera video element #sc-camera was not found.");
        return;
      }

      if (!window.jsQR) {
        showVolunteerScanMessage(
          "QR scanner library failed to load. Check your internet connection and refresh.",
          "error"
        );
        return;
      }

      try {
        stopVolunteerCamera();

        if (message) {
          message.textContent = "Requesting camera permission...";
          message.style.display = "block";
        }

        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        video.srcObject = cameraStream;
        video.style.display = "block";
        await video.play();

        if (message) message.style.display = "none";

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", {
          willReadFrequently: true
        });

        function scanFrame() {
          const scannerScreen = document.querySelector("#vd-scan");

          if (!scannerScreen || scannerScreen.hidden) {
            stopVolunteerCamera();
            return;
          }

          if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            !scanBusy &&
            Date.now() >= scanPausedUntil
          ) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const image = context.getImageData(
              0, 0, canvas.width, canvas.height
            );

            const qr = window.jsQR(
              image.data,
              image.width,
              image.height,
              { inversionAttempts: "attemptBoth" }
            );

            if (qr && qr.data) {
              const token = qr.data.trim();

              // Avoid repeatedly submitting the same QR every video frame.
              if (
                token !== lastScannedToken ||
                Date.now() - lastScannedAt > 7000
              ) {
                submitRealTicketToken(token);
              }
            }
          }

          cameraFrame = requestAnimationFrame(scanFrame);
        }

        cameraFrame = requestAnimationFrame(scanFrame);

      } catch (error) {
        console.error("Unable to start camera:", error);

        if (message) {
          message.textContent =
            error.name === "NotAllowedError"
              ? "Camera permission was denied. Allow camera access in your browser settings."
              : "Unable to open the camera. Check that a camera is connected and available.";

          message.style.display = "block";
        }
      }
    }


    function drawScan(e) {
      sc = e;

      ensureEventState(e.id);
      $("#sc-title").textContent = e.t;
      count();
      idle();
      drawRecent();
      hint();

      startVolunteerCamera();
    }


    /* ----- navigation: list > detail > scan, with the browser back button ----- */
    const views = {
      list: $('#vd-list'),
      detail: $('#vd-detail'),
      scan: $('#vd-scan'),
    };
    let cur = { view: 'list', id: -1 },
      first = true;
    function parse() {
      const m = location.hash.match(/^#(event|scan)-(\d+)$/);
      if (!m) return { view: 'list', id: -1 };
      const e = byId(+m[2]);
      if (!e || status(e) === 'past') return { view: 'list', id: -1 };
      return {
        view: m[1] === 'scan' && status(e) === 'live' ? 'scan' : 'detail',
        id: e.id,
      };
    }
    function render() {
      Object.keys(views).forEach((k) => {
        views[k].hidden = k !== cur.view;
      });
      if (cur.view === 'list') drawList();
      else if (cur.view === 'detail') drawDetail(byId(cur.id));
      else drawScan(byId(cur.id));
      if (!first) {
        const h = views[cur.view].querySelector('[data-focus]');
        if (h) {
          h.setAttribute('tabindex', '-1');
          h.focus({ preventScroll: true });
        }
      }
      first = false;
    }
    function go(view, id) {
      cur = { view, id: id === undefined ? -1 : id };
      render();
      const h =
        view === 'list'
          ? location.pathname + location.search
          : '#' + (view === 'detail' ? 'event' : 'scan') + '-' + id;
      try {
        history.pushState(null, '', h);
      } catch (_) { }
      window.scrollTo(0, 0);
    }
    const sync = () => {
      const n = parse();
      if (n.view !== cur.view || n.id !== cur.id) {
        cur = n;
        render();
      }
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);

    document.addEventListener('click', (ev) => {
      const o = ev.target.closest('[data-open]'),
        s = ev.target.closest('[data-scan]'),
        b = ev.target.closest('[data-back]');
      if (o) {
        go('detail', +o.dataset.open);
        return;
      }
      if (s && !s.disabled) {
        go('scan', +s.dataset.scan);
        return;
      }
      if (b) {
        if (b.dataset.back === 'list') go('list');
        else go('detail', cur.id);
      }
    });

    $("#sc-manual").addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = $("#sc-id");
      const token = input.value.trim();

      if (!token) {
        showVolunteerScanMessage(
          "Please enter the QR token.",
          "error"
        );
        return;
      }

      await submitRealTicketToken(token);
      input.value = "";
    });


    async function loadVolunteerEvents() {
      const liveList = $('#live-list');
      const upcomingList = $('#up-list');
      if (liveList) liveList.innerHTML = '<li class="vd-empty card">Loading events...</li>';
      if (upcomingList) upcomingList.innerHTML = '';

      try {
        const response = await fetch('/admin/volunteer/events', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || `Unable to load events (HTTP ${response.status}).`);
        }

        EVENTS = (data.events || []).map((event) => {
          const start = new Date(`${event.event_date}T${event.start_time || '00:00:00'}`);
          return {
            id: Number(event.id),
            t: event.title || 'Untitled event',
            cat: 'Tech',
            venue: event.venue || 'Venue not specified',
            org: 'University Event Team',
            start,
            end: start,
            reg: 0,
            in: 0,
          };
        });

        NOW = new Date();
        EVENTS.forEach((event) => ensureEventState(event.id));
        cur = parse();
        render();
      } catch (error) {
        console.error('Failed to load volunteer events:', error);
        if (liveList) {
          liveList.innerHTML = `<li class="vd-empty card">Unable to load events. Please refresh and try again.</li>`;
        }
        if (upcomingList) upcomingList.innerHTML = '';
        $('#live-count').textContent = '0';
        $('#up-count').textContent = '0';
      }
    }

    cur = parse();
    render();
    loadVolunteerEvents();
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
