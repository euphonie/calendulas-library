export type FamilyNode = { id: string; name: string; language?: boolean; children: FamilyNode[] }

export type Language = {
  id: string
  name: string
  walsId: string | null
  walsName: string | null
  gbId: string | null
  iso: string | null
  familyId: string | null
  familyName: string | null
  genus: string | null
  familyPath: { id: string; name: string }[]
  lat: number | null
  lon: number | null
  macroarea: string | null
  walsN: number
  grambankN: number
}

export type FeatureCode = { id: string; name: string; number?: string | null }

export type Feature = {
  id: string
  source: "wals" | "grambank"
  sourceId: string
  name: string
  area: string
  curriculum: boolean
  blurb: string
  codes: FeatureCode[]
  url: string
}

export type Neighbor = {
  id: string
  name: string
  score: number | null
  nShared: number
  sameFamily: boolean
  distanceKm: number | null
}

export type Route =
  | { view: "hub"; q?: string }
  | { view: "atlas"; feature?: string; lang?: string }
  | { view: "sunburst"; family?: string; feature?: string; clade?: string }
  | { view: "language"; id: string }
  | { view: "investigate"; lesson: string }
  | { view: "learn" }
  | { view: "compare"; a?: string; b?: string }
  | { view: "notebook"; lang?: string; payload?: string }
