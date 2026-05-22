import type {
  DraftPoint,
  MarkerPayload,
} from './map.types'

export const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

export const createPinIconUrl = (fillColor: string, strokeColor = '#ffffff') =>
  svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
      <path d="M17 1C9.82 1 4 6.82 4 14c0 9.89 11.52 24.46 12.01 25.07a1.25 1.25 0 0 0 1.98 0C18.48 38.46 30 23.89 30 14 30 6.82 24.18 1 17 1z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>
      <circle cx="17" cy="14" r="5.5" fill="#ffffff"/>
    </svg>
  `)

export const createClusterPinIconUrl = (count: number, color: string) => {
  const textSize = count >= 1000 ? 8 : count >= 100 ? 10 : 11
  const displayCount = count > 9999 ? '9k+' : String(count)
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
      <path d="M17 1C9.82 1 4 6.82 4 14c0 9.89 11.52 24.46 12.01 25.07a1.25 1.25 0 0 0 1.98 0C18.48 38.46 30 23.89 30 14 30 6.82 24.18 1 17 1z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="17" cy="14" r="7" fill="#ffffff"/>
      <text x="17" y="17" text-anchor="middle" font-size="${textSize}" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="${color}">${displayCount}</text>
    </svg>
  `)
}

export const createDraftVertexIconUrl = (color: string, innerColor = '#ffffff') =>
  svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="8" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="9" cy="9" r="3.2" fill="${innerColor}"/>
    </svg>
  `)

export const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

export const buildTooltipHtml = (title: string, lines: string[]) => {
  const safeTitle = escapeHtml(title)
  const safeLines = lines.map((line) => `<div class="map-tooltip__line">${escapeHtml(line)}</div>`).join('')

  return `
    <div class="map-tooltip">
      <div class="map-tooltip__title">${safeTitle}</div>
      <div class="map-tooltip__content">${safeLines}</div>
    </div>
  `
}

export const getPointTooltipLines = (marker: MarkerPayload) => [
  `ID: ${marker.id}`,
  `Lat: ${marker.lat.toFixed(5)}`,
  `Lng: ${marker.lng.toFixed(5)}`,
]

export const getClusterSummaryLine = (sampleNames: string[]) =>
  sampleNames.length > 0
    ? `Examples: ${sampleNames.join(', ')}`
    : 'Zoom in to inspect individual points.'

export const createAreaCoordinates = (points: DraftPoint[]): number[][][] => {
  const ring = points.map((point) => [point.lng, point.lat])

  if (ring.length > 0) {
    const [firstLng, firstLat] = ring[0]
    const [lastLng, lastLat] = ring[ring.length - 1]

    if (firstLng !== lastLng || firstLat !== lastLat) {
      ring.push([firstLng, firstLat])
    }
  }

  return [ring]
}
