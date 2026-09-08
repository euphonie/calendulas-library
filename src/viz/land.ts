/** Cut land rings at the antimeridian so MapLibre does not fill across the world. */

type Pos = [number, number]
type Ring = Pos[]
type Geom =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] }
  | { type: "GeometryCollection"; geometries: Geom[] }

export type LandFeatureCollection = {
  type: "FeatureCollection"
  features: { type: "Feature"; properties: Record<string, unknown>; geometry: Geom | null }[]
}

function wrapLon(lon: number): number {
  let x = lon
  while (x > 180) x -= 360
  while (x < -180) x += 360
  return x
}

function closeRing(ring: Ring): Ring {
  if (ring.length < 3) return ring
  const a = ring[0]
  const b = ring[ring.length - 1]
  if (a[0] === b[0] && a[1] === b[1]) return ring
  return [...ring, [a[0], a[1]]]
}

function openRing(ring: Ring): Ring {
  if (ring.length < 2) return ring
  const a = ring[0]
  const b = ring[ring.length - 1]
  if (a[0] === b[0] && a[1] === b[1]) return ring.slice(0, -1)
  return ring
}

const WINDOW = 90

function ringCrosses(ring: Ring): boolean {
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) >= 180) return true
  }
  return false
}

function unwrapLon(lon: number, prev: number): number {
  let x = lon
  while (x - prev > 180) x -= 360
  while (x - prev < -180) x += 360
  return x
}

function unwrapRing(ring: Ring): Ring {
  const src = openRing(ring)
  if (!src.length) return []
  const out: Ring = [[src[0][0], src[0][1]]]
  for (let i = 1; i < src.length; i++) {
    out.push([unwrapLon(src[i][0], out[out.length - 1][0]), src[i][1]])
  }
  const closeLon = unwrapLon(src[0][0], out[out.length - 1][0])
  out.push([closeLon, src[0][1]])
  return out
}

function intersectLon(a: Pos, b: Pos, lon: number): Pos {
  const d = b[0] - a[0]
  const t = d === 0 ? 0 : (lon - a[0]) / d
  return [lon, a[1] + (b[1] - a[1]) * t]
}

function clipHalf(ring: Ring, inside: (lon: number) => boolean, edge: number): Ring {
  const pts = openRing(ring)
  if (pts.length < 3) return []
  const out: Ring = []
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i + pts.length - 1) % pts.length]
    const cur = pts[i]
    const prevIn = inside(prev[0])
    const curIn = inside(cur[0])
    if (curIn) {
      if (!prevIn) out.push(intersectLon(prev, cur, edge))
      out.push(cur)
    } else if (prevIn) {
      out.push(intersectLon(prev, cur, edge))
    }
  }
  return out
}

function clipWindow(ring: Ring, lonMin: number, lonMax: number): Ring {
  let pts = clipHalf(ring, (lon) => lon >= lonMin, lonMin)
  if (pts.length < 3) return []
  pts = clipHalf(pts, (lon) => lon <= lonMax, lonMax)
  if (pts.length < 3) return []
  const shift = Math.round((lonMin + lonMax) / 2 / 360) * 360
  return closeRing(pts.map(([lon, lat]) => [wrapLon(lon - shift), lat] as Pos))
}

function inWorld(min: number, max: number): boolean {
  return max - min < 180 && min >= -180 && max <= 180
}

function closeThroughPole(ring: Ring, poleLat: number): Ring {
  const pts = openRing(ring)
  let ji = -1
  let maxD = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const d = Math.abs(b[0] - a[0])
    if (d > maxD) {
      maxD = d
      ji = i
    }
  }
  if (ji < 0 || maxD < WINDOW - 0.01) return closeRing(pts)
  const a = pts[ji]
  const b = pts[(ji + 1) % pts.length]
  return closeRing([...pts.slice(0, ji + 1), [a[0], poleLat], [b[0], poleLat], ...pts.slice(ji + 1)])
}

