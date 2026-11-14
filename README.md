# Lilavati Puzzles · लीलावती गणितम्

Learn Sanskrit through Bhaskaracharya's *Līlāvatī* (1150 CE). Each verse comes with the original text, word meanings, grammar notes, a puzzle to try, and a worked solution with a Python check.

**Live site:** https://inventornext.github.io/lilavati/

## Folder layout

```
index.html              page shell (header, intro, footer)
css/style.css           all styling and colours
js/app.js               reads the data and builds the page (no need to edit)
data/manifest.json      which verses appear, and in what order
data/verses/*.json      one file per verse: text, words, grammar, answer, solution
data/vocab.json         the science vocabulary table at the bottom
figures/*.svg           one diagram per verse
code/*.py               one Python check per verse
templates/              blank verse to copy
tools/validate.py       checks everything before you push
```

## Add a new verse (about 5 steps)

1. Copy `templates/verse-template.json` to `data/verses/04-name.json` and fill it in.
2. Add the diagram as `figures/04-name.svg`. Use `var(--ink)`, `var(--saffron)`, `var(--indigo)`, `var(--ok)` and `var(--muted)` as colours so it works in dark mode too. You can skip the figure by deleting the `"figure"` line.
3. Add the Python check as `code/04-name.py`. It should `print` the answer.
4. Add `"04-name"` to the list in `data/manifest.json`.
5. Run the checks, preview, then push:

```bash
python tools/validate.py
python -m http.server 8000     # open http://localhost:8000
git add . && git commit -m "Add verse 4: name" && git push
```

GitHub Pages updates the live site within a minute or two.

## Field guide for a verse file

| Field | What goes in it |
|---|---|
| `id` | short English id, used in the link (`#peacock`) |
| `number` | label above the title, e.g. `Verse 4 · Līlāvatī 54` |
| `meter` | the chandas, e.g. `Meter: Mālinī (15 syllables per line)` |
| `devanagari`, `iast` | the shloka line by line, same number of lines |
| `words` | one entry per word: `sanskrit`, `iast`, `meaning`, `note` |
| `grammar` | list of short notes; HTML allowed (`<b>`, `<span class='dv'>`) |
| `answer`, `tolerance`, `unit` | number the reader must enter, allowed error, unit |
| `solution` | HTML: use `<div class="math">` for steps and `<div class="science">` for the modern link |

## Other common edits

- **Change colours or fonts:** edit the variables at the top of `css/style.css`.
- **Change the intro or footer:** edit `index.html`.
- **Add a vocabulary word:** add an entry to `data/vocab.json`.
- **Reorder verses:** reorder names in `data/manifest.json`.

## Notes

- The page loads its data with `fetch`, so opening `index.html` by double-clicking will not work. Use `python -m http.server` locally.
- Verse texts follow the commonly printed *Līlāvatī*. Check each verse against a printed edition before publishing.
