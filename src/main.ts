import "./style.css"
import "maplibre-gl/dist/maplibre-gl.css"
import { applyChartTheme } from "./theme.ts"
import { parseRoute } from "./router.ts"
import { href } from "./router.ts"
import type { Language } from "./types.ts"
import { languages, searchLanguages, stats as loadStats } from "./data.ts"
import { renderHub } from "./views/hub.ts"
import { renderAtlas } from "./views/atlas.ts"
import { renderSunburstView } from "./views/sunburst.ts"
import { renderLanguage } from "./views/language.ts"
import { renderInvestigate } from "./views/investigate.ts"
import { renderLearn } from "./views/learn.ts"
import { renderCompare } from "./views/compare.ts"

const app = document.querySelector<HTMLDivElement>("#app")!

function shell(): string {
  return `
    <header class="site-header">
      <a class="brand" href="${href("/")}">
        <span class="brand-mark">Calendula’s Library</span>
        <span class="brand-sub">A bookshelf for understanding language</span>
      </a>
      <nav class="nav-pill" aria-label="Tools">
        <a class="nav-link" data-nav="hub" href="${href("/")}">Hub</a>
        <a class="nav-link" data-nav="atlas" href="${href("/atlas")}">Atlas</a>
        <a class="nav-link" data-nav="sunburst" href="${href("/sunburst")}">Sunburst</a>
        <a class="nav-link" data-nav="investigate" href="${href("/investigate/sov")}">Investigate</a>
        <a class="nav-link" data-nav="learn" href="${href("/learn")}">Learn</a>
        <a class="nav-link" data-nav="compare" href="${href("/compare")}">Compare</a>
      </nav>
      <div class="header-end">
        <a class="nav-link kiche-link" data-nav="language" href="${href("/language/kich1262")}">K'iche'</a>
        <form class="search" autocomplete="off">
          <label class="visually-hidden" for="q">Search languages</label>
          <input id="q" type="search" placeholder="Search languages" />
          <div id="hits" class="hits" hidden></div>
        </form>
      </div>
    </header>
    <main id="main"></main>
    <footer class="site-footer" id="footer"></footer>
  `
}

let teardown: (() => void) | undefined
let langs: Language[] = []

async function render(): Promise<void> {
  teardown?.()
  teardown = undefined
  const main = document.querySelector<HTMLElement>("#main")!
  const route = parseRoute()
  document.querySelectorAll<HTMLAnchorElement>(".nav-link").forEach((link) => {
    link.classList.toggle("is-on", link.dataset.nav === route.view)
  })
  try {
    if (route.view === "hub") teardown = await renderHub(main, langs, route.q ?? "")
    else if (route.view === "atlas") teardown = await renderAtlas(main, route)
    else if (route.view === "sunburst") teardown = await renderSunburstView(main, route)
    else if (route.view === "language") teardown = await renderLanguage(main, route.id)
    else if (route.view === "investigate") teardown = await renderInvestigate(main, route.lesson)
    else if (route.view === "learn") teardown = await renderLearn(main)
    else teardown = await renderCompare(main, route.a, route.b)
  } catch (err) {
    main.innerHTML = `<section class="page"><h1>Could not load this view</h1><p class="muted">${err instanceof Error ? err.message : String(err)}</p></section>`
  }
}

async function boot(): Promise<void> {
  applyChartTheme()
  app.innerHTML = shell()
  const [loadedLangs, stats] = await Promise.all([languages(), loadStats()])
  langs = loadedLangs
  document.querySelector("#footer")!.innerHTML = Object.values(stats.datasets)
    .map((d) => `<p>${d.citation}</p>`)
    .join("")

  const input = document.querySelector<HTMLInputElement>("#q")!
  const hits = document.querySelector<HTMLElement>("#hits")!
  input.addEventListener("input", () => {
    const found = searchLanguages(langs, input.value)
    if (!found.length) {
      hits.hidden = true
      hits.replaceChildren()
      return
    }
    hits.hidden = false
    hits.innerHTML = found
      .map((l) => `<a href="${href(`/language/${l.id}`)}">${l.name} <span class="muted">${l.familyName ?? ""}</span></a>`)
      .join("")
  })
  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Node)) return
    if (!hits.contains(e.target) && e.target !== input) hits.hidden = true
  })

  window.addEventListener("hashchange", () => void render())
  if (!window.location.hash) window.location.hash = "#/"
  else await render()
}

void boot()
