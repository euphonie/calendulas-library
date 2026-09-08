import type { Language } from "./types.ts"
import { href } from "./router.ts"
import { investigateIntents, tools, type ToolDef } from "./tools.ts"

const STOP = new Set(["a", "an", "the", "of", "for", "to", "in", "on", "and", "or", "is", "are", "do", "does", "me", "my", "please"])

export type Match = {
  tool: ToolDef
  score: number
  reason: string
  href: string
}

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9'\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokens(text: string): string[] {
  return norm(text)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t))
}

function findLanguage(langs: Language[], query: string): Language | undefined {
  const q = norm(query)
  if (q.length < 2) return undefined
  const direct = langs.find(
    (l) =>
      norm(l.name) === q ||
      (l.walsName && norm(l.walsName) === q) ||
      (l.iso && l.iso.toLowerCase() === q) ||
      l.id === q,
  )
  if (direct) return direct
  const hits = langs.filter(
    (l) =>
      norm(l.name).startsWith(q) ||
      norm(l.name).includes(q) ||
      (l.walsName && norm(l.walsName).includes(q)),
  )
  hits.sort((a, b) => a.name.length - b.name.length)
  return hits[0]
}

function splitPair(query: string): [string, string] | undefined {
  const raw = query.trim()
  const cmp = raw.match(/^(?:compare|contrast)\s+(.+?)\s+(?:and|vs\.?|versus|with|to)\s+(.+)$/i)
  if (cmp?.[1] && cmp[2]) return [cmp[1], cmp[2]]
  const vs = raw.split(/\s+(?:vs\.?|versus)\s+/i)
  if (vs.length === 2 && vs[0] && vs[1]) return [vs[0], vs[1]]
  return undefined
}

export function matchIntent(query: string, langs: Language[]): Match[] {
  const q = norm(query)
  if (!q) return tools.map((tool) => ({ tool, score: 0, reason: "Browse the catalog.", href: href(tool.href) }))

  const pair = splitPair(query)
  if (pair) {
    const a = findLanguage(langs, pair[0])
    const b = findLanguage(langs, pair[1])
    const compare = tools.find((t) => t.id === "compare")!
    if (a && b) {
      return [
        {
          tool: compare,
          score: 1,
          reason: `Pair match: ${a.name} × ${b.name}.`,
          href: href(`/compare?a=${a.id}&b=${b.id}`),
        },
      ]
    }
  }

  const stripped = query.replace(
    /^(tell me about|profile of|open|look up|lookup|family tree for|nearest languages to)\s+/i,
    "",
  )
  const named = findLanguage(langs, stripped) ?? (stripped === query ? findLanguage(langs, query) : undefined)
  const explicitLang = stripped !== query && Boolean(named)
  const exactName = Boolean(named && q === norm(named.name))
  if (named && (explicitLang || exactName)) {
    const dossier = tools.find((t) => t.id === "dossier")!
    const rest = scoreTools(q).filter((m) => m.tool.id !== "dossier")
    return [
      {
        tool: dossier,
        score: 0.94,
        reason: `Language match: ${named.name}.`,
        href: href(`/language/${named.id}`),
      },
      ...rest,
    ].sort((a, b) => b.score - a.score)
  }

  const ranked = scoreTools(q)
  if (/notebook|write a sentence|type a phrase|example sentence|phrase in|specimen/.test(q)) {
    const nb = tools.find((t) => t.id === "notebook")
    if (nb) {
      return [
        { tool: nb, score: 0.97, reason: "A phrase specimen in a named language.", href: href("/notebook") },
        ...ranked.filter((m) => m.tool.id !== "notebook"),
      ]
    }
  }
  if (/sunburst|feature rings?|spread by family|family or contact|inherited or/.test(q) || /genealog.*geograph|geograph.*genealog/.test(q)) {
    const sun = tools.find((t) => t.id === "sunburst")
    if (sun) {
      const hrefPath = /\bsov\b|word order/.test(q) ? "/sunburst?fam=indo1319&f=wals:81A" : sun.href
      return [
        { tool: sun, score: 0.96, reason: "Linked genealogy and geography.", href: href(hrefPath) },
        ...ranked.filter((m) => m.tool.id !== "sunburst"),
      ]
    }
  }
  const top = ranked[0]
  if (top?.tool.id === "investigate") {
    const lesson = investigateIntents
      .map((lesson) => ({
        lesson,
        hits: lesson.keywords.filter((k) => q.includes(k)).length,
      }))
      .sort((a, b) => b.hits - a.hits)[0]
    if (lesson && lesson.hits) {
      top.href = href(lesson.lesson.href)
      top.reason = `Investigate · ${lesson.lesson.id}`
    }
  }
  if (top?.tool.id === "atlas") {
    if (/\btone\b/.test(q)) top.href = href("/atlas?f=wals:13A")
    else if (/\bcase\b/.test(q)) top.href = href("/atlas?f=wals:49A")
    else if (/\bgender\b/.test(q)) top.href = href("/atlas?f=wals:30A")
    else if (/adposition|preposition|postposition/.test(q)) top.href = href("/atlas?f=wals:85A")
    else if (/consonant|inventory/.test(q)) top.href = href("/atlas?f=wals:1A")
    else if (/word order|sov|svo|vos|vso/.test(q)) top.href = href("/atlas?f=wals:81A")
  }
  return ranked
}

function scoreTools(q: string): Match[] {
  const qTokens = tokens(q)
  return tools
    .map((tool) => {
      let score = 0
      const hits: string[] = []
      if (q.includes(norm(tool.name))) {
        score += 0.45
        hits.push(tool.name)
      }
      for (const phrase of tool.phrases) {
        if (q.includes(norm(phrase))) {
          score += 0.22
          hits.push(phrase)
        }
      }
      for (const key of tool.keywords) {
        const k = norm(key)
        if (k.length > 2 && q.includes(k)) {
          score += 0.08
          hits.push(key)
        }
      }
      const overlap = qTokens.filter((t) => tool.keywords.some((k) => norm(k).includes(t) || t.includes(norm(k))))
      score += Math.min(0.2, overlap.length * 0.04)
      return {
        tool,
        score: Math.min(1, score),
        reason: hits.length ? `Matched ${[...new Set(hits)].slice(0, 4).join(", ")}.` : "Weak lexical overlap.",
        href: href(tool.href),
      }
    })
    .sort((a, b) => b.score - a.score)
}
