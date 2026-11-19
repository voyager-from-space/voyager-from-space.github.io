#!/usr/bin/env python3
"""One-off helper used to move the three tool sites onto the shared voyager header, footer and share meta.
Run from the directory that holds the sibling repos."""
import re, sys
HOME = "https://voyager-from-space.github.io/"
URL = {"texdiet": "https://texdiet.vercel.app/", "papershed": HOME + "papershed/", "maketitle": "https://maketitle.vercel.app/", "blindsanitize": HOME + "blindsanitize/"}
REPO = lambda n: f"https://github.com/voyager-from-space/{n}"
MARK = '<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-opacity=".5"/><circle cx="16" cy="16" r="5" fill="#ffb547"/><circle cx="16" cy="16" r="1.3" fill="#070b16"/></svg>'
STEPS = [("texdiet", "Slim the project so it compiles faster."), ("papershed", "Clean the zip before you post it."), ("maketitle", "Open an arXiv paper's LaTeX source and compile it in the tab.")]
def header(name, end_label="Source", end_href=None):
    return f'''<header class="wrap vg-top">
  <a class="vg-brand" href="{HOME.rstrip('/')}" aria-label="voyager home">{MARK}<span>voyager</span></a>
  <span class="vg-sep" aria-hidden="true">/</span>
  <a class="vg-tool" href="./" aria-current="page">{name}</a>
  <a class="vg-end" href="{end_href or REPO(name)}">{end_label}</a>
</header>'''
def footer(name, legal):
    li = []
    for n, what in STEPS:
        if n == name:
            li.append(f'    <li class="here" aria-current="step"><span class="vg-name">{n}</span><span class="vg-what">{what}</span></li>')
        else:
            li.append(f'    <li><a href="{URL[n]}">{n}</a><span class="vg-what">{what}</span></li>')
    side_cur = name == "blindsanitize"
    side = (f'<span class="vg-name">blindsanitize</span> checks the source, PDF and extra files of a double-blind submission for anything that points to the authors.' if side_cur
            else f'Submitting double-blind? <a href="{URL["blindsanitize"]}">blindsanitize</a> checks the source, PDF and extra files for anything that points to the authors.')
    return f'''<footer class="wrap vg-foot">
  <nav class="vg-route" aria-label="The voyager LaTeX route">
    <h2>One route for a paper</h2>
    <ol class="vg-steps">
{chr(10).join(li)}
    </ol>
    <p class="vg-side">{side}</p>
  </nav>
  <p class="vg-legal">{legal}</p>
</footer>'''
def meta(name, title, desc, url, img, alt):
    e = lambda s: s.replace("&", "&amp;").replace('"', "&quot;")
    return f'''<meta property="og:type" content="website">
<meta property="og:site_name" content="voyager">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{e(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@voyagerships">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{img}">
<meta name="twitter:image:alt" content="{e(alt)}">
<meta name="theme-color" content="#070b16">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="{url}">'''
