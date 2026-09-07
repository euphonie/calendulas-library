import type { Route } from "./types.ts"

export function parseRoute(hash = window.location.hash): Route {
  const raw = hash.replace(/^#/, "") || "/"
  const url = new URL(raw, "https://atlas.local")
  const path = url.pathname.replace(/\/+$/, "") || "/"
  const q = url.searchParams
  if (path === "/") {
    return { view: "hub", q: q.get("q") || undefined }
  }
  if (path === "/atlas") {
    return { view: "atlas", feature: q.get("f") || undefined, lang: q.get("lang") || undefined }
  }
  if (path === "/sunburst") {
    return {
      view: "sunburst",
      family: q.get("fam") || undefined,
      feature: q.get("f") || undefined,
      clade: q.get("c") || undefined,
    }
  }
  if (path.startsWith("/language/")) {
    return { view: "language", id: decodeURIComponent(path.slice("/language/".length)) }
  }
  if (path.startsWith("/investigate")) {
    const lesson = path.split("/")[2] || "sov"
    return { view: "investigate", lesson }
  }
  if (path === "/learn") return { view: "learn" }
  if (path === "/compare") return { view: "compare", a: q.get("a") || undefined, b: q.get("b") || undefined }
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
