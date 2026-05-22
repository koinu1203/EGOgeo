/// <reference lib="webworker" />

import { bboxPolygon, booleanIntersects, convex, featureCollection, point, polygon } from '@turf/turf'

type VendorSelection = {
  id: number
  codigo: string
  nombre: string
}

type InputPoint = {
  id: string
  lat: number
  lng: number
}

type PolygonGenerationRequest = {
  version: number
  pointsPerVendor: number
  selectedVendors: VendorSelection[]
  existingPolygons: Array<{
    id: number
    coordinates: number[][][]
  }>
  points: InputPoint[]
}

type GeneratedPolygon = {
  vendorId: number
  vendorCode: string
  vendorName: string
  colorHex: string
  coordinates: number[][][]
  pointIds: string[]
}

type PolygonGenerationResponse = {
  version: number
  polygons: GeneratedPolygon[]
  skippedVendorIds: number[]
}

const VENDOR_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#16a34a',
  '#f97316',
  '#a855f7',
  '#eab308',
  '#ec4899',
  '#14b8a6',
]

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null
}

const distanceSquared = (a: InputPoint, b: InputPoint) => {
  const dx = a.lng - b.lng
  const dy = a.lat - b.lat
  return dx * dx + dy * dy
}

const normalizeRing = (ring: number[][]): number[][] => {
  if (ring.length < 3) {
    return ring
  }

  const first = ring[0]
  const last = ring[ring.length - 1]

  if (first[0] === last[0] && first[1] === last[1]) {
    return ring
  }

  return [...ring, first]
}

const buildPolygonGeometry = (chunk: InputPoint[]): number[][][] => {
  const fc = featureCollection(chunk.map((item) => point([item.lng, item.lat])))
  const convexFeature = convex(fc)
  const coordinates = convexFeature?.geometry?.coordinates as number[][][] | undefined

  if (coordinates && coordinates[0]?.length >= 4) {
    return [normalizeRing(coordinates[0])]
  }

  return buildFallbackBBoxCoordinates(chunk)
}

const hasOverlap = (
  candidateCoordinates: number[][][],
  existingCoordinates: number[][][][],
) => {
  try {
    const candidate = polygon(candidateCoordinates)

    for (const coordinates of existingCoordinates) {
      const existing = polygon(coordinates)
      if (booleanIntersects(candidate, existing)) {
        return true
      }
    }

    return false
  } catch {
    // If geometry validation fails, keep behavior safe and mark as overlap.
    return true
  }
}

const getNearestChunk = (
  seed: InputPoint,
  pool: InputPoint[],
  pointsPerVendor: number,
): InputPoint[] => {
  const sorted = [...pool].sort((a, b) => distanceSquared(seed, a) - distanceSquared(seed, b))
  return sorted.slice(0, pointsPerVendor)
}

const buildFallbackBBoxCoordinates = (chunk: InputPoint[]): number[][][] => {
  const lngValues = chunk.map((item) => item.lng)
  const latValues = chunk.map((item) => item.lat)
  const minLng = Math.min(...lngValues)
  const maxLng = Math.max(...lngValues)
  const minLat = Math.min(...latValues)
  const maxLat = Math.max(...latValues)

  const lngSpan = Math.max(maxLng - minLng, 0.0002)
  const latSpan = Math.max(maxLat - minLat, 0.0002)
  const paddingLng = lngSpan * 0.15
  const paddingLat = latSpan * 0.15

  const bboxFeature = bboxPolygon([
    minLng - paddingLng,
    minLat - paddingLat,
    maxLng + paddingLng,
    maxLat + paddingLat,
  ])

  return bboxFeature.geometry.coordinates as number[][][]
}

