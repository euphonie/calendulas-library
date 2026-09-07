import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js"
import {
  codeLabel,
  featureIndex,
  languageMap,
  neighbors as loadNeighbors,
  stats as loadStats,
  trees as loadTrees,
  vectors as loadVectors,
} from "../data.ts"
import { href } from "../router.ts"
import { pct } from "../format.ts"
import { theme } from "../theme.ts"
import type { Feature, Neighbor } from "../types.ts"
import { renderTree } from "../viz/tree.ts"

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const HERO_KEYS = [
  ["order", "Word order"],
  ["adpositions", "Adpositions"],
  ["tone", "Tone"],
  ["gender", "Gender"],
  ["case", "Case"],
  ["adjNoun", "Adjective–noun"],
  ["consonants", "Consonant inventory"],
] as const

function prune(tree: import("../types.ts").FamilyNode, selectedId: string) {
  const size = (n: typeof tree): number => 1 + n.children.reduce((s, c) => s + size(c), 0)
  if (size(tree) < 280) return tree
  const onPath = new Set<string>()
  const walk = (n: typeof tree, trail: string[]): boolean => {
    if (n.id === selectedId) {
      trail.forEach((id) => onPath.add(id))
      onPath.add(n.id)
      return true
    }
    return n.children.some((c) => walk(c, [...trail, n.id]))
  }
  walk(tree, [])
  const clip = (n: typeof tree): typeof tree => ({
    ...n,
    children: n.children
      .filter((c) => onPath.has(c.id) || n.children.some((x) => x.id === selectedId) || onPath.has(n.id))
      .map(clip)
      .concat(
        n.children.filter((c) => !onPath.has(c.id) && c.id !== selectedId).length
          ? [
              {
                id: `${n.id}-more`,
                name: `+${n.children.filter((c) => !onPath.has(c.id)).length} other branches`,
                children: [],
              },
            ]
          : [],
      ),
  })
  return clip(tree)
}

function neighborList(title: string, rows: Neighbor[], empty: string): string {
  if (!rows.length) return `<section class="card"><h3>${title}</h3><p class="muted">${empty}</p></section>`
  return `<section class="card"><h3>${title}</h3>
    <ol class="neighbors">
      ${rows
        .map(
          (n) => `<li>
            <a href="${href(`/language/${n.id}`)}">${n.name}</a>
            <span class="score">${n.score == null ? `${n.distanceKm} km` : pct(n.score)}</span>
            <span class="muted">${n.nShared ? `on ${n.nShared}` : ""}${n.sameFamily ? " · same family" : ""}</span>
          </li>`,
        )
        .join("")}
    </ol></section>`
}

