import { feature } from "topojson-client"
import landTopo from "world-atlas/land-110m.json"
import { Map as MapLibreMap, NavigationControl, Popup, LngLatBounds, setWorkerUrl } from "maplibre-gl"
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import type { GeoJSONSource, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl"
import type { GeometryCollection, Topology } from "topojson-specification"
import type { Feature, Language } from "../types.ts"
import { colorForCodes } from "../format.ts"
import { theme } from "../theme.ts"

setWorkerUrl(mapWorkerUrl)

const land = feature(
  landTopo as unknown as Topology,
  (landTopo as { objects: { land: GeometryCollection } }).objects.land,
)

const STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": theme.ocean },
    },
  ],
}

const UNCODED = ""

export type MapHandle = {
  map: MapLibreMap
  setFeature: (feature: Feature, values: Record<string, string>, highlight?: string) => void
  setGroupVisible: (code: string, visible: boolean) => void
  setLabelsVisible: (code: string, visible: boolean) => void
  setIdFilter: (ids: Set<string> | null) => void
  fitLanguages: (langs: Language[]) => void
  flyTo: (lang: Language) => void
  destroy: () => void
}

function slug(code: string): string {
  const raw = code === UNCODED ? "uncoded" : code
  return raw.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "uncoded"
}

function dotsId(code: string): string {
  return `dots-${slug(code)}`
}

function labelsId(code: string): string {
  return `labels-${slug(code)}`
}

function geojson(langs: Language[], values: Record<string, string>) {
  return {
    type: "FeatureCollection" as const,
    features: langs
      .filter((l) => l.lat != null && l.lon != null)
      .map((l) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [l.lon!, l.lat!] },
        properties: {
          langId: l.id,
          name: l.name,
          val: values[l.id] != null ? String(values[l.id]) : UNCODED,
        },
      })),
  }
}

function ensureLand(map: MapLibreMap): void {
  if (!map.getSource("land")) {
    map.addSource("land", {
      type: "geojson",
      data: land as never,
      attribution: 'Land: <a href="https://www.naturalearthdata.com/">Natural Earth</a>',
    })
  }
  if (!map.getLayer("land")) {
    map.addLayer({
      id: "land",
      type: "fill",
      source: "land",
      paint: {
        "fill-color": theme.land,
        "fill-outline-color": theme.landLine,
      },
    })
  }
}

function styleLayers(map: MapLibreMap): { id: string }[] {
  const raw = map.getStyle()?.layers as unknown
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object") return Object.values(raw as Record<string, { id: string }>)
  return []
}

function removeGroupLayers(map: MapLibreMap): void {
  for (const layer of [...styleLayers(map)].reverse()) {
    if (layer?.id && (layer.id.startsWith("dots-") || layer.id.startsWith("labels-") || layer.id === "highlight")) {
      map.removeLayer(layer.id)
    }
  }
}

function valFilter(code: string): never {
  return ["==", ["to-string", ["coalesce", ["get", "val"], ""]], code] as never
}

function addGroupLayers(map: MapLibreMap, codes: string[], colors: Map<string, string>): void {
  for (const code of codes) {
    const color = code === UNCODED ? theme.uncoded : (colors.get(code) ?? theme.uncoded)
    const coded = code !== UNCODED
    map.addLayer({
      id: dotsId(code),
      type: "circle",
      source: "languages",
      filter: valFilter(code),
      paint: {
        "circle-radius": coded ? 5.4 : 2.9,
        "circle-color": color,
        "circle-opacity": coded ? 0.92 : 0.42,
        "circle-stroke-color": theme.panel,
        "circle-stroke-width": coded ? 0.6 : 0,
        "circle-stroke-opacity": 0.35,
      },
    })
  }
  for (const code of codes) {
    map.addLayer({
      id: labelsId(code),
      type: "symbol",
      source: "languages",
      filter: valFilter(code),
      minzoom: 0,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 0, 9, 3, 11, 6, 13],
        "text-offset": [0, 1.05],
        "text-anchor": "top",
        "text-optional": true,
        "text-padding": 2,
        visibility: "none",
      },
      paint: {
        "text-color": theme.ink,
        "text-halo-color": theme.ocean,
        "text-halo-width": 1.4,
      },
    })
  }
  map.addLayer({
    id: "highlight",
    type: "circle",
    source: "languages",
    filter: ["==", ["get", "langId"], ""],
    paint: {
      "circle-radius": 11,
      "circle-color": theme.yellow,
      "circle-opacity": 0.14,
      "circle-stroke-color": theme.yellow,
      "circle-stroke-width": 2,
    },
  })
}

