import * as d3 from "d3"
import type { Feature } from "../types.ts"
import { colorForCodes } from "../format.ts"

export function renderHeatmap(
  container: HTMLElement,
  rowFeature: Feature,
  colFeature: Feature,
  rowCodes: string[],
  colCodes: string[],
  table: number[][],
): void {
  container.replaceChildren()
  const cell = 36
  const left = 92
  const top = 28
  const width = left + colCodes.length * cell + 16
  const height = top + rowCodes.length * cell + 28
  const max = d3.max(table.flat()) || 1
  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "heatmap")
  const rowColors = colorForCodes(rowCodes)
  svg
    .append("g")
    .selectAll("text")
    .data(colCodes)
    .join("text")
    .attr("x", (_, i) => left + i * cell + cell / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("class", "heat-label")
    .text((d) => colFeature.codes.find((c) => c.id === d)?.name ?? d)
  svg
    .append("g")
    .selectAll("text")
    .data(rowCodes)
    .join("text")
    .attr("x", left - 8)
    .attr("y", (_, i) => top + i * cell + cell / 2 + 4)
    .attr("text-anchor", "end")
    .attr("class", "heat-label")
    .text((d) => rowFeature.codes.find((c) => c.id === d)?.name ?? d)
  const cells = rowCodes.flatMap((r, i) => colCodes.map((c, j) => ({ r, c, i, j, n: table[i]?.[j] ?? 0 })))
  svg
    .append("g")
    .selectAll("rect")
    .data(cells)
    .join("rect")
    .attr("x", (d) => left + d.j * cell + 2)
    .attr("y", (d) => top + d.i * cell + 2)
    .attr("width", cell - 4)
    .attr("height", cell - 4)
    .attr("rx", 4)
    .attr("fill", (d) => rowColors.get(d.r) ?? "#042a22")
    .attr("fill-opacity", (d) => 0.15 + (0.85 * d.n) / max)
  svg
    .append("g")
    .selectAll("text")
    .data(cells)
    .join("text")
    .attr("x", (d) => left + d.j * cell + cell / 2)
    .attr("y", (d) => top + d.i * cell + cell / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("class", "heat-n")
    .text((d) => (d.n ? String(d.n) : ""))
}
