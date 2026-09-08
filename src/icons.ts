/** Inline stroke icons in the same hand as the Ko-fi cup. */

import { escapeHtml } from "./format.ts"

export type IconName =
  | "flower"
  | "hub"
  | "atlas"
  | "sunburst"
  | "investigate"
  | "learn"
  | "notebook"
  | "compare"
  | "search"
  | "locale"
  | "open"
  | "copy"
  | "filter"
  | "clear"
  | "labels"
  | "profile"
  | "tree"
  | "neighbors"
  | "feature"
  | "phrase"
  | "language"
  | "question"
  | "shelf"
  | "percent"
  | "sources"
  | "heatmap"
  | "external"
  | "coffee"

const stroke = `fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"`

function svg(inner: string, size: number): string {
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`
}

const PATHS: Record<IconName, string> = {
  flower: `<circle cx="12" cy="7.2" r="2.4" fill="#d4532a" stroke="none"/><circle cx="8.4" cy="9.2" r="2" fill="#d4532a" stroke="none"/><circle cx="15.6" cy="9.2" r="2" fill="#d4532a" stroke="none"/><path ${stroke} d="M12 9.5v11 M9 16c1.4 1.4 2.6 1.4 3 1.4s1.6 0 3-1.4"/>`,
  hub: `<path ${stroke} d="M5 7h4v13H5zM10.5 4h3.5v16H10.5zM16 8h4v12h-4z"/>`,
  atlas: `<path ${stroke} d="M12 21s6.5-6.4 7-11.2A7 7 0 1 0 5 9.8C5.5 14.6 12 21 12 21z"/><circle cx="12" cy="9.4" r="2.1" ${stroke}/>`,
  sunburst: `<circle cx="12" cy="12" r="3.2" ${stroke}/><path ${stroke} d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21M5.4 5.4l2.3 2.3M16.3 16.3l2.3 2.3M5.4 18.6l2.3-2.3M16.3 7.7l2.3-2.3"/>`,
  investigate: `<circle cx="12" cy="12" r="9" ${stroke}/><path ${stroke} d="M12 4.5v3.2M12 16.3V19.5M4.5 12h3.2M16.3 12h3.2M12 8.2 13.8 12 12 15.8 10.2 12 12 8.2z"/>`,
  learn: `<path ${stroke} d="M4 6c2.2 0 4.2.8 8 .8S17.8 6 20 6v13c-2.2 0-4.2.8-8 .8s-5.8-.8-8-.8V6zM12 6.8v13"/>`,
  notebook: `<path ${stroke} d="M7 4h12v16H8.2A2.2 2.2 0 0 1 6 17.8V6.2A2.2 2.2 0 0 1 8.2 4H7z"/><path ${stroke} d="M10 9h7M10 13h7M10 17h4"/>`,
  compare: `<path ${stroke} d="M4.5 6h6.5v13H4.5zM13 6h6.5v13H13z"/>`,
  search: `<circle cx="11" cy="11" r="6.2" ${stroke}/><path ${stroke} d="M16.2 16.2 21 21"/>`,
  locale: `<circle cx="12" cy="12" r="9" ${stroke}/><path ${stroke} d="M3 12h18M12 3c3.2 3.6 3.2 14.4 0 18M12 3c-3.2 3.6-3.2 14.4 0 18"/>`,
  open: `<path ${stroke} d="M4 12h13M13.5 6.5 20 12l-6.5 5.5"/>`,
  copy: `<path ${stroke} d="M8 8h11v12H8z"/><path ${stroke} d="M5 16V4h11"/>`,
  filter: `<path ${stroke} d="M4 5h16l-5.8 7.2V19l-4.4 2v-8.8L4 5z"/>`,
  clear: `<path ${stroke} d="M6 6l12 12M18 6 6 18"/>`,
  labels: `<path ${stroke} d="M3.8 12.2 12.5 4h7.7v8.2l-8.7 8.7-7.7-8.7z"/><circle cx="16.2" cy="8.2" r="1.15" fill="currentColor" stroke="none"/>`,
  profile: `<circle cx="12" cy="8" r="3.4" ${stroke}/><path ${stroke} d="M5 20.2c1.4-3.6 3.8-5.4 7-5.4s5.6 1.8 7 5.4"/>`,
  tree: `<path ${stroke} d="M12 21V11M12 11 6.5 5.5M12 11l5.5-5.5M6.5 5.5H10M14 5.5h3.5M8.5 13.5 12 11l3.5 2.5"/>`,
  neighbors: `<circle cx="8" cy="8.2" r="2.6" ${stroke}/><circle cx="16" cy="8.2" r="2.6" ${stroke}/><circle cx="12" cy="16.6" r="2.6" ${stroke}/>`,
  feature: `<path ${stroke} d="M12 3.8 4.5 8 12 12.2 19.5 8 12 3.8zM4.5 12.2 12 16.4l7.5-4.2M4.5 16.4 12 20.6l7.5-4.2"/>`,
  phrase: `<path ${stroke} d="M6 8.5c0-2 1.4-3.5 3.5-3.5v3.2c-1.2 0-2 .7-2 2.1H11V18H6V8.5zM13 8.5c0-2 1.4-3.5 3.5-3.5v3.2c-1.2 0-2 .7-2 2.1H18V18h-5V8.5z"/>`,
  language: `<path ${stroke} d="M5 5.5h14v10.5H9.2L5 20V5.5z"/>`,
  question: `<circle cx="12" cy="12" r="9" ${stroke}/><path ${stroke} d="M9.4 9.2a2.6 2.6 0 1 1 3.4 2.4c-.7.5-1.3 1.1-1.3 2.2M12 17.2h.01"/>`,
  shelf: `<path ${stroke} d="M4 19h16M6 19V8.5l4 2.2V19M14 19V7l4 2.4V19"/>`,
  percent: `<path ${stroke} d="M6.5 18 17.5 6"/><circle cx="8" cy="7.5" r="2.1" ${stroke}/><circle cx="16" cy="16.5" r="2.1" ${stroke}/>`,
  sources: `<path ${stroke} d="M6 7h12M6 12h12M6 17h8"/>`,
  heatmap: `<path ${stroke} d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"/>`,
  external: `<path ${stroke} d="M10 6h9v9M19 6l-9.5 9.5M6 10.5v8h9"/>`,
  coffee: `<path ${stroke} d="M7.2 6.2h9.6v1.7H7.2zM8 7.9h8l-.9 10.6c-.12.9-.88 1.55-1.8 1.55h-2.6c-.92 0-1.68-.65-1.8-1.55L8 7.9zM16 10.6h1.8c1.3 0 2.3 1 2.3 2.2s-1 2.2-2.3 2.2H16"/>`,
}

export function icon(name: IconName, size = 16): string {
  return svg(PATHS[name], size)
}

export function withIcon(name: IconName, text: string, size = 16): string {
  return `${icon(name, size)}${escapeHtml(text)}`
}

export const NAV_ICONS: Record<string, IconName> = {
  hub: "hub",
  atlas: "atlas",
  sunburst: "sunburst",
  investigate: "investigate",
  learn: "learn",
  notebook: "notebook",
  compare: "compare",
}

export const TOOL_ICONS: Record<string, IconName> = {
  atlas: "atlas",
  sunburst: "sunburst",
  dossier: "profile",
  compare: "compare",
  investigate: "investigate",
  learn: "learn",
  notebook: "notebook",
}
