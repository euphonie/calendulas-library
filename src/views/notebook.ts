import type { Language, Route } from "../types.ts"
import {
  codeLabel,
  featureIndex,
  featureValues,
  languageMap,
  neighbors as loadNeighbors,
  searchLanguages,
  vectors as loadVectors,
} from "../data.ts"
import { href } from "../router.ts"
import { escapeHtml } from "../format.ts"
import {
  atlasFeatureForPhrase,
  decodePhrasePayload,
  inspectPhrase,
  isGlottocode,
  MAX_PHRASE_CHARS,
  notebookPath,
  sanitizePhrase,
} from "../phrase.ts"
import { createLanguageMap, type MapHandle } from "../viz/map.ts"
import { t, type MsgKey } from "../i18n.ts"
import { icon, withIcon, type IconName } from "../icons.ts"

const HERO_KEYS = ["order", "adpositions", "tone", "gender", "case", "adjNoun", "consonants"] as const

export async function renderNotebook(
  root: HTMLElement,
  langs: Language[],
  route: Extract<Route, { view: "notebook" }>,
): Promise<() => void> {
  const [byId, index, vecs, neighAll] = await Promise.all([
    languageMap(),
    featureIndex(),
    loadVectors(),
    loadNeighbors(),
  ])
  const features = new Map(index.features.map((f) => [f.id, f]))
  const initialLang = route.lang && isGlottocode(route.lang) ? byId.get(route.lang) : undefined
  const initialText = decodePhrasePayload(route.payload)

  root.innerHTML = `
    <section class="page notebook-page">
      <p class="kicker with-icon">${icon("notebook", 16)}${t("nb.kicker")}</p>
      <h1 class="with-icon">${icon("notebook", 28)}${t("nb.title")}</h1>
      <p class="blurb">${t("nb.blurb")}</p>
      <div class="notebook-desk">
        <label class="field notebook-lang">
          <span>${icon("language")}${t("nb.language")}</span>
          <div class="notebook-lang-box">
            ${icon("search")}
            <input id="nb-lang" type="search" autocomplete="off" placeholder="${t("search.languages")}" />
            <div id="nb-hits" class="hits" hidden></div>
          </div>
          <p class="meta" id="nb-lang-label"></p>
        </label>
        <label class="field notebook-text">
          <span>${icon("phrase")}${t("nb.phrase")}</span>
          <textarea id="nb-text" rows="5" maxlength="${MAX_PHRASE_CHARS}" placeholder="Saqarik. ¿La utz awach?"></textarea>
          <p class="meta" id="nb-count"></p>
        </label>
      </div>
      <div class="notebook-share">
        <button type="button" class="btn" id="nb-copy">${withIcon("copy", t("nb.copy"))}</button>
        <p class="muted" id="nb-share-note">${t("nb.shareNote")}</p>
      </div>
      <div id="nb-results" class="notebook-results"></div>
      <div id="nb-map" class="notebook-map hidden"></div>
    </section>
  `

  const langInput = root.querySelector<HTMLInputElement>("#nb-lang")!
  const hits = root.querySelector<HTMLElement>("#nb-hits")!
  const langLabel = root.querySelector<HTMLElement>("#nb-lang-label")!
  const textarea = root.querySelector<HTMLTextAreaElement>("#nb-text")!
  const countEl = root.querySelector<HTMLElement>("#nb-count")!
  const results = root.querySelector<HTMLElement>("#nb-results")!
  const copyBtn = root.querySelector<HTMLButtonElement>("#nb-copy")!
  const shareNote = root.querySelector<HTMLElement>("#nb-share-note")!

  let selected: Language | undefined = initialLang
  textarea.value = initialText
  if (selected) langInput.value = selected.name

  const mapHost = root.querySelector<HTMLElement>("#nb-map")!
  let mapHandle: MapHandle | null = null
  let debounce: number | undefined

  const hideHits = () => {
    hits.hidden = true
    hits.replaceChildren()
  }

  function syncHash(): void {
    const path = notebookPath(selected?.id ?? "", textarea.value)
    const url = new URL(window.location.href)
    url.hash = `#${path}`
    if (url.href === window.location.href) return
    history.replaceState(null, "", url)
  }

  function paintLangLabel(): void {
    langLabel.textContent = selected
      ? `${selected.name} · ${selected.id}${selected.familyName ? ` · ${selected.familyName}` : ""}`
      : t("nb.pickLang")
  }

  function paintCount(): void {
    const { text, truncated } = sanitizePhrase(textarea.value)
    const n = [...text].length
    countEl.textContent = truncated
      ? t("nb.truncated", { n, max: MAX_PHRASE_CHARS })
      : t("nb.chars", { n, max: MAX_PHRASE_CHARS })
  }

  async function paintResults(): Promise<void> {
    const { text, truncated } = sanitizePhrase(textarea.value)
    paintCount()
    paintLangLabel()
    results.replaceChildren()

    if (!text && !selected) {
      const p = document.createElement("p")
      p.className = "muted"
      p.textContent = t("nb.empty")
      results.append(p)
      mapHost.classList.add("hidden")
      return
    }

    if (text) {
      const info = inspectPhrase(text)
      const slip = document.createElement("section")
      slip.className = "card"
      const h = document.createElement("h2")
      h.textContent = t("nb.slip")
      h.className = "with-icon"
      h.insertAdjacentHTML("afterbegin", icon("phrase", 22))
      slip.append(h)
      const quote = document.createElement("blockquote")
      quote.className = "notebook-quote"
      quote.textContent = text
      slip.append(quote)
      const dl = document.createElement("dl")
      dl.className = "hero-grid"
      const rows: [string, string][] = [
        [t("nb.graphemes"), String(info.graphemes)],
        [t("nb.tokens"), String(info.tokens)],
        [t("nb.scripts"), info.scripts.length ? info.scripts.map((s) => `${s.name} (${s.n})`).join(", ") : t("uncoded")],
        [t("nb.direction"), info.direction.toUpperCase()],
        [t("nb.combining"), String(info.combiningMarks)],
      ]
      if (truncated) rows.push([t("nb.shareCap"), t("nb.keptFirst", { n: MAX_PHRASE_CHARS })])
      for (const [dtLabel, dd] of rows) {
        const wrap = document.createElement("div")
        const dtEl = document.createElement("dt")
        dtEl.textContent = dtLabel
        const d = document.createElement("dd")
        d.textContent = dd
        wrap.append(dtEl, d)
        dl.append(wrap)
      }
      slip.append(dl)
      const note = document.createElement("p")
      note.className = "muted"
      note.textContent = t("nb.slipNote")
      slip.append(note)
      results.append(slip)
    }

    if (!selected) {
      mapHost.classList.add("hidden")
      return
    }

    mapHost.classList.remove("hidden")

    const vec = vecs[selected.id] ?? {}
    const profile = document.createElement("section")
    profile.className = "hero-card"
    profile.innerHTML = `<p class="kicker">${escapeHtml(selected.familyName ?? t("ungrouped"))} · ${escapeHtml(selected.macroarea ?? "")}</p>
      <h2>${escapeHtml(selected.name)}</h2>
      <p class="meta">${t("nb.meta", { wals: selected.walsN, gb: selected.grambankN, id: escapeHtml(selected.id) })}</p>
      <dl class="hero-grid"></dl>`
    const grid = profile.querySelector("dl")!
    for (const key of HERO_KEYS) {
      const fid = index.hero[key]
      const feat = features.get(fid)
      const wrap = document.createElement("div")
      const dtEl = document.createElement("dt")
      dtEl.textContent = t(`hero.${key}` as MsgKey)
      const dd = document.createElement("dd")
      dd.textContent = feat ? codeLabel(feat, vec[fid]) : "—"
      wrap.append(dtEl, dd)
      grid.append(wrap)
    }
    results.append(profile)

    const jumps = document.createElement("nav")
    jumps.className = "hub-jumps"
    jumps.setAttribute("aria-label", t("nb.openIn"))
    const info = inspectPhrase(text)
    const featId = atlasFeatureForPhrase(info)
    const neighbor = neighAll[selected.id]?.combined[0]
    const links: [IconName, string, string][] = [
      ["atlas", t("nb.jumps.atlas"), `/atlas?f=${encodeURIComponent(featId)}&lang=${encodeURIComponent(selected.id)}`],
      [
        "sunburst",
        t("nb.jumps.sunburst"),
        selected.familyId
          ? `/sunburst?fam=${encodeURIComponent(selected.familyId)}&f=${encodeURIComponent(featId)}`
          : "/sunburst",
      ],
      ["profile", t("nb.jumps.dossier"), `/language/${encodeURIComponent(selected.id)}`],
    ]
    if (neighbor) {
      links.push(["compare", t("nb.compareNearest"), `/compare?a=${encodeURIComponent(selected.id)}&b=${encodeURIComponent(neighbor.id)}`])
    }
    for (const [ic, label, path] of links) {
      const a = document.createElement("a")
      a.className = "hub-jump"
      a.href = href(path)
      a.innerHTML = withIcon(ic, label)
      jumps.append(a)
    }
    results.append(jumps)

    if (!mapHandle) {
      mapHandle = createLanguageMap(mapHost, langs, (id) => {
        selected = byId.get(id)
        if (selected) langInput.value = selected.name
        void paintResults()
        syncHash()
      })
    }

    const values = await featureValues(featId)
    const feature = features.get(featId) ?? features.get(index.defaultFeature)!
    await mapHandle.setFeature(feature, values, selected.id)
    mapHandle.flyTo(selected)
    mapHandle.map.resize()
  }

  langInput.addEventListener("input", () => {
    const found = searchLanguages(langs, langInput.value)
    if (!found.length) {
      hideHits()
      return
    }
    hits.hidden = false
    hits.replaceChildren()
    for (const lang of found) {
      const a = document.createElement("a")
      a.href = "#"
      a.textContent = `${lang.name} `
      const m = document.createElement("span")
      m.className = "muted"
      m.textContent = lang.familyName ?? lang.id
      a.append(m)
      a.addEventListener("click", (e) => {
        e.preventDefault()
        selected = lang
        langInput.value = lang.name
        hideHits()
        void paintResults()
        syncHash()
      })
      hits.append(a)
    }
  })

  textarea.addEventListener("input", () => {
    paintCount()
    window.clearTimeout(debounce)
    debounce = window.setTimeout(() => {
      void paintResults()
      syncHash()
    }, 220)
  })

  copyBtn.addEventListener("click", async () => {
    syncHash()
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      shareNote.textContent = t("nb.shareCopied")
    } catch {
      shareNote.textContent = t("nb.shareFail")
    }
  })

  document.addEventListener("click", onDocClick)
  function onDocClick(e: MouseEvent): void {
    if (!(e.target instanceof Node)) return
    if (!hits.contains(e.target) && e.target !== langInput) hideHits()
  }

  void paintResults()
  syncHash()

  return () => {
    window.clearTimeout(debounce)
    document.removeEventListener("click", onDocClick)
    mapHandle?.destroy()
    mapHandle = null
  }
}
