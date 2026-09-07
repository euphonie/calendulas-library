import type { Language } from "../types.ts"
import { href, setRoute } from "../router.ts"
import { matchIntent } from "../intent.ts"
import { tools } from "../tools.ts"
import { hubArt, type HubArtId } from "../viz/hub-art.ts"

const useCases: { intent: string; art: HubArtId; learn: string }[] = [
  {
    intent: "Where are SOV languages?",
    art: "sov",
    learn: "A word-order map: the Eurasian SOV belt versus other pockets, and what stays grey.",
  },
  {
    intent: "What is a Sprachbund?",
    art: "sprachbund",
    learn: "Unrelated neighbors can share structure through contact — glossary first, then a tour.",
  },
  {
    intent: "Compare K'iche' and Kaqchikel",
    art: "pair",
    learn: "A feature-by-feature score: what matches, what does not, on how many overlapping codes.",
  },
  {
    intent: "Did SOV spread by family or contact?",
    art: "sunburst",
    learn: "Sunburst rings show inheritance; the linked map shows geography.",
  },
]

export async function renderHub(root: HTMLElement, langs: Language[], initial = ""): Promise<() => void> {
  root.innerHTML = `
    <section class="hub">
      <div class="hub-hero">
        <p class="kicker">Calendula’s knowledge, arranged by question</p>
        <h1>What do you want to look up?</h1>
        <p class="blurb">This library is Calendula’s set of notes for understanding how languages work. Ask in plain language, or take a volume from the shelf — the atlas is only one book.</p>
        <form class="intent-pill" id="intent-form">
          <label class="visually-hidden" for="intent">Intent</label>
          <input id="intent" type="search" name="intent" value="${escapeAttr(initial)}" placeholder="Where are SOV languages?" />
          <button class="btn" type="submit">Open</button>
        </form>
        <nav class="hub-jumps" aria-label="Jump to a shelf">
          ${tools.map((t) => `<a class="hub-jump" href="${href(t.href)}">${t.name}</a>`).join("")}
        </nav>
      </div>
      <div class="hub-matches" id="matches"></div>
      <div class="hub-band">
        <div class="page">
          <h2>Start with a question</h2>
          <p class="blurb use-lead">Each card is a use case. The picture is the payoff.</p>
          <div class="use-grid">
            ${useCases
              .map(
                (c) => `<button type="button" class="card use-card" data-ex="${escapeAttr(c.intent)}">
                  ${hubArt[c.art]}
                  <h3>${c.intent}</h3>
                  <p>${c.learn}</p>
                </button>`,
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="hub-tools">
        <div class="page">
          <h2>On the shelf</h2>
          <p class="blurb use-lead">Open a volume when you already know the kind of question.</p>
          <div class="tool-grid">
            ${tools
              .map(
                (t) => `<a class="card tool-card" href="${href(t.href)}">
                  ${hubArt[t.id]}
                  <div class="tool-copy">
                    <p class="kicker">${t.tag}</p>
                    <h3>${t.name}</h3>
                    <p>${t.blurb}</p>
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
      matches.innerHTML = `<p class="muted">No tool ranked for that intent. Pick a question or a tool.</p>`
      return
    }
    matches.innerHTML = `
      <article class="card best-match">
        ${hubArt[best.tool.id]}
        <p class="kicker">Best match · ${Math.round(best.score * 100)}%</p>
        <h2>${best.tool.name}</h2>
        <p>${best.reason}</p>
        <p class="learn-label">You can learn</p>
        <ul class="learn-list">
          ${best.tool.learns.map((line) => `<li>${line}</li>`).join("")}
        </ul>
        <p><a class="btn" href="${best.href}">Open ${best.tool.name}</a></p>
      </article>
      ${
        rest.length
          ? `<ol class="alt-matches">${rest
              .slice(0, 3)
              .map(
                (m) =>
                  `<li><a href="${m.href}">${m.tool.name}</a> <span class="score">${Math.round(m.score * 100)}%</span> <span class="muted">${m.reason}</span></li>`,
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

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}
