export const MAX_PHRASE_CHARS = 800
export const GLOTTOCODE = /^[a-z]{4}\d{4}$/
export const FEATURE_ID = /^(wals|gb):[A-Za-z0-9._-]+$/
const PAYLOAD = /^v1\.[A-Za-z0-9_-]+$/

const SCRIPT_RANGES: { name: string; from: number; to: number; rtl?: boolean }[] = [
  { name: "Latin", from: 0x0041, to: 0x024f },
  { name: "Latin", from: 0x1e00, to: 0x1eff },
  { name: "Latin", from: 0x2c60, to: 0x2c7f },
  { name: "IPA", from: 0x0250, to: 0x02af },
  { name: "Greek", from: 0x0370, to: 0x03ff },
  { name: "Cyrillic", from: 0x0400, to: 0x04ff },
  { name: "Armenian", from: 0x0530, to: 0x058f },
  { name: "Hebrew", from: 0x0590, to: 0x05ff, rtl: true },
  { name: "Arabic", from: 0x0600, to: 0x06ff, rtl: true },
  { name: "Syriac", from: 0x0700, to: 0x074f, rtl: true },
  { name: "Thaana", from: 0x0780, to: 0x07bf, rtl: true },
  { name: "N'Ko", from: 0x07c0, to: 0x07ff, rtl: true },
  { name: "Devanagari", from: 0x0900, to: 0x097f },
  { name: "Bengali", from: 0x0980, to: 0x09ff },
  { name: "Gurmukhi", from: 0x0a00, to: 0x0a7f },
  { name: "Gujarati", from: 0x0a80, to: 0x0aff },
  { name: "Oriya", from: 0x0b00, to: 0x0b7f },
  { name: "Tamil", from: 0x0b80, to: 0x0bff },
  { name: "Telugu", from: 0x0c00, to: 0x0c7f },
  { name: "Kannada", from: 0x0c80, to: 0x0cff },
  { name: "Malayalam", from: 0x0d00, to: 0x0d7f },
  { name: "Sinhala", from: 0x0d80, to: 0x0d7f },
  { name: "Thai", from: 0x0e00, to: 0x0e7f },
  { name: "Lao", from: 0x0e80, to: 0x0eff },
  { name: "Tibetan", from: 0x0f00, to: 0x0fff },
  { name: "Myanmar", from: 0x1000, to: 0x109f },
  { name: "Georgian", from: 0x10a0, to: 0x10ff },
  { name: "Hangul", from: 0x1100, to: 0x11ff },
  { name: "Ethiopic", from: 0x1200, to: 0x137f },
  { name: "Cherokee", from: 0x13a0, to: 0x13ff },
  { name: "Canadian Aboriginal", from: 0x1400, to: 0x167f },
  { name: "Khmer", from: 0x1780, to: 0x17ff },
  { name: "Mongolian", from: 0x1800, to: 0x18af },
  { name: "Tifinagh", from: 0x2d30, to: 0x2d7f, rtl: true },
  { name: "Hiragana", from: 0x3040, to: 0x309f },
  { name: "Katakana", from: 0x30a0, to: 0x30ff },
  { name: "Han", from: 0x3400, to: 0x4dbf },
  { name: "Han", from: 0x4e00, to: 0x9fff },
  { name: "Yi", from: 0xa000, to: 0xa48f },
  { name: "Hangul", from: 0xac00, to: 0xd7af },
  { name: "Han", from: 0x20000, to: 0x2a6df },
]

const COMBINING: [number, number][] = [
  [0x0300, 0x036f],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0x20d0, 0x20ff],
  [0xfe20, 0xfe2f],
]

export function isGlottocode(id: string): boolean {
  return GLOTTOCODE.test(id)
}

export function isFeatureId(value: string): boolean {
  return FEATURE_ID.test(value)
}

