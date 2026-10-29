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
| `js/theme.js` | Light / dark theme (sun / moon button in the nav; light by default; `?theme=dark` or a saved dark preference selects dark). Shared text and surface colours in `css/main.css` use `var(--hex-xxxxxx, #xxxxxx)` / `rgba(var(--rgb-xxxxxx, r, g, b), a)`: undefined on dark (so dark renders the original values), defined by the light palette table at the end of `main.css`. This module maps the colours scripts draw into SVG through the same table, live, including charts drawn later. The terminal and the film keep their dark look. On light the hero is the inside of a white cabin: the dino floats in front of a porthole (`.porthole` in `index.html`) and `galaxy.js` clips the universe to its glass. The porthole sits on a mounting plate with corner screws. On the hero, switching themes opens space out of the porthole (or closes it back in) along one circle in 0.7 s, so light and dark change at once; the galaxy keeps turning and re-frames at its own pace over 1.4 s (`IRIS` / `SCENE` in `theme.js`). The dark side is a round window (`#universe` as a round-cornered box scaled to the circle, its view scaled back), holding the universe and a shadow-DOM copy of the dark page top and nav; the light side is the real page, or, going dark, a light copy on its cabin wall. Only transforms, opacity and the GPU's rounded-corner clip change per frame: no clip-path, mask or repaint (measured: a clip-path on the page repaints it every frame). The glass reflections and the dark theme's orbit rings fade, and the dino flies to its new place over 1.75 s as a copy whose float stays in phase. The flight starts once the new theme's first frames have rendered. When the hero is off screen, a circular View Transition starts at the theme button. Rapid clicks queue the next complete switch; reduced-motion users switch immediately |
| `js/galaxy.js` | WebGL spiral galaxy behind the whole page (seen through the hero porthole on the light theme) + the Govern/Propose/Judge triad in the hero. The canvas is opaque (it paints the dark of space itself); the camera follows scroll only, not the mouse |
| `js/loop.js` | Contract loop animation (Γt → xt → yt) |
| `js/lineage.js` | Replay of the real Cloudcast lineage run with the per-task context capsule and note / meta-guidance feed |
| `js/terminal.js` | `/evolve` plugin demo, cycling through Claude Code / Codex / OpenCode / JiuwenSwarm |
| `js/charts.js` | Native SVG redraws of the paper's tables and figures (hover tooltips, toggles) |
| `js/cases.js` | Scrub-able replays of the Note-trigger (Signal Processing) and Meta-guidance (MinMax-Dist-3) case figures; data read off the paper's vector figures |
| `js/data.js` | Numbers extracted from the paper's figure/table sources (`_work/build_paper_data.py`) |
| `assets/img/dino/` | Mascot: the original logo split into vector parts, plus costume variants (commander, builder, judge, astronaut, sunglasses, trophy) — body shape unchanged; regenerate with `python _work/costumes2.py` (commander, builder, judge, sunglasses, trophy; held objects sit under a clipped copy of the paws) |
| `assets/video/evotrias_film.mp4` | v2 promo film, web encode of the 2K master: 1080p H.264 at 5 Mbps (25 MB, faststart; chosen over 2K at equal size — cleaner on the particle shots, see VMAF test in `_work/vcompare.py`); `poster.jpg` is the master's 2K frame at 27.2 s. Prefetched in the background on desktop (`UI.film`) |
| `_work/` | Build/QA tooling only (data extraction, costume generator, screenshot script) — exclude when publishing |

## Notes

- Published at https://evotrias.github.io/ from the `main` branch of `EvoTrias/EvoTrias.github.io` (GitHub Pages).
- `Paper` and `Code` buttons show "coming soon" — replace `href="#paper" data-soon=…` / `href="#code" data-soon=…` in `index.html` with the real links (drop `data-soon`).
- Light-theme gradients, chart markers and moving highlights use dedicated styles so decorative light is not inverted into dark ink. The Results pair shows Frontier-CS medians on the left and the compact iteration chart on the right.
- Adding a colour: use the palette mapping above for shared text and surfaces. Give decorative gradients, illumination and markers a semantic class or variable with an explicit light-theme style; a bright highlight should stay a highlight on white.
- Editing copy: the site is English only. Edit the English HTML and script strings directly.
- The hero mascot is `assets/img/dino/dino_astronaut.webp`, a 1040 px render of `dino_astronaut.svg` (a bitmap rescales for free when the theme changes its size; the vector art would be re-rasterised mid-switch). Re-render it after editing the SVG.
- BibTeX uses anonymous authors / "Under review" — update after de-anonymization.
