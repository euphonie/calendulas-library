import type { FamilyNode, Feature } from "../types.ts"
import { codeLabel, featureIndex, featureValues, languages as loadLangs, trees as loadTrees } from "../data.ts"
import { href, setRoute } from "../router.ts"
import { colorForCodes, cssColor, escapeHtml } from "../format.ts"
import { createLanguageMap, type MapHandle } from "../viz/map.ts"
import { collectLeaves, findFamilyNode, renderSunburst } from "../viz/sunburst.ts"
import { t } from "../i18n.ts"
import { icon, withIcon } from "../icons.ts"
const DEFAULT_FAMILY = "indo1319"
const DEFAULT_FEATURE = "wals:81A"

export async function renderSunburstView(
  root: HTMLElement,
  opts: { family?: string; feature?: string; clade?: string },
): Promise<() => void> {
  const [index, pack, langs] = await Promise.all([featureIndex(), loadTrees(), loadLangs()])
  const byId = new Map(langs.map((l) => [l.id, l]))
  const familyList = pack.families
    .map((f) => ({ ...f, n: countLeaves(pack.trees[f.id]) }))
    .filter((f) => f.n >= 12)
    .sort((a, b) => b.n - a.n)
  const familyId = pack.trees[opts.family ?? ""] ? opts.family! : pack.trees[DEFAULT_FAMILY] ? DEFAULT_FAMILY : familyList[0]?.id
  const tree = familyId ? pack.trees[familyId] : undefined
  if (!familyId || !tree) {
    root.innerHTML = `<section class="page"><h1>${t("sunburst.noTrees")}</h1><p class="muted">${t("sunburst.rebuild")}</p></section>`
    return () => {}
  }
  const feature = index.features.find((f) => f.id === (opts.feature || DEFAULT_FEATURE)) ?? index.features.find((f) => f.id === index.defaultFeature)!
  const cladeId = opts.clade && findFamilyNode(tree, opts.clade) ? opts.clade : tree.id

  root.innerHTML = `
    <section class="sunburst-page">
      <aside class="sunburst-side">
        <p class="kicker with-icon">${icon("sunburst", 16)}${t("sunburst.kicker")}</p>
        <h1 class="with-icon">${icon("sunburst", 28)}${t("sunburst.title")}</h1>
        <p class="blurb">${t("sunburst.blurb")}</p>
        <label class="field"><span>${icon("tree")}${t("sunburst.family")}</span>
          <select id="family-select"></select>
        </label>
        <label class="field"><span>${icon("feature")}${t("sunburst.featureRing")}</span>
          <select id="feature-select"></select>
        </label>
        <p class="meta" id="sunburst-status"></p>
        <p class="row-links">
          <button type="button" class="btn-ghost" id="geo-filter">${withIcon("filter", t("sunburst.geoFilter"))}</button>
          <button type="button" class="btn-ghost" id="clear-filters">${withIcon("clear", t("sunburst.clear"))}</button>
        </p>
        <div class="legend" id="legend"></div>
        <p class="muted">${t("sunburst.credit")}</p>
        <p class="row-links"><a href="${href(`/language/kich1262`)}">${withIcon("profile", t("sunburst.dossier"))}</a><a href="${href("/atlas")}">${withIcon("atlas", t("sunburst.atlasOnly"))}</a></p>
      </aside>
      <div class="sunburst-stage">
        <div class="sunburst-wrap" id="sunburst"></div>
        <div class="atlas-map sunburst-map" id="map"></div>
      </div>
    </section>
  `

  const familySelect = root.querySelector<HTMLSelectElement>("#family-select")!
  for (const f of familyList) {
    const opt = document.createElement("option")
    opt.value = f.id
    opt.textContent = `${f.name} · ${f.n}`
    familySelect.append(opt)
  }
  familySelect.value = familyId

  const featureSelect = root.querySelector<HTMLSelectElement>("#feature-select")!
  const curriculum = index.features.filter((f) => f.curriculum)
  const rest = index.features.filter((f) => f.source === "wals" && !f.curriculum)
  for (const [label, items] of [
    [t("startHere"), curriculum],
    ["WALS", rest],
  ] as [string, Feature[]][]) {
    const g = document.createElement("optgroup")
    g.label = label
    for (const item of items) {
      const opt = document.createElement("option")
      opt.value = item.id
      opt.textContent = `${item.sourceId} · ${item.name}`
      g.append(opt)
    }
    featureSelect.append(g)
  }
  featureSelect.value = feature.id

  const familyLangs = collectLeaves(tree).flatMap((id) => {
    const lang = byId.get(id)
    return lang ? [lang] : []
  })
  const mapHandle: MapHandle = createLanguageMap(root.querySelector("#map")!, familyLangs, (id) => {
    setRoute(pathOf(familyId, featureSelect.value, id))
  })

  let geoIds: Set<string> | null = null
  let values: Record<string, string> = {}

  const paint = async (nextFeature: Feature, clade: string) => {
    values = await featureValues(nextFeature.id)
    const node = findFamilyNode(tree, clade) ?? tree
    const cladeLeaves = collectLeaves(node)
    const visible = geoIds ? cladeLeaves.filter((id) => geoIds!.has(id)) : cladeLeaves
    const visibleLangs = visible.flatMap((id) => {
      const lang = byId.get(id)
      return lang && lang.lat != null && lang.lon != null ? [lang] : []
    })
    root.querySelector("#sunburst-status")!.textContent =
      t("sunburst.status", { name: node.name, n: visible.length }) + (geoIds ? t("sunburst.mapFilter") : "")
    const present = [...new Set(cladeLeaves.map((id) => values[id]).filter(Boolean))]
    const colors = colorForCodes(present)
    root.querySelector("#legend")!.innerHTML = present
      .map((code) => {
        const name = codeLabel(nextFeature, code)
        const n = cladeLeaves.filter((id) => values[id] === code).length
        return `<div class="legend-row"><span class="swatch" style="background:${cssColor(colors.get(code) ?? "")}"></span><span>${escapeHtml(name)}</span><span class="muted">${n}</span></div>`
      })
      .join("")
    renderSunburst(root.querySelector("#sunburst")!, tree, nextFeature, values, {
      selectedId: clade === tree.id ? undefined : clade,
      geoIds,
      onPick: (pick) => setRoute(pathOf(familyId, nextFeature.id, pick.id)),
    })
    await mapHandle.setFeature(nextFeature, values, cladeLeaves.includes(clade) ? clade : undefined)
    mapHandle.setIdFilter(new Set(visible))
    mapHandle.fitLanguages(visibleLangs)
  }

  familySelect.addEventListener("change", () => setRoute(pathOf(familySelect.value, featureSelect.value)))
  featureSelect.addEventListener("change", () => setRoute(pathOf(familyId, featureSelect.value, cladeId === tree.id ? undefined : cladeId)))
  root.querySelector("#geo-filter")!.addEventListener("click", () => {
    const bounds = mapHandle.map.getBounds()
    geoIds = new Set(
      familyLangs
        .filter((l) => l.lat != null && l.lon != null && bounds.contains([l.lon!, l.lat!]))
        .map((l) => l.id),
    )
    void paint(feature, cladeId)
  })
  root.querySelector("#clear-filters")!.addEventListener("click", () => {
    geoIds = null
    setRoute(pathOf(familyId, featureSelect.value))
  })

  await paint(feature, cladeId)
  requestAnimationFrame(() => {
    mapHandle.map.resize()
    renderSunburst(root.querySelector("#sunburst")!, tree, feature, values, {
      selectedId: cladeId === tree.id ? undefined : cladeId,
      geoIds,
      onPick: (pick) => setRoute(pathOf(familyId, feature.id, pick.id)),
    })
  })
  return () => mapHandle.destroy()
}

function pathOf(family: string, feature: string, clade?: string): string {
  const q = new URLSearchParams({ fam: family, f: feature })
  if (clade) q.set("c", clade)
  return `/sunburst?${q.toString()}`
}

function countLeaves(node: FamilyNode | undefined): number {
  if (!node) return 0
  return collectLeaves(node).length
}