self.onmessage = (event: MessageEvent<PolygonGenerationRequest>) => {
  const version = Number.isFinite(event.data?.version) ? event.data.version : 0
  const pointsPerVendorRaw = Number(event.data?.pointsPerVendor)
  const pointsPerVendor = Number.isInteger(pointsPerVendorRaw)
    ? Math.max(3, pointsPerVendorRaw)
    : 3

  const selectedVendors = Array.isArray(event.data?.selectedVendors)
    ? event.data.selectedVendors
    : []

  const existingPolygons = Array.isArray(event.data?.existingPolygons)
    ? event.data.existingPolygons
    : []

  const rawPoints = Array.isArray(event.data?.points) ? event.data.points : []
  const points = rawPoints
    .map((item) => ({
      id: String(item.id ?? ''),
      lat: toFiniteNumber(item.lat),
      lng: toFiniteNumber(item.lng),
    }))
    .filter((item): item is { id: string; lat: number; lng: number } => (
      item.id.length > 0 && item.lat !== null && item.lng !== null
    ))
    .map((item) => ({ id: item.id, lat: item.lat, lng: item.lng }))

  // Keep contiguous chunks deterministic by ordering points from west to east.
  points.sort((a, b) => {
    if (a.lng === b.lng) {
      return a.lat - b.lat
    }
    return a.lng - b.lng
  })

  const polygons: GeneratedPolygon[] = []
  const skippedVendorIds: number[] = []
  const usedPointIds = new Set<string>()
  const createdCoordinates: number[][][][] = existingPolygons
    .map((item) => item.coordinates)
    .filter((coordinates) => Array.isArray(coordinates) && coordinates[0]?.length >= 4)
  const minimumPolygonPoints = 3

  selectedVendors.forEach((vendor, vendorIndex) => {
    const availableUniquePoints = points.filter((item) => !usedPointIds.has(item.id))
    const canUseOnlyUniquePoints = availableUniquePoints.length >= pointsPerVendor
    const candidatePool = canUseOnlyUniquePoints ? availableUniquePoints : points

    if (candidatePool.length < minimumPolygonPoints) {
      skippedVendorIds.push(vendor.id)
      return
    }

    const uniqueSeedCandidates = canUseOnlyUniquePoints
      ? candidatePool
      : candidatePool.filter((item) => !usedPointIds.has(item.id))

    const seedCandidates = uniqueSeedCandidates.length > 0 ? uniqueSeedCandidates : candidatePool

    let selectedChunk: InputPoint[] | null = null
    let selectedCoordinates: number[][][] | null = null

    for (const seed of seedCandidates) {
      const nextChunk = getNearestChunk(seed, candidatePool, pointsPerVendor)
      if (nextChunk.length < minimumPolygonPoints) {
        continue
      }

      const nextCoordinates = buildPolygonGeometry(nextChunk)

      // Only enforce non-overlap while we still have enough unique points.
      if (canUseOnlyUniquePoints && hasOverlap(nextCoordinates, createdCoordinates)) {
        continue
      }

      selectedChunk = nextChunk
      selectedCoordinates = nextCoordinates
      break
    }

    if (!selectedChunk || !selectedCoordinates) {
      if (canUseOnlyUniquePoints) {
        // Unique points are still enough, so we skip instead of creating overlapping polygons.
        skippedVendorIds.push(vendor.id)
        return
      }

      // Fallback: allow overlap only when unique points are insufficient.
      const fallbackChunk = getNearestChunk(candidatePool[0], candidatePool, pointsPerVendor)
      if (fallbackChunk.length < minimumPolygonPoints) {
        skippedVendorIds.push(vendor.id)
        return
      }

      selectedChunk = fallbackChunk
      selectedCoordinates = buildPolygonGeometry(fallbackChunk)
    }

    if (selectedChunk.length < minimumPolygonPoints) {
      skippedVendorIds.push(vendor.id)
      return
    }

    selectedChunk.forEach((item) => {
      if (!usedPointIds.has(item.id)) {
        usedPointIds.add(item.id)
      }
    })

    createdCoordinates.push(selectedCoordinates)

    polygons.push({
      vendorId: vendor.id,
      vendorCode: vendor.codigo,
      vendorName: vendor.nombre,
      colorHex: VENDOR_COLORS[vendorIndex % VENDOR_COLORS.length],
      coordinates: selectedCoordinates,
      pointIds: selectedChunk.map((item) => item.id),
    })
  })

  const response: PolygonGenerationResponse = {
    version,
    polygons,
    skippedVendorIds,
  }

  self.postMessage(response)
}

export {}