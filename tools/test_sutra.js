// Runs every example in data/sutra-examples.json and checks its output.
const Sutra = require('../js/sutra.js');
const { examples } = require('../data/sutra-examples.json');
let bad = 0;
for (const ex of examples) {
  const r = Sutra.run(ex.code);
  const got = r.output.join('\n'), want = ex.expect.join('\n');
  if (!r.ok || got !== want) { bad++; console.log(`FAIL ${ex.id}\n  error: ${r.error}\n  got:  ${got}\n  want: ${want}`); }
}
// error messages
const errs = [['वद x', 'Unknown name'], ['मान अ = [१,२]\nवद अ[५]', 'outside the list'], ['यावत् सत्यम् { }', 'ran too long'], ['वद "abc', 'not closed'], ['यदि १ > ० {\nवद १', 'never closed'], ['वद ५ / ०', 'divide by zero']];
for (const [code, want] of errs) { const r = Sutra.run(code, { maxSteps: 20000 }); if (r.ok || !String(r.error).includes(want)) { bad++; console.log('FAIL error case', JSON.stringify(code), String(r.error)); } }
console.log(bad ? `${bad} problem(s)` : `OK: ${examples.length} examples and ${errs.length} error cases`);
process.exit(bad ? 1 : 0);
