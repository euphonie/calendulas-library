# Calendula’s Library

Calendula’s bookshelf for understanding language. The **hub** matches a plain-language question to a volume. Volumes include the **Typology Atlas**, **WALS Sunburst Explorer**, **Language Dossier**, **Comparator**, **Investigate**, **Learn**, and **Notebook**. The data is WALS, Glottolog, and Grambank (CLDF), joined on Glottocode.

Live site: [https://euphonie.github.io/calendulas-library/](https://euphonie.github.io/calendulas-library/)

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/download_datasets.py
.venv/bin/python scripts/build_data.py
npm install
npm run dev
```

Pinned dataset versions live in [`data/datasets.json`](data/datasets.json): WALS v2020.5, Glottolog 5.3, Grambank v1.0.3. Generated JSON is written to `public/data/`. When several WALS or Grambank lects share a Glottocode, the build keeps the richest coding (so Spanish is `spa`, not a sparsely coded variety).

UI fonts (DM Sans, Fraunces, IBM Plex Mono) are bundled from Fontsource. Map label glyphs still load from MapLibre’s demo font host.

## Interface language

The header picker translates **tool chrome** (nav, buttons, section copy) into English, Spanish, German, Italian, Portuguese, or French. Feature names and Glottolog language names stay in the source English. The choice is stored as `calendula-ui-lang` and, on a first visit, follows `navigator.languages` when it matches.

## GitHub Pages

The app uses hash routes (`#/`, `#/atlas`, `#/notebook`) so it does not need a server-side fallback. In GitHub: **Settings → Pages → Source → GitHub Actions**. Push to `main` and the workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds with `base: /calendulas-library/` and deploys `dist/`. Production builds add a Content-Security-Policy meta tag; GitHub Actions are pinned to commit SHAs.

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
| Learn | Glossary, starter path, and what similarity percentages mean |
| Notebook | A phrase specimen plus a language, opening maps and coded features |

Examples the matcher routes: “Where are SOV languages?”, “Did SOV spread by family or contact?”, “Compare K'iche' and Kaqchikel”, “What is a Sprachbund?”, “Open K'iche'”.

K'iche' (`kich1262`) is still the specimen language in Learn and the comparison examples. It is not a header shortcut.

Notebook share links encode the phrase in the hash. They are not private: anyone with the URL can decode it.

## Stack

Vite + TypeScript, MapLibre GL with a local Natural Earth land layer (no map API key), D3 (trees and heatmaps), Chart.js (bars). UI tokens live in [`src/theme.ts`](src/theme.ts) and [`src/style.css`](src/style.css). No runtime API: the ETL precomputes neighbors and associations.

## Cite the data

WALS, Glottolog, and Grambank are CC-BY. The site footer repeats the required citations. Lesson text is original; chapter prose is not copied. Link through to wals.info and grambank.clld.org.

Support the project on [Ko-fi](https://ko-fi.com/Q5Q5DH9I8).

## License

Calendula’s Library (code, interface, and original lesson text) is
[CC BY-SA 4.0](LICENSE): copy, remix, and share it, including commercially,
if you credit the source **and** keep adaptations under CC-BY-SA or a
compatible ShareAlike license. 

Bundled WALS, Glottolog, and Grambank remain [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
(attribution, no ShareAlike requirement of their own). Credit those authors
when you reuse the data.
