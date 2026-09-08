import "@fontsource/dm-sans/400.css"
import "@fontsource/dm-sans/400-italic.css"
import "@fontsource/dm-sans/500.css"
import "@fontsource/dm-sans/600.css"
import "@fontsource/dm-sans/700.css"
import "@fontsource/fraunces/500.css"
import "@fontsource/fraunces/600.css"
import "@fontsource/fraunces/700.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"
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
import { renderNotebook } from "./views/notebook.ts"
import { KOFI_URL, kofiButton, kofiCup } from "./support.ts"
import { getLocale, localePickerHtml, setLocale, t, type Locale, type MsgKey } from "./i18n.ts"
import { icon, NAV_ICONS, type IconName } from "./icons.ts"
import { escapeHtml } from "./format.ts"

const app = document.querySelector<HTMLDivElement>("#app")!

function shell(): string {
  return `
    <header class="site-header">
      <a class="brand" href="${href("/")}">
        ${icon("flower", 26)}
        <span class="brand-text">
          <span class="brand-mark">Calendula’s Library</span>
          <span class="brand-sub">${t("brand.sub")}</span>
        </span>
      </a>
      <nav class="nav-pill" aria-label="${t("nav.aria")}">
        <a class="nav-link" data-nav="hub" href="${href("/")}" title="${t("nav.hub")}">${icon("hub", 15)}<span class="nav-label">${t("nav.hub")}</span></a>
        <a class="nav-link" data-nav="atlas" href="${href("/atlas")}" title="${t("nav.atlas")}">${icon("atlas", 15)}<span class="nav-label">${t("nav.atlas")}</span></a>
        <a class="nav-link" data-nav="sunburst" href="${href("/sunburst")}" title="${t("nav.sunburst")}">${icon("sunburst", 15)}<span class="nav-label">${t("nav.sunburst")}</span></a>
        <a class="nav-link" data-nav="investigate" href="${href("/investigate/sov")}" title="${t("nav.investigate")}">${icon("investigate", 15)}<span class="nav-label">${t("nav.investigate")}</span></a>
        <a class="nav-link" data-nav="learn" href="${href("/learn")}" title="${t("nav.learn")}">${icon("learn", 15)}<span class="nav-label">${t("nav.learn")}</span></a>
        <a class="nav-link" data-nav="notebook" href="${href("/notebook")}" title="${t("nav.notebook")}">${icon("notebook", 15)}<span class="nav-label">${t("nav.notebook")}</span></a>
        <a class="nav-link" data-nav="compare" href="${href("/compare")}" title="${t("nav.compare")}">${icon("compare", 15)}<span class="nav-label">${t("nav.compare")}</span></a>
      </nav>
      <div class="header-end">
        ${kofiButton()}
        ${localePickerHtml()}
        <form class="search" autocomplete="off">
          ${icon("search", 16)}
          <label class="visually-hidden" for="q">${t("search.languages")}</label>
          <input id="q" type="search" placeholder="${t("search.languages")}" />
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
    else if (route.view === "notebook") teardown = await renderNotebook(main, langs, route)
    else teardown = await renderCompare(main, route.a, route.b)
  } catch (err) {
    const section = document.createElement("section")
    section.className = "page"
    const h1 = document.createElement("h1")
    h1.textContent = t("error.load")
    const p = document.createElement("p")
    p.className = "muted"
    p.textContent = err instanceof Error ? err.message : String(err)
    section.append(h1, p)
    main.replaceChildren(section)
  }
}

function paintFooter(citations: string): void {
  document.querySelector("#footer")!.innerHTML =
    `<p class="kofi-foot"><a href="${KOFI_URL}" target="_blank" rel="noopener noreferrer">${kofiCup()}${escapeHtml(t("kofi.support"))}</a></p>` + citations
}

const NAV_KEYS: Record<string, MsgKey> = {
  hub: "nav.hub",
  atlas: "nav.atlas",
  sunburst: "nav.sunburst",
  investigate: "nav.investigate",
  learn: "nav.learn",
  notebook: "nav.notebook",
  compare: "nav.compare",
}

function applyChrome(citations: string): void {
  document.documentElement.lang = getLocale()
  const sub = document.querySelector(".brand-sub")
  if (sub) sub.textContent = t("brand.sub")
  document.querySelector(".nav-pill")?.setAttribute("aria-label", t("nav.aria"))
  document.querySelectorAll<HTMLAnchorElement>(".nav-link[data-nav]").forEach((link) => {
    const key = NAV_KEYS[link.dataset.nav ?? ""]
    if (!key) return
    const name = t(key)
    const ic = NAV_ICONS[link.dataset.nav ?? ""] as IconName | undefined
    link.title = name
    link.innerHTML = `${ic ? icon(ic, 15) : ""}<span class="nav-label">${escapeHtml(name)}</span>`
  })
  const q = document.querySelector<HTMLInputElement>("#q")
  const qLabel = document.querySelector("label[for='q']")
  if (q) q.placeholder = t("search.languages")
  if (qLabel) qLabel.textContent = t("search.languages")
  const kofiStrong = document.querySelector(".kofi-btn-copy strong")
  const kofiSub = document.querySelector(".kofi-btn-sub")
  if (kofiStrong) kofiStrong.textContent = t("kofi.buy")
  if (kofiSub) kofiSub.textContent = t("kofi.on")
  const locHidden = document.querySelector(".locale-picker .visually-hidden")
  const locSelect = document.querySelector<HTMLSelectElement>("#ui-lang")
  if (locHidden) locHidden.textContent = t("locale.label")
  if (locSelect) locSelect.setAttribute("aria-label", t("locale.label"))
  paintFooter(citations)
}

function bindLocalePicker(citations: string): void {
  const select = document.querySelector<HTMLSelectElement>("#ui-lang")
  if (!select) return
  select.value = getLocale()
  select.addEventListener("change", () => {
    setLocale(select.value as Locale)
    applyChrome(citations)
    void render()
  })
}

async function boot(): Promise<void> {
  applyChartTheme()
  document.documentElement.lang = getLocale()
  app.innerHTML = shell()
  const [loadedLangs, stats] = await Promise.all([languages(), loadStats()])
  langs = loadedLangs
  const citations = Object.values(stats.datasets)
    .map((d) => `<p>${escapeHtml(d.citation)}</p>`)
    .join("")
  paintFooter(citations)

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
    hits.replaceChildren()
    for (const l of found) {
      const a = document.createElement("a")
      a.href = href(`/language/${l.id}`)
      a.append(document.createTextNode(l.name + " "))
      const span = document.createElement("span")
      span.className = "muted"
      span.textContent = l.familyName ?? ""
      a.append(span)
      hits.append(a)
    }
  })
  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Node)) return
    if (!hits.contains(e.target) && e.target !== input) hits.hidden = true
  })

  bindLocalePicker(citations)

  window.addEventListener("hashchange", () => void render())
  if (!window.location.hash) window.location.hash = "#/"
  else await render()
}

void boot()
