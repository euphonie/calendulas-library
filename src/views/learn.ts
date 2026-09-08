import { href } from "../router.ts"
import { stats as loadStats } from "../data.ts"
import { t } from "../i18n.ts"
import { icon } from "../icons.ts"

const GLOSSARY = [
  ["learn.g.morphology", "learn.g.morphologyDef"],
  ["learn.g.syntax", "learn.g.syntaxDef"],
  ["learn.g.phonology", "learn.g.phonologyDef"],
  ["learn.g.typology", "learn.g.typologyDef"],
  ["learn.g.family", "learn.g.familyDef"],
  ["learn.g.bund", "learn.g.bundDef"],
] as const

export async function renderLearn(root: HTMLElement): Promise<() => void> {
  const stats = await loadStats()
  root.innerHTML = `
    <section class="page learn">
      <h1 class="with-icon">${icon("learn", 28)}${t("learn.title")}</h1>
      <ol class="path">
        <li>${t("learn.p1", { library: `<a href="${href("/")}">${t("learn.library")}</a>` })}</li>
        <li>${t("learn.p2", { open: `<a href="${href("/language/kich1262")}">${t("learn.openKiche")}</a>` })}</li>
        <li>${t("learn.p3", { tree: `<strong>${t("learn.tree")}</strong>`, near: `<strong>${t("learn.near")}</strong>` })}</li>
        <li>${t("learn.p4", { map: `<a href="${href("/atlas?f=wals:81A")}">${t("learn.mapOrder")}</a>` })}</li>
        <li>${t("learn.p5", { tour: `<a href="${href("/investigate/neighbors")}">${t("learn.tour")}</a>` })}</li>
      </ol>
      <h2 class="with-icon">${icon("learn", 22)}${t("learn.glossary")}</h2>
      <dl class="glossary">
        ${GLOSSARY.map(([term, def]) => `<dt>${t(term)}</dt><dd>${t(def)}</dd>`).join("")}
      </dl>
      <h2 class="with-icon">${icon("percent", 22)}${t("learn.pctTitle")}</h2>
      <p>${t("learn.pctBody", { wals: stats.minOverlap.wals, gb: stats.minOverlap.grambank })}</p>
      <h2 class="with-icon">${icon("sources", 22)}${t("learn.sources")}</h2>
      <ul class="citations">
        ${Object.values(stats.datasets)
          .map((d) => `<li>${d.citation}${d.doi ? ` (${d.doi})` : ""} · ${d.license} · ${d.tag}</li>`)
          .join("")}
      </ul>
    </section>
  `
  return () => {}
}
