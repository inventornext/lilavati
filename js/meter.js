// Sanskrit meter scanner: splits a Devanagari line into syllables and marks
// each as laghu (L, light) or guru (G, heavy), then names the meter.
(function (root) {
  const IND_SHORT = 'अइउऋऌ', IND_LONG = 'आईऊॠॡएऐओऔ';
  const MATRA_SHORT = 'िुृॢ', MATRA_LONG = 'ाीूॄॣेैोौ';
  const VIRAMA = '्', NUKTA = '़', NASAL = 'ंँ', VISARGA = 'ः';
  const isCons = c => c >= 'क' && c <= 'ह' || 'क़ख़ग़ज़ड़ढ़फ़य़ळ'.includes(c);

  const GANA = { LGG: 'ya', GGG: 'ma', GGL: 'ta', GLG: 'ra', LGL: 'ja', GLL: 'bha', LLL: 'na', LLG: 'sa' };
  const METERS = {
    'Anushtubh': null,
    'Malini': 'LLLLLLGGGLGGLGG',
    'Panchachamara': 'LGLGLGLGLGLGLGLG',
    'Dodhaka': 'GLLGLLGLLGG',
    'Shardulavikridita': 'GGGLLGLGLLLGGGLGGLG',
    'Mandakranta': 'GGGGLLLLLGGLGGLGG',
    'Vasantatilaka': 'GGLGLLLGLLGLGG',
    'Shikharini': 'LGGGGGLLLLLGGLLLG',
    'Sragdhara': 'GGGGLGGLLLLLLGGLGGLGG',
    'Indravajra': 'GGLGGLLGLGG',
    'Upendravajra': 'LGLGGLLGLGG',
    'Vamshastha': 'LGLGGLLGLGLG',
    'Bhujangaprayata': 'LGGLGGLGGLGG',
    'Prithvi': 'LGLLLGLGLLLGLGGLG',
    'Harini': 'LLLLLGGGGLGLLGLLG'
  };

  function scan(line) {
    const chars = [...line.replace(/[\s।॥|ऽ0-9०-९.,;:!?'"()-]/g, '')];
    const syl = [];
    let buf = '', clusterSize = 0;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (isCons(c)) {
        buf += c;
        if (chars[i + 1] === NUKTA) buf += chars[++i];
        if (chars[i + 1] === VIRAMA) {          // consonant with no vowel
          buf += chars[++i];
          clusterSize++;
          continue;
        }
        let long = false;
        const m = chars[i + 1];
        if (m && MATRA_LONG.includes(m)) { long = true; buf += chars[++i]; }
        else if (m && MATRA_SHORT.includes(m)) { buf += chars[++i]; }
        syl.push({ text: buf, long, cluster: clusterSize + 1, coda: false });
        buf = ''; clusterSize = 0;
      } else if (IND_SHORT.includes(c) || IND_LONG.includes(c)) {
        syl.push({ text: buf + c, long: IND_LONG.includes(c), cluster: clusterSize, coda: false });
        buf = ''; clusterSize = 0;
      } else if (NASAL.includes(c) || c === VISARGA) {
        if (syl.length) { syl[syl.length - 1].text += c; syl[syl.length - 1].coda = true; }
      }
    }
    if (buf && syl.length) {                     // line ends in a bare consonant
      syl[syl.length - 1].text += buf;
      syl[syl.length - 1].coda = true;
    }
    syl.forEach((s, i) => {
      const next = syl[i + 1];
      s.weight = (s.long || s.coda || (next && next.cluster >= 2)) ? 'G' : 'L';
    });
    return syl;
  }

  function ganas(pattern) {
    const out = [];
    let i = 0;
    for (; i + 3 <= pattern.length; i += 3) out.push(GANA[pattern.slice(i, i + 3)]);
    for (; i < pattern.length; i++) out.push(pattern[i] === 'G' ? 'ga' : 'la');
    return out;
  }

  const morae = p => [...p].reduce((n, c) => n + (c === 'G' ? 2 : 1), 0);
  // the last syllable of a line may count as heavy
  const moraOptions = p => p.endsWith('L') ? [morae(p), morae(p) + 1] : [morae(p)];

  function identify(lines) {
    const pats = lines.map(l => scan(l).map(s => s.weight).join(''));
    const lens = pats.map(p => p.length);
    // Arya: a matra meter, written here as two half-verses of 30 and 27 matras
    if (pats.length === 2 && moraOptions(pats[0]).includes(30) && moraOptions(pats[1]).includes(27))
      return { name: 'Arya', pattern: null, matras: [30, 27], matches: 2, total: 2 };
    for (const [name, ref] of Object.entries(METERS)) {
      if (!ref) continue;
      // the final syllable of a line may be light or heavy (anceps)
      const ok = pats.filter(p => p.length === ref.length && p.slice(0, -1) === ref.slice(0, -1)).length;
      if (ok >= Math.ceil(pats.length / 2)) return { name, pattern: ref, matches: ok, total: pats.length };
    }
    if (lens.every(n => n === 8) || (lens.length === 2 && lens.every(n => n === 16)))
      return { name: 'Anushtubh', pattern: null, matches: pats.length, total: pats.length };
    // lines with the same number of matras: a matra meter
    const m = moraOptions(pats[0]).find(x => pats.every(p => moraOptions(p).includes(x)));
    if (m) return { name: `Matra meter (${m} matras per line)`, pattern: null, matches: pats.length, total: pats.length };
    return null;
  }

  const api = { scan, ganas, identify, morae, moraOptions, METERS };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Meter = api;
})(this);
