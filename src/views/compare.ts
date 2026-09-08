import type { Feature } from "../types.ts"
import { codeLabel, featureIndex, languageMap, searchLanguages, vectors as loadVectors, languages as loadLangs } from "../data.ts"
import { href, setRoute } from "../router.ts"
import { escapeHtml } from "../format.ts"
import { t } from "../i18n.ts"
import { icon, withIcon } from "../icons.ts"

export async function renderCompare(root: HTMLElement, aId?: string, bId?: string): Promise<() => void> {
  const [langs, byId, index, vecs] = await Promise.all([loadLangs(), languageMap(), featureIndex(), loadVectors()])
  const a = aId ? byId.get(aId) : undefined
  const b = bId ? byId.get(bId) : undefined
  root.innerHTML = `
    <section class="page">
      <h1 class="with-icon">${icon("compare", 28)}${t("compare.title")}</h1>
      <div class="compare-picks">
        <label class="field"><span>${icon("language")}${t("compare.a")}</span> <input id="a" list="lang-list" value="${escapeHtml(a?.name ?? "")}" /></label>
        <label class="field"><span>${icon("language")}${t("compare.b")}</span> <input id="b" list="lang-list" value="${escapeHtml(b?.name ?? "")}" /></label>
        <datalist id="lang-list"></datalist>
        <button id="go" type="button" class="btn">${withIcon("compare", t("compare.go"))}</button>
      </div>
      <div id="table"></div>
    </section>
  `
  const list = root.querySelector("#lang-list")!
  langs.slice(0, 400).forEach((l) => {
    const o = document.createElement("option")
    o.value = l.name
    list.append(o)
  })

  const resolve = (text: string) => {
    const q = text.trim().toLowerCase()
    return byId.get(q) || langs.find((l) => l.name.toLowerCase() === q) || searchLanguages(langs, text, 1)[0]
  }

  const paint = () => {
    if (!a || !b) {
      root.querySelector("#table")!.innerHTML = `<p class="muted">${t("compare.pick")}</p>`
      return
    }
    const va = vecs[a.id] || {}
    const vb = vecs[b.id] || {}
    const ids = [...new Set([...Object.keys(va), ...Object.keys(vb)])]
      .map((id) => index.features.find((f) => f.id === id)!)
      .filter(Boolean)
      .sort((x, y) => Number(y.curriculum) - Number(x.curriculum) || x.id.localeCompare(y.id))
    const wals = ids.filter((f) => f.source === "wals")
    const gb = ids.filter((f) => f.source === "grambank")
    const walsBlock = sourceBlock(t("compare.wals"), wals, va, vb, a.name, b.name)
    const gbBlock = sourceBlock(t("compare.gb"), gb, va, vb, a.name, b.name)
    root.querySelector("#table")!.innerHTML = `
      <p>${t("compare.agree", {
        a: `<a href="${href(`/language/${a.id}`)}">${escapeHtml(a.name)}</a>`,
        b: `<a href="${href(`/language/${b.id}`)}">${escapeHtml(b.name)}</a>`,
      })}</p>
      <div class="compare-scores">
        <p>${walsBlock.score}</p>
        <p>${gbBlock.score}</p>
        <p class="muted">${t("lang.gbNote")}</p>
      </div>
      ${walsBlock.html}
      ${gbBlock.html}
    `
  }

  root.querySelector("#go")!.addEventListener("click", () => {
    const nextA = resolve((root.querySelector("#a") as HTMLInputElement).value)
    const nextB = resolve((root.querySelector("#b") as HTMLInputElement).value)
    if (nextA && nextB) setRoute(`/compare?a=${nextA.id}&b=${nextB.id}`)
  })
  paint()
  return () => {}
}

function sourceBlock(
  source: string,
  feats: Feature[],
  va: Record<string, string>,
  vb: Record<string, string>,
  aName: string,
  bName: string,
): { score: string; html: string } {
  let agree = 0
  let both = 0
  const rows = feats.map((f) => {
    const same = Boolean(va[f.id] && vb[f.id] && va[f.id] === vb[f.id])
    if (va[f.id] && vb[f.id]) {
      both += 1
      if (same) agree += 1
    }
    return `<tr class="${same ? "agree" : va[f.id] && vb[f.id] ? "differ" : ""}">
      <td>${escapeHtml(`${f.sourceId} ${f.name}`)}</td>
      <td>${escapeHtml(codeLabel(f, va[f.id]))}</td>
      <td>${escapeHtml(codeLabel(f, vb[f.id]))}</td>
    </tr>`
  })
  const score = both
    ? t("compare.sourceAgree", { source, agree, both })
    : t("compare.sourceEmpty", { source })
  const table = feats.length
    ? `<table class="data"><thead><tr><th>${t("compare.feature")}</th><th>${escapeHtml(aName)}</th><th>${escapeHtml(bName)}</th></tr></thead>
      <tbody>${rows.join("")}</tbody></table>`
    : `<p class="muted">${t("lang.noFeats")}</p>`
  return {
    score,
    html: `<section class="compare-source"><h2>${escapeHtml(source)}</h2>${table}</section>`,
  }
}
