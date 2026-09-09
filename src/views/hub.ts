import type { Language } from "../types.ts"
import { href, setRoute } from "../router.ts"
import { matchIntent } from "../intent.ts"
import { tools } from "../tools.ts"
import { hubArt } from "../viz/hub-art.ts"
import { t, toolMsg } from "../i18n.ts"
import { icon, TOOL_ICONS, withIcon } from "../icons.ts"
import { escapeHtml } from "../format.ts"

const useCases: { intentKey: "use.sov.intent" | "use.bund.intent" | "use.pair.intent" | "use.sun.intent" }[] = [
  { intentKey: "use.sov.intent" },
  { intentKey: "use.bund.intent" },
  { intentKey: "use.pair.intent" },
  { intentKey: "use.sun.intent" },
]
const assetBase = import.meta.env.BASE_URL
const toolArt: Record<string, string> = {
  atlas: "atlas",
  sunburst: "sunburst",
  dossier: "dossier",
  compare: "compare",
  investigate: "investigate",
  learn: "learn",
}

export async function renderHub(root: HTMLElement, langs: Language[], initial = ""): Promise<() => void> {
  root.innerHTML = `
    <section class="hub">
      <div class="hub-hero">
        <div class="hub-hero-inner">
          <div class="hub-hero-books">
            <img src="${assetBase}brand/books-scene.jpg" alt="" />
          </div>
          <div class="hub-hero-copy">
            <p class="poster-sidecopy">Languages<br>People<br>Patterns<br>A brighter world</p>
            <h1 class="poster-wordmark">
              <span>Calendula’s</span>
              <strong>Library</strong>
            </h1>
            <p class="poster-tagline">${t("brand.sub")}</p>
            <p class="blurb">${t("hub.blurb")}</p>
            <form class="intent-pill" id="intent-form">
              ${icon("search", 18)}
              <label class="visually-hidden" for="intent">${t("hub.intent")}</label>
              <input id="intent" type="search" name="intent" value="${escapeHtml(initial)}" placeholder="${t("hub.placeholder")}" />
              <button class="btn" type="submit">${withIcon("open", t("hub.open"))}</button>
            </form>
          </div>
          <div class="hub-hero-art">
            <img src="${assetBase}brand/poster-scene.jpg" alt="" />
          </div>
        </div>
      </div>
      <div class="hub-matches" id="matches"></div>
      <div class="hub-tools">
        <div class="page">
          <div class="tool-grid">
            ${tools
              .filter((tool) => tool.id !== "notebook")
              .map(
                (tool) => `<a class="card tool-card tool-card-simple" href="${href(tool.href)}">
                  <span class="tool-icon tool-icon-${tool.id}">${toolArt[tool.id] ? `<img src="${assetBase}brand/menu-icons/${toolArt[tool.id]}.png" alt="" />` : icon(TOOL_ICONS[tool.id] ?? "open", 28)}</span>
                  <h3>${toolMsg(tool.id, "name")}</h3>
                  <p>${escapeHtml(tool.learns[0])}</p>
                </a>`,
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="hub-band">
        <div class="page">
          <h2>${t("hub.start")}</h2>
          <p class="blurb use-lead">${t("hub.useLead")}</p>
          <div class="q-pills">
            ${useCases.map((c) => `<button type="button" class="q-pill" data-ex="${escapeHtml(t(c.intentKey))}">${escapeHtml(t(c.intentKey))}${icon("open", 16)}</button>`).join("")}
          </div>
        </div>
      </div>
    </section>
  `

  const input = root.querySelector<HTMLInputElement>("#intent")!
  const matches = root.querySelector("#matches")!

  const paint = (query: string) => {
    const ranked = matchIntent(query, langs)
    if (!query.trim()) {
      matches.innerHTML = ""
      return
    }
    const [best, ...rest] = ranked
    if (!best) {
      matches.innerHTML = `<p class="muted">${t("hub.noMatch")}</p>`
      return
    }
    matches.innerHTML = `
      <article class="card best-match">
        ${hubArt[best.tool.id]}
        <p class="kicker with-icon">${withIcon(TOOL_ICONS[best.tool.id] ?? "open", `${t("hub.bestMatch")} · ${Math.round(best.score * 100)}%`)}</p>
        <h2 class="with-icon">${withIcon(TOOL_ICONS[best.tool.id] ?? "open", toolMsg(best.tool.id, "name"), 22)}</h2>
        <p>${escapeHtml(best.reason)}</p>
        <p class="learn-label with-icon">${icon("learn", 16)}${t("hub.youCanLearn")}</p>
        <ul class="learn-list">
          ${(["learn1", "learn2", "learn3"] as const).map((part) => `<li>${toolMsg(best.tool.id, part)}</li>`).join("")}
        </ul>
        <p><a class="btn" href="${best.href}">${withIcon("open", t("hub.openTool", { name: toolMsg(best.tool.id, "name") }))}</a></p>
      </article>
      ${
        rest.length
          ? `<ol class="alt-matches">${rest
              .slice(0, 3)
              .map(
                (m) =>
                  `<li><a class="hub-jump" href="${m.href}">${withIcon(TOOL_ICONS[m.tool.id] ?? "open", toolMsg(m.tool.id, "name"))}</a> <span class="score">${Math.round(m.score * 100)}%</span> <span class="muted">${escapeHtml(m.reason)}</span></li>`,
              )
              .join("")}</ol>`
          : ""
      }
    `
  }

  const submitIntent = (q: string) => {
    const ranked = matchIntent(q, langs)
    if (q && ranked[0] && ranked[0].score >= 0.3) {
      window.location.hash = ranked[0].href
      return
    }
    setRoute(q ? `/?q=${encodeURIComponent(q)}` : "/")
    paint(q)
  }

  root.querySelector("#intent-form")!.addEventListener("submit", (e) => {
    e.preventDefault()
    submitIntent(input.value.trim())
  })
  root.querySelectorAll<HTMLButtonElement>("[data-ex]").forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.ex ?? ""
      submitIntent(input.value.trim())
    })
  })
  paint(initial)
  return () => {}
}
