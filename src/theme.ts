import { Chart } from "chart.js"

/** Light lime field, forest ink — high contrast without a dark shell. */
export const theme = {
  bg: "#c8f29a",
  panel: "#ffffff",
  ink: "#042a22",
  muted: "#3f6b58",
  line: "#b7d39a",
  yellow: "#042a22",
  rust: "#d4532a",
  wine: "#9b2c40",
  cream: "#042a22",
  land: "#b7d48a",
  landLine: "#6a9a58",
  ocean: "#eef6e4",
  uncoded: "#8a9a80",
  highlight: "#042a22",
} as const

export const QUALITATIVE = [
  "#d4532a",
  "#1578a0",
  "#6b3d9e",
  "#c23048",
  "#042a22",
  "#c48a00",
  "#1f7a45",
  "#e07a5f",
  "#3d6b8c",
  "#b86b2a",
  "#5a7c3a",
  "#8b4c7a",
]

export function applyChartTheme(): void {
  Chart.defaults.color = theme.muted
  Chart.defaults.borderColor = theme.line
  Chart.defaults.font.family = '"DM Sans", "Segoe UI", sans-serif'
  Chart.defaults.plugins.legend.labels.color = theme.ink
  const scale = Chart.defaults.scale
  if (scale.grid) scale.grid.color = "rgba(4, 42, 34, 0.08)"
  if (scale.ticks) scale.ticks.color = theme.muted
}
