import { Chart, BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip } from "chart.js"
import { codeLabel, featureIndex, languageMap, stats as loadStats, featureValues } from "../data.ts"
import { href, setRoute } from "../router.ts"
import { renderHeatmap } from "../viz/heatmap.ts"
import { createLanguageMap } from "../viz/map.ts"
import { neighbors as loadNeighbors, languages as loadLangs } from "../data.ts"
import { QUALITATIVE, theme } from "../theme.ts"

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip)

const LESSONS = [
  { id: "sov", title: "Why are SOV languages geographically common?" },
  { id: "postpositions", title: "Which features correlate with postpositions?" },
  { id: "neighbors", title: "How similar are unrelated neighboring languages?" },
  { id: "genealogy", title: "How much does genealogy explain typological similarity?" },
]

export async function renderInvestigate(root: HTMLElement, lesson: string): Promise<() => void> {
  const current = LESSONS.some((l) => l.id === lesson) ? lesson : "sov"
  root.innerHTML = `
    <section class="page investigate">
      <nav class="lesson-nav">
        ${LESSONS.map((l) => `<a class="${l.id === current ? "on" : ""}" href="${href(`/investigate/${l.id}`)}">${l.title}</a>`).join("")}
      </nav>
      <div id="lesson"></div>
    </section>
  `
  const mount = root.querySelector<HTMLElement>("#lesson")!
  if (current === "sov") return sovLesson(mount)
  if (current === "postpositions") return postpositionLesson(mount)
  if (current === "neighbors") return neighborLesson(mount)
  return genealogyLesson(mount)
}

async function sovLesson(root: HTMLElement): Promise<() => void> {
  const [stats, index, langs, values] = await Promise.all([
    loadStats(),
    featureIndex(),
    loadLangs(),
    featureValues("wals:81A"),
  ])
  const feat = index.features.find((f) => f.id === "wals:81A")!
  const codes = [...new Set(stats.sovMacroarea.areas.flatMap((a) => Object.keys(a.codes)))]
  root.innerHTML = `
    <article>
      <h1>SOV on the map</h1>
      <p>Subject–object–verb (SOV) is the most widely attested dominant order in WALS. It is especially dense across a belt from South Asia through Inner Asia. That is geography plus large families (for example Indo-Iranian, Turkic, Dravidian), not a law of nature. Click the map, then compare macroareas in the chart.</p>
      <div class="atlas-map lesson-map" id="map"></div>
      <canvas id="sov-chart" height="180"></canvas>
      <p class="muted">Uncoded languages are grey. WALS 81A does not sample every language equally; treat the bars as a teaching sketch. See also <a href="${feat.url}" target="_blank" rel="noreferrer">WALS 81A</a>.</p>
    </article>
  `
  const handle = createLanguageMap(root.querySelector("#map")!, langs, (id) => setRoute(`/language/${id}`))
  await handle.setFeature(feat, values)
  requestAnimationFrame(() => handle.map.resize())
  const chart = new Chart(root.querySelector<HTMLCanvasElement>("#sov-chart")!, {
    type: "bar",
    data: {
      labels: stats.sovMacroarea.areas.map((a) => a.area),
      datasets: codes.map((code, i) => ({
        label: codeLabel(feat, code),
        data: stats.sovMacroarea.areas.map((a) => a.codes[code] || 0),
        backgroundColor: QUALITATIVE[i % QUALITATIVE.length],
      })),
    },
    options: { plugins: { legend: { position: "bottom" } }, scales: { x: { stacked: true }, y: { stacked: true } } },
  })
  return () => {
    chart.destroy()
    handle.destroy()
  }
}

async function postpositionLesson(root: HTMLElement): Promise<() => void> {
  const [stats, index] = await Promise.all([loadStats(), featureIndex()])
  const focus = index.features.find((f) => f.id === "wals:85A")!
  const pairIds = ["wals:81A", "wals:87A", "wals:88A"]
  root.innerHTML = `
    <article>
      <h1>Postpositions and harmonic word order</h1>
      <p>Languages that put adpositions after the noun (postpositions) tend to put the verb last and the adjective before or after the noun in patterned ways. Dryer and others call this harmonic word order. The heatmaps count languages coded for both features. Cramér’s V is a 0–1 association strength; it is not a causal proof.</p>
      <div id="heatmaps" class="heat-grid"></div>
    </article>
  `
  const box = root.querySelector("#heatmaps")!
  for (const pid of pairIds) {
    const other = index.features.find((f) => f.id === pid)!
    const cell = stats.postpositions.pairs[pid]
    if (!cell) continue
    const wrap = document.createElement("section")
    wrap.className = "card"
    wrap.innerHTML = `<h3>${focus.sourceId} × ${other.sourceId} ${other.name}</h3>
      <p class="meta">n = ${cell.n} · Cramér’s V = ${cell.cramersV}</p>
      <div class="heat-target"></div>
      <p class="muted">${other.blurb}</p>`
    box.append(wrap)
    renderHeatmap(wrap.querySelector(".heat-target")!, focus, other, cell.rowCodes, cell.colCodes, cell.table)
  }
  return () => {}
}

