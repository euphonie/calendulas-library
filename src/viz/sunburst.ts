import * as d3 from "d3"
import type { FamilyNode, Feature } from "../types.ts"
import { codeLabel } from "../data.ts"
import { colorForCodes } from "../format.ts"
import { theme } from "../theme.ts"

export type SunburstPick = { id: string; name: string; language: boolean }

type ArcNode = d3.HierarchyRectangularNode<FamilyNode>

function leafIds(node: FamilyNode, into: string[] = []): string[] {
  if (node.language) into.push(node.id)
  for (const child of node.children ?? []) leafIds(child, into)
  return into
}

function descendantLeaves(d: ArcNode): string[] {
  return leafIds(d.data)
}

export function renderSunburst(
  container: HTMLElement,
  tree: FamilyNode,
  feature: Feature,
  values: Record<string, string>,
  opts: {
    selectedId?: string
    geoIds?: Set<string> | null
    onPick: (pick: SunburstPick) => void
  },
): void {
  container.replaceChildren()
  const width = Math.max(container.clientWidth || 560, 420)
  const height = Math.max(container.clientHeight || 560, 420)
  const radius = Math.min(width, height) / 2 - 8
  const colors = colorForCodes([...new Set(Object.values(values).map(String))])

  const root = d3
    .partition<FamilyNode>()
    .size([2 * Math.PI, radius])(
      d3
        .hierarchy(tree)
        .sum((d) => (d.language ? 1 : 0))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    )

  const genealogyMax = Math.max(
    ...root.descendants().filter((d) => !d.data.language).map((d) => d.y1),
    radius * 0.55,
  )
  const innerScale = (radius * 0.68) / genealogyMax

  const genealogyArc = d3
    .arc<ArcNode>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle(0.004)
    .innerRadius((d) => Math.max(18, d.y0 * innerScale))
    .outerRadius((d) => Math.max(22, d.y1 * innerScale - 1.5))

  const featureArc = d3
    .arc<ArcNode>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle(0.003)
    .innerRadius(radius * 0.72)
    .outerRadius(radius * 0.96)

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("class", "sunburst")
    .attr("role", "img")
    .attr("aria-label", `Genealogy sunburst for ${tree.name}`)

  const geo = opts.geoIds
  const selected = opts.selectedId
  const inGeo = (d: ArcNode) => {
    if (!geo) return true
    return descendantLeaves(d).some((id) => geo.has(id))
  }

  function emphasized(d: ArcNode): boolean {
    if (!selected) return inGeo(d)
    const node = findNode(tree, selected)
    const ids = node ? new Set(leafIds(node)) : new Set<string>()
    if (d.data.language) return ids.has(d.data.id) && inGeo(d)
    return descendantLeaves(d).some((id) => ids.has(id)) && inGeo(d)
  }

  svg
    .append("g")
    .selectAll("path")
    .data(root.descendants().filter((d) => d.depth > 0 && !d.data.language && d.x1 - d.x0 > 0.008))
    .join("path")
    .attr("d", genealogyArc)
    .attr("fill", theme.land)
    .attr("fill-opacity", (d) => (emphasized(d) ? 0.95 : 0.18))
    .attr("stroke", (d) => (d.data.id === selected ? theme.yellow : theme.landLine))
    .attr("stroke-width", (d) => (d.data.id === selected ? 2 : 0.6))
    .attr("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation()
      opts.onPick({ id: d.data.id, name: d.data.name, language: false })
    })
    .append("title")
    .text((d) => `${d.data.name} · ${d.value ?? 0} languages`)

  svg
    .append("g")
    .selectAll("path")
    .data(root.leaves().filter((d) => d.data.language && d.x1 - d.x0 > 0.002))
    .join("path")
    .attr("d", featureArc)
    .attr("fill", (d) => {
      const code = values[d.data.id]
      return code ? (colors.get(code) ?? theme.uncoded) : theme.uncoded
    })
    .attr("fill-opacity", (d) => (emphasized(d) ? 0.96 : 0.16))
    .attr("stroke", (d) => (d.data.id === selected ? theme.yellow : theme.bg))
    .attr("stroke-width", (d) => (d.data.id === selected ? 1.6 : 0.3))
    .attr("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation()
      opts.onPick({ id: d.data.id, name: d.data.name, language: true })
    })
    .append("title")
    .text((d) => {
      const code = values[d.data.id]
      const label = codeLabel(feature, code || undefined)
      return `${d.data.name} · ${label}`
    })

  svg
    .append("g")
    .attr("pointer-events", "none")
    .selectAll("text")
    .data(root.descendants().filter((d) => d.depth === 1 && d.x1 - d.x0 > 0.22))
    .join("text")
    .attr("class", "sunburst-label")
    .attr("transform", (d) => {
      const angle = ((d.x0 + d.x1) / 2) * (180 / Math.PI)
      const r = (d.y0 + d.y1) * innerScale * 0.5
      return `rotate(${angle - 90}) translate(${r},0) rotate(${angle > 180 ? 180 : 0})`
    })
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text((d) => d.data.name)

  svg
    .append("circle")
    .attr("r", 28)
    .attr("fill", theme.panel)
    .attr("stroke", theme.yellow)
    .attr("stroke-width", 1.4)
    .attr("cursor", "pointer")
    .on("click", () => opts.onPick({ id: tree.id, name: tree.name, language: false }))

  svg
    .append("text")
    .attr("class", "sunburst-core")
    .attr("text-anchor", "middle")
    .attr("dy", "0.32em")
    .attr("pointer-events", "none")
    .text(tree.name.length > 14 ? tree.name.slice(0, 12) + "…" : tree.name)
}

function findNode(node: FamilyNode, id: string): FamilyNode | undefined {
  if (node.id === id) return node
  for (const child of node.children ?? []) {
    const hit = findNode(child, id)
    if (hit) return hit
  }
  return undefined
}

export function collectLeaves(node: FamilyNode): string[] {
  return leafIds(node)
}

export function findFamilyNode(node: FamilyNode, id: string): FamilyNode | undefined {
  return findNode(node, id)
}
