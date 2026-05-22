export type MapLoadStatus = 'loading' | 'ready' | 'error'

export type MarkerPayload = {
  id: string
  title: string
  lat: number
  lng: number
}

export type GoogleMapsLatLng = {
  lat: () => number
  lng: () => number
}

export type GoogleMapsBounds = {
  getSouthWest: () => GoogleMapsLatLng
  getNorthEast: () => GoogleMapsLatLng
}

export type GoogleMapsMapsEventListener = {
  remove: () => void
}

export type GoogleMapsMapInstance = {
  getBounds: () => GoogleMapsBounds | undefined
  getZoom?: () => number
  setZoom?: (zoom: number) => void
  panTo?: (latLng: { lat: number; lng: number }) => void
  fitBounds?: (bounds: { north: number; south: number; east: number; west: number }) => void
  addListener: (
    eventName: string,
    handler: (event?: { latLng?: GoogleMapsLatLng | null }) => void,
  ) => GoogleMapsMapsEventListener
}

export type GoogleMapsMarkerInstance = {
  setMap: (map: unknown | null) => void
  setIcon: (icon: { url: string } | null) => void
  addListener: (eventName: string, handler: () => void) => GoogleMapsMapsEventListener
  getTitle: () => string | null
}

export type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapsMapInstance
  Marker: new (options: Record<string, unknown>) => GoogleMapsMarkerInstance
  Polygon: new (options: Record<string, unknown>) => {
    setMap: (map: unknown | null) => void
    addListener: (eventName: string, handler: () => void) => GoogleMapsMapsEventListener
  }
  InfoWindow: new (options?: { content?: string }) => {
    setContent: (content: string) => void
    open: (options: { map?: GoogleMapsMapInstance; anchor?: unknown }) => void
    close: () => void
  }
}

export type DraftPoint = {
  lng: number
  lat: number
}

export type MarkerWorkerResponse = {
  version: number
  markers: MarkerPayload[]
}

export type ColoringWorkerResponse = {
  version: number
  colorMap: Record<string, string> // markerId -> polygon color hex
}
