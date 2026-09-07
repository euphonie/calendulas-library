import type { Feature, Language } from "../types.ts"
import { featureIndex, featureValues, languageMap, languages as loadLangs } from "../data.ts"
import { href, setRoute } from "../router.ts"
import { colorForCodes } from "../format.ts"
import { theme } from "../theme.ts"
import { createLanguageMap, type MapHandle } from "../viz/map.ts"

export async function renderAtlas(
  root: HTMLElement,
  opts: { feature?: string; lang?: string },
): Promise<() => void> {
  const [index, langs, byId] = await Promise.all([featureIndex(), loadLangs(), languageMap()])
  const features = new Map(index.features.map((f) => [f.id, f]))
  const feature = features.get(opts.feature || index.defaultFeature) ?? features.get(index.defaultFeature)!

  root.innerHTML = `
    <section class="atlas">
      <aside class="atlas-side">
        <label class="field">
          <span>Feature</span>
          <select id="feature-select"></select>
        </label>
        <p class="blurb" id="feature-blurb"></p>
        <p class="meta"><a id="feature-source" target="_blank" rel="noreferrer">Original chapter</a></p>
        <div class="legend" id="legend"></div>
        <div class="panel" id="lang-panel">
          <p class="muted">Click a language on the map. Grey dots are uncoded for this feature — WALS and Grambank are sparse by design.</p>
        </div>
      </aside>
      <div class="atlas-map" id="map"></div>
    </section>
  `

  const select = root.querySelector<HTMLSelectElement>("#feature-select")!
  const curriculum = index.features.filter((f) => f.curriculum)
  const restWals = index.features.filter((f) => f.source === "wals" && !f.curriculum)
  const restGb = index.features.filter((f) => f.source === "grambank")
  const groups: [string, Feature[]][] = [
    ["Start here", curriculum],
    ["WALS", restWals],
    ["Grambank", restGb],
  ]
  for (const [label, items] of groups) {
    const g = document.createElement("optgroup")
    g.label = label
    for (const item of items) {
      const opt = document.createElement("option")
      opt.value = item.id
      opt.textContent = `${item.sourceId} · ${item.name}`
      g.append(opt)
    }
    select.append(g)
  }
  select.value = feature.id

  const mapHandle: MapHandle = createLanguageMap(root.querySelector("#map")!, langs, (id) => {
    setRoute(`/atlas?f=${encodeURIComponent(select.value)}&lang=${encodeURIComponent(id)}`)
  })

  async function paint(next: Feature, langId?: string) {
    root.querySelector("#feature-blurb")!.textContent =
      next.blurb || `${next.area} coding from ${next.source === "wals" ? "WALS" : "Grambank"}.`
    const src = root.querySelector<HTMLAnchorElement>("#feature-source")!
    src.href = next.url
    src.textContent = next.source === "wals" ? `WALS ${next.sourceId}` : `Grambank ${next.sourceId}`
    const values = await featureValues(next.id)
    const present = [...new Set(Object.values(values))]
    const colors = colorForCodes(present)
    const uncodedN = langs.filter((l) => l.lat != null && values[l.id] == null).length
    const groups = [
      ...present.map((code) => ({
        code,
        name: next.codes.find((c) => c.id === code)?.name ?? code,
        n: Object.values(values).filter((v) => v === code).length,
        color: colors.get(code) ?? theme.uncoded,
      })),
      ...(uncodedN ? [{ code: "", name: "Not coded", n: uncodedN, color: theme.uncoded }] : []),
    ]
    const legend = root.querySelector("#legend")!
    legend.innerHTML = `
      <div class="legend-toolbar">
        <button type="button" class="btn-ghost" id="labels-all">Show all labels</button>
      </div>
      ${groups
        .map(
          (g) => `<div class="legend-row" data-code="${escapeAttr(g.code)}">
            <button type="button" class="layer-toggle" aria-pressed="true" aria-label="Show or hide ${escapeAttr(g.name)}">
              <span class="swatch" style="background:${g.color}"></span>
            </button>
            <span class="legend-name">${g.name}</span>
            <span class="muted">${g.n}</span>
            <button type="button" class="label-toggle" aria-pressed="false" aria-label="Labels for ${escapeAttr(g.name)}">Labels</button>
          </div>`,
        )
        .join("")}
    `
    await mapHandle.setFeature(next, values, langId)
    const allLabels = legend.querySelector<HTMLButtonElement>("#labels-all")!
    const syncAllLabelsCaption = () => {
      const on = [...legend.querySelectorAll<HTMLButtonElement>(".label-toggle")].every((b) => b.getAttribute("aria-pressed") === "true")
      allLabels.textContent = on ? "Hide all labels" : "Show all labels"
    }
    allLabels.addEventListener("click", () => {
      const turnOn = allLabels.textContent?.startsWith("Show")
      legend.querySelectorAll<HTMLButtonElement>(".label-toggle").forEach((btn) => {
        btn.setAttribute("aria-pressed", turnOn ? "true" : "false")
        const row = btn.closest<HTMLElement>(".legend-row")
        if (row) mapHandle.setLabelsVisible(row.dataset.code ?? "", Boolean(turnOn))
      })
      syncAllLabelsCaption()
    })
    legend.querySelectorAll<HTMLElement>(".legend-row").forEach((row) => {
      const code = row.dataset.code ?? ""
      row.querySelector(".layer-toggle")!.addEventListener("click", () => {
        const btn = row.querySelector<HTMLButtonElement>(".layer-toggle")!
        const nextOn = btn.getAttribute("aria-pressed") !== "true"
        btn.setAttribute("aria-pressed", String(nextOn))
        row.classList.toggle("is-off", !nextOn)
        mapHandle.setGroupVisible(code, nextOn)
      })
      row.querySelector(".label-toggle")!.addEventListener("click", () => {
        const btn = row.querySelector<HTMLButtonElement>(".label-toggle")!
        const nextOn = btn.getAttribute("aria-pressed") !== "true"
        btn.setAttribute("aria-pressed", String(nextOn))
        mapHandle.setLabelsVisible(code, nextOn)
        syncAllLabelsCaption()
      })
    })
    if (langId) {
      const lang = byId.get(langId)
      if (lang) {
        mapHandle.flyTo(lang)
        showPanel(lang, next, values[lang.id])
      }
    }
  }

  function showPanel(lang: Language, feat: Feature, code: string | undefined) {
    const label = feat.codes.find((c) => c.id === code)?.name ?? (code ? code : "not coded")
    root.querySelector("#lang-panel")!.innerHTML = `
      <h2>${lang.name}</h2>
      <p class="meta">${lang.familyName ?? "family unknown"} · ${lang.macroarea ?? "macroarea unknown"}</p>
      <p><strong>${feat.sourceId}:</strong> ${label}</p>
      <p class="row-links">
        <a href="${href(`/language/${lang.id}`)}">Open profile</a>
        <a href="${href(`/compare?a=${lang.id}`)}">Compare</a>
      </p>
    `
  }

  select.addEventListener("change", () => {
    setRoute(`/atlas?f=${encodeURIComponent(select.value)}${opts.lang ? `&lang=${opts.lang}` : ""}`)
  })

  await paint(feature, opts.lang)
  requestAnimationFrame(() => mapHandle.map.resize())
  return () => mapHandle.destroy()
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}
