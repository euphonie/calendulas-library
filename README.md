# Calendula’s Library

Calendula’s bookshelf for understanding language. The **hub** matches a plain-language question to a volume. The **Typology Atlas** is the world map; the **WALS Sunburst Explorer** links Glottolog genealogy to geography with feature rings. Built on WALS, Glottolog, and Grambank (CLDF).

Live site (after Pages is on): [https://euphonie.github.io/calendulas-library/](https://euphonie.github.io/calendulas-library/)

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/download_datasets.py
.venv/bin/python scripts/build_data.py
npm install
npm run dev
```

Pinned dataset versions live in [`data/datasets.json`](data/datasets.json). Generated JSON is written to `public/data/`.

## GitHub Pages

The app uses hash routes (`#/`, `#/atlas`) so it does not need a server-side fallback. In GitHub: **Settings → Pages → Source → GitHub Actions**. Push to `main` and the workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds with `base: /calendulas-library/` and deploys `dist/`.

Local production preview:

```bash
npm run build
npm run preview
```

## On the shelf

From the hub (`#/`), type a question or open a volume:

| Volume | For |
| --- | --- |
| Typology Atlas | Feature maps (word order, tone, case, …) |
| WALS Sunburst Explorer | Genealogy sunburst + feature rings, linked to a world map |
| Language Dossier | One language: family tree, coded features, neighbors |
| Comparator | Two-language agreement table |
| Investigate | Guided questions (SOV, postpositions, Sprachbund, genealogy) |
| Learn | Glossary and starter path |

Examples the matcher routes: “Where are SOV languages?”, “Did SOV spread by family or contact?”, “Compare K'iche' and Kaqchikel”, “What is a Sprachbund?”, “Open K'iche'”.

## Stack

Vite + TypeScript, MapLibre GL with a local Natural Earth land layer (no map API key), D3 (trees and heatmaps), Chart.js (bars). UI tokens live in [`src/theme.ts`](src/theme.ts) and [`src/style.css`](src/style.css) and are reused across views. No runtime API: the ETL precomputes neighbors and associations.

## Cite the data

WALS, Glottolog, and Grambank are CC-BY. The site footer repeats the required citations. Lesson text is original; chapter prose is not copied. Link through to wals.info and grambank.clld.org.

## License

The site code is [MIT](LICENSE): you may use, copy, modify, and redistribute it freely. Bundled WALS, Glottolog, and Grambank data stay under their CC-BY terms.