async function neighborLesson(root: HTMLElement): Promise<() => void> {
  const [stats, byId, neighAll] = await Promise.all([loadStats(), languageMap(), loadNeighbors()])
  const seeds = stats.sprachbundTours.filter((t) => byId.has(t.seed))
  root.innerHTML = `
    <article>
      <h1>Neighbors versus relatives</h1>
      <p>A <em>Sprachbund</em> is a region where unrelated languages share structure through contact. Pick a tour, then compare genealogical closeness with geographic neighbors who are <em>not</em> in the same family.</p>
      <div class="tour-picks">
        ${seeds.map((t) => `<button class="btn-ghost" data-seed="${t.seed}">${t.name}</button>`).join("")}
      </div>
      <div id="tour"></div>
    </article>
  `
  const tour = root.querySelector("#tour")!
  const show = (seed: string) => {
    const lang = byId.get(seed)!
    const spec = seeds.find((t) => t.seed === seed)
    const n = neighAll[seed]
    tour.innerHTML = `
      <p>${spec?.blurb ?? ""} <a href="${href(`/language/${lang.id}`)}">Open ${lang.name}</a></p>
      <div class="split">
        <section class="card"><h3>Structural neighbors</h3>
          <ol class="neighbors">${(n?.combined ?? [])
            .slice(0, 8)
            .map(
              (r) =>
                `<li><a href="${href(`/language/${r.id}`)}">${r.name}</a> <span class="score">${Math.round((r.score ?? 0) * 100)}%</span> <span class="muted">${r.sameFamily ? "same family" : "different family"} · ${r.nShared} features</span></li>`,
            )
            .join("")}</ol></section>
        <section class="card"><h3>Unrelated geographic neighbors</h3>
          <ol class="neighbors">${(n?.geoUnrelated ?? [])
            .slice(0, 8)
            .map(
              (r) =>
                `<li><a href="${href(`/language/${r.id}`)}">${r.name}</a> <span class="score">${r.distanceKm} km</span></li>`,
            )
            .join("")}</ol></section>
      </div>
    `
  }
  root.querySelectorAll<HTMLButtonElement>("[data-seed]").forEach((btn) =>
    btn.addEventListener("click", () => show(btn.dataset.seed!)),
  )
  if (seeds[0]) show(seeds[0].seed)
  return () => {}
}

async function genealogyLesson(root: HTMLElement): Promise<() => void> {
  const stats = await loadStats()
  root.innerHTML = `
    <article>
      <h1>Genealogy versus typology</h1>
      <p>Related languages should look alike if features are inherited. Contact and chance also produce similarity. These bars use each language’s top combined-feature neighbors (not all pairs), so large families and missing data bias the picture.</p>
      <canvas id="gen-chart" height="160"></canvas>
      <canvas id="dist-chart" height="160"></canvas>
      <p class="notice">${stats.genealogy.note}</p>
    </article>
  `
  const labels: Record<string, string> = {
    sameGenus: "Same WALS genus",
    sameFamily: "Same family, different genus",
    differentFamily: "Different family",
  }
  const a = new Chart(root.querySelector<HTMLCanvasElement>("#gen-chart")!, {
    type: "bar",
    data: {
      labels: stats.genealogy.byGenealogy.map((r) => `${labels[r.key] ?? r.key} (n=${r.n})`),
      datasets: [{ label: "Mean similarity of top neighbors", data: stats.genealogy.byGenealogy.map((r) => r.mean), backgroundColor: theme.yellow }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { suggestedMin: 0, suggestedMax: 1 } } },
  })
  const b = new Chart(root.querySelector<HTMLCanvasElement>("#dist-chart")!, {
    type: "bar",
    data: {
      labels: stats.genealogy.byDistance.map((r) => `${r.key} (n=${r.n})`),
      datasets: [{ label: "Mean similarity by distance", data: stats.genealogy.byDistance.map((r) => r.mean), backgroundColor: theme.rust }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { suggestedMin: 0, suggestedMax: 1 } } },
  })
  return () => {
    a.destroy()
    b.destroy()
  }
}
