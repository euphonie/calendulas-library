import { QUALITATIVE } from "./theme.ts"

export function colorForCodes(codes: string[]): Map<string, string> {
  const map = new Map<string, string>()
  codes.forEach((code, i) => map.set(code, QUALITATIVE[i % QUALITATIVE.length]))
  return map
}

export function pct(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "—"
  return `${Math.round(score * 100)}%`
}