function splitRing(ring: Ring): Ring[] {
  const unwrapped = unwrapRing(ring)
  if (unwrapped.length < 4) return []
  const lons = unwrapped.map((p) => p[0])
  const min = Math.min(...lons)
  const max = Math.max(...lons)
  if (inWorld(min, max)) {
    const wrapped = closeRing(unwrapped.map(([lon, lat]) => [wrapLon(lon), lat] as Pos))
    if (!ringCrosses(wrapped)) return [wrapped]
  } else if (max - min < 180) {
    const shift = Math.round((min + max) / 2 / 360) * 360
    const shifted = closeRing(unwrapped.map(([lon, lat]) => [lon - shift, lat] as Pos))
    const slons = shifted.map((p) => p[0])
    const smin = Math.min(...slons)
    const smax = Math.max(...slons)
    if (inWorld(smin, smax) && !ringCrosses(shifted)) {
      return [closeRing(shifted.map(([lon, lat]) => [wrapLon(lon), lat] as Pos))]
    }
  }

  const pieces: Ring[] = []
  const start = Math.floor(min / WINDOW) * WINDOW
  for (let lo = start; lo < max; lo += WINDOW) {
    let piece = clipWindow(unwrapped, lo, lo + WINDOW)
    if (piece.length < 4 || ringCrosses(piece)) continue
    const plons = piece.map((p) => p[0])
    const plats = piece.map((p) => p[1])
    if (Math.max(...plons) - Math.min(...plons) >= 180) continue
    if (Math.max(...plats) < -50) piece = closeThroughPole(piece, -90)
    else if (Math.min(...plats) > 50) piece = closeThroughPole(piece, 90)
    if (piece.length < 4 || ringCrosses(piece)) continue
    pieces.push(piece)
  }
  return pieces
}

function polygonsFrom(coords: Ring[]): Geom[] {
  if (!coords.length) return []
  const [outer, ...holes] = coords
  const outers = splitRing(outer)
  if (outers.length === 1) {
    const keptHoles = holes.flatMap((h) => {
      const parts = splitRing(h)
      return parts.length === 1 ? parts : []
    })
    return [{ type: "Polygon", coordinates: [outers[0], ...keptHoles] }]
  }
  return outers.map((o) => ({ type: "Polygon", coordinates: [o] }))
}

function fromMulti(coords: Ring[][]): Geom[] {
  return coords.flatMap(polygonsFrom)
}

function splitGeom(geom: Geom): Geom[] {
  if (geom.type === "Polygon") return polygonsFrom(geom.coordinates)
  if (geom.type === "MultiPolygon") return fromMulti(geom.coordinates)
  if (geom.type === "GeometryCollection") return geom.geometries.flatMap(splitGeom)
  return []
}

export function sanitizeLand(raw: unknown): LandFeatureCollection {
  const features: LandFeatureCollection["features"] = []
  const push = (props: Record<string, unknown>, geom: Geom | null) => {
    if (!geom) return
    for (const piece of splitGeom(geom)) {
      features.push({ type: "Feature", properties: props, geometry: piece })
    }
  }

  const obj = raw as { type?: string; features?: unknown[]; geometry?: Geom; geometries?: Geom[] }
  if (obj?.type === "FeatureCollection" && Array.isArray(obj.features)) {
    for (const f of obj.features as { properties?: Record<string, unknown>; geometry?: Geom | null }[]) {
      push(f.properties ?? {}, f.geometry ?? null)
    }
  } else if (obj?.type === "Feature") {
    push({}, obj.geometry ?? null)
  } else if (obj?.type === "GeometryCollection" && Array.isArray(obj.geometries)) {
    for (const g of obj.geometries) push({}, g)
  } else if (obj?.type === "Polygon" || obj?.type === "MultiPolygon") {
    push({}, obj as Geom)
  }

  return { type: "FeatureCollection", features }
}

export function clampPoint(lat: number, lon: number): [number, number] | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90) return null
  return [wrapLon(lon), lat]
}
