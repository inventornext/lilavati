# Shlokashala · श्लोकशाला

Shlokashala ('school of verses') teaches Sanskrit through **Bhakti** (stotras to Shiva and the Goddess, including the Durgā Saptaśatī) and **Gaṇita** (Bhaskaracharya's *Līlāvatī* and Āryabhaṭa's astronomy). Each verse has the original text, a meter scanner, word cards, English and Hindi translations, grammar notes, a puzzle with a worked solution, and a Python check. The site also has flashcards, a Sanskrit glossary of electrical engineering terms (Vidyut Shabdakosh) and a science word bank.

**Live site:** https://inventornext.github.io/shlokashala/

## Pages

| Link | Page |
|---|---|
| `#` | Home: verse of the day, Bhakti and Gaṇita |
| `#bhakti` | All stotras, grouped (Shiva, Durgā Saptaśatī) |
| `#ganita` | Līlāvatī puzzles and Āryabhaṭīya, with progress |
| `#practice` | Flashcards and quiz |
| `#learn` | Grammar, Shabdakosh, word bank, about |
| `#peacock` (any verse id) | One verse, with previous/next buttons |
| `#tandava`, `#rudrashtakam`, `#nirvana`, `#lingashtakam` | A stotra's full text for recitation |
| `#aryabhatiya` | Āryabhaṭīya (astronomy) full text |
| `#tandava-1`, `#nirvana-3`, `#aryabhatiya-1` … | One verse of a collection |
| `#quiz` | Ten-question quiz from every section |
| `#grammar` | Grammar guide: sandhi, cases, verbs, compounds, meter, word numerals |
| `#flashcards` | Flashcards for every word, progress saved on the device |
| `#shabdakosh` | Vidyut Shabdakosh, searchable |
| `#words` | Science word bank |
| `#about` | About, how to study, sources |

## Folder layout

```
index.html              page shell: top bar, footer
css/style.css           theme: all colours and fonts are variables at the top
js/app.js               builds every page from data/ (no need to edit)
js/meter.js             Sanskrit meter scanner (laghu/guru, gaṇas, meter name)
data/manifest.json      which verses appear, and in what order
data/verses/*.json      one file per verse
data/shabdakosh.json    electrical engineering terms
data/vocab.json         science word bank
data/collections.json   which collections appear (stotras, Āryabhaṭīya), in order
data/collections/<id>/  one folder per collection: manifest.json + verses/01.json …
data/grammar.json       the grammar guide (HTML in each section)
figures/*.svg           one diagram per verse
code/*.py               one Python check per verse
audio/                  your own recitations (optional)
templates/              blank verse to copy
tools/validate.py       checks everything before you push
```

## Add a new verse

1. Copy `templates/verse-template.json` to `data/verses/08-name.json` and fill it in.
2. Add the diagram as `figures/08-name.svg`. Use the colours `var(--ink)`, `var(--accent)`, `var(--gold)`, `var(--teal)`, `var(--ok)` and `var(--muted)` so it works in both themes. No diagram? Delete the `"figure"` line.
3. Add the Python check as `code/08-name.py`. It should `print` the answer.
4. Add `"08-name"` to `data/manifest.json`.
5. Check, preview, push:

```bash
python tools/build_static.py   # share pages, sitemap
python tools/validate.py
python -m http.server 8000     # open http://localhost:8000
git add . && git commit -m "Add verse 8: name" && git push
```

The meter scanner works automatically. If it shows "Meter not recognised" or red-outlined syllables, there is probably a typo in the Devanagari.

## Field guide for a verse file

