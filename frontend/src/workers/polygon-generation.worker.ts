/// <reference lib="webworker" />

import { bboxPolygon, convex, featureCollection, point } from '@turf/turf'

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

  selectedVendors.forEach((vendor, vendorIndex) => {
    const start = vendorIndex * pointsPerVendor
    const end = start + pointsPerVendor
    const chunk = points.slice(start, end)

    if (chunk.length < 3) {
      skippedVendorIds.push(vendor.id)
      return
    }

    const fc = featureCollection(chunk.map((item) => point([item.lng, item.lat])))
    const convexFeature = convex(fc)
    const coordinates = convexFeature?.geometry?.coordinates as number[][][] | undefined

    polygons.push({
      vendorId: vendor.id,
      vendorCode: vendor.codigo,
      vendorName: vendor.nombre,
      colorHex: VENDOR_COLORS[vendorIndex % VENDOR_COLORS.length],
      coordinates: coordinates && coordinates[0]?.length >= 4
        ? coordinates
        : buildFallbackBBoxCoordinates(chunk),
      pointIds: chunk.map((item) => item.id),
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