export async function renderLanguage(root: HTMLElement, id: string): Promise<() => void> {
  const [byId, index, neighAll, vecs, treePack, stats] = await Promise.all([
    languageMap(),
    featureIndex(),
    loadNeighbors(),
    loadVectors(),
    loadTrees(),
    loadStats(),
  ])
  const lang = byId.get(id)
  if (!lang) {
    root.innerHTML = `<section class="page"><h1>Language not found</h1><p>No record for <code>${id}</code>.</p></section>`
    return () => {}
  }
  const features = new Map(index.features.map((f) => [f.id, f]))
  const vec = vecs[lang.id] ?? {}
  const neigh = neighAll[lang.id] ?? { wals: [], grambank: [], combined: [], geoUnrelated: [] }
  const heroRows = HERO_KEYS.map(([key, label]) => {
    const fid = index.hero[key]
    const feat = features.get(fid)
    return { label, feat, value: feat ? codeLabel(feat, vec[fid]) : "—" }
  })

  const walsFeats = index.features.filter((f) => f.source === "wals" && vec[f.id])
  const gbFeats = index.features.filter((f) => f.source === "grambank" && vec[f.id])

  root.innerHTML = `
    <section class="page language-page">
      <header class="hero-card">
        <p class="kicker">${lang.familyName ?? "Ungrouped"} · ${lang.iso ?? "no ISO"} · ${lang.macroarea ?? ""}</p>
        <h1>${lang.name}</h1>
        <p class="meta">${lang.walsName && lang.walsName !== lang.name ? `WALS: ${lang.walsName} (${lang.walsId})` : lang.walsId ? `WALS ${lang.walsId}` : "Not in WALS"}
        · Glottocode ${lang.id}
        · ${lang.walsN} WALS features · ${lang.grambankN} Grambank features</p>
        <dl class="hero-grid">
          ${heroRows.map((r) => `<div><dt>${r.label}</dt><dd>${r.value}</dd></div>`).join("")}
        </dl>
        ${lang.walsN < stats.minOverlap.wals ? `<p class="notice">WALS coverage is sparse here (${lang.walsN} features; neighbors need ≥${stats.minOverlap.wals} overlapping codes). Grambank similarity is the more stable signal for this language.</p>` : ""}
      </header>
      <div class="tabs" role="tablist">
        <button class="tab on" data-tab="wals">WALS profile</button>
        <button class="tab" data-tab="grambank">Grambank profile</button>
        <button class="tab" data-tab="tree">Family tree</button>
        <button class="tab" data-tab="near">Nearest languages</button>
      </div>
      <div id="tab-wals" class="tab-panel">
        <canvas id="coverage-chart" height="120"></canvas>
        ${profileTable(walsFeats, vec)}
      </div>
      <div id="tab-grambank" class="tab-panel hidden">
        <p class="muted">Grambank uses a different questionnaire from WALS. Do not mix the two percentages as if they were one coding system.</p>
        ${profileTable(gbFeats, vec)}
      </div>
      <div id="tab-tree" class="tab-panel hidden">
        <div id="tree-target" class="tree-wrap"></div>
      </div>
      <div id="tab-near" class="tab-panel hidden split">
        ${neighborList("Structurally closest (combined)", neigh.combined, "Not enough overlapping features.")}
        ${neighborList("Structurally closest (Grambank)", neigh.grambank, "Not enough Grambank overlap.")}
        ${neighborList("Structurally closest (WALS)", neigh.wals, `Need at least ${stats.minOverlap.wals} shared WALS features.`)}
        ${neighborList("Nearest unrelated languages", neigh.geoUnrelated, "No coordinates or no unrelated neighbors.")}
      </div>
    </section>
  `

  const ctx = root.querySelector<HTMLCanvasElement>("#coverage-chart")!
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["WALS features coded", "Grambank features coded"],
      datasets: [{ data: [lang.walsN, lang.grambankN], backgroundColor: [theme.yellow, theme.rust] }],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  })

  const familyTree = lang.familyId ? treePack.trees[lang.familyId] : undefined
  if (familyTree) renderTree(root.querySelector("#tree-target")!, prune(familyTree, lang.id), lang.id)
  else root.querySelector("#tree-target")!.innerHTML = `<p class="muted">No Glottolog family tree for this language.</p>`

  root.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".tab").forEach((b) => b.classList.remove("on"))
      root.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"))
      btn.classList.add("on")
      root.querySelector(`#tab-${btn.dataset.tab}`)!.classList.remove("hidden")
    })
  })

  return () => chart.destroy()
}

function profileTable(feats: Feature[], vec: Record<string, string>): string {
  if (!feats.length) return `<p class="muted">No coded features in this source.</p>`
  return `<table class="data"><thead><tr><th>Feature</th><th>Value</th></tr></thead><tbody>
    ${feats
      .map(
        (f) =>
          `<tr><td><a href="${href(`/atlas?f=${encodeURIComponent(f.id)}`)}">${f.sourceId} ${f.name}</a></td><td>${codeLabel(f, vec[f.id])}</td></tr>`,
      )
      .join("")}
  </tbody></table>`
}
