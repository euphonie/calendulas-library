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
import { escapeHtml, pct } from "../format.ts"
import { theme } from "../theme.ts"
import type { Feature, Neighbor } from "../types.ts"
import { renderTree } from "../viz/tree.ts"
import { t, type MsgKey } from "../i18n.ts"
import { icon, withIcon, type IconName } from "../icons.ts"

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const HERO_KEYS = ["order", "adpositions", "tone", "gender", "case", "adjNoun", "consonants"] as const

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
                name: t("lang.moreBranches", { n: n.children.filter((c) => !onPath.has(c.id)).length }),
                children: [],
              },
            ]
          : [],
      ),
  })
  return clip(tree)
}

function neighborList(title: string, rows: Neighbor[], empty: string, ic: IconName): string {
  if (!rows.length) return `<section class="card"><h3 class="with-icon">${icon(ic, 18)}${title}</h3><p class="muted">${empty}</p></section>`
  return `<section class="card"><h3 class="with-icon">${icon(ic, 18)}${title}</h3>
    <ol class="neighbors">
      ${rows
        .map(
          (n) => `<li>
            <a href="${href(`/language/${n.id}`)}">${escapeHtml(n.name)}</a>
            <span class="score">${n.score == null ? `${n.distanceKm} km` : pct(n.score)}</span>
            <span class="muted">${n.nShared ? t("lang.onN", { n: n.nShared }) : ""}${n.sameFamily ? ` · ${t("sameFamily")}` : ""}</span>
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
    const section = document.createElement("section")
    section.className = "page"
    const h1 = document.createElement("h1")
    h1.textContent = t("lang.notFound")
    const p = document.createElement("p")
    p.textContent = id ? t("lang.noRecord", { id }) : t("lang.notFound")
    section.append(h1, p)
    root.replaceChildren(section)
    return () => {}
  }
  const features = new Map(index.features.map((f) => [f.id, f]))
  const vec = vecs[lang.id] ?? {}
  const neigh = neighAll[lang.id] ?? { wals: [], grambank: [], combined: [], geoUnrelated: [] }
  const heroRows = HERO_KEYS.map((key) => {
    const fid = index.hero[key]
    const feat = features.get(fid)
    return { label: t(`hero.${key}` as MsgKey), feat, value: feat ? codeLabel(feat, vec[fid]) : "—" }
  })

  const walsFeats = index.features.filter((f) => f.source === "wals" && vec[f.id])
  const gbFeats = index.features.filter((f) => f.source === "grambank" && vec[f.id])

  const walsBit =
    lang.walsName && lang.walsName !== lang.name
      ? t("lang.walsNamed", { name: escapeHtml(lang.walsName), id: escapeHtml(lang.walsId ?? "") })
      : lang.walsId
        ? t("lang.walsId", { id: escapeHtml(lang.walsId) })
        : t("notInWals")

  root.innerHTML = `
    <section class="page language-page">
      <header class="hero-card">
        <p class="kicker with-icon">${icon("profile", 16)}${escapeHtml(lang.familyName ?? t("ungrouped"))} · ${escapeHtml(lang.iso ?? t("noIso"))} · ${escapeHtml(lang.macroarea ?? "")}</p>
        <h1>${escapeHtml(lang.name)}</h1>
        <p class="meta">${t("lang.meta", { wals: walsBit, id: escapeHtml(lang.id), walsN: lang.walsN, gb: lang.grambankN })}</p>
        <dl class="hero-grid">
          ${heroRows.map((r) => `<div><dt>${escapeHtml(r.label)}</dt><dd>${escapeHtml(r.value)}</dd></div>`).join("")}
        </dl>
        ${lang.walsN < stats.minOverlap.wals ? `<p class="notice">${t("lang.sparse", { n: lang.walsN, min: stats.minOverlap.wals })}</p>` : ""}
      </header>
      <div class="tabs" role="tablist">
        <button class="tab on" data-tab="wals">${withIcon("feature", t("lang.tabWals"))}</button>
        <button class="tab" data-tab="grambank">${withIcon("heatmap", t("lang.tabGb"))}</button>
        <button class="tab" data-tab="tree">${withIcon("tree", t("lang.tabTree"))}</button>
        <button class="tab" data-tab="near">${withIcon("neighbors", t("lang.tabNear"))}</button>
      </div>
      <div id="tab-wals" class="tab-panel">
        <canvas id="coverage-chart" height="120"></canvas>
        ${profileTable(walsFeats, vec)}
      </div>
      <div id="tab-grambank" class="tab-panel hidden">
        <p class="muted">${t("lang.gbNote")}</p>
        ${profileTable(gbFeats, vec)}
      </div>
      <div id="tab-tree" class="tab-panel hidden">
        <div id="tree-target" class="tree-wrap"></div>
      </div>
      <div id="tab-near" class="tab-panel hidden split">
        ${neighborList(t("lang.nearCombined"), neigh.combined, t("lang.emptyCombined"), "neighbors")}
        ${neighborList(t("lang.nearGb"), neigh.grambank, t("lang.emptyGb"), "heatmap")}
        ${neighborList(t("lang.nearWals"), neigh.wals, t("lang.emptyWals", { n: stats.minOverlap.wals }), "feature")}
        ${neighborList(t("lang.nearGeo"), neigh.geoUnrelated, t("lang.emptyGeo"), "atlas")}
      </div>
    </section>
  `

  const ctx = root.querySelector<HTMLCanvasElement>("#coverage-chart")!
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [t("lang.chartWals"), t("lang.chartGb")],
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
  else root.querySelector("#tree-target")!.innerHTML = `<p class="muted">${t("lang.noTree")}</p>`

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
  if (!feats.length) return `<p class="muted">${t("lang.noFeats")}</p>`
  return `<table class="data"><thead><tr><th>${t("lang.feature")}</th><th>${t("lang.value")}</th></tr></thead><tbody>
    ${feats
      .map(
        (f) =>
          `<tr><td><a href="${href(`/atlas?f=${encodeURIComponent(f.id)}`)}">${escapeHtml(`${f.sourceId} ${f.name}`)}</a></td><td>${escapeHtml(codeLabel(f, vec[f.id]))}</td></tr>`,
      )
      .join("")}
  </tbody></table>`
}
