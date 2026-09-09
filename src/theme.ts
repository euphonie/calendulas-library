import { Chart } from "chart.js"

/** Calendula mockup palette: cream paper, mustard, calendula red, teal, ink. */
export const theme = {
  bg: "#f9f6ee",
  panel: "#fdfbf7",
  ink: "#1a1510",
  muted: "#5a4e43",
  line: "#d9d0c2",
  yellow: "#f4d03f",
  rust: "#c41e2a",
  wine: "#5c3d8f",
  cream: "#fdfbf7",
  land: "#f1ead6",
  landLine: "#c6bda7",
  ocean: "#a9cec4",
  uncoded: "#b8b3a8",
  highlight: "#1a1510",
} as const

export const QUALITATIVE = [
  "#c41e2a", "#1a7a6d", "#2d5fa3", "#5c3d8f",
  "#e07a2a", "#1a1510", "#f4d03f", "#0e6b8a",
  "#c41e6c", "#2f7a3a", "#8b3c2a", "#4a6b8c",
]

export const FACET = ["#1a7a6d", "#5c3d8f", "#2d5fa3", "#c41e2a", "#e07a2a"] as const

export function applyChartTheme(): void {
  Chart.defaults.color = theme.muted
  Chart.defaults.borderColor = "rgba(17, 17, 17, 0.18)"
  Chart.defaults.font.family = '"DM Sans", "Segoe UI", sans-serif'
  Chart.defaults.plugins.legend.labels.color = theme.ink
  const scale = Chart.defaults.scale
  if (scale.grid) scale.grid.color = "rgba(17, 17, 17, 0.12)"
  if (scale.ticks) scale.ticks.color = theme.muted
}
