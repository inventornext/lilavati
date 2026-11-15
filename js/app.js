// Lilavati Puzzles: a small single-page site driven by the files in data/.
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
const prefs = { script: store.get('lp-script', 'deva'), lang: store.get('lp-lang', 'en') };
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
  const out = DATA.verses.map(v => ({ v, where: 'Līlāvatī', href: `#${v.id}` }));
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
  const meters = new Set(all.map(x => (Meter.identify(x.v.devanagari) || {}).name).filter(Boolean)).size;
  const pct = Math.round(100 * DATA.verses.filter(v => solved.has(v.id)).length / DATA.verses.length);
  const d = dailyVerse();
  const stotras = DATA.collections.filter(c => c.meta.kind === 'stotra');
  const arya = coll('aryabhatiya');
  return `
  <section class="hero">
    ${mandala()}
    <p class="invocation">॥ श्रीगणेशाय नमः ॥</p>
    <h1>लीलावती</h1>
    <p class="en">Lilavati Puzzles</p>
    <p class="sub">Learn Sanskrit through mathematics, astronomy and the great Shiva stotras. Every verse comes with its words, grammar, meter and translation.</p>
    <div class="stats">
      <span class="stat"><b>${all.length}</b> verses</span>
      <span class="stat"><b>${words}</b> words</span>
      <span class="stat"><b>${meters}</b> meters</span>
      <span class="stat"><b>${DATA.shabda.terms.length}</b> science terms</span>
    </div>
    <a class="cta" href="#${DATA.verses.find(v => !solved.has(v.id))?.id || DATA.verses[0].id}">${solved.size ? 'Continue learning' : 'Start with verse 1'} →</a>
  </section>

  <a class="daily" href="${d.href}">
    <div class="kicker">आज का श्लोक · Verse of the day · ${d.where}</div>
    <div class="dl">${d.v.devanagari.join('<br>')}</div>
    <div class="dt">${d.v.title} →</div>
  </a>

  <h2 class="section-title">लीलावती · The Līlāvatī puzzles</h2>
  <p class="section-sub">Solve each puzzle to tick it off. Your progress stays on this device.</p>
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

  ${stotras.length ? `
  <h2 class="section-title">स्तोत्राणि · Stotras</h2>
  <p class="section-sub">Hymns to Shiva, word by word, with their rhythm shown beat by beat.</p>
  <div class="grid">${stotras.map(collCard).join('')}</div>` : ''}

  ${arya ? `
  <h2 class="section-title">आर्यभटीयम् · Astronomy</h2>
  <p class="section-sub">${arya.meta.intro}</p>
  <div class="grid">${arya.verses.map(v => `
    <a class="card" href="#${v.id}">${solved.has(v.id) ? '<span class="done">✓</span>' : ''}<div class="kicker">${v.number}</div><h3>${v.title}</h3><div class="line1">${v.devanagari[0]}</div><span class="tag">${v.topic || ''}</span></a>`).join('')}</div>` : ''}

  <h2 class="section-title">Practise and explore</h2>
  <div class="grid">
    <a class="card feature" href="#quiz"><div class="big">परीक्षा</div><h3>Quiz</h3><p class="note">Ten quick questions mixing words and meters from every section.</p></a>
    <a class="card feature" href="#flashcards"><div class="big">स्मरण</div><h3>Flashcards</h3><p class="note">Every word from every verse. Flip, test yourself, and track what you know.</p></a>
    <a class="card feature" href="#grammar"><div class="big">व्याकरण</div><h3>Grammar guide</h3><p class="note">Sandhi, cases, verbs, compounds, meters and word numerals in one place.</p></a>
    <a class="card feature" href="#shabdakosh"><div class="big">विद्युत्</div><h3>Vidyut Shabdakosh</h3><p class="note">Electrical engineering terms built from Sanskrit roots.</p></a>
    <a class="card feature" href="#words"><div class="big">गणित</div><h3>Science word bank</h3><p class="note">Maths words from the verses that are still used today.</p></a>
  </div>`;
}
function collCard(c) {
  return `<a class="card feature" href="#${c.meta.id}"><div class="big">${c.meta.title_deva}</div><h3>${c.meta.title}</h3>
    <p class="note">${c.verses.length} verses · ${c.meta.author || ''}</p></a>`;
}