| Field | What goes in it |
|---|---|
| `id` | short English id, used in the link (`#peacock`) |
| `number` | label above the title, e.g. `Verse 8 · Fractions` |
| `topic` | maths topic shown on the card, e.g. `Linear equations` |
| `meter` | e.g. `Meter: Mālinī (15 syllables per line)` |
| `devanagari`, `iast` | the shloka line by line, same number of lines |
| `translation`, `translation_hi` | English and Hindi translations; `<b>` allowed |
| `words` | one entry per word: `sanskrit`, `iast`, `meaning`, `note` |
| `grammar` | list of short notes; HTML allowed (`<b>`, `<span class='dv'>`) |
| `question`, `answer`, `tolerance`, `unit` | the puzzle and its numeric answer |
| `solution` | HTML: `<div class="math">` for steps, `<div class="science">` for the modern link |
| `audio` | optional: path to your recording, e.g. `audio/08-name.mp3` |

## Stotras and the Āryabhaṭīya (collections)

Each collection is a folder in `data/collections/`, for example `data/collections/nirvana/`:

- `manifest.json`: `title`, `title_deva`, `author`, `kind` (`stotra` or `science`), `intro`, `note`, `opening`, `closing` and the list of `verses`.
- `verses/01.json` …: same fields as a Lilavati verse. `question`, `answer`, `figure`, `code` are optional (the Āryabhaṭīya verses have them; stotras do not).

**Add a new stotra:** copy a folder such as `data/collections/nirvana/`, edit its manifest and verse files, and add its folder name to `data/collections.json`. It then appears on the home page, the Stotras page, in Flashcards and in the Quiz automatically.

The meter scanner checks every line. Two light syllables may replace one heavy (a mātrā-equal variant); anything else it marks in red, which usually means a typo.

## Your own recitation

Record the verse on your phone, save it as `audio/03-bees.mp3`, and add `"audio": "audio/03-bees.mp3"` to `data/verses/03-bees.json`. Without a recording, the Listen button uses the device's Hindi voice.

## Other edits

- **Colours and fonts:** variables at the top of `css/style.css`.
- **Shabdakosh term:** add an entry to `data/shabdakosh.json` (`sanskrit`, `iast`, `english`, `root`, optional `link`).
- **Word bank:** add an entry to `data/vocab.json`.
- **Reorder verses:** reorder `data/manifest.json`.

## Notes

- The page loads its data with `fetch`, so double-clicking `index.html` will not work. Use `python -m http.server` locally.
- Verse texts follow the commonly printed *Līlāvatī*. Compare with a printed edition before publishing new verses.

## Animation

The diya flame, the slowly turning mandala behind each shloka, the ārti glow while a verse plays, and the marigold petals on Bhakti pages are all in `css/style.css` (search for "devotional animation") and `js/app.js` (`shlokaMandala`, `glow`, `petals`). Visitors can switch them off with "Animations: on/off" in the footer, and they stop automatically for anyone whose device asks for reduced motion.

## Grouping stotras

A stotra's `manifest.json` can have `"group": "Shiva"` or `"group": "Durgā Saptaśatī"`. The Bhakti page shows one section per group, so a new group (for example "Viṣṇu") appears automatically.

## Offline app and sharing

- **Offline:** `sw.js` (the service worker) saves every page and verse on the visitor's device the first time they open the site, so it works without internet. `manifest.webmanifest` and `icons/` make it installable ("Add to Home screen"). When you add a whole new text, change `CACHE = 'shlokashala-vN'` in `sw.js` to the next number, so installed copies download it for offline use. For small edits nothing is needed.
- **Share pages:** `python tools/build_static.py` writes `v/<verse-id>.html` for every verse and every stotra, plus `sitemap.xml`. These give WhatsApp and Google a proper title and description, and the Share button on each verse links to them. **Run it every time you add or change verses**; `tools/validate.py` warns you if you forget.
- **Google:** submit `https://inventornext.github.io/shlokashala/sitemap.xml` in Google Search Console once, so the verse pages get indexed.

## Prose texts

A verse file can have `"meterNote"`: a sentence shown instead of the meter scanner. The Māṇḍūkya Upaniṣad uses it, because its mantras are prose.
