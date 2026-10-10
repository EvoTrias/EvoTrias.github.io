# EvoTrias — project page (local draft)

Static site, no build step, no external requests (fonts, video and figures are all local).

## Preview

- Double-click `index.html` (Chrome / Edge recommended), or
- serve the folder: `python -m http.server 8000` then open http://localhost:8000

## Structure

| Path | What |
|---|---|
| `index.html` | All sections: hero · film · architecture · governance replay + Notes / Meta-guidance case replays · plugin · results · cite |
| `css/main.css`, `css/fonts.css` | Styles (palette follows the promo film) and local web fonts |
| `js/galaxy.js` | WebGL spiral galaxy behind the whole page + the Govern/Propose/Judge triad in the hero |
| `js/loop.js` | Contract loop animation (Γt → xt → yt) |
| `js/lineage.js` | Replay of the real Cloudcast lineage run with the per-task context capsule and note / meta-guidance feed |
| `js/terminal.js` | `/evolve` plugin demo, cycling through Claude Code / Codex / OpenCode / JiuwenSwarm |
| `js/charts.js` | Native SVG redraws of the paper's tables and figures (hover tooltips, toggles) |
| `js/cases.js` | Scrub-able replays of the Note-trigger (Signal Processing) and Meta-guidance (MinMax-Dist-3) case figures; data read off the paper's vector figures |
| `js/data.js` | Numbers extracted from the paper's figure/table sources (`_work/build_paper_data.py`) |
| `assets/img/dino/` | Mascot: the original logo split into vector parts, plus costume variants (commander, builder, judge, astronaut, sunglasses, trophy) — body shape unchanged; regenerate with `python _work/costumes2.py` (commander, builder, judge, sunglasses, trophy; held objects sit under a clipped copy of the paws) |
| `assets/video/evotrias_film.mp4` | 1080p web encode of the v2 promo film (18 MB) |
| `_work/` | Build/QA tooling only (data extraction, costume generator, screenshot script) — exclude when publishing |

## Notes

- Published at https://evotrias.github.io/ from the `main` branch of `EvoTrias/EvoTrias.github.io` (GitHub Pages).
- `Paper` and `Code` buttons show "coming soon" — replace `href="#paper" data-soon=…` / `href="#code" data-soon=…` in `index.html` with the real links (drop `data-soon`).
- BibTeX uses anonymous authors / "Under review" — update after de-anonymization.
- The film still carries the "FAST Evolve" name inside the video itself.
