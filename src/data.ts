import type { Feature, Language, Neighbor } from "./types.ts"

const cache = new Map<string, Promise<unknown>>()
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`

function load<T>(path: string): Promise<T> {
  const url = asset(path)
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${url}`)
        return res.json()
      }),
    )
  }
  return cache.get(url) as Promise<T>
}

export type FeatureIndex = {
  curriculum: string[]
  hero: Record<string, string>
  defaultFeature: string
  features: Feature[]
}

export type Stats = {
  sovMacroarea: {
    feature: string
    areas: { area: string; codes: Record<string, number> }[]
  }
  postpositions: {
    focus: string
    pairs: Record<
      string,
      {
        feature: string
        n: number
        cramersV: number
        rowCodes: string[]
        colCodes: string[]
        table: number[][]
        conditional: { code: string; n: number; given: { code: string; p: number; n: number }[] }[]
      }
    >
  }
  genealogy: {
    byGenealogy: { key: string; n: number; mean: number }[]
    byDistance: { key: string; n: number; mean: number }[]
    note: string
  }
  minOverlap: { wals: number; grambank: number; combined: number }
  sprachbundTours: { id: string; name: string; seed: string; blurb: string }[]
  datasets: Record<string, { citation: string; doi?: string; license: string; tag: string }>
}

export const languages = () => load<Language[]>("data/languages.json")
export const featureIndex = () => load<FeatureIndex>("data/features.json")
export const stats = () => load<Stats>("data/stats.json")
export const neighbors = () =>
  load<Record<string, { wals: Neighbor[]; grambank: Neighbor[]; combined: Neighbor[]; geoUnrelated: Neighbor[] }>>(
    "data/neighbors.json",
  )
export const vectors = () => load<Record<string, Record<string, string>>>("data/vectors.json")
export const trees = () =>
  load<{ families: { id: string; name: string }[]; trees: Record<string, import("./types.ts").FamilyNode> }>(
    "data/trees.json",
  )
export const featureValues = (featureId: string) =>
  load<Record<string, string>>(`data/values/${featureId.replace(":", "_")}.json`)

export async function languageMap(): Promise<Map<string, Language>> {
  const list = await languages()
  return new Map(list.map((l) => [l.id, l]))
}

export function searchLanguages(list: Language[], query: string, limit = 12): Language[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored = list
    .map((lang) => {
      const fields = [lang.name, lang.walsName, lang.iso, lang.id, lang.familyName, lang.genus]
        .filter(Boolean)
        .map((s) => s!.toLowerCase())
      let score = 0
      if (fields[0] === q) score = 100
      else if (fields.some((f) => f === q)) score = 80
      else if (fields.some((f) => f.startsWith(q))) score = 60
      else if (fields.some((f) => f.includes(q))) score = 40
      return { lang, score }
    })
    .filter((x) => x.score)
    .sort((a, b) => b.score - a.score || a.lang.name.localeCompare(b.lang.name))
  return scored.slice(0, limit).map((x) => x.lang)
}

export function codeLabel(feature: Feature, code: string | undefined): string {
  if (!code) return "not coded"
  return feature.codes.find((c) => c.id === code)?.name ?? code
}
