// Lilavati Puzzles: renders every verse listed in data/manifest.json.
// To add a verse you never need to edit this file. See README.md.

const DEVA_DIGITS = '०१२३४५६७८९';
const toDeva = n => String(n).replace(/\d/g, d => DEVA_DIGITS[d]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
  return r.json();
}
async function getText(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
  return r.text();
}

function renderVerse(v, figure, code) {
  const s = document.createElement('section');
  s.className = 'verse';
  s.id = v.id;
  const lines = v.devanagari.map((d, i) =>
    `<div class="l">${d}</div><div class="t">${v.iast[i] || ''}</div>`).join('');
  const words = v.words.map(w => `
    <div class="w" tabindex="0">
      <div class="d">${w.sanskrit}</div><div class="i">${w.iast}</div>
      <div class="m">${w.meaning}</div><div class="n">${w.note || ''}</div>
    </div>`).join('');

  s.innerHTML = `
    <div class="vhead"><div><div class="vnum">${v.number}</div><h2>${v.title}</h2></div><span class="meter">${v.meter}</span></div>
    <div class="shloka mode-${currentScript()}">${lines}</div>
    <h3>Word by word</h3>
    <p class="tip">Tap a card to see its grammar note.</p>
    <div class="words">${words}</div>
    <h3>Translation</h3>
    <p class="tr">${v.translation}</p>
    <h3>Grammar in this verse</h3>
    <ul class="gram">${v.grammar.map(g => `<li>${g}</li>`).join('')}</ul>
    <h3>Your turn</h3>
    <p>${v.question}</p>
    <div class="try">
      <input type="number" step="any" inputmode="decimal" aria-label="Your answer">
      <button class="btn primary chk">Check</button>
      <button class="btn rev">Show solution</button>
      <span class="fb" aria-live="polite"></span>
    </div>
    <div class="sol">
      ${figure ? `<div class="figure">${figure}</div>` : ''}
      ${v.solution}
      ${code ? `<div class="codebar"><span>Verify it in Python</span><button class="btn cp">Copy</button></div>
      <pre><code>${esc(code)}</code></pre>` : ''}
    </div>`;

  const inp = s.querySelector('input'), fb = s.querySelector('.fb');
  const sol = s.querySelector('.sol'), rev = s.querySelector('.rev');
  const tol = v.tolerance ?? 1e-6;
  const check = () => {
    const n = parseFloat(inp.value);
    if (isNaN(n)) { fb.className = 'fb bad'; fb.textContent = 'Enter a number first.'; return; }
    if (Math.abs(n - v.answer) <= tol) {
      fb.className = 'fb ok';
      fb.textContent = `साधु! Correct: ${v.answer} ${v.unit}.`;
      sol.classList.add('show'); rev.textContent = 'Hide solution';
    } else {
      fb.className = 'fb bad';
      fb.textContent = 'Not quite. Read the verse again and try once more.';
    }
  };
  s.querySelector('.chk').onclick = check;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  rev.onclick = () => {
    const on = sol.classList.toggle('show');
    rev.textContent = on ? 'Hide solution' : 'Show solution';
  };
  const cp = s.querySelector('.cp');
  if (cp) cp.onclick = async () => {
    try { await navigator.clipboard.writeText(code); cp.textContent = 'Copied'; }
    catch { cp.textContent = 'Select and copy'; }
    setTimeout(() => cp.textContent = 'Copy', 1600);
  };
  s.querySelectorAll('.w').forEach(c => {
    const t = () => { c.classList.toggle('open'); c.classList.add('revealed'); };
    c.onclick = t;
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } };
  });
  return s;
}

function currentScript() {
  const on = document.querySelector('[data-script].on');
  return on ? on.dataset.script : 'deva';
}

function setupControls() {
  document.querySelectorAll('[data-script]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-script]').forEach(x => x.classList.toggle('on', x === b));
    const m = b.dataset.script;
    document.querySelectorAll('.shloka').forEach(sh => sh.className = 'shloka mode-' + m);
  });
  const st = document.getElementById('selftest');
  st.onclick = () => {
    const on = document.body.classList.toggle('selftest');
    st.classList.toggle('on', on);
    st.textContent = on ? 'Self-test: on' : 'Self-test: hide meanings';
    document.querySelectorAll('.w.revealed').forEach(w => w.classList.remove('revealed'));
  };
}

async function main() {
  setupControls();
  const box = document.getElementById('verses');
  const nav = document.getElementById('nav');
  try {
    const { verses } = await getJSON('data/manifest.json');
    const loaded = await Promise.all(verses.map(async name => {
      const v = await getJSON(`data/verses/${name}.json`);
      const [figure, code] = await Promise.all([
        v.figure ? getText(v.figure) : '',
        v.code ? getText(v.code) : ''
      ]);
      return { v, figure, code };
    }));
    box.innerHTML = '';
    loaded.forEach(({ v, figure, code }, i) => {
      box.appendChild(renderVerse(v, figure, code));
      nav.insertAdjacentHTML('beforeend', `<a href="#${v.id}">${toDeva(i + 1)}. ${v.title}</a>`);
    });
    nav.insertAdjacentHTML('beforeend', `<a href="#vocab">Science vocabulary</a>`);

    const { words } = await getJSON('data/vocab.json');
    document.getElementById('vocab-body').innerHTML = words.map(w =>
      `<tr><td><span class="dv">${w.sanskrit}</span> <i>${w.iast}</i></td><td>${w.meaning}</td><td>${w.today}</td></tr>`).join('');

    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  } catch (err) {
    box.innerHTML = `<p class="fb bad">${esc(err.message)}</p>
      <p class="note">If you opened index.html directly from your computer, run
      <code>python -m http.server</code> in this folder and open http://localhost:8000 instead.</p>`;
  }
}

main();
