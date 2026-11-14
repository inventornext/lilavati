# Lilavati Puzzles · लीलावती

Learn Sanskrit through Bhaskaracharya's *Līlāvatī* (1150 CE). Each verse has the original text, a meter scanner, word cards, English and Hindi translations, grammar notes, a puzzle with a worked solution, and a Python check. The site also has flashcards, a Sanskrit glossary of electrical engineering terms (Vidyut Shabdakosh) and a science word bank.

**Live site:** https://inventornext.github.io/lilavati/

## Pages

| Link | Page |
|---|---|
| `#` | Home: all verses, progress |
| `#peacock` (any verse id) | One verse, with previous/next buttons |
| `#tandava` | Shiva Tāṇḍava Stotram: full text for recitation |
| `#tandava-1` … `#tandava-17` | One stotra verse with meaning, grammar and meter |
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
data/stotra/            Shiva Tāṇḍava Stotram: manifest.json + verses/01.json … 17.json
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

## Shiva Tāṇḍava Stotram

Each verse is a file in `data/stotra/verses/`, with the same fields as a Lilavati verse but no puzzle (`question`, `answer`, `figure`, `code` are left out). To fix a reading, edit the `devanagari` and `iast` lines; the meter scanner will flag any line that no longer scans. To add your recitation, save `audio/tandava-01.mp3` and add `"audio": "audio/tandava-01.mp3"` to `01.json`.

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
