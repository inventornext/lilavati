"""Check the site's content before you push.

Run from the repo root:   python tools/validate.py

It checks that every verse in data/manifest.json exists, has all required
fields, that its figure and code files exist, and that each Python script
runs and prints the verse's answer.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = ["id", "number", "title", "meter", "devanagari", "iast", "translation",
            "words", "grammar", "question", "answer", "unit", "solution"]
WORD_FIELDS = ["sanskrit", "iast", "meaning"]

errors, warnings = [], []


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errors.append(f"{path.relative_to(ROOT)}: invalid JSON ({e})")
    except FileNotFoundError:
        errors.append(f"{path.relative_to(ROOT)}: file not found")
    return None


manifest = load(ROOT / "data" / "manifest.json") or {"verses": []}
seen_ids = set()

for name in manifest["verses"]:
    path = ROOT / "data" / "verses" / f"{name}.json"
    v = load(path)
    if v is None:
        continue
    tag = f"{name}:"
    for f in REQUIRED:
        if f not in v:
            errors.append(f"{tag} missing field '{f}'")
    if v.get("id") in seen_ids:
        errors.append(f"{tag} duplicate id '{v.get('id')}'")
    seen_ids.add(v.get("id"))
    if len(v.get("devanagari", [])) != len(v.get("iast", [])):
        warnings.append(f"{tag} devanagari and iast have different line counts")
    for i, w in enumerate(v.get("words", []), 1):
        for f in WORD_FIELDS:
            if not w.get(f):
                errors.append(f"{tag} word {i} missing '{f}'")
    if not isinstance(v.get("answer"), (int, float)):
        errors.append(f"{tag} answer must be a number")
    for key in ("figure", "code"):
        if v.get(key) and not (ROOT / v[key]).exists():
            errors.append(f"{tag} {key} file '{v[key]}' not found")
    if v.get("code") and (ROOT / v["code"]).exists():
        r = subprocess.run([sys.executable, str(ROOT / v["code"])],
                           capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            errors.append(f"{tag} {v['code']} crashed:\n{r.stderr.strip()}")
        elif isinstance(v.get("answer"), (int, float)):
            a = v["answer"]
            forms = {str(a), str(float(a))} | ({str(int(a))} if float(a).is_integer() else set())
            if not any(f in r.stdout for f in forms):
                warnings.append(f"{tag} script output does not show the answer {a}")

load(ROOT / "data" / "vocab.json")

# Collections: stotras and the Aryabhatiya (puzzle fields optional)
COLL_REQUIRED = ["id", "number", "title", "meter", "devanagari", "iast",
                 "translation", "words", "grammar"]
n_coll = 0
cindex = load(ROOT / "data" / "collections.json") or {"collections": []}
for cid in cindex["collections"]:
    cmeta = load(ROOT / "data" / "collections" / cid / "manifest.json")
    if not cmeta:
        continue
    for name in cmeta["verses"]:
        v = load(ROOT / "data" / "collections" / cid / "verses" / f"{name}.json")
        if v is None:
            continue
        n_coll += 1
        tag = f"{cid}/{name}:"
        for f in COLL_REQUIRED:
            if f not in v:
                errors.append(f"{tag} missing field '{f}'")
        if v.get("id") in seen_ids:
            errors.append(f"{tag} duplicate id '{v.get('id')}'")
        seen_ids.add(v.get("id"))
        if len(v.get("devanagari", [])) != len(v.get("iast", [])):
            warnings.append(f"{tag} devanagari and iast line counts differ")
        for i, w in enumerate(v.get("words", []), 1):
            for f in WORD_FIELDS:
                if not w.get(f):
                    errors.append(f"{tag} word {i} missing '{f}'")
        for key in ("figure", "code"):
            if v.get(key) and not (ROOT / v[key]).exists():
                errors.append(f"{tag} {key} file '{v[key]}' not found")
        if v.get("code") and (ROOT / v["code"]).exists():
            r = subprocess.run([sys.executable, str(ROOT / v["code"])], capture_output=True, text=True, timeout=30)
            if r.returncode != 0:
                errors.append(f"{tag} {v['code']} crashed:\n{r.stderr.strip()}")

load(ROOT / "data" / "grammar.json")

for w in warnings:
    print("WARNING:", w)
for e in errors:
    print("ERROR:", e)
if errors:
    sys.exit(1)
print(f"OK: {len(manifest['verses'])} Lilavati verses and {n_coll} collection verses checked.")