export function createLanguageMap(
  container: HTMLElement,
  langs: Language[],
  onSelect: (id: string) => void,
): MapHandle {
  const map = new MapLibreMap({
    container,
    style: STYLE,
    center: [10, 20],
    zoom: 1.4,
    attributionControl: { compact: true },
  })
  map.addControl(new NavigationControl({ showCompass: false }), "top-right")

  let currentFeature: Feature | null = null
  let groupCodes: string[] = []
  let idFilter: Set<string> | null = null
  let popup: Popup | null = null
  let resolveReady!: () => void
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })
  const onReady = () => {
    ensureLand(map)
    resolveReady()
  }
  if (map.loaded()) onReady()
  else map.once("load", onReady)

  const queryHits = (point: MapLayerMouseEvent["point"]) => {
    const layers = groupCodes.map(dotsId).filter((id) => map.getLayer(id))
    if (!layers.length) return []
    return map.queryRenderedFeatures(point, { layers })
  }

  map.on("click", (e: MapLayerMouseEvent) => {
    const id = queryHits(e.point)[0]?.properties?.langId as string | undefined
    if (id) onSelect(id)
  })
  map.on("mousemove", (e: MapLayerMouseEvent) => {
    const f = queryHits(e.point)[0]
    if (!f?.properties) {
      map.getCanvas().style.cursor = ""
      popup?.remove()
      return
    }
    map.getCanvas().style.cursor = "pointer"
    const name = String(f.properties.name)
    const code = String(f.properties.val ?? "")
    const label = code ? (currentFeature?.codes.find((c) => c.id === code)?.name ?? code) : "not coded"
    popup?.remove()
    popup = new Popup({ closeButton: false, offset: 8 })
      .setLngLat(e.lngLat)
      .setHTML(`<strong>${name}</strong><br>${label}`)
      .addTo(map)
  })

  const layerFilter = (code: string) => {
    const val = valFilter(code)
    if (!idFilter) return val
    return ["all", val, ["in", ["get", "langId"], ["literal", [...idFilter]]]] as never
  }

  const applyIdFilter = () => {
    for (const code of groupCodes) {
      if (map.getLayer(dotsId(code))) map.setFilter(dotsId(code), layerFilter(code))
      if (map.getLayer(labelsId(code))) map.setFilter(labelsId(code), layerFilter(code))
    }
  }

  const setVisibility = (layerId: string, visible: boolean) => {
    if (!map.getLayer(layerId)) return
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none")
  }

  return {
    map,
    async setFeature(feature, values, highlight) {
      currentFeature = feature
      await ready
      ensureLand(map)
      const data = geojson(langs, values)
      if (!map.getSource("languages")) {
        map.addSource("languages", { type: "geojson", data })
      } else {
        ;(map.getSource("languages") as GeoJSONSource).setData(data)
      }
      const present = [...new Set(Object.values(values).map(String))]
      const hasUncoded = data.features.some((f) => f.properties.val === UNCODED)
      groupCodes = hasUncoded ? [...present, UNCODED] : present
      const colors = colorForCodes(present)
      removeGroupLayers(map)
      addGroupLayers(map, groupCodes, colors)
      applyIdFilter()
      map.setFilter("highlight", ["==", ["get", "langId"], highlight ?? ""])
    },
    setGroupVisible(code, visible) {
      setVisibility(dotsId(code), visible)
    },
    setLabelsVisible(code, visible) {
      setVisibility(labelsId(code), visible)
    },
    setIdFilter(ids) {
      idFilter = ids
      applyIdFilter()
    },
    fitLanguages(list) {
      const pts = list.filter((l) => l.lat != null && l.lon != null)
      if (!pts.length) return
      if (pts.length === 1) {
        map.flyTo({ center: [pts[0].lon!, pts[0].lat!], zoom: Math.max(map.getZoom(), 4.5), speed: 0.9 })
        return
      }
      const bounds = new LngLatBounds()
      for (const p of pts) bounds.extend([p.lon!, p.lat!])
      map.fitBounds(bounds, { padding: 56, maxZoom: 4.8, duration: 700 })
    },
    flyTo(lang) {
      if (lang.lon == null || lang.lat == null) return
      map.flyTo({ center: [lang.lon, lang.lat], zoom: Math.max(map.getZoom(), 4.5), speed: 0.9 })
      if (map.getLayer("highlight")) map.setFilter("highlight", ["==", ["get", "langId"], lang.id])
    },
    destroy() {
      popup?.remove()
      map.remove()
    },
  }
}
