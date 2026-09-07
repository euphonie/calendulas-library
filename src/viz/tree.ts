import * as d3 from "d3"
import type { FamilyNode } from "../types.ts"
import { href } from "../router.ts"

export function renderTree(container: HTMLElement, rootData: FamilyNode, selectedId?: string): void {
  container.replaceChildren()
  const root = d3.hierarchy(rootData)
  const dx = 18
  const dy = 168
  const tree = d3.tree<FamilyNode>().nodeSize([dx, dy])
  const laid = tree(root)
  let minX = Infinity
  let maxX = -Infinity
  laid.each((d) => {
    minX = Math.min(minX, d.x)
    maxX = Math.max(maxX, d.x)
  })
  const width = Math.max(640, (laid.height + 1) * dy + 80)
  const height = maxX - minX + 48
  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", [-40, minX - 24, width, height])
    .attr("class", "family-tree")
    .attr("role", "img")
    .attr("aria-label", `Family tree for ${rootData.name}`)

  svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#b7d39a")
    .attr("stroke-width", 1)
    .selectAll("path")
    .data(laid.links())
    .join("path")
    .attr("d", (d) => {
      const link = d3.linkHorizontal<{ source: { x: number; y: number }; target: { x: number; y: number } }, { x: number; y: number }>()
        .x((n) => n.y)
        .y((n) => n.x)
      return link({ source: { x: d.source.x, y: d.source.y }, target: { x: d.target.x, y: d.target.y } })
    })

  const node = svg
    .append("g")
    .selectAll("g")
    .data(laid.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.y},${d.x})`)

  node
    .append("circle")
    .attr("r", (d) => (d.data.id === selectedId ? 5.5 : 3.2))
    .attr("fill", (d) => (d.data.language ? (d.data.id === selectedId ? "#042a22" : "#8fbf5a") : "#ffffff"))
    .attr("stroke", "#042a22")
    .attr("stroke-width", 1)

  node
    .append("a")
    .attr("href", (d) => (d.data.language ? href(`/language/${d.data.id}`) : href(`/atlas?lang=${d.data.id}`)))
    .append("text")
    .attr("dy", "0.32em")
    .attr("x", (d) => (d.children ? -8 : 8))
    .attr("text-anchor", (d) => (d.children ? "end" : "start"))
    .attr("class", (d) => (d.data.id === selectedId ? "tree-label selected" : "tree-label"))
    .text((d) => d.data.name)
}
