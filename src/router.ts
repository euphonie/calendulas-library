import type { Route } from "./types.ts"
import { isFeatureId, isGlottocode } from "./phrase.ts"

const LESSONS = new Set(["sov", "postpositions", "neighbors", "genealogy"])
const MAX_QUERY = 400

function glotto(value: string | null): string | undefined {
  if (!value) return undefined
  return isGlottocode(value) ? value : undefined
}

function featureId(value: string | null): string | undefined {
  if (!value) return undefined
  return isFeatureId(value) ? value : undefined
}

function clipQuery(value: string | null): string | undefined {
  if (!value) return undefined
  const text = value.slice(0, MAX_QUERY)
  return text || undefined
}

export function parseRoute(hash = window.location.hash): Route {
  const raw = hash.replace(/^#/, "") || "/"
  const url = new URL(raw, "https://atlas.local")
  const path = url.pathname.replace(/\/+$/, "") || "/"
  const q = url.searchParams
  if (path === "/") {
    return { view: "hub", q: clipQuery(q.get("q")) }
  }
  if (path === "/atlas") {
    return { view: "atlas", feature: featureId(q.get("f")), lang: glotto(q.get("lang")) }
  }
  if (path === "/sunburst") {
    return {
      view: "sunburst",
      family: glotto(q.get("fam")),
      feature: featureId(q.get("f")),
      clade: glotto(q.get("c")),
    }
  }
  if (path.startsWith("/language/")) {
    return { view: "language", id: glotto(decodeURIComponent(path.slice("/language/".length))) ?? "" }
  }
  if (path.startsWith("/investigate")) {
    const lesson = path.split("/")[2] || "sov"
    return { view: "investigate", lesson: LESSONS.has(lesson) ? lesson : "sov" }
  }
  if (path === "/learn") return { view: "learn" }
  if (path === "/notebook") {
    return { view: "notebook", lang: glotto(q.get("lang")), payload: q.get("p") || undefined }
  }
  if (path === "/compare") return { view: "compare", a: glotto(q.get("a")), b: glotto(q.get("b")) }
  return { view: "hub" }
}

export function setRoute(path: string): void {
  const next = path.startsWith("#") ? path : `#${path}`
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"))
    return
  }
  window.location.hash = next
}

export function href(path: string): string {
  return `#${path}`
}
