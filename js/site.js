/* Vila da Praia — page behaviour. One scroll-driven updater, one shared rAF (MotionEngine). */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DAYS_S = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const HOURS = { 0: [7, 20], 1: [7, 22], 2: [7, 22], 3: [8, 22], 4: [7, 22], 5: [7, 22], 6: [7, 22] };
  const SPORT_COLOR = { 'Beach Tennis': 'var(--bt)', 'Vôlei': 'var(--volei)', 'Futevôlei': 'var(--fute)' };
  let WA = '5515998613030';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const waLink = msg => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;

  // ---------- Sorocaba time ----------
  function nowSP() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return { dow, h: +p.hour + +p.minute / 60, iso: `${p.year}-${p.month}-${p.day}` };
  }
  const fmtH = h => `${String(Math.floor(h)).padStart(2, '0')}h`;
  function status() {
    const n = nowSP(), [o, c] = HOURS[n.dow];
    if (n.h >= o && n.h < c) return { open: true, short: `Aberto até ${fmtH(c)}`, long: `Aberto agora. Hoje vai até as ${c}h.` };
    if (n.h < o) return { open: false, short: `Abre às ${fmtH(o)}`, long: `Fechado agora. Hoje abre às ${o}h.` };
    const nd = (n.dow + 1) % 7;
    return { open: false, short: `Abre amanhã ${fmtH(HOURS[nd][0])}`, long: `Fechado agora. Amanhã abre às ${HOURS[nd][0]}h.` };
  }
  function paintStatus() {
    const s = status();
    $$('[data-status-dot]').forEach(d => d.classList.toggle('open', s.open));
    $$('[data-status-text]').forEach(t => (t.textContent = s.short));
    $$('[data-status-long]').forEach(t => (t.textContent = s.long));
  }
  function paintHours() {
    const n = nowSP(), order = [1, 2, 3, 4, 5, 6, 0];
    $('#hours').innerHTML = order.map(d => `<li class="${d === n.dow ? 'today' : ''}"><span>${DAYS[d]}</span><span>${String(HOURS[d][0]).padStart(2, '0')}h às ${HOURS[d][1]}h</span></li>`).join('');
    $('#ftHours').innerHTML = '<li>Seg, ter, qui, sex e sáb: 7h às 22h</li><li>Qua: 8h às 22h</li><li>Dom: 7h às 20h</li>';
  }
  paintStatus(); paintHours(); setInterval(paintStatus, 60e3);
  $('#yr').textContent = new Date().getFullYear();

  function bindWA() { $$('[data-wa]').forEach(a => (a.href = waLink(a.dataset.wa))); }
  bindWA();

  // ---------- reveal ----------
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  const observeRv = () => $$('.rv:not(.in)').forEach(n => io.observe(n));
  observeRv();

  // ---------- header theme ----------
  const hdr = $('#hdr');
  const themed = $$('[data-theme]');
  function headerTheme() {
    const y = 36;
    let theme = 'dark';
    for (const s of themed) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { theme = s.dataset.theme; break; } }
    hdr.classList.toggle('light', theme === 'light');
    hdr.classList.toggle('solid', theme === 'dark' && heroEl.getBoundingClientRect().bottom < y);
  }

  // ---------- hero ----------
  // Intro runs on CSS keyframes (transform); scroll uses the individual translate/rotate/scale properties so the two compose.
  const heroEl = $('#hero'), heroCopy = $('.hero-copy'), heroImg = $('#heroImg'), heroDim = $('#heroDim'), heroGlow = $('#heroGlow'), heroSeal = $('#heroSeal'), heroCue = $('#heroCue');
  const heroLines = $$('#heroTitle .ln').map((ln, li) => {
    let k = 0;
    ln.innerHTML = ln.textContent.split(' ').map(w => `<span class="wd">${[...w].map(c => `<span class="ch" aria-hidden="true">${esc(c)}</span>`).join('')}</span>`).join(' ');
    const chars = $$('.ch', ln);
    chars.forEach(ch => ch.style.setProperty('--i', li * 7 + k++));
    return { ln, chars, dir: li % 2 ? 1 : -1 };
  });
  $$('.hero-tags span').forEach((t, i) => t.style.setProperty('--i', i));
  const heroTags = $$('.hero-tags span'), heroFade = $$('.hero-sub, .hero-cta');
  const bandTrack = $('#bandTrack');
  const BAND = ['Beach tennis', 'Vôlei', 'Futevôlei', 'Bar pé na areia', 'Aulas', 'Torneios'];
  const bandSet = BAND.map((w, i) => `<span class="${i % 2 ? 'o' : ''}">${w}<svg class="mark" viewBox="308 285 1111 1111"><use href="img/mark.svg#p"/></svg></span>`).join('');
  bandTrack.innerHTML = bandSet + bandSet + bandSet;
  const bandMarks = $$('svg', bandTrack);
  let bandW = 0;
  const measureBand = () => (bandW = bandTrack.scrollWidth / 3);
  measureBand(); addEventListener('resize', measureBand);
  document.fonts && document.fonts.ready.then(measureBand);

  function paintHero(y) {
    const h = heroEl.offsetHeight || innerHeight;
    const p = reduced ? 0 : clamp(y / h), e = ease(p);
    // photo sinks slower than the page and pushes in; the sun glow slides across
    heroImg.style.translate = `0 ${(p * h * 0.42).toFixed(1)}px`;
    heroImg.style.scale = (1.04 + 0.22 * e).toFixed(4);
    heroGlow.style.translate = `${(-p * 38).toFixed(2)}% ${(p * 22).toFixed(2)}%`;
    heroDim.style.opacity = (0.72 * e).toFixed(3);
    heroCopy.style.translate = `0 ${(p * h * 0.32).toFixed(1)}px`;
    // title opens: lines split sideways, letters lift at staggered speeds and lean
    heroLines.forEach(L => {
      L.ln.style.translate = `${(L.dir * e * 22).toFixed(2)}vw 0`;
      L.chars.forEach((ch, i) => {
        const w = 0.6 + ((i * 37) % 10) / 10;
        ch.style.translate = `0 ${(-e * 110 * w).toFixed(1)}px`;
        ch.style.rotate = `${(L.dir * e * 18 * (w - 0.9)).toFixed(2)}deg`;
        ch.style.opacity = clamp(1 - p * (1.6 + 1.4 * w)).toFixed(3);
      });
    });
    heroTags.forEach((t, i) => { t.style.translate = `0 ${(-e * 70 * (1 + i * 0.45)).toFixed(1)}px`; t.style.opacity = clamp(1 - p * (4 + i * 0.8)).toFixed(3); });
    heroFade.forEach((n, i) => { n.style.translate = `0 ${(-e * (90 + i * 50)).toFixed(1)}px`; n.style.opacity = clamp(1 - p * (2.6 + i * 0.6)).toFixed(3); });
    heroSeal.style.rotate = `${(e * 280).toFixed(1)}deg`;
    heroSeal.style.scale = (1 + e * 0.9).toFixed(3);
    heroSeal.style.opacity = clamp(1 - p * 4).toFixed(3);
    heroCue.style.opacity = clamp(1 - p * 6).toFixed(3);
    // band: drifts with the page, marks roll like a ball
    if (bandW) bandTrack.style.translate = `${(-((y * 0.55) % bandW)).toFixed(1)}px 0`;
    const roll = `${(y * 0.35).toFixed(1)}deg`;
    bandMarks.forEach(m => (m.style.rotate = roll));
  }

  // ---------- trajectories ----------
  const NS = 'http://www.w3.org/2000/svg';
  const courts = $$('svg.court').map(svg => {
    const net = +svg.dataset.net;
    svg.innerHTML = `
      <line x1="10" y1="160" x2="350" y2="160" stroke="#111" stroke-opacity=".25" stroke-width="2"/>
      <line x1="180" y1="160" x2="180" y2="${net}" stroke="#111" stroke-width="3" stroke-linecap="round"/>
      <rect x="176" y="${net}" width="8" height="${Math.min(46, 158 - net)}" fill="none" stroke="#111" stroke-opacity=".5" stroke-dasharray="2 3"/>
      <path class="trail" d="${svg.dataset.path}" fill="none" stroke="#111" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round" opacity=".55"/>
      <path class="ink" d="${svg.dataset.path}" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse class="shadow" cx="0" cy="162" rx="9" ry="2.6" fill="#111" opacity=".18"/>
      <circle class="ball" r="8" fill="${svg.dataset.ball}" stroke="#111" stroke-width="2"/>`;
    const ink = svg.querySelector('.ink'), L = ink.getTotalLength();
    ink.style.strokeDasharray = `${L} ${L}`;
    return { svg, ink, L, ball: svg.querySelector('.ball'), shadow: svg.querySelector('.shadow') };
  });
  function paintCourt(c, p) {
    const d = c.L * p, pt = c.ink.getPointAtLength(d);
    c.ink.style.strokeDashoffset = (c.L - d).toFixed(1);
    c.ball.setAttribute('cx', pt.x.toFixed(1)); c.ball.setAttribute('cy', pt.y.toFixed(1));
    const hgt = clamp((160 - pt.y) / 140);
    c.shadow.setAttribute('cx', pt.x.toFixed(1)); c.shadow.setAttribute('rx', (9 - 4 * hgt).toFixed(1));
    c.shadow.setAttribute('opacity', (0.22 - 0.14 * hgt).toFixed(2));
  }

  // ---------- sun arc ----------
  const sunCanvas = $('#sun');
  MotionEngine.Loop(sunCanvas, (ctx, t, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.9, R = Math.min(w * 0.46, h * 0.82);
    const H0 = 5, H1 = 23; // horizon hours
    const n = nowSP(), [o, c] = HOURS[n.dow];
    const ang = hh => Math.PI + (clamp((hh - H0) / (H1 - H0))) * Math.PI;
    // horizon
    ctx.strokeStyle = 'rgba(17,17,17,.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - R - 14, cy); ctx.lineTo(cx + R + 14, cy); ctx.stroke();
    // full arc dashed
    ctx.setLineDash([2, 7]); ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    // open window
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, ang(o), ang(c)); ctx.stroke();
    // ticks + labels
    ctx.fillStyle = '#6E675C'; ctx.font = '500 12px "DM Sans", sans-serif'; ctx.textAlign = 'center';
    for (const hh of [o, 12, 17, c]) {
      const a = ang(hh), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fillStyle = '#111'; ctx.fill();
      ctx.fillStyle = '#6E675C'; ctx.fillText(`${hh}h`, cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22) + 4);
    }
    // the sun travels from opening hour to now when the section shows
    const target = clamp(n.h, H0, H1), k = ease(clamp(t / 2.2));
    const hh = o + (target - o) * k, a = ang(hh);
    const sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R;
    const pulse = 1 + 0.06 * Math.sin(t * 2.2);
    ctx.fillStyle = 'rgba(242,169,59,.22)'; ctx.beginPath(); ctx.arc(sx, sy, 26 * pulse, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, 7); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const r = i * Math.PI / 4 + t * 0.25; ctx.beginPath(); ctx.moveTo(sx + Math.cos(r) * 21, sy + Math.sin(r) * 21); ctx.lineTo(sx + Math.cos(r) * 28, sy + Math.sin(r) * 28); ctx.stroke(); }
    // now label
    ctx.fillStyle = '#111'; ctx.font = '700 15px Unbounded, sans-serif';
    const hm = `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')}`;
    ctx.fillText(hm, cx, cy - 18);
  }, { still: 10 });

  // ---------- data from the panel ----------
  let classes = [], filter = '';
  function paintGrade() {
    const g = $('#grade');
    const today = nowSP().dow;
    const list = classes.filter(c => !filter || c.sport === filter);
    if (!list.length) { g.innerHTML = `<div class="empty">Sem turma ${filter ? 'de ' + esc(filter) + ' ' : ''}na grade agora. Chama no WhatsApp que a gente encaixa você.</div>`; return; }
    const days = [...Array(7).keys()].map(i => (today + i) % 7);
    g.innerHTML = days.map(d => {
      const rows = list.filter(c => +c.day === d).sort((a, b) => a.start.localeCompare(b.start));
      if (!rows.length) return '';
      const label = d === today ? `Hoje · ${DAYS[d]}` : DAYS[d];
      return `<div class="day">${label}</div>` + rows.map(c => `<div class="cl"><b>${esc(c.start)}${c.end ? '–' + esc(c.end) : ''}</b>
        <span class="sp"><i style="background:${SPORT_COLOR[c.sport] || 'var(--sand-2)'}"></i>${esc(c.sport)}${c.teacher ? ` <span class="muted" style="font-weight:400">· ${esc(c.teacher)}</span>` : ''}</span>
        <span class="chip">${esc(c.level)}</span></div>`).join('');
    }).join('');
  }
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.f; $$('.filters button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); paintGrade();
  }));

  function dateParts(iso) { const [y, m, d] = iso.split('-').map(Number); return { d, m: MONTHS[m - 1], dow: DAYS_S[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] }; }
  function paintTickets(events) {
    const box = $('#tickets');
    if (!events.length) { box.innerHTML = `<p class="empty">Nenhum evento marcado por enquanto. Quer fazer o seu aniversário ou o torneio da firma aqui? <a href="${waLink('Oi! Quero fazer um evento na Vila.')}" target="_blank" rel="noopener">Fala com a gente.</a></p>`; return; }
    const feat = events.find(e => e.featured) || null;
    const ordered = feat ? [feat, ...events.filter(e => e !== feat)] : events;
    box.innerHTML = ordered.slice(0, 7).map(e => {
      const p = dateParts(e.date), when = `${p.dow} ${p.d} ${p.m}${e.start ? ' · ' + e.start + (e.end ? '–' + e.end : '') : ''}`;
      const isF = e === feat;
      return `<article class="ticket rv${isF ? ' feat' : ''}">
        <div class="stub"><span>${p.m}</span><b>${String(p.d).padStart(2, '0')}</b><span>${p.dow}</span></div>
        <div class="body">
          <div class="meta"><span class="chip">${esc(e.category)}</span>${e.sport ? `<span class="chip">${esc(e.sport)}</span>` : ''}${e.price ? `<span class="chip">${esc(e.price)}</span>` : ''}</div>
          <h3>${esc(e.title)}</h3>
          <p>${esc(when)}</p>
          ${e.description ? `<p>${esc(e.description)}</p>` : ''}
          <a class="btn" href="${e.link ? esc(e.link) : waLink(`Oi! Quero ir no ${e.title} (${p.d}/${e.date.slice(5, 7)}).`)}" target="_blank" rel="noopener">${e.link ? 'Inscrição' : 'Quero ir'}</a>
        </div>
        ${isF && e.image ? `<div class="pic" style="background-image:url('${esc(e.image)}')" role="img" aria-label="${esc(e.title)}"></div>` : ''}
      </article>`;
    }).join('');
    observeRv();
  }

  let rating = { rating: 4.6, reviews: 761 }, rateDone = false;
  function runRating() {
    if (rateDone) return; rateDone = true;
    const el = $('#rateNum'), fill = $('#starFill');
    $('#rateTxt').textContent = `${rating.reviews.toLocaleString('pt-BR')} avaliações no Google`;
    const end = rating.rating, t0 = performance.now(), dur = reduced ? 0 : 1600;
    const step = now => {
      const k = dur ? ease(clamp((now - t0) / dur)) : 1, v = end * k;
      el.textContent = v.toFixed(1).replace('.', ',');
      fill.style.width = (v / 5 * 100).toFixed(1) + '%';
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { runRating(); o.disconnect(); } }), { threshold: 0.4 }).observe($('#rateNum'));

  const dataReady = fetch('/api/data').then(r => r.json()).then(d => {
    if (d.settings) {
      WA = d.settings.whatsapp || WA; bindWA();
      rating = { rating: +d.settings.rating || 4.6, reviews: +d.settings.reviews || 761 };
      if (d.settings.notice) { const n = $('#notice'); n.textContent = d.settings.notice; n.hidden = false; }
    }
    classes = d.classes || []; paintGrade(); paintTickets(d.events || []);
  }).catch(() => { $('#grade').innerHTML = '<div class="empty">Grade indisponível agora. Chama no WhatsApp.</div>'; paintTickets([]); });

  // ---------- scroll-driven layer ----------
  const caps = $$('.cap svg'), tl = $('#tl'), gal = $('#galeria'), gTrack = $('#gTrack'), gNum = $('#gNum');
  const route = $('#route'), routeL = route.getTotalLength(), pin = $('#pin'), seal = $('#seal');
  route.style.strokeDasharray = `${routeL} ${routeL}`;
  const prog = (el, a = 1, b = 0.3) => { const r = el.getBoundingClientRect(); return clamp((innerHeight * a - r.top) / (innerHeight * (a - b) + r.height * 0.0001 + 1)); };
  let spin = 0, lastY = scrollY;
  function update() {
    const y = scrollY, dy = y - lastY; lastY = y;
    headerTheme();
    paintHero(y);
    courts.forEach((c, i) => { const r = c.svg.getBoundingClientRect(), off = innerWidth > 980 ? i * 0.1 : 0; paintCourt(c, ease(clamp((innerHeight * (1 - off) - r.top) / (innerHeight * 0.6)))); });
    spin += dy * 0.12;
    caps.forEach((s, i) => (s.style.transform = `rotate(${(spin * (i % 2 ? -1 : 1)).toFixed(2)}deg)`));
    tl.style.transform = `scaleX(${prog(tl, 0.95, 0.35).toFixed(3)})`;
    // gallery
    const gr = gal.getBoundingClientRect(), gspan = gr.height - innerHeight, gp = gspan > 0 ? clamp(-gr.top / gspan) : 0;
    const max = Math.max(0, gTrack.scrollWidth - innerWidth);
    gTrack.style.transform = `translate3d(${(-max * gp).toFixed(1)}px,0,0)`;
    const figs = gTrack.children.length; gNum.textContent = String(Math.min(figs, 1 + Math.floor(gp * figs * 0.999))).padStart(2, '0');
    // route + pin
    const rp = ease(prog(route.ownerSVGElement, 0.95, 0.3));
    route.style.strokeDashoffset = (routeL * (1 - rp)).toFixed(1);
    pin.setAttribute('transform', `translate(452 250) scale(${(0.6 + 0.4 * clamp((rp - 0.85) / 0.15)).toFixed(3)})`);
    pin.style.opacity = clamp((rp - 0.7) / 0.3).toFixed(2);
    seal.style.transform = `rotate(${(y * 0.04).toFixed(2)}deg)`;
  }
  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();

  // ---------- dev contract ----------
  Promise.race([dataReady, new Promise(r => setTimeout(r, 2500))]).then(() => {
    MotionEngine.ready(() => {
      if (MotionEngine.JUMP !== null) { $$('.rv').forEach(n => n.classList.add('in')); runRating(); }
      lastY = scrollY; update();
    });
  });
})();
