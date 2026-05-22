import {
  bbox,
  buffer,
  centroid,
  distance,
  point,
  points,
  pointsWithinPolygon,
} from '@turf/turf'
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'

export type LngLat = {
  lng: number
  lat: number
}

export type PolygonRing = Array<[number, number]>

const toPointFeature = (coords: LngLat): Feature<Point> => point([coords.lng, coords.lat])

const toClosedRing = (ring: PolygonRing): PolygonRing => {
  if (ring.length === 0) {
    return ring
  }

  const [firstLng, firstLat] = ring[0]
  const [lastLng, lastLat] = ring[ring.length - 1]

  if (firstLng === lastLng && firstLat === lastLat) {
    return ring
  }

  return [...ring, [firstLng, firstLat]]
}

export const createPolygonFeature = (ring: PolygonRing): Feature<Polygon> => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [toClosedRing(ring)],
  },
})

export const isPointInsidePolygon = (coords: LngLat, ring: PolygonRing) => {
  const candidate = toPointFeature(coords)
  const polygonFeature = createPolygonFeature(ring)

  const selected = pointsWithinPolygon(points([candidate.geometry.coordinates]), polygonFeature)
  return selected.features.length > 0
}

export const filterPointsInsidePolygon = (items: LngLat[], ring: PolygonRing) => {
  const pointCollection = points(items.map((item) => [item.lng, item.lat]))
  const polygonFeature = createPolygonFeature(ring)
  const selected = pointsWithinPolygon(pointCollection, polygonFeature)

  const selectedSet = new Set(selected.features.map((feature) => feature.geometry.coordinates.join(',')))

  return items.filter((item) => selectedSet.has([item.lng, item.lat].join(',')))
}

export const distanceInMeters = (from: LngLat, to: LngLat) => {
  const fromFeature = toPointFeature(from)
  const toFeature = toPointFeature(to)
  return distance(fromFeature, toFeature, { units: 'meters' })
}

export const createBufferFromPoint = (center: LngLat, radiusMeters: number) => {
  const centerFeature = toPointFeature(center)
  return buffer(centerFeature, radiusMeters, { units: 'meters' })
}

export const getBoundingBox = (items: LngLat[]): [number, number, number, number] => {
  const collection: FeatureCollection<Point> = points(items.map((item) => [item.lng, item.lat]))
  const [minLng, minLat, maxLng, maxLat] = bbox(collection)
  return [minLng, minLat, maxLng, maxLat]
}

export const getCentroid = (items: LngLat | LngLat[]) => {
  const list = Array.isArray(items) ? items : [items]
  const collection = points(list.map((item) => [item.lng, item.lat]))
  const center = centroid(collection)

  return {
    lng: center.geometry.coordinates[0],
    lat: center.geometry.coordinates[1],
  }
}