// ---------- meter scanner ----------
function meterBlock(v) {
  const info = Meter.identify(v.devanagari);
  const ref = info && info.pattern;
  const refMorae = ref ? Meter.morae(ref) : null;
  const rows = v.devanagari.map(line => {
    const syl = Meter.scan(line);
    const pat = syl.map(s => s.weight).join('');
    const morae = Meter.morae(pat);
    // two light syllables may stand for one heavy: same mātrās, not an error
    const matraEqual = ref && pat.length !== ref.length && Meter.moraOptions(pat).some(m => Meter.moraOptions(ref).includes(m));
    const chips = syl.map((s, i) => {
      const off = ref && !matraEqual && i < ref.length - 1 && ref[i] !== s.weight ? ' off' : '';
      const gap = !info || info.pattern ? (i > 0 && i % 3 === 0 ? ' gap' : '') : '';
      return `<span class="syl ${s.weight}${gap}${off}"><span class="mk">${s.weight === 'G' ? '—' : '◡'}</span><span class="tx">${s.text}</span></span>`;
    }).join('');
    const extra = matraEqual ? ` · <b>mātrā-equal variant</b> (◡◡ = —, still ${refMorae} mātrās)` : '';
    const ganas = info && info.pattern ? ` · gaṇas: ${Meter.ganas(pat).join(' ')}` : '';
    return `<div class="mline">${chips}</div><div class="ganas">${syl.length} syllables · ${morae} mātrās${ganas}${extra}</div>`;
  }).join('');
  return `
  <div class="block">
    <h2>Meter scanner <span class="meter-result">${info ? `✓ ${info.name}` : 'Meter not recognised'}</span></h2>
    <p class="legend"><b>—</b> guru (heavy, 2 mātrās): a long vowel, or a vowel followed by ं ः or two consonants. <b>◡</b> laghu (light, 1 mātrā): a short vowel followed by at most one consonant. The last syllable of a line may be either. <a href="#grammar">More in the grammar guide →</a></p>
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
  const lines = v.devanagari.map((d, i) => `<div class="l">${d}</div><div class="t">${v.iast[i] || ''}</div>`).join('');
  return `
  <p class="crumbs"><a href="${crumb.href}">${crumb.label}</a> › ${v.title}</p>
  <div class="vhead">
    <div class="vnum">${v.number}</div>
    <h1>${v.title}</h1>
    <span class="pill">${v.meter}</span>${v.topic ? `<span class="pill">${v.topic}</span>` : ''}
  </div>
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Script">
      <button data-script="deva">देवनागरी</button><button data-script="both">Both</button><button data-script="iast">IAST</button>
    </div>
    <button class="btn" id="listen">${v.audio ? '🔊 Listen' : '🔊 Listen (machine voice)'}</button>
    <span class="note" id="listen-note"></span>
  </div>
  <div class="shloka mode-${prefs.script}">${lines}</div>

  ${meterBlock(v)}

  <div class="block">
    <h2>Word by word <button class="btn ${document.body.classList.contains('selftest') ? 'on' : ''}" id="selftest">Self-test</button></h2>
    <p class="tip">Tap a card for its grammar note. Self-test hides the meanings; tap a card to reveal it.</p>
    <div class="words">${v.words.map(w => `
      <div class="w" tabindex="0"><div class="d">${w.sanskrit}</div><div class="i">${w.iast}</div><div class="m">${w.meaning}</div><div class="n">${w.note || ''}</div></div>`).join('')}
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

function bindScript(cls = 'shloka') {
  const setScript = m => {
    prefs.script = m; store.set('lp-script', m);
    $$('[data-script]').forEach(b => b.classList.toggle('on', b.dataset.script === m));
    $('.shloka').className = `${cls} mode-${m}`;
  };
  $$('[data-script]').forEach(b => b.onclick = () => setScript(b.dataset.script));
  setScript(prefs.script);
}

function bindVerse(v) {
  bindScript();
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
      if (audio.paused) { audio.play().catch(() => note.textContent = 'Could not play the recording.'); btn.textContent = '⏸ Pause'; }
      else { audio.pause(); btn.textContent = '🔊 Listen'; }
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) { note.textContent = 'Speech is not supported in this browser.'; return; }
    if (synth.speaking) { synth.cancel(); btn.textContent = '🔊 Listen (machine voice)'; return; }
    const voices = synth.getVoices();
    const voice = voices.find(x => /^sa/i.test(x.lang)) || voices.find(x => /^hi/i.test(x.lang)) || voices.find(x => /^(mr|ne)/i.test(x.lang));
    if (!voice && voices.length) note.textContent = 'No Hindi voice found. Add one in your device’s text-to-speech settings.';
    v.devanagari.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(line.replace(/[।॥-]/g, ' '));
      u.lang = voice ? voice.lang : 'hi-IN'; if (voice) u.voice = voice;
      u.rate = 0.72;
      if (i === v.devanagari.length - 1) u.onend = () => btn.textContent = '🔊 Listen (machine voice)';
      synth.speak(u);
    });
    btn.textContent = '⏹ Stop';
  };
}

