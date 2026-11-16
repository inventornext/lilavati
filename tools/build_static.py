"""Build the shareable pages, sitemap and robots.txt.

Run from the repo root after adding or editing verses:   python tools/build_static.py

For every verse it writes v/<id>.html: a light page with the verse, its
translations and a link into the full site. These pages give WhatsApp,
Facebook and Google a proper title and description for each verse, and
they appear in search results. It also writes sitemap.xml and robots.txt.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://inventornext.github.io/shlokashala/"
OG_IMAGE = BASE + "icons/og-image.jpg"


def load(p):
    return json.loads((ROOT / p).read_text(encoding="utf-8"))


def plain(s, n=None):
    s = re.sub(r"<[^>]+>", "", s or "")
    s = html.unescape(s).strip()
    if n and len(s) > n:
        s = s[: n - 1].rsplit(" ", 1)[0] + "…"
    return s


def page(pid, title, where, desc, body, back_href, back_label):
    t = html.escape(f"{title} · {where} | Shlokashala")
    d = html.escape(desc)
    url = f"{BASE}v/{pid}.html"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Shlokashala">
<meta property="og:title" content="{html.escape(title)} · {html.escape(where)}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="../icons/icon-32.png">
<link rel="apple-touch-icon" href="../icons/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Mukta:wght@400;600&family=Noto+Serif+Devanagari:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/style.css">
</head>
<body>
<div class="topbar"><div class="wrap">
  <a class="brand" href="../"><span class="deva">श्लोकशाला</span><span>Shlokashala</span></a>
</div></div>
<main class="wrap">
  <p class="crumbs"><a href="../{back_href}">{html.escape(back_label)}</a> › {html.escape(title)}</p>
  {body}
</main>
<footer><div class="wrap"><p class="deva">॥ श्लोकशाला ॥</p><p><a href="../">Shlokashala</a> · learn Sanskrit one verse at a time</p></div></footer>
</body>
</html>
"""


def verse_body(v, where, link):
    lines = "".join(f'<div class="l">{d}</div><div class="t">{html.escape(i)}</div>'
                    for d, i in zip(v["devanagari"], v["iast"]))
    hi = f'<p class="tr hi">{v["translation_hi"]}</p>' if v.get("translation_hi") else ""
    return f"""
  <div class="vhead"><div class="vnum">{html.escape(where)} · {html.escape(v.get("number", ""))}</div>
  <h1>{html.escape(v["title"])}</h1><span class="pill">{html.escape(v.get("meter", ""))}</span></div>
  <div class="shloka mode-both">{lines}</div>
  <div class="block"><h2>Translation</h2><p class="tr">{v["translation"]}</p>{hi}</div>
  <p style="text-align:center;margin:26px 0"><a class="cta" href="../#{link}">Open with word meanings, meter, grammar and audio →</a></p>"""


def main():
    out = ROOT / "v"
    out.mkdir(exist_ok=True)
    for old in out.glob("*.html"):
        old.unlink()
    urls = [BASE]

    # Lilavati verses
    for name in load("data/manifest.json")["verses"]:
        v = load(f"data/verses/{name}.json")
        desc = plain(v["translation"], 180)
        (out / f"{v['id']}.html").write_text(
            page(v["id"], v["title"], "Līlāvatī", desc, verse_body(v, "Līlāvatī", v["id"]), "#ganita", "Gaṇita"),
            encoding="utf-8")
        urls.append(f"{BASE}v/{v['id']}.html")

    # collections
    for cid in load("data/collections.json")["collections"]:
        m = load(f"data/collections/{cid}/manifest.json")
        verses = [load(f"data/collections/{cid}/verses/{n}.json") for n in m["verses"]]
        back = ("#bhakti", "Bhakti") if m.get("kind") == "stotra" else ("#ganita", "Gaṇita")
        for v in verses:
            desc = plain(v["translation"], 180)
            (out / f"{v['id']}.html").write_text(
                page(v["id"], v["title"], m["title"], desc, verse_body(v, m["title"], v["id"]), f"#{cid}", m["title"]),
                encoding="utf-8")
            urls.append(f"{BASE}v/{v['id']}.html")
        # full-text page for the whole collection
        text = "".join(
            '<div class="stotra-verse">' + "".join(f'<div class="l">{d}</div>' for d in v["devanagari"]) +
            f'<div class="vfoot"><a href="{v["id"]}.html">{html.escape(v["title"])}</a></div></div>' for v in verses)
        body = f"""
  <div class="vhead"><div class="vnum">{len(verses)} verses · {html.escape(m.get("author", ""))}</div>
  <h1 class="dv" style="color:var(--accent)">{m["title_deva"]}</h1><p style="font-family:var(--serif);font-size:24px;margin:0">{html.escape(m["title"])}</p></div>
  <p>{m["intro"]}</p>
  <p style="margin:20px 0"><a class="cta" href="../#{cid}">Open in Shlokashala →</a></p>
  <div class="shloka stotra mode-deva">{text}</div>"""
        desc = plain(m["intro"], 180)
        (out / f"{cid}.html").write_text(page(cid, m["title"], m.get("author", ""), desc, body, back[0], back[1]), encoding="utf-8")
        urls.append(f"{BASE}v/{cid}.html")

    sitemap = "".join(f"<url><loc>{u}</loc></url>" for u in urls)
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sitemap}</urlset>\n',
        encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n", encoding="utf-8")
    print(f"Built {len(urls) - 1} pages in v/, plus sitemap.xml and robots.txt.")


if __name__ == "__main__":
    main()
