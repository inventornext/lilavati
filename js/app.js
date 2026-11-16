// Shlokashala: a small single-page site driven by the files in data/.
// Pages: #  (home) · #<lilavati verse id> · #stotras · #<collection id> · #<collection id>-<n>
//        #flashcards · #quiz · #grammar · #shabdakosh · #words · #about
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

const DATA = { verses: [], vocab: [], shabda: { intro: '', terms: [] }, collections: [], grammar: { sections: [] } };
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
  DATA.grammar = await getJSON('data/grammar.json').catch(() => ({ sections: [] }));
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
function viewHome() {
  const all = everyVerse();
  const words = all.reduce((n, x) => n + x.v.words.length, 0);
  const d = dailyVerse();
  const stotras = DATA.collections.filter(c => c.meta.kind === 'stotra');
  const bhaktiVerses = stotras.reduce((n, c) => n + c.verses.length, 0);
  const ganitaVerses = DATA.verses.length + (coll('aryabhatiya')?.verses.length || 0);
  return `
  <section class="hero">
    ${mandala()}
    <p class="invocation">॥ श्रीगणेशाय नमः ॥</p>
    <h1>श्लोकशाला</h1>
    <p class="en">Shlokashala · a school of verses</p>
    <p class="sub">Learn Sanskrit one verse at a time: the great stotras to Shiva and the Goddess, and the poetry of Indian mathematics and astronomy. Every verse comes with its words, grammar, meter and translation.</p>
    <div class="stats">
      <span class="stat"><b>${all.length}</b> verses</span>
      <span class="stat"><b>${words}</b> words</span>
      <span class="stat"><b>${DATA.collections.length + 1}</b> texts</span>
    </div>
    <button class="cta install-app" hidden>📲 Install as an app (works offline)</button>
  </section>

  <a class="daily" href="${d.href}">
    <div class="kicker">आज का श्लोक · Verse of the day · ${d.where}</div>
    <div class="dl">${d.v.devanagari.join('<br>')}</div>
    <div class="dt">${d.v.title} →</div>
  </a>

  <div class="doors">
    <a class="door bhakti" href="#bhakti">
      <div class="door-deva">भक्ति</div>
      <h2>Bhakti</h2>
      <p>Stotras to Shiva and the Goddess: Shiva Tandava, Rudrashtakam, Nirvana Shatkam, Lingashtakam, the Durga Saptashati and the Mandukya Upanishad.</p>
      <span class="door-count">${stotras.length} texts · ${bhaktiVerses} verses →</span>
    </a>
    <a class="door ganita" href="#ganita">
      <div class="door-deva">गणित</div>
      <h2>Ganita</h2>
      <p>Bhaskaracharya's Lilavati puzzles in verse, and Aryabhata's astronomy: π, the turning Earth, the light of the Moon.</p>
      <span class="door-count">${ganitaVerses} verses with puzzles →</span>
    </a>
  </div>

  <div class="grid small-doors">
    <a class="card feature" href="#practice"><div class="big">अभ्यास</div><h3>Practice</h3><p class="note">Flashcards for every word, and a ten-question quiz.</p></a>
    <a class="card feature" href="#learn"><div class="big">व्याकरण</div><h3>Learn</h3><p class="note">Grammar guide, Vidyut Shabdakosh and the science word bank.</p></a>
  </div>`;
}
function viewBhakti() {
  const st = DATA.collections.filter(c => c.meta.kind === 'stotra');
  const groups = [...new Set(st.map(c => c.meta.group || 'Stotras'))];
  const intro = { 'Upanishad': 'Twelve prose mantras on Om and the four states of the Self, the root of Advaita Vedanta.', 'Shiva': 'Hymns to Shiva, from Ravana’s thundering Tandava to Shankara’s meditation on the Self.', 'Durga Saptashati': 'The most-recited parts of the Durga Saptashati (Devi Mahatmya). More chapters will be added over time.' };
  return `
  <div class="page-head"><div class="page-deva">भक्ति</div><h1>Bhakti · Stotras and Upanishad</h1>
  <p class="section-sub">Each stotra has a full-text page for recitation and a page for every verse with meanings, grammar, meter and translations.</p></div>
  ${groups.map(g => `
    <h2 class="section-title">${({ 'Shiva': 'शिव · Shiva', 'Durga Saptashati': 'दुर्गासप्तशती · Durga Saptashati', 'Upanishad': 'उपनिषद् · Upanishad' })[g] || g}</h2>
    <p class="section-sub">${intro[g] || ''}</p>
    <div class="grid">${st.filter(c => (c.meta.group || 'Stotras') === g).map(c => `<a class="card feature" href="#${c.meta.id}"><div class="big">${c.meta.title_deva}</div><h3>${c.meta.title}</h3>
      <p class="note">${c.meta.intro.replace(/<[^>]+>/g, '').slice(0, 140)}…</p><span class="tag">${c.verses.length} verses · ${c.meta.author}</span></a>`).join('')}</div>`).join('')}`;
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
    <a class="card feature" href="#quiz"><div class="big">परीक्षा</div><h3>Quiz</h3><p class="note">Ten questions: word meanings both ways, and naming the meter of a verse. Best score: ${store.get('lp-quiz-best', 0)} / 10.</p></a>
  </div>`;
}
function viewLearn() {
  return `
  <div class="page-head"><div class="page-deva">व्याकरण</div><h1>Learn</h1>
  <p class="section-sub">Reference pages that gather what the verses teach.</p></div>
  <div class="grid">
    <a class="card feature" href="#grammar"><div class="big">व्याकरणम्</div><h3>Grammar guide</h3><p class="note">Sandhi, the eight cases, verb forms, compounds, meters and word numerals, each linked to a verse.</p></a>
    <a class="card feature" href="#shabdakosh"><div class="big">विद्युत्</div><h3>Vidyut Shabdakosh</h3><p class="note">Electrical engineering terms built from Sanskrit roots.</p></a>
    <a class="card feature" href="#words"><div class="big">गणित</div><h3>Science word bank</h3><p class="note">Maths words from the verses that are still used today.</p></a>
    <a class="card feature" href="#about"><div class="big">परिचय</div><h3>About</h3><p class="note">About Shlokashala, how to study a verse, and the sources.</p></a>
  </div>`;
}
function collCard(c) {
  return `<a class="card feature" href="#${c.meta.id}"><div class="big">${c.meta.title_deva}</div><h3>${c.meta.title}</h3>
    <p class="note">${c.verses.length} verses · ${c.meta.author || ''}</p></a>`;
}

// ---------- meter scanner ----------
function meterBlock(v) {
  if (v.meterNote) return `<div class="block"><h2>Meter <span class="meter-result">${v.meter.split(' (')[0]}</span></h2><p class="legend">${v.meterNote} <a href="#grammar">Meters in the grammar guide →</a></p></div>`;
  const info = Meter.identify(v.devanagari);
  const ref = info && info.pattern;
  const refMorae = ref ? Meter.morae(ref) : null;
  const rows = v.devanagari.map(line => {
    const syl = Meter.scan(line);
    const pat = syl.map(s => s.weight).join('');
    const morae = Meter.morae(pat);
    // two light syllables may stand for one heavy: same matras, not an error
    const matraEqual = ref && pat.length !== ref.length && Meter.moraOptions(pat).some(m => Meter.moraOptions(ref).includes(m));
    const chips = syl.map((s, i) => {
      const off = ref && !matraEqual && i < ref.length - 1 && ref[i] !== s.weight ? ' off' : '';
      const gap = !info || info.pattern ? (i > 0 && i % 3 === 0 ? ' gap' : '') : '';
      return `<span class="syl ${s.weight}${gap}${off}"><span class="mk">${s.weight === 'G' ? '—' : '◡'}</span><span class="tx">${s.text}</span></span>`;
    }).join('');
    const extra = matraEqual ? ` · <b>matra-equal variant</b> (◡◡ = —, still ${refMorae} matras)` : '';
    const ganas = info && info.pattern ? ` · ganas: ${Meter.ganas(pat).join(' ')}` : '';
    return `<div class="mline">${chips}</div><div class="ganas">${syl.length} syllables · ${morae} matras${ganas}${extra}</div>`;
  }).join('');
  return `
  <div class="block">
    <h2>Meter scanner <span class="meter-result">${info ? `✓ ${info.name}` : 'Meter not recognised'}</span></h2>
    <p class="legend"><b>—</b> guru (heavy, 2 matras): a long vowel, or a vowel followed by ं ः or two consonants. <b>◡</b> laghu (light, 1 matra): a short vowel followed by at most one consonant. The last syllable of a line may be either. <a href="#grammar">More in the grammar guide →</a></p>
    ${rows}
  </div>`;
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
    <span class="pill">${v.meter}</span>${v.topic ? `<span class="pill">${v.topic}</span>` : ''}
  </div>
  <div class="toolbar">
    <button class="btn" id="listen">${v.audio ? '🔊 Listen' : '🔊 Listen (machine voice)'}</button>
    ${shareButton()}
    <span class="note" id="listen-note"></span>
  </div>
  <div class="shloka">${shlokaMandala()}${lines}</div>

  ${meterBlock(v)}

  <div class="block">
    <h2>Word by word <button class="btn ${document.body.classList.contains('selftest') ? 'on' : ''}" id="selftest">Self-test</button></h2>
    <p class="tip">Tap a card for its grammar note. Self-test hides the meanings; tap a card to reveal it.</p>
    <div class="words">${v.words.map(w => `
      <div class="w" tabindex="0"><div class="d">${w.sanskrit}</div><div class="m">${w.meaning}</div><div class="n">${w.note || ''}</div></div>`).join('')}
    </div>
  </div>

  <div class="block">
    <h2>Translation
      <span class="seg" role="group" aria-label="Translation language"><button data-lang="en">English</button><button data-lang="hi">हिन्दी</button><button data-lang="both">Both</button></span>
    </h2>
    <div id="tr">${translationHTML(v)}</div>
  </div>

  <div class="block">
    <h2>Grammar in this verse</h2>
    <ul class="gram">${v.grammar.map(g => `<li>${g}</li>`).join('')}</ul>
  </div>

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
  const crumb = m.kind === 'stotra' ? '<a href="#bhakti">Bhakti</a>' : '<a href="#ganita">Ganita</a>';
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
    <a class="btn primary" href="#${c.verses[0].id}">Learn verse by verse →</a>
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
  DATA.verses.forEach(v => v.words.forEach((w, i) => cards.push({ key: `${v.id}:${i}`, deck: v.id, group: 'lilavati', front: w.sanskrit, back: w.meaning, note: w.note, from: v.title })));
  DATA.collections.forEach(c => c.verses.forEach(v => v.words.forEach((w, i) => cards.push({ key: `${v.id}:${i}`, deck: v.id, group: c.meta.id, front: w.sanskrit, back: w.meaning, note: w.note, from: `${c.meta.title} · ${v.title}` }))));
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
  back.innerHTML = (fc.dir === 'sa' ? en : sa) + `<div class="small">${card.note || ''}</div><div class="from">from: ${card.from}</div>`;
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
  shuffle(pool.slice()).slice(0, 7).forEach((c, n) => {
    const wrong = shuffle(pool.filter(x => x.back !== c.back && x.front !== c.front)).slice(0, 3);
    if (n % 2 === 0) qs.push({ kind: 'Meaning', prompt: `<div class="qbig dv">${c.front}</div><p>What does this mean?</p>`, options: shuffle([c, ...wrong]).map(x => x.back), answer: c.back, explain: `${c.front} = ${c.back}. From: ${c.from}.` });
    else qs.push({ kind: 'Sanskrit word', prompt: `<div class="qbig">${c.back}</div><p>Which Sanskrit word means this?</p>`, options: shuffle([c, ...wrong]).map(x => x.front), answer: c.front, dv: true, explain: `${c.back} = ${c.front}. From: ${c.from}.` });
  });
  // meter questions
  const verses = everyVerse().map(x => ({ ...x, m: (Meter.identify(x.v.devanagari) || {}).name })).filter(x => x.m && !x.m.startsWith('Matra'));
  const meterNames = [...new Set(verses.map(x => x.m))];
  shuffle(verses).slice(0, 3).forEach(x => {
    const opts = shuffle([x.m, ...shuffle(meterNames.filter(n => n !== x.m)).slice(0, 3)]);
    qs.push({ kind: 'Meter', prompt: `<div class="qline dv">${x.v.devanagari[0]}<br>${x.v.devanagari[1]}</div><p>Which meter is this? <span class="note">(Use the rhythm: count syllables, find light and heavy.)</span></p>`, options: opts, answer: x.m, explain: `This is ${x.v.title} (${x.where}), in ${x.m}.`, href: x.href });
  });
  quiz.qs = shuffle(qs).slice(0, 10); quiz.i = 0; quiz.score = 0; quiz.answered = false;
}
function viewQuiz() {
  return `
  <h1 class="section-title">परीक्षा · Quiz</h1>
  <p class="section-sub">Ten questions from every section: word meanings both ways, and meters. Best score: <b id="best">${store.get('lp-quiz-best', 0)}</b> / 10</p>
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

// ---------- grammar, shabdakosh, word bank, about ----------
function viewGrammar() {
  const g = DATA.grammar;
  return `
  <h1 class="section-title">व्याकरणम् · Grammar guide</h1>
  <p class="section-sub">${g.intro || ''}</p>
  <div class="toc">${g.sections.map(s => `<a href="#grammar" data-jump="${s.id}">${s.title}</a>`).join('')}</div>
  ${g.sections.map(s => `<div class="block prose" id="g-${s.id}"><h2>${s.title}</h2>${s.html}</div>`).join('')}`;
}
function bindGrammar() {
  $$('[data-jump]').forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById('g-' + a.dataset.jump).scrollIntoView({ behavior: 'smooth' }); });
}
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
    <p><b>Shlokashala</b> (श्लोकशाला, 'school of verses') teaches Sanskrit through two kinds of verse: <b>bhakti</b>, the great stotras to Shiva and the Goddess, and <b>ganita</b>, the mathematics and astronomy of Bhaskaracharya and Aryabhata.</p>
    <p>In 1150 CE, Bhaskaracharya (Bhaskara II) wrote the <i>Lilavati</i>, the arithmetic and geometry volume of his <i>Siddhanta Shiromani</i>. Its problems are written as Sanskrit poetry in classical meters, often addressed to a young girl named Lilavati. That makes it a perfect textbook for learning the language and the mathematics together.</p>
    <h2>How to study a verse</h2>
    <p>1. Listen to the verse and read it aloud. 2. Look at the meter scanner and clap the rhythm: long for —, short for ◡. 3. Work out the meaning from the word cards before you read the translation. 4. Solve the puzzle yourself, then open the solution. 5. Revise in Flashcards and the Quiz a day later.</p>
    <h2>About the texts</h2>
    <p>Verses follow commonly printed texts. Readings and verse numbers differ slightly between editions, so compare with a printed edition when you study. Every verse is checked by the meter scanner; where a hymn bends its meter, the verse notes say so. The peacock problem is Lilavati 152, with its rule in verse 151 (Plofker's translation in Katz, ed., <i>The Mathematics of Egypt, Mesopotamia, China, India, and Islam: A Sourcebook</i>, Princeton, 2007).</p>
    <h2>Use it as an app, even offline</h2>
    <p>Shlokashala works without internet once you have opened it. <b>Android (Chrome):</b> tap <i>Install as an app</i> on the home page, or the ⋮ menu → <i>Add to Home screen</i>. <b>iPhone (Safari):</b> tap the Share button → <i>Add to Home Screen</i>. <b>Computer (Chrome or Edge):</b> click the install icon at the right of the address bar.</p>
    <p><button class="btn primary install-app" hidden>📲 Install as an app</button></p>
    <h2>Further reading</h2>
    <p><a href="https://old.maa.org/node/116870">MAA: Mathematical Treasures, Lilavati of Bhaskara</a><br>
    <a href="https://wolframcloud.com/obj/history-of-mathematics/production/artifacts/lilavati-of-bhaskara-ii">MoMath + Wolfram: Lilavati of Bhaskara II</a></p>
    <h2>Coming next</h2>
    <p>More chapters of the Durga Saptashati (Kilakam, Siddha Kunjika), the Shiva Mahimnah Stotram, more Lilavati verses, and recitations in my own voice.</p>
  </div>`;
}

// ---------- router ----------
function render() {
  const app = $('#app');
  const id = decodeURIComponent(location.hash.slice(1));
  let view = 'home', devotional = false;
  window.speechSynthesis && speechSynthesis.cancel();
  const lIdx = DATA.verses.findIndex(v => v.id === id);
  const c = coll(id);
  const owner = DATA.collections.find(x => x.verses.some(v => v.id === id));
  const T = t => document.title = `${t} · Shlokashala`;
  if (lIdx >= 0) {
    view = 'ganita'; const v = DATA.verses[lIdx];
    app.innerHTML = viewVerse(v, lIdx, DATA.verses, { href: '#ganita', label: 'Ganita · Lilavati' }, { href: '#quiz', label: 'Test yourself in the quiz' });
    bindVerse(v); T(v.title);
  } else if (owner) {
    const i = owner.verses.findIndex(v => v.id === id), v = owner.verses[i];
    devotional = owner.meta.kind === 'stotra'; view = devotional ? 'bhakti' : 'ganita';
    app.innerHTML = viewVerse(v, i, owner.verses, { href: `#${owner.meta.id}`, label: owner.meta.title }, { href: `#${owner.meta.id}`, label: `Read the full ${owner.meta.title}` });
    bindVerse(v); T(`${v.title} · ${owner.meta.title}`);
  } else if (c) {
    devotional = c.meta.kind === 'stotra'; view = devotional ? 'bhakti' : 'ganita';
    app.innerHTML = viewCollection(c); bindShare(c.meta.id, c.meta.title, c.meta.title_deva); T(c.meta.title);
  } else if (id === 'bhakti' || id === 'stotras') { view = 'bhakti'; devotional = true; app.innerHTML = viewBhakti(); T('Bhakti'); }
  else if (id === 'ganita') { view = 'ganita'; app.innerHTML = viewGanita(); T('Ganita'); }
  else if (id === 'practice') { view = 'practice'; app.innerHTML = viewPractice(); T('Practice'); }
  else if (id === 'learn') { view = 'learn'; app.innerHTML = viewLearn(); T('Learn'); }
  else if (id === 'flashcards') { view = 'practice'; app.innerHTML = viewFlashcards(); bindFlashcards(); T('Flashcards'); }
  else if (id === 'quiz') { view = 'practice'; app.innerHTML = viewQuiz(); makeQuiz(); drawQuiz(); T('Quiz'); }
  else if (id === 'grammar') { view = 'learn'; app.innerHTML = viewGrammar(); bindGrammar(); T('Grammar guide'); }
  else if (id === 'shabdakosh') { view = 'learn'; app.innerHTML = viewShabda(); bindShabda(); T('Vidyut Shabdakosh'); }
  else if (id === 'words') { view = 'learn'; app.innerHTML = viewWords(); T('Word bank'); }
  else if (id === 'about') { view = 'learn'; app.innerHTML = viewAbout(); T('About'); }
  else { app.innerHTML = viewHome(); document.title = 'Shlokashala · श्लोकशाला'; }
  $$('#links a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  $$('.install-app').forEach(b => b.onclick = e => { e.preventDefault(); doInstall(); });
  showInstall();
  document.body.classList.toggle('devotional', devotional);
  petals(devotional);
  window.scrollTo(0, 0);
}

function setupTheme() {
  $('#theme').onclick = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('lp-theme', root.dataset.theme); } catch {}
  };
}

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
