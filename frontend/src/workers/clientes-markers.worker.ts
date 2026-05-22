/// <reference lib="webworker" />

// Raw customer item expected from the main thread.
type ClienteViewportItem = {
  cliente_id: string
  nombre: string
  longitud: number | string
  latitud: number | string
}

// Message contract sent from DashboardView to this worker.
type MarkerWorkerRequest = {
  version: number
  clientes: ClienteViewportItem[]
}

// Minimal marker payload returned to the main thread.
type MarkerPayload = {
  id: string
  title: string
  lat: number
  lng: number
}

// Response includes version so stale batches can be ignored safely.
type MarkerWorkerResponse = {
  version: number
  markers: MarkerPayload[]
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return isFiniteNumber(parsed) ? parsed : null
}

self.onmessage = (event: MessageEvent<MarkerWorkerRequest>) => {
  // Keep version from request to support out-of-order response protection.
  const version = Number.isFinite(event.data?.version) ? event.data.version : 0
  const clientes = Array.isArray(event.data?.clientes) ? event.data.clientes : []

  // Convert raw customer items into valid marker coordinates.
  const markers: MarkerPayload[] = []

  for (const cliente of clientes) {
    const lat = toFiniteNumber(cliente.latitud)
    const lng = toFiniteNumber(cliente.longitud)

    // Skip items with invalid coordinates.
    if (lat === null || lng === null) {
      continue
    }

    markers.push({
      id: cliente.cliente_id,
      title: cliente.nombre,
      lat,
      lng,
    })
  }

  // Return only sanitized marker payloads.
  const response: MarkerWorkerResponse = { version, markers }
  self.postMessage(response)
}

export {}