// ---------- collections (stotras, Āryabhaṭīya) ----------
function viewStotras() {
  const st = DATA.collections.filter(c => c.meta.kind === 'stotra');
  return `
  <h1 class="section-title">स्तोत्राणि · Stotras</h1>
  <p class="section-sub">Each stotra has a full-text page for recitation and a page for every verse with meanings, grammar, meter and translations.</p>
  <div class="grid">${st.map(c => `<a class="card feature" href="#${c.meta.id}"><div class="big">${c.meta.title_deva}</div><h3>${c.meta.title}</h3>
    <p class="note">${c.meta.intro.replace(/<[^>]+>/g, '').slice(0, 150)}…</p><span class="tag">${c.verses.length} verses · ${c.meta.author}</span></a>`).join('')}</div>`;
}
function viewCollection(c) {
  const m = c.meta;
  const body = c.verses.map((v, i) => `
    <div class="stotra-verse">
      ${v.devanagari.map((d, j) => `<div class="l">${d}</div><div class="t">${v.iast[j] || ''}</div>`).join('')}
      <div class="vfoot"><span class="dv">॥ ${toDeva(i + 1)} ॥</span> <a href="#${v.id}">${v.title} · meaning →</a></div>
    </div>`).join('');
  const crumb = m.kind === 'stotra' ? '<a href="#stotras">Stotras</a>' : '<a href="#">Home</a>';
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
    <div class="seg" role="group" aria-label="Script"><button data-script="deva">देवनागरी</button><button data-script="both">Both</button><button data-script="iast">IAST</button></div>
    <a class="btn primary" href="#${c.verses[0].id}">Learn verse by verse →</a>
  </div>
  <div class="shloka stotra mode-${prefs.script}">
    ${m.opening ? `<p class="invocation dv" style="color:var(--gold);margin:0 0 16px">${m.opening}</p>` : ''}
    ${body}
    ${m.closing ? `<p class="invocation dv" style="color:var(--gold);margin:16px 0 0">${m.closing}</p>` : ''}
  </div>`;
}

// ---------- flashcards ----------
const fc = { deck: 'lilavati', dir: 'sa', hideKnown: true, queue: [] };
function allCards() {
  const cards = [];
  DATA.verses.forEach(v => v.words.forEach((w, i) => cards.push({ key: `${v.id}:${i}`, deck: v.id, group: 'lilavati', front: w.sanskrit, sub: w.iast, back: w.meaning, note: w.note, from: v.title })));
  DATA.collections.forEach(c => c.verses.forEach(v => v.words.forEach((w, i) => cards.push({ key: `${v.id}:${i}`, deck: v.id, group: c.meta.id, front: w.sanskrit, sub: w.iast, back: w.meaning, note: w.note, from: `${c.meta.title} · ${v.title}` }))));
  DATA.shabda.terms.forEach((t, i) => cards.push({ key: `shabda:${i}`, deck: 'shabda', group: 'shabda', front: t.sanskrit, sub: t.iast, back: t.english, note: t.root, from: 'Vidyut Shabdakosh' }));
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
      <optgroup label="Līlāvatī"><option value="lilavati">All Līlāvatī words</option>
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
  const sa = `<div class="big">${card.front}</div><div class="small"><i>${card.sub}</i></div>`;
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
    if (n % 2 === 0) qs.push({ kind: 'Meaning', prompt: `<div class="qbig dv">${c.front}</div><div class="note"><i>${c.sub}</i></div><p>What does this mean?</p>`, options: shuffle([c, ...wrong]).map(x => x.back), answer: c.back, explain: `${c.front} = ${c.back}. From: ${c.from}.` });
    else qs.push({ kind: 'Sanskrit word', prompt: `<div class="qbig">${c.back}</div><p>Which Sanskrit word means this?</p>`, options: shuffle([c, ...wrong]).map(x => x.front), answer: c.front, dv: true, explain: `${c.back} = ${c.front} (${c.sub}). From: ${c.from}.` });
  });
  // meter questions
  const verses = everyVerse().map(x => ({ ...x, m: (Meter.identify(x.v.devanagari) || {}).name })).filter(x => x.m && !x.m.startsWith('Mātrā'));
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
  <input class="search" id="q" placeholder="Search: current, धारा, √vṛt…" aria-label="Search terms">
  <div class="grid" id="terms">${DATA.shabda.terms.map(t => `
    <div class="card term" data-s="${esc((t.sanskrit + ' ' + t.iast + ' ' + t.english + ' ' + t.root).toLowerCase())}">
      <div class="big">${t.sanskrit}</div><div class="note"><i>${t.iast}</i></div>
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
    <tbody>${DATA.vocab.map(w => `<tr><td><span class="dv">${w.sanskrit}</span><br><i class="note">${w.iast}</i></td><td>${w.meaning}</td><td>${w.today}</td></tr>`).join('')}</tbody>
  </table></div>`;
}
function viewAbout() {
  return `
  <div class="prose">
    <h1 class="section-title">About this site</h1>
    <p>In 1150 CE, Bhaskaracharya (Bhāskara II) wrote the <i>Līlāvatī</i>, the arithmetic and geometry volume of his <i>Siddhānta Śiromaṇi</i>. Its problems are written as Sanskrit poetry in classical meters, often addressed to a young girl named Lilavati. That makes it a perfect textbook for learning the language and the mathematics together. The site also includes the astronomy of Āryabhaṭa and four great hymns to Shiva.</p>
    <h2>How to study a verse</h2>
    <p>1. Listen to the verse and read it aloud. 2. Look at the meter scanner and clap the rhythm: long for —, short for ◡. 3. Work out the meaning from the word cards before you read the translation. 4. Solve the puzzle yourself, then open the solution. 5. Revise in Flashcards and the Quiz a day later.</p>
    <h2>About the texts</h2>
    <p>Verses follow commonly printed texts. Readings and verse numbers differ slightly between editions, so compare with a printed edition when you study. Every verse is checked by the meter scanner; where a hymn bends its meter, the verse notes say so. The peacock problem is Līlāvatī 152, with its rule in verse 151 (Plofker's translation in Katz, ed., <i>The Mathematics of Egypt, Mesopotamia, China, India, and Islam: A Sourcebook</i>, Princeton, 2007).</p>
    <h2>Further reading</h2>
    <p><a href="https://old.maa.org/node/116870">MAA: Mathematical Treasures, Lilavati of Bhaskara</a><br>
    <a href="https://wolframcloud.com/obj/history-of-mathematics/production/artifacts/lilavati-of-bhaskara-ii">MoMath + Wolfram: Lilāvatī of Bhāskara II</a></p>
    <h2>Coming next</h2>
    <p>More Līlāvatī verses, the Śiva Mahimnaḥ Stotram, and recitations in my own voice.</p>
  </div>`;
}

// ---------- router ----------
function render() {
  const app = $('#app');
  const id = decodeURIComponent(location.hash.slice(1));
  let view = 'home';
  window.speechSynthesis && speechSynthesis.cancel();
  const lIdx = DATA.verses.findIndex(v => v.id === id);
  const c = coll(id);
  const owner = DATA.collections.find(x => x.verses.some(v => v.id === id));
  if (lIdx >= 0) {
    view = 'home'; const v = DATA.verses[lIdx];
    app.innerHTML = viewVerse(v, lIdx, DATA.verses, { href: '#', label: 'Līlāvatī' }, { href: '#quiz', label: 'Test yourself in the quiz' });
    bindVerse(v); document.title = `${v.title} · Lilavati Puzzles`;
  } else if (owner) {
    const i = owner.verses.findIndex(v => v.id === id), v = owner.verses[i];
    view = owner.meta.kind === 'stotra' ? 'stotras' : owner.meta.id;
    app.innerHTML = viewVerse(v, i, owner.verses, { href: `#${owner.meta.id}`, label: owner.meta.title }, { href: `#${owner.meta.id}`, label: `Read the full ${owner.meta.title}` });
    bindVerse(v); document.title = `${v.title} · ${owner.meta.title}`;
  } else if (c) {
    view = c.meta.kind === 'stotra' ? 'stotras' : c.meta.id;
    app.innerHTML = viewCollection(c); bindScript('shloka stotra'); document.title = `${c.meta.title} · Lilavati Puzzles`;
  } else if (id === 'stotras') { view = id; app.innerHTML = viewStotras(); document.title = 'Stotras · Lilavati Puzzles'; }
  else if (id === 'flashcards') { view = id; app.innerHTML = viewFlashcards(); bindFlashcards(); document.title = 'Flashcards · Lilavati Puzzles'; }
  else if (id === 'quiz') { view = id; app.innerHTML = viewQuiz(); makeQuiz(); drawQuiz(); document.title = 'Quiz · Lilavati Puzzles'; }
  else if (id === 'grammar') { view = id; app.innerHTML = viewGrammar(); bindGrammar(); document.title = 'Grammar guide · Lilavati Puzzles'; }
  else if (id === 'shabdakosh') { view = id; app.innerHTML = viewShabda(); bindShabda(); document.title = 'Vidyut Shabdakosh · Lilavati Puzzles'; }
  else if (id === 'words') { view = id; app.innerHTML = viewWords(); document.title = 'Word bank · Lilavati Puzzles'; }
  else if (id === 'about') { view = id; app.innerHTML = viewAbout(); document.title = 'About · Lilavati Puzzles'; }
  else { app.innerHTML = viewHome(); document.title = 'Lilavati Puzzles · लीलावती'; }
  $$('#links a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
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
  try {
    await loadAll();
    window.addEventListener('hashchange', render);
    render();
  } catch (err) {
    $('#app').innerHTML = `<p class="error" style="padding-top:40px">${esc(err.message)}</p>
      <p class="note">If you opened index.html directly from your computer, run <code>python -m http.server</code> in this folder and open http://localhost:8000 instead.</p>`;
  }
})();
