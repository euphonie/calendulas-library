import type { Language } from "../types.ts"
import { href, setRoute } from "../router.ts"
import { matchIntent } from "../intent.ts"
import { tools } from "../tools.ts"
import { hubArt, type HubArtId } from "../viz/hub-art.ts"
import { t, toolMsg } from "../i18n.ts"
import { icon, TOOL_ICONS, withIcon } from "../icons.ts"
import { escapeHtml } from "../format.ts"

const useCases: { intentKey: "use.sov.intent" | "use.bund.intent" | "use.pair.intent" | "use.sun.intent"; learnKey: "use.sov.learn" | "use.bund.learn" | "use.pair.learn" | "use.sun.learn"; art: HubArtId }[] = [
  { intentKey: "use.sov.intent", art: "sov", learnKey: "use.sov.learn" },
  { intentKey: "use.bund.intent", art: "sprachbund", learnKey: "use.bund.learn" },
  { intentKey: "use.pair.intent", art: "pair", learnKey: "use.pair.learn" },
  { intentKey: "use.sun.intent", art: "sunburst", learnKey: "use.sun.learn" },
]

export async function renderHub(root: HTMLElement, langs: Language[], initial = ""): Promise<() => void> {
  root.innerHTML = `
    <section class="hub">
      <div class="hub-hero">
        <p class="kicker with-icon">${icon("shelf", 16)}${t("hub.kicker")}</p>
        <h1>${t("hub.title")}</h1>
        <p class="blurb">${t("hub.blurb")}</p>
        <form class="intent-pill" id="intent-form">
          ${icon("search", 18)}
          <label class="visually-hidden" for="intent">${t("hub.intent")}</label>
          <input id="intent" type="search" name="intent" value="${escapeHtml(initial)}" placeholder="${t("hub.placeholder")}" />
          <button class="btn" type="submit">${withIcon("open", t("hub.open"))}</button>
        </form>
        <nav class="hub-jumps" aria-label="${t("hub.jump")}">
          ${tools.map((tool) => `<a class="hub-jump" href="${href(tool.href)}">${withIcon(TOOL_ICONS[tool.id] ?? "open", toolMsg(tool.id, "name"))}</a>`).join("")}
        </nav>
      </div>
      <div class="hub-matches" id="matches"></div>
      <div class="hub-band">
        <div class="page">
          <h2 class="with-icon">${icon("question", 22)}${t("hub.start")}</h2>
          <p class="blurb use-lead">${t("hub.useLead")}</p>
          <div class="use-grid">
            ${useCases
              .map(
                (c) => `<button type="button" class="card use-card" data-ex="${escapeHtml(t(c.intentKey))}">
                  ${hubArt[c.art]}
                  <h3>${t(c.intentKey)}</h3>
                  <p>${t(c.learnKey)}</p>
                </button>`,
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="hub-tools">
        <div class="page">
          <h2 class="with-icon">${icon("shelf", 22)}${t("hub.shelf")}</h2>
          <p class="blurb use-lead">${t("hub.shelfLead")}</p>
          <div class="tool-grid">
            ${tools
              .map(
                (tool) => `<a class="card tool-card" href="${href(tool.href)}">
                  ${hubArt[tool.id]}
                  <div class="tool-copy">
                    <p class="kicker with-icon">${icon(TOOL_ICONS[tool.id] ?? "open")}${toolMsg(tool.id, "tag")}</p>
                    <h3>${toolMsg(tool.id, "name")}</h3>
                    <p>${toolMsg(tool.id, "blurb")}</p>
                  </div>
                </a>`,
              )
              .join("")}
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