export function sanitizePhrase(raw: string): { text: string; truncated: boolean } {
  let text = raw.normalize("NFC").replace(/\r\n?/g, "\n")
  text = [...text]
    .filter((ch) => {
      const c = ch.codePointAt(0)!
      if (c === 9 || c === 10) return true
      if (c < 32 || c === 127) return false
      return true
    })
    .join("")
  const truncated = [...text].length > MAX_PHRASE_CHARS
  if (truncated) text = [...text].slice(0, MAX_PHRASE_CHARS).join("")
  return { text, truncated }
}

export function encodePhrasePayload(raw: string): string {
  const { text } = sanitizePhrase(raw)
  if (!text) return ""
  return `v1.${toBase64Url(new TextEncoder().encode(text))}`
}

export function decodePhrasePayload(p: string | null | undefined): string {
  if (!p || !PAYLOAD.test(p)) return ""
  const bytes = fromBase64Url(p.slice(3))
  if (!bytes) return ""
  try {
    return sanitizePhrase(new TextDecoder("utf-8", { fatal: true }).decode(bytes)).text
  } catch {
    return ""
  }
}

export function notebookPath(langId: string, raw: string): string {
  const q = new URLSearchParams()
  if (isGlottocode(langId)) q.set("lang", langId)
  const payload = encodePhrasePayload(raw)
  if (payload) q.set("p", payload)
  const qs = q.toString()
  return qs ? `/notebook?${qs}` : "/notebook"
}

export type PhraseInspect = {
  graphemes: number
  tokens: number
  scripts: { name: string; n: number }[]
  direction: "ltr" | "rtl" | "mixed"
  combiningMarks: number
}

export function inspectPhrase(text: string): PhraseInspect {
  const graphemes = segment(text, "grapheme")
  const tokens = wordTokens(text)
  const counts = new Map<string, { n: number; rtl: boolean }>()
  let combiningMarks = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (isCombining(cp)) combiningMarks += 1
    const hit = scriptOf(cp)
    if (!hit) continue
    const cur = counts.get(hit.name) ?? { n: 0, rtl: hit.rtl }
    cur.n += 1
    counts.set(hit.name, cur)
  }
  const scripts = [...counts.entries()]
    .map(([name, v]) => ({ name, n: v.n }))
    .sort((a, b) => b.n - a.n)
  const rtlN = [...counts.values()].filter((v) => v.rtl).reduce((s, v) => s + v.n, 0)
  const ltrN = [...counts.values()].filter((v) => !v.rtl).reduce((s, v) => s + v.n, 0)
  const direction = rtlN && ltrN ? "mixed" : rtlN ? "rtl" : "ltr"
  return { graphemes: graphemes.length, tokens: tokens.length, scripts, direction, combiningMarks }
}

export function atlasFeatureForPhrase(info: PhraseInspect): string {
  return info.combiningMarks > 0 ? "wals:13A" : "wals:81A"
}

function scriptOf(cp: number): { name: string; rtl: boolean } | undefined {
  for (const row of SCRIPT_RANGES) {
    if (cp >= row.from && cp <= row.to) return { name: row.name, rtl: Boolean(row.rtl) }
  }
  return undefined
}

function isCombining(cp: number): boolean {
  return COMBINING.some(([a, b]) => cp >= a && cp <= b)
}

function segment(text: string, granularity: "grapheme" | "word"): string[] {
  const Seg = (Intl as typeof Intl & { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (!Seg) {
    return granularity === "word" ? text.trim().split(/\s+/).filter(Boolean) : [...text]
  }
  return [...new Seg(undefined, { granularity }).segment(text)].map((s) => s.segment)
}

function wordTokens(text: string): string[] {
  const Seg = (Intl as typeof Intl & { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (Seg) {
    return [...new Seg(undefined, { granularity: "word" }).segment(text)]
      .filter((s) => s.isWordLike)
      .map((s) => s.segment)
  }
  return text.trim().split(/\s+/).filter(Boolean)
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(s: string): Uint8Array | null {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}
