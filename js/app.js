// Shlokashala: a small single-page site driven by the files in data/.
// Pages: #  (home) · #<lilavati verse id> · #stotras · #<collection id> · #<collection id>-<n>
//        #flashcards · #quiz · #shabdakosh · #words · #about
// To add content you edit data/ only. See README.md.

const DEVA_DIGITS = '०१२३४५६७८९';
const toDeva = n => String(n).replace(/\d/g, d => DEVA_DIGITS[d]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- small storage helpers (work even if storage is blocked) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const prefs = { lang: store.get('lp-lang', 'en'), motion: store.get('lp-motion', true) };
const solved = new Set(store.get('lp-solved', []));
const known = new Set(store.get('lp-known', []));

const DATA = { verses: [], vocab: [], shabda: { intro: '', terms: [] }, collections: [] };
const coll = id => DATA.collections.find(c => c.meta.id === id);

async function getJSON(p) { const r = await fetch(p); if (!r.ok) throw new Error(`Could not load ${p} (${r.status})`); return r.json(); }
async function getText(p) { const r = await fetch(p); if (!r.ok) throw new Error(`Could not load ${p} (${r.status})`); return r.text(); }
async function withExtras(v) {
  const [figure, code] = await Promise.all([
    v.figure ? getText(v.figure).catch(() => '') : '',
    v.code ? getText(v.code).catch(() => '') : ''
  ]);
  return { ...v, figureSvg: figure, codeText: code };
}

async function loadAll() {
  const { verses } = await getJSON('data/manifest.json');
  DATA.verses = await Promise.all(verses.map(async n => withExtras(await getJSON(`data/verses/${n}.json`))));
  DATA.vocab = (await getJSON('data/vocab.json')).words;
  DATA.shabda = await getJSON('data/shabdakosh.json').catch(() => ({ intro: '', terms: [] }));
  DATA.raghava = await getJSON('data/special/raghava-yadaviyam.json').catch(() => null);
  const { collections } = await getJSON('data/collections.json').catch(() => ({ collections: [] }));
  DATA.collections = await Promise.all(collections.map(async id => {
    const meta = await getJSON(`data/collections/${id}/manifest.json`);
    const vs = await Promise.all(meta.verses.map(async n => withExtras(await getJSON(`data/collections/${id}/verses/${n}.json`))));
    return { meta, verses: vs };
  }));
}

// every verse on the site, with where it belongs
function everyVerse() {
  const out = DATA.verses.map(v => ({ v, where: 'Lilavati', href: `#${v.id}` }));
  DATA.collections.forEach(c => c.verses.forEach(v => out.push({ v, where: c.meta.title, href: `#${v.id}` })));
  return out;
}

// ---------- decorative mandala ----------
function mandala() {
  let petals = '', small = '';
  for (let i = 0; i < 16; i++) petals += `<ellipse cx="300" cy="150" rx="26" ry="92" transform="rotate(${i * 22.5} 300 300)"/>`;
  for (let i = 0; i < 32; i++) small += `<circle cx="300" cy="28" r="6" transform="rotate(${i * 11.25} 300 300)"/>`;
  return `<svg class="mandala" viewBox="0 0 600 600" aria-hidden="true" fill="none" stroke="var(--gold)" stroke-width="1" opacity=".6">
    <circle cx="300" cy="300" r="280"/><circle cx="300" cy="300" r="250"/><circle cx="300" cy="300" r="70"/><circle cx="300" cy="300" r="40"/>
    <g opacity=".7">${petals}</g><g fill="var(--gold-soft)">${small}</g></svg>`;
}

// ---------- home ----------
function dailyVerse() {
  const all = everyVerse();
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  return all[day % all.length];
}
// ---------- days practised and streak ----------
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function markPractice() {
  const days = store.get('lp-days', []); const t = todayKey();
  if (!days.includes(t)) { days.push(t); store.set('lp-days', days.slice(-400)); }
}
function streak() {
  const days = new Set(store.get('lp-days', []));
  const d = new Date(); if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0; while (days.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const pathCount = () => Object.values(store.get('lp-paths', {})).reduce((a, b) => a + b, 0);

// ---------- greeting, day of the week and festivals ----------
function greeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return 'सुप्रभातम् · Good morning';
  if (h >= 12 && h < 17) return 'नमस्ते · Good afternoon';
  if (h >= 17 && h < 21) return 'शुभसन्ध्या · Good evening';
  return 'शुभरात्रिः · Good night';
}
// dates for India; small differences between panchangs are covered by the windows
const FESTIVALS = [
  { from: '2026-12-13', to: '2026-12-20', name: 'Gita Jayanti', deva: 'गीता जयन्ती', when: '20 December', ids: ['gita-12', 'gita-15'] },
  { from: '2027-02-27', to: '2027-03-06', name: 'Maha Shivaratri', deva: 'महाशिवरात्रि', when: '5 or 6 March (check your panchang)', ids: ['tandava', 'rudrashtakam', 'lingashtakam'] },
  { from: '2027-04-07', to: '2027-04-14', name: 'Chaitra Navratri', deva: 'चैत्र नवरात्रि', when: '7 to 15 April', ids: ['argala', 'devi-stuti'] },
  { from: '2027-04-15', to: '2027-04-15', name: 'Ram Navami', deva: 'रामनवमी', when: 'today', ids: ['hanuman-chalisa'] },
  { from: '2027-04-16', to: '2027-04-20', name: 'Hanuman Jayanti', deva: 'हनुमान जयन्ती', when: '20 April', ids: ['hanuman-chalisa'] },
  { from: '2027-10-01', to: '2027-10-10', name: 'Sharad Navratri', deva: 'शारदीय नवरात्रि', when: 'from 1 October', ids: ['argala', 'devi-stuti'] },
  { from: '2027-12-02', to: '2027-12-09', name: 'Gita Jayanti', deva: 'गीता जयन्ती', when: '9 December', ids: ['gita-12', 'gita-15'] }
];
const WEEKDAY = [
  { day: 'Sunday', deva: 'रविवार', why: 'the day of Surya, the sun', ids: ['rigveda'] },
  { day: 'Monday', deva: 'सोमवार', why: 'Shiva’s day', ids: ['tandava', 'rudrashtakam', 'lingashtakam'] },
  { day: 'Tuesday', deva: 'मंगलवार', why: 'Hanuman’s day', ids: ['hanuman-chalisa'] },
  { day: 'Wednesday', deva: 'बुधवार', why: 'the day of Budha, for learning', ids: ['yajurveda', 'mandukya'] },
  { day: 'Thursday', deva: 'गुरुवार', why: 'the Guru’s day', ids: ['gita-12', 'gita-15'] },
  { day: 'Friday', deva: 'शुक्रवार', why: 'the Goddess’s day', ids: ['argala', 'devi-stuti'] },
  { day: 'Saturday', deva: 'शनिवार', why: 'Hanuman’s day', ids: ['hanuman-chalisa'] }
];
function todaysPick() {
  const t = todayKey();
  const f = FESTIVALS.find(f => t >= f.from && t <= f.to);
  if (f) return { kicker: `${f.deva} · ${f.name}${f.when === 'today' ? ' is today' : ', ' + f.when}`, ids: f.ids, festival: true };
  const w = WEEKDAY[new Date().getDay()];
  return { kicker: `आज ${w.deva} · ${w.day}, ${w.why}`, ids: w.ids, festival: false };
}

// ---------- the list of all texts, grouped ----------
const GROUPS = [
  { g: 'Veda', head: 'वेद · Veda', sub: 'The famous suktas and mantras of the four Vedas.' },
  { g: 'Hanuman', head: 'हनुमान · Hanuman', sub: 'Tulsidas’s Hanuman Chalisa, for Tuesdays and Saturdays.' },
  { g: 'Bhagavad Gita', head: 'भगवद्गीता · Bhagavad Gita', sub: 'Krishna’s teaching to Arjuna, chapter by chapter.' },
  { g: 'Shiva', head: 'शिव · Shiva', sub: 'Hymns to Shiva, from Ravana’s thundering Tandava to Shankara’s meditation on the Self.' },
  { g: 'Durga Saptashati', head: 'देवी · Durga Saptashati', sub: 'The most-recited parts of the Devi Mahatmya.' },
  { g: 'Upanishad', head: 'उपनिषद् · Upanishad', sub: 'Twelve mantras on Om and the four states of the Self.' }
];
function textCard(c) {
  return `<a class="tcard" href="#${c.meta.id}"><div class="tdeva">${c.meta.title_deva}</div><h3>${c.meta.title}</h3><span class="tmeta">${c.verses.length} verses · ${c.meta.author}</span></a>`;
}
function textsList() {
  const st = DATA.collections.filter(c => c.meta.kind === 'stotra');
  const known = GROUPS.map(x => x.g);
  const extra = [...new Set(st.map(c => c.meta.group || 'Stotras'))].filter(g => !known.includes(g)).map(g => ({ g, head: g, sub: '' }));
  const blocks = [...GROUPS, ...extra].map(({ g, head, sub }) => {
    const cs = st.filter(c => (c.meta.group || 'Stotras') === g);
    if (!cs.length) return '';
    return `<section class="tgroup"><h2>${head}</h2><p class="tsub">${sub}</p><div class="tgrid">${cs.map(textCard).join('')}</div></section>`;
  }).join('');
  const arya = coll('aryabhatiya');
  return blocks + `<section class="tgroup"><h2>चित्रकाव्य · Wonder poetry</h2><p class="tsub">Verses that do something magical. Read forward or backward.</p><div class="tgrid">
    <a class="tcard wonder" href="#raghava-yadaviyam"><div class="tdeva">राघवयादवीयम्</div><h3>Raghava Yadaviyam</h3><span class="tmeta">30 verses that read both ways · Venkatadhvari</span></a></div></section>
  <section class="tgroup"><h2>गणित · Ganita</h2><p class="tsub">Mathematics and astronomy in verse, with puzzles to solve.</p><div class="tgrid">
    <a class="tcard" href="#ganita"><div class="tdeva">लीलावती</div><h3>Lilavati</h3><span class="tmeta">${DATA.verses.length} puzzles · Bhaskaracharya</span></a>
    ${arya ? textCard(arya) : ''}</div></section>`;
}

// ---------- search ----------
const plain = s => String(s).replace(/<[^>]+>/g, '').toLowerCase();
const squash = s => String(s).replace(/[\s।॥\-·,.'"!?;:()]/g, '');
let SEARCH = null;
function searchIndex() {
  if (SEARCH) return SEARCH;
  SEARCH = everyVerse().map(x => {
    const dev = x.v.devanagari.join(' ');
    return { ...x, dev, devSq: squash(dev), en: plain([x.v.title, x.where, x.v.number, x.v.translation, x.v.translation_hi || '', x.v.words.map(w => w.sanskrit + ' ' + w.meaning).join(' ')].join(' ')) };
  });
  return SEARCH;
}
function runSearch(q) {
  q = q.trim(); if (q.length < 2) return '';
  const ql0 = q.toLowerCase(), qs = squash(q);
  const ALIAS = { 'गायत्री': 'gayatri', 'मृत्युञ्जय': 'mahamrityunjaya', 'मृत्युंजय': 'mahamrityunjaya', 'गीता': 'gita', 'हनुमान': 'hanuman', 'चालीसा': 'chalisa', 'ताण्डव': 'tandava', 'तांडव': 'tandava', 'नासदीय': 'nasadiya', 'पुरुष': 'purusha', 'भूमि': 'bhumi', 'ईश': 'isha', 'अर्गला': 'argala', 'माण्डूक्य': 'mandukya', 'लीलावती': 'lilavati', 'आर्यभट': 'aryabhata' };
  const alias = Object.keys(ALIAS).find(k => qs.startsWith(squash(k)) || squash(k).startsWith(qs) && qs.length > 2);
  const ql = alias ? ALIAS[alias] : ql0;
  const texts = DATA.collections.filter(c => plain(c.meta.title + ' ' + c.meta.title_deva + ' ' + c.meta.group).includes(ql));
  const hits = searchIndex().filter(x => x.devSq.includes(qs) || x.en.includes(ql) || x.en.includes(ql0))
    .sort((a, b) => (b.devSq.includes(qs) ? 1 : 0) - (a.devSq.includes(qs) ? 1 : 0)).slice(0, 30);
  if (!texts.length && !hits.length) return `<p class="note">Nothing found for “${esc(q)}”. Try a word from the verse, like <span class="dv">शिव</span>, or an English word, like “peace”.</p>`;
  return `${texts.map(c => `<a class="sres text" href="#${c.meta.id}"><span class="sw">${c.meta.title_deva}</span><b>${c.meta.title}</b><span class="sm">Full text · ${c.verses.length} verses</span></a>`).join('')}
    ${hits.map(x => `<a class="sres" href="${x.href}"><span class="sw dv">${esc(x.v.devanagari[0])}</span><b>${x.v.title}</b><span class="sm">${x.where}</span></a>`).join('')}`;
}
function bindSearch() {
  const box = $('#search'), out = $('#search-results'); if (!box) return;
  let t; box.oninput = () => { clearTimeout(t); t = setTimeout(() => { out.innerHTML = runSearch(box.value); }, 120); };
  box.onkeydown = e => { if (e.key === 'Enter') { const a = $('a', out); if (a) location.hash = a.getAttribute('href'); } };
}

// ---------- home ----------
function viewHome() {
  const all = everyVerse();
  const d = dailyVerse();
  const pick = todaysPick();
  const picks = pick.ids.map(coll).filter(Boolean);
  const s = streak(), mala = store.get('lp-mala', {});
  return `
  <section class="hero compact">
    ${mandala()}
    <p class="invocation">${greeting()}</p>
    <h1>श्लोकशाला</h1>
    <p class="sub">Sanskrit verses with their meaning, word by word, in English and Hindi. Read, listen, recite, and count your mala.</p>
    <div class="searchbox"><span aria-hidden="true">🔍</span><input id="search" type="search" placeholder="Search: गायत्री, Hanuman, peace, कर्म…" autocomplete="off" aria-label="Search verses"></div>
    <div id="search-results" class="search-results"></div>
    <div class="stats">
      <span class="stat"><b>${DATA.collections.length + 1}</b> texts</span>
      <span class="stat"><b>${all.length}</b> verses</span>
      <span class="stat">🔥 <b>${s}</b> day${s === 1 ? '' : 's'} streak</span>
    </div>
    <button class="cta install-app" hidden>📲 Install as an app (works offline)</button>
  </section>

  <section class="today${pick.festival ? ' festival' : ''}">
    <div class="kicker">${pick.kicker}</div>
    <div class="today-cards">${picks.map(c => `<a class="pick" href="#${c.meta.id}"><span class="dv">${c.meta.title_deva}</span><small>${c.meta.title} →</small></a>`).join('')}</div>
  </section>

  <div class="home-row">
    <a class="daily" href="${d.href}">
      <div class="kicker">आज का श्लोक · Verse of the day</div>
      <div class="dl">${d.v.devanagari.slice(0, 4).join('<br>')}</div>
      <div class="dt">${d.v.title} · ${d.where} →</div>
    </a>
    <a class="mala-mini" href="#mala">
      <div class="kicker">जप माला · Mala</div>
      <div class="mm-num">${mala.today === todayKey() ? (mala.todayBeads || 0) : 0}</div>
      <div class="dt">beads today · ${mala.rounds || 0} malas in all →</div>
    </a>
  </div>

  <h2 class="section-title center">सर्वे ग्रन्थाः · All texts</h2>
  ${textsList()}

  <div class="grid small-doors">
    <a class="card feature" href="#practice"><div class="big">अभ्यास</div><h3>Practice</h3><p class="note">Flashcards for every word, and a ten-question quiz.</p></a>
    <a class="card feature" href="#learn"><div class="big">ज्ञान</div><h3>Learn</h3><p class="note">Vidyut Shabdakosh, the science word bank, and about this site.</p></a>
  </div>`;
}
function viewTexts() {
  return `<div class="page-head"><div class="page-deva">ग्रन्थाः</div><h1>All texts</h1>
  <p class="section-sub">Each text has a full-text page for recitation, a path mode, and a page for every verse with word meanings and translations.</p></div>
  ${textsList()}`;
}

// ---------- Raghava Yadaviyam: verses that read as Rama's story forward and Krishna's backward ----------
// split a line into syllables (aksharas); spaces and punctuation are dropped
function aksharas(line) {
  const s = line.replace(/[।॥०-९\d]/g, ' ').replace(/ऽ/g, '');
  const re = /[क-हळ]्(?![क-हळ])|(?:[क-हळ]्)*[क-हळ][ािीुूृॄेैोौ]?[ंःँ]?|[अ-औ][ंःँ]?/g;
  const out = [];
  for (const m of s.matchAll(re)) {
    // a dead consonant at the end of a word (देवम्) joins the syllable before it
    if (m[0].endsWith('्') && out.length) out[out.length - 1] += m[0]; else out.push(m[0]);
  }
  return out;
}
const rv = { i: 0, playing: false, timers: [], anims: [], speed: 1, auto: false };
function viewRaghava() {
  const R = DATA.raghava; if (!R) return '<p class="error">Could not load the poem.</p>';
  return `
  <p class="crumbs"><a href="#texts">All texts</a> › Raghava Yadaviyam</p>
  <div class="vhead"><div class="vnum">30 verses that become 60 · ${R.author}</div>
    <h1 class="dv" style="color:var(--accent)">${R.title}</h1>
    <p class="en" style="font-family:var(--serif);font-size:24px;margin:0">${R.title_en}: a poem that reads both ways</p></div>
  <p>Read each verse forward and it tells the story of <b>Rama</b> (राघव). Read the same verse <b>backwards, syllable by syllable</b>, and it becomes a new verse telling the story of <b>Krishna</b> (यादव). Press play: the original stays on top, and its syllables fly down one by one, from the last to the first, to build the reversed verse below.</p>
  <div class="rv-stage" id="rv-stage">
    <div class="rv-box top"><div class="rv-boxlabel"><b class="dv">अनुलोम</b> · original verse, read forward: Rama’s story</div><div id="rv-top"></div></div>
    <div class="rv-mid" id="rv-mid">⇣ take the syllables from the end, one by one ⇣</div>
    <div class="rv-box bottom"><div class="rv-boxlabel"><b class="dv">विलोम</b> · reversed: Krishna’s story</div><div id="rv-bottom"></div></div>
    <div class="rv-final dv" id="rv-final"></div>
    <div class="rv-caption" id="rv-caption"></div>
  </div>
  <div class="rv-controls">
    <button class="pbtn" id="rv-prev" aria-label="Previous verse">⏮</button>
    <button class="pbtn main" id="rv-play" aria-label="Play">▶</button>
    <button class="pbtn" id="rv-next" aria-label="Next verse">⏭</button>
  </div>
  <div class="path-opts">
    <span class="note" id="rv-num"></span>
    <div class="seg" role="group" aria-label="Speed"><button data-rvsp="1.3">Slow</button><button data-rvsp="1">Normal</button><button data-rvsp="0.7">Fast</button></div>
    <label class="note"><input type="checkbox" id="rv-auto"> Play all verses</label>
  </div>
  <div class="block science"><h3>Science link</h3><p>A <b>palindrome</b> reads the same in both directions, like the number 12321. This poem goes further: reversed, each verse is a different, meaningful verse. Nature uses palindromes too: many DNA sites that enzymes cut, such as GAATTC, read the same backwards on the opposite strand.</p></div>
  <h2 class="section-title">All 30 verses</h2>
  <p class="section-sub">Left: अनुलोम, Rama's story. Right: विलोम, the same syllables reversed, Krishna's story. Tap a verse to animate it.</p>
  <div class="rv-list">${R.verses.map((v, i) => `
    <button class="rv-pair" data-rvi="${i}"><span class="rv-n">॥ ${toDeva(v.n)} ॥</span>
      <span class="rv-side dv">${v.fw.join('<br>')}</span><span class="rv-arrow" aria-hidden="true">⇄</span><span class="rv-side dv krishna">${v.bw.join('<br>')}</span></button>`).join('')}</div>
  <p class="note">${R.source} Word meanings will be added once they are checked against a commentary. In a few verses, a vowel or a sandhi letter differs between the two readings, as poets allow at word joins.</p>`;
}
function rvAt(ms, fn) { rv.timers.push(setTimeout(fn, ms * rv.speed)); }
function rvSetup() {
  const v = DATA.raghava.verses[rv.i];
  const lines = v.fw.map(aksharas);
  const n = lines.flat().length;
  // top: the original, one row per line. bottom: empty slots, the reversed lines
  const rev = lines.slice().reverse().map(l => l.slice().reverse());
  let k = 0;
  $('#rv-top').innerHTML = lines.map(l => `<div class="rv-row">${l.map(a => `<span class="rv-t" data-k="${k++}">${a}</span>`).join('')}</div>`).join('');
  let q = 0;
  $('#rv-bottom').innerHTML = rev.map(l => `<div class="rv-row">${l.map(() => `<span class="rv-t slot" data-q="${q++}"></span>`).join('')}</div>`).join('');
  $('#rv-stage').classList.toggle('long', n > 36);
  $('#rv-final').innerHTML = ''; $('#rv-final').classList.remove('show');
  $('#rv-caption').textContent = '';
  $('#rv-mid').classList.remove('on');
  $('#rv-num').textContent = `Verse ${v.n} of ${DATA.raghava.verses.length}`;
  $$('.rv-pair').forEach(p => p.classList.toggle('on', +p.dataset.rvi === rv.i));
  return { v, n };
}
function rvPlay() {
  rvClear(); rv.playing = true; $('#rv-play').textContent = '⏸';
  const { v, n } = rvSetup();
  const src = $$('#rv-top .rv-t'), slots = $$('#rv-bottom .slot'), stage = $('#rv-stage');
  const gap = Math.min(340, 11000 / n), fly = 750, noMotion = document.body.classList.contains('no-motion');
  // 1. read the original once
  src.forEach((t, j) => rvAt(200 + j * 45, () => { t.classList.add('lit'); rvAt(260, () => t.classList.remove('lit')); }));
  const start = 200 + n * 45 + 700;
  rvAt(start - 300, () => $('#rv-mid').classList.add('on'));
  // 2. the last syllable flies first, into the first empty slot below
  slots.forEach((slot, j) => rvAt(start + j * gap, () => {
    const from = src[n - 1 - j];
    from.classList.add('taken');
    if (noMotion) { slot.textContent = from.textContent; slot.classList.add('filled'); return; }
    const sr = stage.getBoundingClientRect(), a = from.getBoundingClientRect(), b = slot.getBoundingClientRect();
    const c = document.createElement('span'); c.className = 'rv-t rv-fly'; c.textContent = from.textContent;
    Object.assign(c.style, { left: (a.left - sr.left) + 'px', top: (a.top - sr.top) + 'px', width: a.width + 'px', height: a.height + 'px' });
    stage.appendChild(c);
    const dx = b.left - a.left, dy = b.top - a.top, side = dx === 0 ? 40 : -Math.sign(dx) * 40;
    const anim = c.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: `translate(${dx * 0.35 + side}px, ${dy * 0.45}px) scale(1.35) rotate(${dx > 0 ? 12 : -12}deg)`, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(1)` }
    ], { duration: fly * rv.speed, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    rv.anims.push(anim);
    anim.onfinish = () => { c.remove(); slot.textContent = from.textContent; slot.classList.add('filled'); };
  }));
  const end = start + n * gap + fly + 400;
  // 3. read the new verse and show it printed
  rvAt(end, () => {
    $('#rv-mid').classList.remove('on');
    src.forEach(t => t.classList.remove('taken'));
    slots.forEach((t, j) => rvAt(j * 45, () => { t.classList.add('lit2'); rvAt(260, () => t.classList.remove('lit2')); }));
  });
  rvAt(end + n * 45 + 400, () => {
    $('#rv-final').innerHTML = v.bw.join('<br>'); $('#rv-final').classList.add('show');
    $('#rv-caption').textContent = 'The same syllables in reverse order: Rama’s verse has become Krishna’s.';
  });
  rvAt(end + n * 45 + 3400, () => {
    if (rv.auto && rv.i < DATA.raghava.verses.length - 1) { rv.i++; rvPlay(); }
    else { rv.playing = false; $('#rv-play').textContent = '↺'; }
  });
}
function rvClear() {
  rv.timers.forEach(clearTimeout); rv.timers = [];
  rv.anims.forEach(a => { try { a.cancel(); } catch {} }); rv.anims = [];
  $$('.rv-fly').forEach(e => e.remove());
}
function bindRaghava() {
  if (!DATA.raghava) return;
  rv.i = 0; rv.playing = false; rvSetup();
  $('#rv-play').onclick = () => { if (rv.playing) { rvClear(); rv.playing = false; $('#rv-play').textContent = '▶'; rvSetup(); } else rvPlay(); };
  $('#rv-prev').onclick = () => { rv.i = Math.max(0, rv.i - 1); rv.playing ? rvPlay() : (rvClear(), rvSetup()); };
  $('#rv-next').onclick = () => { rv.i = Math.min(DATA.raghava.verses.length - 1, rv.i + 1); rv.playing ? rvPlay() : (rvClear(), rvSetup()); };
  $('#rv-auto').onchange = e => { rv.auto = e.target.checked; };
  $$('[data-rvsp]').forEach(b => b.onclick = () => { rv.speed = +b.dataset.rvsp; $$('[data-rvsp]').forEach(x => x.classList.toggle('on', x === b)); });
  $$('[data-rvsp]').forEach(x => x.classList.toggle('on', +x.dataset.rvsp === rv.speed));
  $$('.rv-pair').forEach(p => p.onclick = () => { rv.i = +p.dataset.rvi; $('#rv-stage').scrollIntoView({ behavior: 'smooth', block: 'center' }); rvPlay(); });
}

// ---------- path mode: recite a whole text, line by line ----------
const pathState = { c: null, vi: 0, li: 0, playing: false, timer: null, speed: 1, voice: false, size: store.get('lp-path-size', 1), wake: null, audio: null };
function openPath(c) {
  Object.assign(pathState, { c, vi: 0, li: 0, playing: false });
  let box = $('#path'); if (box) box.remove();
  box = document.createElement('div'); box.id = 'path'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Path mode');
  box.innerHTML = `
    <div class="path-top"><span class="dv">${c.meta.title_deva}</span><span class="path-prog" id="path-prog"></span><button class="icon-btn" id="path-close" aria-label="Close">✕</button></div>
    <div class="path-stage" id="path-stage"></div>
    <div class="path-controls">
      <button class="pbtn" id="path-prev" aria-label="Previous verse">⏮</button>
      <button class="pbtn main" id="path-play" aria-label="Play or pause">▶</button>
      <button class="pbtn" id="path-next" aria-label="Next verse">⏭</button>
    </div>
    <div class="path-opts">
      <div class="seg" role="group" aria-label="Speed"><button data-sp="1.5">Slow</button><button data-sp="1">Normal</button><button data-sp="0.7">Fast</button></div>
      <button class="btn" id="path-voice">🔇 Silent</button>
      <button class="btn" id="path-small" aria-label="Smaller text">A−</button><button class="btn" id="path-big" aria-label="Larger text">A+</button>
    </div>`;
  document.body.appendChild(box); document.body.classList.add('path-open');
  $('#path-close').onclick = closePath;
  $('#path-play').onclick = () => pathState.playing ? pathPause() : pathPlay();
  $('#path-prev').onclick = () => pathGo(pathState.vi - 1);
  $('#path-next').onclick = () => pathGo(pathState.vi + 1);
  $('#path-voice').onclick = () => { pathState.voice = !pathState.voice; $('#path-voice').textContent = pathState.voice ? '🔊 Machine voice' : '🔇 Silent'; if (pathState.playing) { pathPause(); pathPlay(); } };
  $$('[data-sp]', box).forEach(b => b.onclick = () => { pathState.speed = +b.dataset.sp; $$('[data-sp]', box).forEach(x => x.classList.toggle('on', x === b)); });
  $$('[data-sp]', box).forEach(x => x.classList.toggle('on', +x.dataset.sp === pathState.speed));
  $('#path-small').onclick = () => { pathState.size = Math.max(0.7, pathState.size - 0.15); store.set('lp-path-size', pathState.size); drawPath(); };
  $('#path-big').onclick = () => { pathState.size = Math.min(2, pathState.size + 0.15); store.set('lp-path-size', pathState.size); drawPath(); };
  document.addEventListener('keydown', pathKeys);
  drawPath();
}
function pathKeys(e) {
  if (!$('#path')) return;
  if (e.key === 'Escape') closePath();
  else if (e.key === ' ') { e.preventDefault(); pathState.playing ? pathPause() : pathPlay(); }
  else if (e.key === 'ArrowRight') pathGo(pathState.vi + 1);
  else if (e.key === 'ArrowLeft') pathGo(pathState.vi - 1);
}
function closePath() {
  pathPause(); document.removeEventListener('keydown', pathKeys);
  const b = $('#path'); if (b) b.remove(); document.body.classList.remove('path-open');
}
function drawPath() {
  const { c, vi, li } = pathState; const stage = $('#path-stage'); if (!stage) return;
  if (vi >= c.verses.length) {
    stage.innerHTML = `<div class="path-done"><div class="dv big">॥ पाठः सम्पूर्णः ॥</div><p>Path complete. You have recited the ${c.meta.title} <b>${store.get('lp-paths', {})[c.meta.id] || 1}</b> time(s) on this device.</p>
      <p>🔥 ${streak()} day streak</p><button class="btn primary" id="path-again">Recite again</button></div>`;
    $('#path-again').onclick = () => { pathState.vi = 0; pathState.li = 0; drawPath(); pathPlay(); };
    $('#path-prog').textContent = ''; $('#path-play').textContent = '▶'; return;
  }
  const v = c.verses[vi];
  stage.innerHTML = `${vi === 0 && c.meta.opening ? `<p class="path-opening dv">${c.meta.opening}</p>` : ''}
    <div class="path-verse dv" style="font-size:${(pathState.size * 100).toFixed(0)}%">${v.devanagari.map((l, j) => `<div class="pl${j === li && pathState.playing ? ' now' : ''}${j < li && pathState.playing ? ' said' : ''}">${l}</div>`).join('')}</div>
    <div class="path-num dv">॥ ${toDeva(vi + 1)} ॥</div>
    <p class="path-tr">${v.translation}</p>`;
  $('#path-prog').textContent = `${vi + 1} / ${c.verses.length}`;
  const now = $('.pl.now', stage); if (now) now.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function pathGo(i) {
  const was = pathState.playing; pathPause();
  pathState.vi = Math.max(0, Math.min(pathState.c.verses.length - 1, i)); pathState.li = 0; drawPath();
  if (was) pathPlay();
}
async function pathPlay() {
  if (pathState.vi >= pathState.c.verses.length) { pathState.vi = 0; pathState.li = 0; }
  pathState.playing = true; $('#path-play').textContent = '⏸';
  try { if ('wakeLock' in navigator) pathState.wake = await navigator.wakeLock.request('screen'); } catch {}
  pathStep();
}
function pathPause() {
  pathState.playing = false; clearTimeout(pathState.timer);
  window.speechSynthesis && speechSynthesis.cancel();
  if (pathState.audio) { pathState.audio.pause(); pathState.audio = null; }
  try { pathState.wake && pathState.wake.release(); } catch {} pathState.wake = null;
  const p = $('#path-play'); if (p) p.textContent = '▶';
  drawPath();
}
function pathAdvance() {
  if (!pathState.playing) return;
  const v = pathState.c.verses[pathState.vi];
  if (pathState.li < v.devanagari.length - 1) pathState.li++;
  else {
    pathState.vi++; pathState.li = 0;
    if (pathState.vi >= pathState.c.verses.length) { pathFinished(); return; }
  }
  pathStep();
}
function pathFinished() {
  const p = store.get('lp-paths', {}); p[pathState.c.meta.id] = (p[pathState.c.meta.id] || 0) + 1; store.set('lp-paths', p);
  markPractice(); pathState.playing = false; drawPath();
  try { navigator.vibrate && navigator.vibrate([60, 60, 120]); } catch {}
}
function pathStep() {
  if (!pathState.playing) return;
  drawPath();
  const v = pathState.c.verses[pathState.vi], line = v.devanagari[pathState.li];
  // your own recording: play the verse once and move the highlight along by line length
  if (v.audio && pathState.li === 0) {
    const a = new Audio(v.audio); pathState.audio = a;
    const lens = v.devanagari.map(l => l.length), total = lens.reduce((x, y) => x + y, 0);
    a.ontimeupdate = () => { if (!a.duration) return; let t = a.currentTime / a.duration * total, j = 0; while (j < lens.length - 1 && t > lens[j]) { t -= lens[j]; j++; } if (j !== pathState.li) { pathState.li = j; drawPath(); } };
    a.onended = () => { pathState.audio = null; pathState.li = v.devanagari.length - 1; pathAdvance(); };
    a.playbackRate = 1 / pathState.speed; a.play().catch(() => { pathState.audio = null; timedLine(line); });
    return;
  }
  if (v.audio) return;
  const synth = window.speechSynthesis;
  if (pathState.voice && synth) {
    const voices = synth.getVoices();
    const voice = voices.find(x => /^sa/i.test(x.lang)) || voices.find(x => /^hi/i.test(x.lang));
    const u = new SpeechSynthesisUtterance(line.replace(/[।॥]/g, ' '));
    u.lang = voice ? voice.lang : 'hi-IN'; if (voice) u.voice = voice; u.rate = 0.8 / pathState.speed;
    u.onend = () => { pathState.timer = setTimeout(pathAdvance, 250); };
    u.onerror = () => timedLine(line);
    synth.cancel(); synth.speak(u);
  } else timedLine(line);
}
function timedLine(line) {
  const ms = Math.max(1800, line.replace(/[\s।॥]/g, '').length * 170) * pathState.speed;
  pathState.timer = setTimeout(pathAdvance, ms);
}

// ---------- mala (japa counter) ----------
const MANTRAS = [
  { id: 'shiva', deva: 'ॐ नमः शिवाय', en: 'Om Namah Shivaya' },
  { id: 'rama', deva: 'श्रीराम जय राम जय जय राम', en: 'Shri Ram Jay Ram' },
  { id: 'krishna', deva: 'ॐ नमो भगवते वासुदेवाय', en: 'Om Namo Bhagavate Vasudevaya' },
  { id: 'ganesha', deva: 'ॐ गं गणपतये नमः', en: 'Om Gam Ganapataye Namah' },
  { id: 'hanuman', deva: 'ॐ हं हनुमते नमः', en: 'Om Ham Hanumate Namah' },
  { id: 'gayatri', deva: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्', en: 'Gayatri Mantra', href: '#rigveda-1' },
  { id: 'mrityunjaya', deva: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय माऽमृतात्', en: 'Mahamrityunjaya Mantra', href: '#rigveda-2' }
];
function malaState() {
  const m = store.get('lp-mala', {});
  if (m.today !== todayKey()) { m.today = todayKey(); m.todayBeads = 0; m.todayRounds = 0; }
  return Object.assign({ mantra: 'shiva', count: 0, rounds: 0, todayBeads: 0, todayRounds: 0 }, m);
}
function malaSvg(count) {
  let beads = '';
  for (let i = 0; i < 108; i++) {
    const a = Math.PI / 2 + (i + 1) * (Math.PI * 2 / 110);
    const x = 160 + 135 * Math.cos(a), y = 160 + 135 * Math.sin(a);
    beads += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" class="bead${i < count ? ' done' : ''}${i === count ? ' cur' : ''}"/>`;
  }
  return `<svg viewBox="0 0 320 335" class="mala-svg" aria-hidden="true"><circle cx="160" cy="160" r="135" class="thread"/>${beads}
    <circle cx="160" cy="295" r="9" class="sumeru"/><path d="M155 303 L150 326 M160 304 L160 328 M165 303 L170 326" class="tassel"/>
    <text x="160" y="150" class="mala-count">${count}</text><text x="160" y="185" class="mala-of">of 108</text></svg>`;
}
function viewMala() {
  const m = malaState(), mt = MANTRAS.find(x => x.id === m.mantra) || MANTRAS[0];
  return `
  <div class="page-head center"><div class="page-deva">जप माला</div><h1>Mala</h1>
  <p class="section-sub">Choose a mantra, then tap the mala (or press the space bar) once for each repetition. 108 beads make one mala.</p></div>
  <div class="mala-pick"><select id="mala-mantra" aria-label="Mantra">${MANTRAS.map(x => `<option value="${x.id}" ${x.id === mt.id ? 'selected' : ''}>${x.en}</option>`).join('')}</select></div>
  <p class="mala-mantra dv">${mt.deva}</p>
  ${mt.href ? `<p class="center note"><a href="${mt.href}">Meaning of this mantra →</a></p>` : ''}
  <button class="mala-tap" id="mala-tap" aria-label="Count one bead">${malaSvg(m.count)}</button>
  <div class="mala-stats">
    <span class="stat">Today: <b id="ms-today">${m.todayBeads}</b> beads</span>
    <span class="stat">Malas today: <b id="ms-rounds-today">${m.todayRounds}</b></span>
    <span class="stat">All malas: <b id="ms-rounds">${m.rounds}</b></span>
    <span class="stat">🔥 <b id="ms-streak">${streak()}</b> day streak</span>
  </div>
  <div class="mala-actions"><button class="btn" id="mala-undo">↺ Undo one</button><button class="btn" id="mala-reset">Start this mala again</button></div>
  <p class="note center">Paths recited: <b>${pathCount()}</b>. Open any text and tap “Path mode” to recite it line by line.</p>`;
}
function bindMala() {
  const save = m => store.set('lp-mala', m);
  const redraw = m => {
    $('#mala-tap').innerHTML = malaSvg(m.count);
    $('#ms-today').textContent = m.todayBeads; $('#ms-rounds-today').textContent = m.todayRounds; $('#ms-rounds').textContent = m.rounds; $('#ms-streak').textContent = streak();
  };
  const tap = () => {
    const m = malaState(); m.count++; m.todayBeads++;
    let vib = 12;
    if (m.count >= 108) { m.count = 0; m.rounds++; m.todayRounds++; vib = [80, 60, 160]; $('#mala-tap').classList.add('complete'); setTimeout(() => $('#mala-tap')?.classList.remove('complete'), 1200); }
    save(m); markPractice(); redraw(m);
    try { navigator.vibrate && navigator.vibrate(vib); } catch {}
  };
  $('#mala-tap').onclick = tap;
  const key = e => { if (location.hash !== '#mala') { document.removeEventListener('keydown', key); return; } if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } };
  document.addEventListener('keydown', key);
  $('#mala-undo').onclick = () => { const m = malaState(); if (m.count > 0) { m.count--; m.todayBeads = Math.max(0, m.todayBeads - 1); save(m); redraw(m); } };
  $('#mala-reset').onclick = () => { const m = malaState(); m.count = 0; save(m); redraw(m); };
  $('#mala-mantra').onchange = e => { const m = malaState(); m.mantra = e.target.value; save(m); render(); };
}

function viewGanita() {
  const pct = Math.round(100 * DATA.verses.filter(v => solved.has(v.id)).length / DATA.verses.length);
  const arya = coll('aryabhatiya');
  return `
  <div class="page-head"><div class="page-deva">गणित</div><h1>Ganita · Mathematics in verse</h1>
  <p class="section-sub">Each verse is a puzzle: read the Sanskrit, solve it, then open the worked solution and its Python check. Your progress stays on this device.</p></div>
  <h2 class="section-title">लीलावती · Lilavati (Bhaskaracharya, 1150 CE)</h2>
  <div class="progress" aria-label="Progress"><div style="width:${pct}%"></div></div>
  <div class="grid">
    ${DATA.verses.map((v, i) => `
      <a class="card" href="#${v.id}">
        ${solved.has(v.id) ? '<span class="done" title="Solved">✓</span>' : ''}
        <div class="kicker">Verse ${toDeva(i + 1)} · ${i + 1}</div>
        <h3>${v.title}</h3>
        <div class="line1">${v.devanagari[0]}</div>
        <span class="tag">${v.topic || ''}</span>
      </a>`).join('')}
  </div>
  ${arya ? `
  <h2 class="section-title">आर्यभटीयम् · Aryabhatiya (499 CE)</h2>
  <p class="section-sub">${arya.meta.intro} <a href="#aryabhatiya">Read all three verses →</a></p>
  <div class="grid">${arya.verses.map(v => `
    <a class="card" href="#${v.id}">${solved.has(v.id) ? '<span class="done">✓</span>' : ''}<div class="kicker">${v.number}</div><h3>${v.title}</h3><div class="line1">${v.devanagari[0]}</div><span class="tag">${v.topic || ''}</span></a>`).join('')}</div>` : ''}`;
}
function viewPractice() {
  return `
  <div class="page-head"><div class="page-deva">अभ्यास</div><h1>Practice</h1>
  <p class="section-sub">Revise a day after you study a verse. Little and often works best.</p></div>
  <div class="grid">
    <a class="card feature" href="#flashcards"><div class="big">स्मरण</div><h3>Flashcards</h3><p class="note">Every word from every verse, by text or all together. Flip, mark Got it or Again, and track what you know.</p></a>
    <a class="card feature" href="#quiz"><div class="big">परीक्षा</div><h3>Quiz</h3><p class="note">Ten questions on word meanings, both ways. Best score: ${store.get('lp-quiz-best', 0)} / 10.</p></a>
  </div>`;
}
function viewLearn() {
  return `
  <div class="page-head"><div class="page-deva">ज्ञान</div><h1>Learn</h1>
  <p class="section-sub">Reference pages that gather what the verses teach.</p></div>
  <div class="grid">
    <a class="card feature" href="#shabdakosh"><div class="big">विद्युत्</div><h3>Vidyut Shabdakosh</h3><p class="note">Electrical engineering terms built from Sanskrit roots.</p></a>
    <a class="card feature" href="#words"><div class="big">गणित</div><h3>Science word bank</h3><p class="note">Maths words from the verses that are still used today.</p></a>
    <a class="card feature" href="#about"><div class="big">परिचय</div><h3>About</h3><p class="note">About Shlokashala, how to study a verse, and the sources.</p></a>
  </div>`;
}
function collCard(c) {
  return `<a class="card feature" href="#${c.meta.id}"><div class="big">${c.meta.title_deva}</div><h3>${c.meta.title}</h3>
    <p class="note">${c.verses.length} verses · ${c.meta.author || ''}</p></a>`;
}

function translationHTML(v) {
  const en = `<p class="tr">${v.translation}</p>`;
  const hi = v.translation_hi ? `<p class="tr hi">${v.translation_hi}</p>` : '<p class="note">Hindi translation coming soon.</p>';
  return prefs.lang === 'hi' ? hi : prefs.lang === 'both' ? en + hi : en;
}

// ---------- one verse ----------
function viewVerse(v, idx, list, crumb, end) {
  const prev = list[idx - 1], next = list[idx + 1];
  const lines = v.devanagari.map((d, i) => `<div class="l">${d}</div>`).join('');
  return `
  <p class="crumbs"><a href="${crumb.href}">${crumb.label}</a> › ${v.title}</p>
  <div class="vhead">
    <div class="vnum">${v.number}</div>
    <h1>${v.title}</h1>
    ${v.topic ? `<span class="pill">${v.topic}</span>` : ''}
  </div>
  <div class="toolbar">
    <button class="btn" id="listen">${v.audio ? '🔊 Listen' : '🔊 Listen (machine voice)'}</button>
    ${shareButton()}
    <span class="note" id="listen-note"></span>
  </div>
  <div class="shloka">${shlokaMandala()}${lines}</div>


  <div class="block">
    <h2>अर्थ · Meaning
      <span class="seg" role="group" aria-label="Translation language"><button data-lang="en">English</button><button data-lang="hi">हिन्दी</button><button data-lang="both">Both</button></span>
    </h2>
    <div id="tr">${translationHTML(v)}</div>
  </div>

  <div class="block">
    <h2>Word by word <button class="btn ${document.body.classList.contains('selftest') ? 'on' : ''}" id="selftest">Self-test</button></h2>
    <p class="tip">Self-test hides the meanings; tap a card to reveal it.</p>
    <div class="words">${v.words.map(w => `
      <div class="w" tabindex="0"><div class="d">${w.sanskrit}</div><div class="m">${w.meaning}</div></div>`).join('')}
    </div>
  </div>

  ${v.science ? `<div class="block">
    <h2>Science link</h2>
    <ul class="gram">${v.science.map(g => `<li>${g}</li>`).join('')}</ul>
  </div>` : ''}

  ${v.question ? `<div class="block">
    <h2>Your turn</h2>
    <p>${v.question}</p>
    <div class="try">
      <input type="number" step="any" inputmode="decimal" aria-label="Your answer" id="ans">
      <button class="btn primary" id="check">Check</button>
      <button class="btn" id="reveal">Show solution</button>
      <span class="fb" id="fb" aria-live="polite"></span>
    </div>
    <div class="sol" id="sol">
      ${v.figureSvg ? `<div class="figure">${v.figureSvg}</div>` : ''}
      ${v.solution || ''}
      ${v.codeText ? `<div class="codebar"><span>Verify it in Python</span><button class="btn" id="copy">Copy</button></div><pre><code>${esc(v.codeText)}</code></pre>` : ''}
    </div>
  </div>` : ''}

  <nav class="pager">
    ${prev ? `<a href="#${prev.id}"><small>← Previous</small>${prev.title}</a>` : '<span></span>'}
    ${next ? `<a class="next" href="#${next.id}"><small>Next →</small>${next.title}</a>` : `<a class="next" href="${end.href}"><small>Next →</small>${end.label}</a>`}
  </nav>`;
}

function bindVerse(v) {
  const setLang = l => {
    prefs.lang = l; store.set('lp-lang', l);
    $$('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
    $('#tr').innerHTML = translationHTML(v);
  };
  $$('[data-lang]').forEach(b => b.onclick = () => setLang(b.dataset.lang));
  setLang(prefs.lang);
  $$('.w').forEach(c => {
    const t = () => { c.classList.toggle('open'); c.classList.add('revealed'); };
    c.onclick = t;
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } };
  });
  $('#selftest').onclick = e => {
    const on = document.body.classList.toggle('selftest');
    e.currentTarget.classList.toggle('on', on);
    $$('.w.revealed').forEach(w => w.classList.remove('revealed'));
  };
  if (v.question) bindPuzzle(v);
  bindListen(v);
  bindShare(v.id, v.title, `${v.devanagari[0].replace(/[।॥-]/g, '')} ${v.devanagari[1].replace(/[।॥-]/g, '').trim()}`);
}

// ---------- sharing ----------
const siteBase = () => location.href.split('#')[0].replace(/index\.html$/, '');
const shareUrl = id => `${siteBase()}v/${id}.html`;
function shareButton() {
  return `<span class="share-wrap"><button class="btn" id="share">📤 Share</button>
    <span class="share-menu" id="share-menu" hidden>
      <a id="share-wa" target="_blank" rel="noopener">WhatsApp</a>
      <button id="share-copy">Copy link</button>
    </span></span>`;
}
function bindShare(id, title, line) {
  const btn = $('#share'); if (!btn) return;
  const url = shareUrl(id);
  const text = `${line}\n${title} · Shlokashala\n${url}`;
  const menu = $('#share-menu');
  $('#share-wa').href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  btn.onclick = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${title} · Shlokashala`, text: `${line}\n${title}`, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    menu.hidden = !menu.hidden;
  };
  $('#share-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(url); $('#share-copy').textContent = 'Copied'; }
    catch { $('#share-copy').textContent = url; }
    setTimeout(() => { $('#share-copy').textContent = 'Copy link'; }, 1800);
  };
}

// ---------- install as an app ----------
// The button appears only when the browser offers a direct install; one tap installs.
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; showInstall(); });
window.addEventListener('appinstalled', () => { installPrompt = null; showInstall(); });
function showInstall() { $$('.install-app').forEach(b => b.hidden = !installPrompt); }
async function doInstall() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null; showInstall();
}



function bindPuzzle(v) {
  const sol = $('#sol'), fb = $('#fb'), rev = $('#reveal'), inp = $('#ans');
  const tol = v.tolerance ?? 1e-6;
  const check = () => {
    const n = parseFloat(inp.value);
    if (isNaN(n)) { fb.className = 'fb bad'; fb.textContent = 'Enter a number first.'; return; }
    if (Math.abs(n - v.answer) <= tol) {
      fb.className = 'fb ok'; fb.textContent = `साधु! Correct: ${v.answer} ${v.unit || ''}`.trim();
      sol.classList.add('show'); rev.textContent = 'Hide solution';
      solved.add(v.id); store.set('lp-solved', [...solved]);
    } else { fb.className = 'fb bad'; fb.textContent = 'Not quite. Read the verse again and try once more.'; }
  };
  $('#check').onclick = check;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  rev.onclick = () => { const on = sol.classList.toggle('show'); rev.textContent = on ? 'Hide solution' : 'Show solution'; };
  const cp = $('#copy');
  if (cp) cp.onclick = async () => {
    try { await navigator.clipboard.writeText(v.codeText); cp.textContent = 'Copied'; } catch { cp.textContent = 'Select and copy'; }
    setTimeout(() => cp.textContent = 'Copy', 1600);
  };
}

// listen: your own recording if the verse has "audio", otherwise the device voice
function bindListen(v) {
  const btn = $('#listen'), note = $('#listen-note');
  let audio = null;
  btn.onclick = () => {
    if (v.audio) {
      if (!audio) { audio = new Audio(v.audio); audio.onended = () => btn.textContent = '🔊 Listen'; }
      if (audio.paused) { audio.play().catch(() => note.textContent = 'Could not play the recording.'); btn.textContent = '⏸ Pause'; glow(true); audio.onpause = () => glow(false); }
      else { audio.pause(); btn.textContent = '🔊 Listen'; }
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) { note.textContent = 'Speech is not supported in this browser.'; return; }
    if (synth.speaking) { synth.cancel(); btn.textContent = '🔊 Listen (machine voice)'; glow(false); return; }
    const voices = synth.getVoices();
    const voice = voices.find(x => /^sa/i.test(x.lang)) || voices.find(x => /^hi/i.test(x.lang)) || voices.find(x => /^(mr|ne)/i.test(x.lang));
    if (!voice && voices.length) note.textContent = 'No Hindi voice found. Add one in your device’s text-to-speech settings.';
    v.devanagari.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(line.replace(/[।॥-]/g, ' '));
      u.lang = voice ? voice.lang : 'hi-IN'; if (voice) u.voice = voice;
      u.rate = 0.72;
      if (i === v.devanagari.length - 1) u.onend = () => { btn.textContent = '🔊 Listen (machine voice)'; glow(false); };
      synth.speak(u);
    });
    btn.textContent = '⏹ Stop'; glow(true);
  };
}

// ---------- devotional animation ----------
function shlokaMandala() {
  let p = '';
  for (let i = 0; i < 12; i++) p += `<ellipse cx="100" cy="52" rx="10" ry="34" transform="rotate(${i * 30} 100 100)"/>`;
  return `<svg class="shloka-mandala" viewBox="0 0 200 200" aria-hidden="true" fill="none" stroke="var(--gold)" stroke-width=".8">
    <circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="88" stroke-dasharray="2 4"/><circle cx="100" cy="100" r="22"/>${p}</svg>`;
}
function glow(on) { const sh = $('.shloka'); if (sh) sh.classList.toggle('glow', on); }
function petals(on) {
  let box = $('#petals');
  if (!on || !prefs.motion) { if (box) box.remove(); return; }
  if (box) return;
  box = document.createElement('div'); box.id = 'petals'; box.setAttribute('aria-hidden', 'true');
  const colors = ['#f59e0b', '#f97316', '#fbbf24', '#ea580c', '#fcd34d'];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDuration = 9 + Math.random() * 8 + 's, ' + (3 + Math.random() * 3) + 's';
    s.style.animationDelay = -Math.random() * 15 + 's, 0s';
    s.style.background = colors[i % colors.length];
    s.style.transform = `scale(${0.6 + Math.random() * 0.7})`;
    box.appendChild(s);
  }
  document.body.appendChild(box);
}
function applyMotion() {
  document.body.classList.toggle('no-motion', !prefs.motion);
  const t = $('#motion-toggle'); if (t) t.textContent = `Animations: ${prefs.motion ? 'on' : 'off'}`;
}

// ---------- collections (stotras, Aryabhatiya) ----------
function viewCollection(c) {
  const m = c.meta;
  const body = c.verses.map((v, i) => `
    <div class="stotra-verse">
      ${v.devanagari.map((d, j) => `<div class="l">${d}</div>`).join('')}
      <div class="vfoot"><span class="dv">॥ ${toDeva(i + 1)} ॥</span> <a href="#${v.id}">${v.title} · meaning →</a></div>
    </div>`).join('');
  const crumb = m.kind === 'stotra' ? '<a href="#texts">All texts</a>' : '<a href="#ganita">Ganita</a>';
  return `
  <p class="crumbs">${crumb} › ${m.title}</p>
  <div class="vhead">
    <div class="vnum">${c.verses.length} verses · ${m.author || ''}</div>
    <h1 class="dv" style="color:var(--accent)">${m.title_deva}</h1>
    <p class="en" style="font-family:var(--serif);font-size:24px;margin:0">${m.title}</p>
  </div>
  <p>${m.intro}</p>
  <p class="note">${m.note || ''}</p>
  <div class="toolbar">
    <button class="btn primary" id="open-path">▶ Path mode</button>
    <a class="btn" href="#${c.verses[0].id}">Learn verse by verse →</a>
    ${shareButton()}
  </div>
  <div class="shloka stotra">
    ${shlokaMandala()}
    ${m.opening ? `<p class="invocation dv" style="color:var(--gold);margin:0 0 16px">${m.opening}</p>` : ''}
    ${body}
    ${m.closing ? `<p class="invocation dv" style="color:var(--gold);margin:16px 0 0">${m.closing}</p>` : ''}
  </div>`;
}

// ---------- flashcards ----------
const fc = { deck: 'lilavati', dir: 'sa', hideKnown: true, queue: [] };
function allCards() {
  const cards = [];
  DATA.verses.forEach(v => v.words.forEach((w, i) => cards.push({ key: `${v.id}:${i}`, deck: v.id, group: 'lilavati', front: w.sanskrit, back: w.meaning, from: v.title })));
  DATA.collections.forEach(c => c.verses.forEach(v => v.words.forEach((w, i) => cards.push({ key: `${v.id}:${i}`, deck: v.id, group: c.meta.id, front: w.sanskrit, back: w.meaning, from: `${c.meta.title} · ${v.title}` }))));
  DATA.shabda.terms.forEach((t, i) => cards.push({ key: `shabda:${i}`, deck: 'shabda', group: 'shabda', front: t.sanskrit, back: t.english, note: t.root, from: 'Vidyut Shabdakosh' }));
  return cards;
}
const inDeck = c => c.group === fc.deck || c.deck === fc.deck || fc.deck === 'everything';
function buildQueue() {
  let cards = allCards().filter(inDeck);
  if (fc.hideKnown) cards = cards.filter(c => !known.has(c.key));
  fc.queue = shuffle(cards);
}
function viewFlashcards() {
  return `
  <h1 class="section-title">स्मरण · Flashcards</h1>
  <p class="section-sub">Look at the card, say the meaning aloud, then tap to flip. Mark it <b>Got it</b> or <b>Again</b>.</p>
  <div class="fc-controls">
    <select id="fc-deck" aria-label="Deck">
      <option value="everything">Everything</option>
      <optgroup label="Lilavati"><option value="lilavati">All Lilavati words</option>
      ${DATA.verses.map(v => `<option value="${v.id}">${v.title}</option>`).join('')}</optgroup>
      <optgroup label="Stotras and astronomy">${DATA.collections.map(c => `<option value="${c.meta.id}">${c.meta.title}</option>`).join('')}</optgroup>
      <optgroup label="Science"><option value="shabda">Vidyut Shabdakosh</option></optgroup>
    </select>
    <div class="seg" role="group" aria-label="Direction"><button data-dir="sa">Sanskrit → English</button><button data-dir="en">English → Sanskrit</button></div>
    <label class="note"><input type="checkbox" id="fc-hide" ${fc.hideKnown ? 'checked' : ''}> Skip words I know</label>
    <button class="btn" id="fc-reset">Reset progress</button>
  </div>
  <div class="flash" id="flash" tabindex="0" aria-live="polite"><div class="flash-inner"><div class="face front"></div><div class="face back"></div></div></div>
  <div class="fc-actions"><button class="btn big" id="fc-again">↺ Again</button><button class="btn primary big" id="fc-got">✓ Got it</button></div>
  <p class="fc-status" id="fc-status"></p>`;
}
function drawCard() {
  const card = fc.queue[0], flash = $('#flash');
  flash.classList.remove('flipped');
  const total = allCards().filter(inDeck);
  const k = total.filter(c => known.has(c.key)).length;
  $('#fc-status').textContent = `You know ${k} of ${total.length} words in this deck · ${fc.queue.length} left in this round`;
  const [front, back] = $$('.face', flash);
  if (!card) {
    front.innerHTML = `<div class="en-big">उत्तमम्! Well done.</div><div class="small">You have gone through every card in this deck.</div><button class="btn" id="fc-again-all" style="margin-top:14px">Go again</button>`;
    back.innerHTML = '';
    const again = $('#fc-again-all');
    if (again) again.onclick = e => { e.stopPropagation(); fc.hideKnown = false; $('#fc-hide').checked = false; buildQueue(); drawCard(); };
    return;
  }
  const sa = `<div class="big">${card.front}</div>`;
  const en = `<div class="en-big">${card.back}</div>`;
  front.innerHTML = (fc.dir === 'sa' ? sa : en) + `<div class="from">tap to flip</div>`;
  back.innerHTML = (fc.dir === 'sa' ? en : sa) + (card.note ? `<div class="small">${card.note}</div>` : '') + `<div class="from">from: ${card.from}</div>`;
}
function bindFlashcards() {
  $('#fc-deck').value = fc.deck;
  $$('[data-dir]').forEach(b => { b.classList.toggle('on', b.dataset.dir === fc.dir); b.onclick = () => { fc.dir = b.dataset.dir; $$('[data-dir]').forEach(x => x.classList.toggle('on', x === b)); drawCard(); }; });
  $('#fc-deck').onchange = e => { fc.deck = e.target.value; buildQueue(); drawCard(); };
  $('#fc-hide').onchange = e => { fc.hideKnown = e.target.checked; buildQueue(); drawCard(); };
  $('#fc-reset').onclick = () => { known.clear(); store.set('lp-known', []); buildQueue(); drawCard(); };
  const flash = $('#flash');
  flash.onclick = () => flash.classList.toggle('flipped');
  flash.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flash.classList.toggle('flipped'); } };
  $('#fc-got').onclick = () => { const c = fc.queue.shift(); if (c) { known.add(c.key); store.set('lp-known', [...known]); } drawCard(); };
  $('#fc-again').onclick = () => { const c = fc.queue.shift(); if (c) fc.queue.push(c); drawCard(); };
  buildQueue(); drawCard();
}

// ---------- quiz ----------
const quiz = { qs: [], i: 0, score: 0, answered: false };
function makeQuiz() {
  const cards = allCards().filter(c => c.group !== 'shabda' || Math.random() < 0.3);
  const uniqueBy = (arr, f) => [...new Map(arr.map(x => [f(x), x])).values()];
  const pool = uniqueBy(cards, c => c.back);
  const qs = [];
  shuffle(pool.slice()).slice(0, 10).forEach((c, n) => {
    const wrong = shuffle(pool.filter(x => x.back !== c.back && x.front !== c.front)).slice(0, 3);
    if (n % 2 === 0) qs.push({ kind: 'Meaning', prompt: `<div class="qbig dv">${c.front}</div><p>What does this mean?</p>`, options: shuffle([c, ...wrong]).map(x => x.back), answer: c.back, explain: `${c.front} = ${c.back}. From: ${c.from}.` });
    else qs.push({ kind: 'Sanskrit word', prompt: `<div class="qbig">${c.back}</div><p>Which Sanskrit word means this?</p>`, options: shuffle([c, ...wrong]).map(x => x.front), answer: c.front, dv: true, explain: `${c.back} = ${c.front}. From: ${c.from}.` });
  });
  quiz.qs = shuffle(qs).slice(0, 10); quiz.i = 0; quiz.score = 0; quiz.answered = false;
}
function viewQuiz() {
  return `
  <h1 class="section-title">परीक्षा · Quiz</h1>
  <p class="section-sub">Ten questions from every section: word meanings both ways. Best score: <b id="best">${store.get('lp-quiz-best', 0)}</b> / 10</p>
  <div class="block quiz" id="quizbox"></div>`;
}
function drawQuiz() {
  const box = $('#quizbox');
  if (quiz.i >= quiz.qs.length) {
    const best = Math.max(store.get('lp-quiz-best', 0), quiz.score);
    store.set('lp-quiz-best', best); $('#best').textContent = best;
    const msg = quiz.score >= 9 ? 'उत्तमम्! Excellent.' : quiz.score >= 6 ? 'साधु! Well done.' : 'Keep practising with the flashcards.';
    box.innerHTML = `<div class="qbig">${quiz.score} / ${quiz.qs.length}</div><p>${msg}</p><button class="btn primary big" id="again">New quiz</button> <a class="btn big" href="#flashcards">Flashcards</a>`;
    $('#again').onclick = () => { makeQuiz(); drawQuiz(); };
    return;
  }
  const q = quiz.qs[quiz.i];
  quiz.answered = false;
  box.innerHTML = `
    <div class="qhead"><span class="kicker">${q.kind}</span><span class="note">Question ${quiz.i + 1} of ${quiz.qs.length} · Score ${quiz.score}</span></div>
    ${q.prompt}
    <div class="qopts">${q.options.map((o, n) => `<button class="qopt${q.dv ? ' dv' : ''}" data-n="${n}">${o}</button>`).join('')}</div>
    <p class="qfb" id="qfb"></p>`;
  $$('.qopt', box).forEach(b => b.onclick = () => {
    if (quiz.answered) return;
    quiz.answered = true;
    const pick = q.options[+b.dataset.n], ok = pick === q.answer;
    if (ok) quiz.score++;
    $$('.qopt', box).forEach(x => { if (q.options[+x.dataset.n] === q.answer) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    $('#qfb').innerHTML = `<b class="${ok ? 'ok' : 'bad'}">${ok ? 'साधु! Correct.' : 'Not quite.'}</b> ${q.explain} ${q.href ? `<a href="${q.href}">Open the verse →</a>` : ''}
      <br><button class="btn primary" id="next" style="margin-top:12px">${quiz.i + 1 < quiz.qs.length ? 'Next question →' : 'See score'}</button>`;
    $('#next').onclick = () => { quiz.i++; drawQuiz(); };
  });
}

// ---------- shabdakosh, word bank, about ----------
function viewShabda() {
  return `
  <h1 class="section-title">विद्युत् शब्दकोश · Vidyut Shabdakosh</h1>
  <p class="section-sub">${DATA.shabda.intro}</p>
  <input class="search" id="q" placeholder="Search: current, धारा, √वृत्…" aria-label="Search terms">
  <div class="grid" id="terms">${DATA.shabda.terms.map(t => `
    <div class="card term" data-s="${esc((t.sanskrit + ' ' + t.english + ' ' + t.root).toLowerCase())}">
      <div class="big">${t.sanskrit}</div>
      <div class="en">${t.english}</div>
      <div class="root">${t.root}</div>
      ${t.link ? `<div class="link">↳ ${t.link}</div>` : ''}
    </div>`).join('')}</div>`;
}
function bindShabda() {
  $('#q').oninput = e => { const q = e.target.value.trim().toLowerCase(); $$('#terms .term').forEach(c => c.style.display = c.dataset.s.includes(q) ? '' : 'none'); };
}
function viewWords() {
  return `
  <h1 class="section-title">गणित शब्द · Science word bank</h1>
  <p class="section-sub">Maths words from these verses. Many are still used in Hindi and other Indian languages today.</p>
  <div class="block"><table class="vocab">
    <thead><tr><th>Sanskrit</th><th>Meaning in the verses</th><th>Where you see it today</th></tr></thead>
    <tbody>${DATA.vocab.map(w => `<tr><td><span class="dv">${w.sanskrit}</span></td><td>${w.meaning}</td><td>${w.today}</td></tr>`).join('')}</tbody>
  </table></div>`;
}
function viewAbout() {
  return `
  <div class="prose">
    <h1 class="section-title">About Shlokashala</h1>
    <p><b>Shlokashala</b> (श्लोकशाला, 'school of verses') teaches Sanskrit through two kinds of verse: <b>bhakti</b>, from the four Vedas, the Bhagavad Gita and the Hanuman Chalisa to the great stotras to Shiva and the Goddess, and <b>ganita</b>, the mathematics and astronomy of Bhaskaracharya and Aryabhata.</p>
    <h2>Path mode, mala and streak</h2>
    <p>Open any text and tap <b>Path mode</b>: the text plays full screen, one verse at a time, and the line to recite lights up. Use the <a href="#mala">Mala</a> page as a japa counter of 108 beads. Every day you read a verse, finish a path or count your mala adds to your streak. All of this is saved only on your device.</p>
    <p>In 1150 CE, Bhaskaracharya (Bhaskara II) wrote the <i>Lilavati</i>, the arithmetic and geometry volume of his <i>Siddhanta Shiromani</i>. Its problems are written as Sanskrit poetry, often addressed to a young girl named Lilavati. That makes it a perfect textbook for learning the language and the mathematics together.</p>
    <h2>How to study a verse</h2>
    <p>1. Listen to the verse and read it aloud. 2. Work out the meaning from the word cards before you read the translation. 3. For the Lilavati, solve the puzzle yourself, then open the solution. 4. Revise in Flashcards and the Quiz a day later.</p>
    <h2>About the texts</h2>
    <p>Verses follow commonly printed texts. Readings and verse numbers differ slightly between editions, so compare with a printed edition when you study. The peacock problem is Lilavati 152, with its rule in verse 151 (Plofker's translation in Katz, ed., <i>The Mathematics of Egypt, Mesopotamia, China, India, and Islam: A Sourcebook</i>, Princeton, 2007).</p>
    <h2>Use it as an app, even offline</h2>
    <p>Shlokashala works without internet once you have opened it. <b>Android (Chrome):</b> tap <i>Install as an app</i> on the home page, or the ⋮ menu → <i>Add to Home screen</i>. <b>iPhone (Safari):</b> tap the Share button → <i>Add to Home Screen</i>. <b>Computer (Chrome or Edge):</b> click the install icon at the right of the address bar.</p>
    <p><button class="btn primary install-app" hidden>📲 Install as an app</button></p>
    <h2>Further reading</h2>
    <p><a href="https://old.maa.org/node/116870">MAA: Mathematical Treasures, Lilavati of Bhaskara</a><br>
    <a href="https://wolframcloud.com/obj/history-of-mathematics/production/artifacts/lilavati-of-bhaskara-ii">MoMath + Wolfram: Lilavati of Bhaskara II</a></p>
    <h2>Coming next</h2>
    <p>More chapters of the Bhagavad Gita, more of the Durga Saptashati, the Shiva Mahimnah Stotram, more Lilavati verses, and recitations in my own voice.</p>
  </div>`;
}

// ---------- router ----------
function render() {
  const app = $('#app');
  const id = decodeURIComponent(location.hash.slice(1));
  let view = 'home', devotional = false;
  window.speechSynthesis && speechSynthesis.cancel();
  if (typeof rvClear === 'function') rvClear();
  const lIdx = DATA.verses.findIndex(v => v.id === id);
  const c = coll(id);
  const owner = DATA.collections.find(x => x.verses.some(v => v.id === id));
  const T = t => document.title = `${t} · Shlokashala`;
  if (lIdx >= 0) {
    view = 'ganita'; const v = DATA.verses[lIdx];
    app.innerHTML = viewVerse(v, lIdx, DATA.verses, { href: '#ganita', label: 'Ganita · Lilavati' }, { href: '#quiz', label: 'Test yourself in the quiz' });
    bindVerse(v); markPractice(); T(v.title);
  } else if (owner) {
    const i = owner.verses.findIndex(v => v.id === id), v = owner.verses[i];
    devotional = owner.meta.kind === 'stotra'; view = devotional ? 'texts' : 'ganita'; markPractice();
    app.innerHTML = viewVerse(v, i, owner.verses, { href: `#${owner.meta.id}`, label: owner.meta.title }, { href: `#${owner.meta.id}`, label: `Read the full ${owner.meta.title}` });
    bindVerse(v); T(`${v.title} · ${owner.meta.title}`);
  } else if (c) {
    devotional = c.meta.kind === 'stotra'; view = devotional ? 'texts' : 'ganita';
    app.innerHTML = viewCollection(c); bindShare(c.meta.id, c.meta.title, c.meta.title_deva); T(c.meta.title);
    $('#open-path').onclick = () => openPath(c);
  } else if (id === 'texts' || id === 'bhakti' || id === 'stotras') { view = 'texts'; devotional = true; app.innerHTML = viewTexts(); T('All texts'); }
  else if (id === 'raghava-yadaviyam') { view = 'texts'; app.innerHTML = viewRaghava(); bindRaghava(); markPractice(); T('Raghava Yadaviyam'); }
  else if (id === 'mala') { view = 'mala'; devotional = true; app.innerHTML = viewMala(); bindMala(); T('Mala'); }
  else if (id === 'ganita') { view = 'ganita'; app.innerHTML = viewGanita(); T('Ganita'); }
  else if (id === 'practice') { view = 'practice'; app.innerHTML = viewPractice(); T('Practice'); }
  else if (id === 'learn') { view = 'learn'; app.innerHTML = viewLearn(); T('Learn'); }
  else if (id === 'flashcards') { view = 'practice'; app.innerHTML = viewFlashcards(); bindFlashcards(); T('Flashcards'); }
  else if (id === 'quiz') { view = 'practice'; app.innerHTML = viewQuiz(); makeQuiz(); drawQuiz(); T('Quiz'); }
  else if (id === 'shabdakosh') { view = 'learn'; app.innerHTML = viewShabda(); bindShabda(); T('Vidyut Shabdakosh'); }
  else if (id === 'words') { view = 'learn'; app.innerHTML = viewWords(); T('Word bank'); }
  else if (id === 'about') { view = 'learn'; app.innerHTML = viewAbout(); T('About'); }
  else { app.innerHTML = viewHome(); bindSearch(); document.title = 'Shlokashala · श्लोकशाला'; }
  if ($('#path') && !c) closePath();
  $$('#links a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  $$('.install-app').forEach(b => b.onclick = e => { e.preventDefault(); doInstall(); });
  showInstall();
  document.body.classList.toggle('devotional', devotional);
  petals(devotional);
  window.scrollTo(0, 0);
}

function setupTheme() {
  const btn = $('#theme'), root = document.documentElement;
  const icons = { auto: '🌓', light: '☀️', dark: '🌙' };
  const label = { auto: 'Theme: automatic (light by day, dark at night)', light: 'Theme: light', dark: 'Theme: dark' };
  const show = () => { const m = store.get('lp-theme', 'auto'); btn.textContent = icons[m] || '🌓'; btn.title = label[m]; btn.setAttribute('aria-label', label[m]); };
  btn.onclick = () => {
    const order = ['auto', 'light', 'dark'], m = store.get('lp-theme', 'auto');
    const next = order[(order.indexOf(m) + 1) % 3]; store.set('lp-theme', next);
    root.dataset.theme = next === 'auto' ? autoTheme() : next; show();
  };
  show();
  setInterval(() => { if (store.get('lp-theme', 'auto') === 'auto') root.dataset.theme = autoTheme(); }, 5 * 60000);
}
function autoTheme() { const h = new Date().getHours(); return h >= 6 && h < 18 ? 'light' : 'dark'; }

(async function main() {
  setupTheme();
  applyMotion();
  $('#motion-toggle').onclick = e => { e.preventDefault(); prefs.motion = !prefs.motion; store.set('lp-motion', prefs.motion); applyMotion(); render(); };
  try {
    await loadAll();
    window.addEventListener('hashchange', render);
    render();
  } catch (err) {
    $('#app').innerHTML = `<p class="error" style="padding-top:40px">${esc(err.message)}</p>
      <p class="note">If you opened index.html directly from your computer, run <code>python -m http.server</code> in this folder and open http://localhost:8000 instead.</p>`;
  }
})();
