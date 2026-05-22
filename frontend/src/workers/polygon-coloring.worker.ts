/// <reference lib="webworker" />
import { booleanPointInPolygon, point as turfPoint, polygon as turfPolygon } from '@turf/turf'

// Minimal marker representation needed for classification.
type MarkerItem = {
  id: string
  lat: number
  lng: number
}

// Polygon with a color and GeoJSON-style closed ring coordinates.
type PolygonColorItem = {
  id: number
  color: string
  coordinates: number[][][] // GeoJSON Polygon coordinates — outer ring at index 0
}

// Message contract sent from DashboardView to this worker.
type ColoringRequest = {
  version: number
  markers: MarkerItem[]
  polygons: PolygonColorItem[]
}

// Response — versioned so stale batches can be discarded on the main thread.
type ColoringResponse = {
  version: number
  colorMap: Record<string, string> // markerId -> polygon color hex
}

self.onmessage = (event: MessageEvent<ColoringRequest>) => {
  const version = Number.isFinite(event.data?.version) ? event.data.version : 0
  const markers = Array.isArray(event.data?.markers) ? event.data.markers : []
  const polygons = Array.isArray(event.data?.polygons) ? event.data.polygons : []

  const colorMap: Record<string, string> = {}

  for (const marker of markers) {
    for (const poly of polygons) {
      try {
        const pt = turfPoint([marker.lng, marker.lat])
        const pg = turfPolygon(poly.coordinates)

        if (booleanPointInPolygon(pt, pg)) {
          // First matching polygon wins — polygons are ordered newest first.
          colorMap[marker.id] = poly.color
          break
        }
      } catch {
        // Skip polygons with invalid geometry silently.
      }
    }
  }

  const response: ColoringResponse = { version, colorMap }
  self.postMessage(response)
}

export {}
