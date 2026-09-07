import { href } from "../router.ts"
import { stats as loadStats } from "../data.ts"

const GLOSSARY = [
  {
    term: "Morphology",
    def: "How words are built from smaller pieces (roots, prefixes, suffixes, tone changes). Case endings and gender markers are morphological.",
  },
  {
    term: "Syntax",
    def: "How words combine into phrases and clauses. Word order, adpositions, and relative clauses are syntactic topics.",
  },
  {
    term: "Phonology",
    def: "The sound system of a language: which consonants and vowels it has, and whether tone or stress distinguish words.",
  },
  {
    term: "Linguistic typology",
    def: "Comparison of languages by structural type rather than by family history. WALS and Grambank are typological databases.",
  },
  {
    term: "Language family",
    def: "A group of languages descended from a common ancestor (Mayan, Indo-European, Austronesian). Genealogy is not the same as geography.",
  },
  {
    term: "Sprachbund / areal linguistics",
    def: "A linguistic area where languages share features through contact even when they are unrelated. The Balkans and Mesoamerica are classic examples.",
  },
]

export async function renderLearn(root: HTMLElement): Promise<() => void> {
  const stats = await loadStats()
  root.innerHTML = `
    <section class="page learn">
      <h1>A first path through typology</h1>
      <ol class="path">
        <li>Start at the <a href="${href("/")}">library</a> and describe what you want, or take a volume from the shelf. The atlas is the map, not the whole bookshelf.</li>
        <li><a href="${href("/language/kich1262")}">Open K'iche'</a> — Mayan, listed in WALS as Quiché. Word order is sparsely coded there; open Tz'utujil or Kaqchikel on the map for VOS.</li>
        <li>On that page, open the <strong>family tree</strong> and the <strong>nearest languages</strong> lists.</li>
        <li><a href="${href("/atlas?f=wals:81A")}">Map word order</a> and find VOS in Mesoamerica versus the Eurasian SOV belt.</li>
        <li><a href="${href("/investigate/neighbors")}">Tour Mesoamerica</a> and compare relatives with unrelated neighbors.</li>
      </ol>
      <h2>Glossary</h2>
      <dl class="glossary">
        ${GLOSSARY.map((g) => `<dt>${g.term}</dt><dd>${g.def}</dd>`).join("")}
      </dl>
      <h2>What the percentages mean</h2>
      <p>Structural similarity is the share of <em>overlapping coded features</em> with the same value. A language with 7 WALS features cannot be compared fairly to one with 120 unless we require a minimum overlap (here WALS ≥ ${stats.minOverlap.wals}, Grambank ≥ ${stats.minOverlap.grambank}). Always read the “on N features” note.</p>
      <h2>Sources</h2>
      <ul class="citations">
        ${Object.values(stats.datasets)
          .map((d) => `<li>${d.citation}${d.doi ? ` (${d.doi})` : ""} · ${d.license} · ${d.tag}</li>`)
          .join("")}
      </ul>
    </section>
  `
  return () => {}
}
