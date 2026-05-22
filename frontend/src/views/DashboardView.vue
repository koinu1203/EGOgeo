<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer'
import { booleanPointInPolygon, point as turfPoint, polygon as turfPolygon } from '@turf/turf'

import { getClientesInViewport, type ClienteViewportItem } from '../services/clientes.service'
import {
  createPoligono,
  createPoligonosBulk,
  deletePoligono,
  listPoligonos,
  type CreatePoligonosBulkResponse,
  type PoligonoItem,
} from '../services/poligonos.service'
import { listVendedores, type VendedorItem } from '../services/vendedores.service'
import FloatingPlaceSearch from '../components/map/FloatingPlaceSearch.vue'
import MapPolygonSidebar from '../components/poligonos/MapPolygonSidebar.vue'
import PoligonoDetailsSidebar from '../components/poligonos/PoligonoDetailsSidebar.vue'
import { useAuthStore } from '../stores/auth.store'
import { useGlobalLoadingStore } from '../stores/global-loading.store'
import {
  CLUSTER_ICON_COLOR,
  CLUSTER_RADIUS_PX,
  darkMapStyles,
  DEFAULT_MAP_ZOOM,
  DEFAULT_POLYGON_COLOR,
  DRAFT_POLYGON_COLOR,
  GOOGLE_MAPS_SCRIPT_ID,
  LIMA_CENTER,
  PIN_ICON_COLOR,
} from './dashboard/map.constants'
import type {
  ColoringWorkerResponse,
  DraftPoint,
  GoogleMapsApi,
  GoogleMapsMapInstance,
  GoogleMapsMapsEventListener,
  GoogleMapsMarkerInstance,
  MapLoadStatus,
  MarkerPayload,
  MarkerWorkerResponse,
} from './dashboard/map.types'
import {
  buildTooltipHtml,
  createAreaCoordinates,
  createClusterPinIconUrl,
  createDraftVertexIconUrl,
  createPinIconUrl,
  getClusterSummaryLine,
  getPointTooltipLines,
} from './dashboard/map.utils'

type MarkerWorkerRequest = {
  version: number
  clientes: ClienteViewportItem[]
}

type PolygonGenerationWorkerRequest = {
  version: number
  pointsPerVendor: number
  selectedVendors: Array<{
    id: number
    codigo: string
    nombre: string
  }>
  existingPolygons: Array<{
    id: number
    coordinates: number[][][]
  }>
  points: Array<{
    id: string
    lat: number
    lng: number
  }>
}

type PolygonGenerationWorkerResponse = {
  version: number
  polygons: Array<{
    vendorId: number
    vendorCode: string
    vendorName: string
    colorHex: string
    coordinates: number[][][]
    pointIds: string[]
  }>
  skippedVendorIds: number[]
}

type ClienteWithOptionalCoords = ClienteViewportItem & {
  longitud?: number | string
  latitud?: number | string
}

type PlaceSelection = {
  lat: number
  lng: number
  address: string
}

const mapLoadStatus = ref<MapLoadStatus>('loading')
const mapStatusMessage = ref('Loading Google Maps...')
const globalLoadingStore = useGlobalLoadingStore()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
const googleMapsMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim()
const showGoogleMapsSuccessBanner = import.meta.env.VITE_GOOGLE_MAPS_SHOW_SUCCESS_BANNER === 'true'

const DEBUG_MAP_RECURSION = import.meta.env.VITE_DEBUG_MAP_RECURSION === 'true'

const viewportClientes = ref<ClienteViewportItem[]>([])
const mapInstance = shallowRef<GoogleMapsMapInstance | null>(null)
const markerInstances = shallowRef<GoogleMapsMarkerInstance[]>([])
const markerClustererInstance = shallowRef<MarkerClusterer | null>(null)
const markerWorker = shallowRef<Worker | null>(null)
type MapPolygonOverlay = {
  setMap: (map: unknown) => void
  addListener: (eventName: string, handler: () => void) => GoogleMapsMapsEventListener
}

const polygonOverlays = shallowRef<MapPolygonOverlay[]>([])
const draftPolygonOverlay = shallowRef<{ setMap: (map: unknown | null) => void } | null>(null)
const mapInfoWindow = shallowRef<{
  setContent: (content: string) => void
  open: (options: { map?: GoogleMapsMapInstance; anchor?: unknown }) => void
  close: () => void
} | null>(null)
const pendingMarkers = ref<MarkerPayload[]>([])
const mapIdleListener = ref<GoogleMapsMapsEventListener | null>(null)
const viewportFetchDebounceTimer = ref<ReturnType<typeof window.setTimeout> | null>(null)
const draftStartPointMarker = shallowRef<GoogleMapsMarkerInstance | null>(null)
const draftLastPointMarker = shallowRef<GoogleMapsMarkerInstance | null>(null)
const coloringWorkerInstance = shallowRef<Worker | null>(null)
const polygonGenerationWorker = shallowRef<Worker | null>(null)
const coloringWorkerVersion = ref(0)
const polygonGenerationVersion = ref(0)
const markerColorMap = shallowRef<Record<string, string>>({})
const lastRenderedMarkerPayloads = shallowRef<MarkerPayload[]>([])
const selectedPolygonColor = ref(DEFAULT_POLYGON_COLOR)
const latestFetchVersion = ref(0)
const latestWorkerVersion = ref(0)
const lastViewportRequestKey = ref<string | null>(null)
const mapClickListener = ref<GoogleMapsMapsEventListener | null>(null)
const isDrawingPolygon = ref(false)
const isSavingPolygon = ref(false)
const isLoadingPolygons = ref(false)
const isLoadingVendedores = ref(false)
const isGeneratingPolygons = ref(false)
const pointsPerVendor = ref(1)
const selectedVendedores = ref<VendedorItem[]>([])
const showPoligonosPanel = ref(false)
const showVendedoresPanel = ref(false)
const deletingPoligonoId = ref<number | null>(null)
const selectedPoligonoId = ref<number | null>(null)
const polygonDraftPoints = ref<DraftPoint[]>([])
const savedPoligonos = ref<PoligonoItem[]>([])
const generatedPoligonos = ref<PoligonoItem[]>([])
const savedVendedores = ref<VendedorItem[]>([])
const hasResolvedInitialMapLoading = ref(false)
const isPostLoginPointsLoading = ref(false)

const shouldShowStatusBanner = computed(
  () => mapLoadStatus.value !== 'ready' || showGoogleMapsSuccessBanner || !isAuthenticated.value,
)

const canSavePolygon = computed(
  () => isDrawingPolygon.value && polygonDraftPoints.value.length >= 3 && !isSavingPolygon.value,
)

const activePoligonosForMap = computed(
  () => (generatedPoligonos.value.length > 0 ? generatedPoligonos.value : savedPoligonos.value),
)

const selectedPoligono = computed(() => (
  selectedPoligonoId.value === null
    ? null
    : savedPoligonos.value.find((item) => item.id === selectedPoligonoId.value) ?? null
))

const canGeneratePolygons = computed(() => (
  selectedVendedores.value.length > 0
  && Number.isFinite(pointsPerVendor.value)
  && pointsPerVendor.value >= 3
  && viewportClientes.value.length >= selectedVendedores.value.length * pointsPerVendor.value
))

const isMapDrawingCursor = computed(() => isDrawingPolygon.value)
const showAuthRequiredNotice = computed(() => mapLoadStatus.value === 'ready' && !isAuthenticated.value)

const openMapTooltip = (anchor: unknown, htmlContent: string) => {
  if (!mapInfoWindow.value || !mapInstance.value) {
    return
  }

  mapInfoWindow.value.setContent(htmlContent)
  mapInfoWindow.value.open({
    map: mapInstance.value,
    anchor,
  })
}

const closeMapTooltip = () => {
  mapInfoWindow.value?.close()
}

const startPostLoginPointsLoading = () => {
  isPostLoginPointsLoading.value = true
  globalLoadingStore.begin({
    title: 'Loading data',
    message: 'Loading points after login...',
    progress: 20,
  })
}

const finishPostLoginPointsLoading = (message: string) => {
  if (!isPostLoginPointsLoading.value) {
    return
  }

  globalLoadingStore.setProgress(100)
  globalLoadingStore.setMessage(message)
  globalLoadingStore.finish()
  isPostLoginPointsLoading.value = false
}

const clearDraftPointMarkers = () => {
  draftStartPointMarker.value?.setMap(null)
  draftLastPointMarker.value?.setMap(null)
  draftStartPointMarker.value = null
  draftLastPointMarker.value = null
}

const renderDraftPointMarkers = () => {
  const googleMaps = getGoogleMapsApi()
  if (!googleMaps || !mapInstance.value) {
    return
  }

  clearDraftPointMarkers()

  if (polygonDraftPoints.value.length === 0) {
    return
  }

  const firstPoint = polygonDraftPoints.value[0]
  draftStartPointMarker.value = new googleMaps.Marker({
    map: mapInstance.value,
    position: { lat: firstPoint.lat, lng: firstPoint.lng },
    title: 'Initial polygon point',
    zIndex: 2000,
    icon: {
      url: createDraftVertexIconUrl('#0f766e'),
    },
  })

  draftStartPointMarker.value.addListener('click', () => {
    if (polygonDraftPoints.value.length >= 3 && !isSavingPolygon.value) {
      void saveDraftPolygon()
    }
  })

  if (polygonDraftPoints.value.length < 2) {
    return
  }

  const lastPoint = polygonDraftPoints.value[polygonDraftPoints.value.length - 1]
  draftLastPointMarker.value = new googleMaps.Marker({
    map: mapInstance.value,
    position: { lat: lastPoint.lat, lng: lastPoint.lng },
    title: 'Last polygon point',
    zIndex: 2001,
    icon: {
      url: createDraftVertexIconUrl('#f97316'),
    },
  })
}

const distanceMeters = (a: DraftPoint, b: DraftPoint) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadiusMeters = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

const isClickNearInitialPoint = (point: DraftPoint) => {
  if (polygonDraftPoints.value.length < 3) {
    return false
  }

  const firstPoint = polygonDraftPoints.value[0]
  return distanceMeters(point, firstPoint) <= 18
}

const clearDraftPolygonOverlay = () => {
  draftPolygonOverlay.value?.setMap(null)
  draftPolygonOverlay.value = null
}

const clearSavedPolygonOverlays = () => {
  polygonOverlays.value.forEach((overlay) => overlay.setMap(null))
  polygonOverlays.value = []
}

const renderDraftPolygon = () => {
  const googleMaps = getGoogleMapsApi()
  if (!googleMaps || !mapInstance.value) {
    return
  }

  clearDraftPolygonOverlay()

  if (polygonDraftPoints.value.length < 2) {
    renderDraftPointMarkers()
    return
  }

  draftPolygonOverlay.value = new googleMaps.Polygon({
    map: mapInstance.value,
    paths: polygonDraftPoints.value.map((point) => ({ lat: point.lat, lng: point.lng })),
    strokeColor: selectedPolygonColor.value,
    strokeOpacity: 0.95,
    strokeWeight: 2,
    fillColor: selectedPolygonColor.value,
    fillOpacity: 0.18,
    clickable: false,
  })

  renderDraftPointMarkers()
}

const renderSavedPoligonos = () => {
  const googleMaps = getGoogleMapsApi()
  if (!googleMaps || !mapInstance.value) {
    return
  }

  clearSavedPolygonOverlays()

  polygonOverlays.value = activePoligonosForMap.value
    .map((poligono) => {
      const ring = poligono.area?.coordinates?.[0]

      if (!ring || ring.length < 4) {
        return null
      }

      const overlay = new googleMaps.Polygon({
        map: mapInstance.value,
        paths: ring.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: poligono.color_hex || DEFAULT_POLYGON_COLOR,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: poligono.color_hex || DEFAULT_POLYGON_COLOR,
        fillOpacity: 0.14,
      })

      overlay.addListener('click', () => {
        if (poligono.id <= 0) {
          return
        }

        selectedPoligonoId.value = poligono.id
        showPoligonosPanel.value = true
      })

      return overlay
    })
    .filter((overlay): overlay is MapPolygonOverlay => overlay !== null)

  // Re-classify markers when the polygon set changes.
  runColoringWorker()
}

const resetPolygonDrawing = () => {
  isDrawingPolygon.value = false
  polygonDraftPoints.value = []
  clearDraftPolygonOverlay()
  clearDraftPointMarkers()
}

const startPolygonDrawing = () => {
  isDrawingPolygon.value = true
  polygonDraftPoints.value = []
  clearDraftPolygonOverlay()
}

const togglePolygonDrawing = () => {
  if (isDrawingPolygon.value) {
    resetPolygonDrawing()
    return
  }

  startPolygonDrawing()
}

const loadPoligonos = async () => {
  isLoadingPolygons.value = true

  try {
    savedPoligonos.value = await listPoligonos()

    if (
      selectedPoligonoId.value !== null
      && !savedPoligonos.value.some((item) => item.id === selectedPoligonoId.value)
    ) {
      selectedPoligonoId.value = null
    }

    renderSavedPoligonos()
  } catch {
    savedPoligonos.value = []
    selectedPoligonoId.value = null
  } finally {
    isLoadingPolygons.value = false
  }
}

const resolveInitialMapLoading = (message = 'Map and points loaded successfully.') => {
  if (hasResolvedInitialMapLoading.value) {
    return
  }

  hasResolvedInitialMapLoading.value = true
  globalLoadingStore.setProgress(100)
  globalLoadingStore.setMessage(message)
  globalLoadingStore.finish()
}

const loadVendedores = async () => {
  isLoadingVendedores.value = true

  try {
    savedVendedores.value = await listVendedores()
  } catch {
    savedVendedores.value = []
  } finally {
    isLoadingVendedores.value = false
  }
}

const initPolygonGenerationWorker = () => {
  if (polygonGenerationWorker.value) {
    return
  }

  polygonGenerationWorker.value = new Worker(
    new URL('../workers/polygon-generation.worker.ts', import.meta.url),
    { type: 'module' },
  )

  polygonGenerationWorker.value.onmessage = async (event: MessageEvent<PolygonGenerationWorkerResponse>) => {
    if (event.data.version !== polygonGenerationVersion.value) {
      return
    }

    const timestamp = new Date().toISOString()

    generatedPoligonos.value = event.data.polygons.map((polygon, index) => ({
      id: -(index + 1),
      usuario_id: 0,
      nombre: `${polygon.vendorCode} - ${polygon.vendorName}`,
      area: {
        type: 'Polygon',
        coordinates: polygon.coordinates,
      },
      color_hex: polygon.colorHex,
      estilo_punto: 'generated',
      fecha_creacion: timestamp,
    }))

    renderSavedPoligonos()
    showPoligonosPanel.value = true

    globalLoadingStore.setProgress(62)
    globalLoadingStore.setMessage('Saving generated polygons...')

    try {
      const persisted = await persistGeneratedPolygons(event.data.polygons)
      generatedPoligonos.value = []
      globalLoadingStore.setProgress(86)
      globalLoadingStore.setMessage('Refreshing polygons on map...')
      await loadPoligonos()
      globalLoadingStore.setProgress(100)
      globalLoadingStore.finish()

      if (event.data.skippedVendorIds.length > 0) {
        mapStatusMessage.value = `Saved ${persisted.createdPolygons} polygons with ${persisted.clientAssignmentsUpserted} customer assignments. Some vendors were skipped due to insufficient points.`
        return
      }

      mapStatusMessage.value = `Saved ${persisted.createdPolygons} polygons with ${persisted.clientAssignmentsUpserted} customer assignments.`
    } catch {
      mapStatusMessage.value = 'Polygons were generated on screen but could not be saved in backend.'
      globalLoadingStore.setProgress(100)
      globalLoadingStore.finish()
    } finally {
      isGeneratingPolygons.value = false
    }
  }

  polygonGenerationWorker.value.onerror = () => {
    isGeneratingPolygons.value = false
    mapStatusMessage.value = 'Polygon generation worker failed while processing points.'
  }
}

const generatePolygonsFromSelection = () => {
  if (!polygonGenerationWorker.value || !canGeneratePolygons.value) {
    return
  }

  showVendedoresPanel.value = false
  showPoligonosPanel.value = true
  isGeneratingPolygons.value = true
  globalLoadingStore.begin({
    title: 'Generating polygons',
    message: 'Assigning points to vendors...',
    progress: 22,
  })

  const plainExistingPolygons = savedPoligonos.value
    .filter((item) => item.area?.coordinates?.[0] && item.area.coordinates[0].length >= 4)
    .map((item) => ({
      id: item.id,
      // postMessage cannot clone Vue Proxy objects.
      coordinates: JSON.parse(JSON.stringify(item.area.coordinates)) as number[][][],
    }))

  const request: PolygonGenerationWorkerRequest = {
    version: ++polygonGenerationVersion.value,
    pointsPerVendor: Math.max(3, Math.floor(pointsPerVendor.value)),
    selectedVendors: selectedVendedores.value.map((vendor) => ({
      id: vendor.id,
      codigo: vendor.codigo,
      nombre: vendor.nombre,
    })),
    existingPolygons: plainExistingPolygons,
    points: viewportClientes.value.map((cliente) => ({
      id: String(cliente.id),
      lat: cliente.latitud,
      lng: cliente.longitud,
    })),
  }

  polygonGenerationWorker.value.postMessage(request)
}

const persistGeneratedPolygons = async (
  polygons: PolygonGenerationWorkerResponse['polygons'],
): Promise<CreatePoligonosBulkResponse> => {
  const items = polygons.map((polygon) => {
    const uniquePointIds = [...new Set(
      polygon.pointIds
        .map((pointId) => Number(pointId))
        .filter((pointId) => Number.isInteger(pointId) && pointId > 0),
    )]

    return {
      nombre: `${polygon.vendorCode} - ${polygon.vendorName}`,
      areaCoordinates: polygon.coordinates,
      colorHex: polygon.colorHex,
      estiloPunto: 'generated',
      vendedorId: polygon.vendorId,
      clienteIds: uniquePointIds,
    }
  }).filter((item) => item.clienteIds.length > 0)

  if (items.length === 0) {
    throw new Error('No customer assignments were generated for bulk persistence.')
  }

  return createPoligonosBulk({ items })
}

const saveDraftPolygon = async () => {
  if (!canSavePolygon.value) {
    return
  }

  isSavingPolygon.value = true

  try {
    const created = await createPoligono({
      nombre: `Poligono ${new Date().toLocaleString('es-PE')}`,
      areaCoordinates: createAreaCoordinates(polygonDraftPoints.value),
      colorHex: selectedPolygonColor.value,
      estiloPunto: 'default',
    })

    savedPoligonos.value = [created, ...savedPoligonos.value]
    renderSavedPoligonos()
    showPoligonosPanel.value = true
    resetPolygonDrawing()
  } finally {
    isSavingPolygon.value = false
  }
}

const removePoligonoById = async (id: number) => {
  deletingPoligonoId.value = id

  try {
    await deletePoligono(id)
    savedPoligonos.value = savedPoligonos.value.filter((item) => item.id !== id)

    if (selectedPoligonoId.value === id) {
      selectedPoligonoId.value = null
    }

    renderSavedPoligonos()
  } finally {
    deletingPoligonoId.value = null
  }
}

const selectPoligono = (id: number) => {
  selectedPoligonoId.value = id
}

const closePoligonoDetails = () => {
  selectedPoligonoId.value = null
}

const handlePlaceSelected = (selection: PlaceSelection) => {
  const currentMap = mapInstance.value
  if (!currentMap) {
    return
  }

  currentMap.panTo?.({ lat: selection.lat, lng: selection.lng })

  // Approximate a 3 km viewport around the selected place.
  const radiusKm = 3
  const latDelta = radiusKm / 111.32
  const lngDelta = radiusKm / (111.32 * Math.max(Math.cos((selection.lat * Math.PI) / 180), 0.2))

  currentMap.fitBounds?.({
    north: selection.lat + latDelta,
    south: selection.lat - latDelta,
    east: selection.lng + lngDelta,
    west: selection.lng - lngDelta,
  })

  mapStatusMessage.value = `Location selected: ${selection.address}`
  scheduleViewportFetch()
}

const handlePoligonoUpdated = (updated: PoligonoItem) => {
  savedPoligonos.value = savedPoligonos.value.map((item) => (
    item.id === updated.id ? updated : item
  ))

  renderSavedPoligonos()
}

const formatClusterTooltip = (count: number, markers: unknown[] | undefined) => {
  const sampleNames = (markers ?? [])
    .map((marker) => {
      if (
        typeof marker === 'object' &&
        marker !== null &&
        'getTitle' in marker &&
        typeof (marker as { getTitle?: () => string | null }).getTitle === 'function'
      ) {
        return (marker as { getTitle: () => string | null }).getTitle() ?? null
      }

      return null
    })
    .filter((title): title is string => Boolean(title))
    .slice(0, 3)

  const summary = getClusterSummaryLine(sampleNames)

  return [`${count} points in this area`, summary].join('\n')
}

const traceMapFlow = (stage: string, details?: Record<string, unknown>) => {
  if (!DEBUG_MAP_RECURSION) {
    return
  }

  console.debug(`[MapFlow] ${stage}`, {
    ...details,
    latestFetchVersion: latestFetchVersion.value,
    latestWorkerVersion: latestWorkerVersion.value,
    markerCount: markerInstances.value.length,
  })
}

const attachGoogleAuthFailureHandler = () => {
  ;(window as Window & {
    gm_authFailure?: () => void
  }).gm_authFailure = () => {
    mapLoadStatus.value = 'error'
    mapStatusMessage.value = 'Google Maps auth failed. Check API key restrictions and enabled APIs.'
  }
}

const waitForGoogleMaps = (timeoutMs: number) =>
  new Promise<boolean>((resolve) => {
    const pollIntervalMs = 100
    let elapsedMs = 0

    const timer = window.setInterval(() => {
      const mapsAvailable = Boolean(
        (window as Window & {
          google?: {
            maps?: unknown
          }
        }).google?.maps,
      )

      if (mapsAvailable) {
        window.clearInterval(timer)
        resolve(true)
        return
      }

      elapsedMs += pollIntervalMs
      if (elapsedMs >= timeoutMs) {
        window.clearInterval(timer)
        resolve(false)
      }
    }, pollIntervalMs)
  })

const loadGoogleMapsScript = async () => {
  const mapsAlreadyLoaded = Boolean(
    (window as Window & {
      google?: {
        maps?: unknown
      }
    }).google?.maps,
  )

  if (mapsAlreadyLoaded) {
    return true
  }

  if (!googleMapsApiKey) {
    mapLoadStatus.value = 'error'
    mapStatusMessage.value = 'Missing VITE_GOOGLE_MAPS_API_KEY in .env'
    return false
  }

  const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null
  if (existingScript) {
    return waitForGoogleMaps(10000)
  }

  const script = document.createElement('script')
  script.id = GOOGLE_MAPS_SCRIPT_ID
  script.async = true
  script.defer = true
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&v=weekly&libraries=places`

  const loaded = await new Promise<boolean>((resolve) => {
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })

  if (!loaded) {
    mapLoadStatus.value = 'error'
    mapStatusMessage.value = 'Unable to download Google Maps script.'
    return false
  }

  return waitForGoogleMaps(3000)
}

const getGoogleMapsApi = () =>
  (window as Window & {
    google?: {
      maps?: GoogleMapsApi
    }
  }).google?.maps

const clearMapMarkers = () => {
  traceMapFlow('clearMapMarkers:start')
  markerInstances.value.forEach((marker) => marker.setMap(null))
  markerInstances.value = []
  traceMapFlow('clearMapMarkers:end')
}

const releaseMarkerReferences = () => {
  markerInstances.value = []
}

const clearMarkerCluster = () => {
  traceMapFlow('clearMarkerCluster:start')
  markerClustererInstance.value?.clearMarkers()
  ;(markerClustererInstance.value as unknown as { setMap?: (map: unknown | null) => void } | null)
    ?.setMap?.(null)
  markerClustererInstance.value = null
  traceMapFlow('clearMarkerCluster:end')
}

// Synchronous point-in-polygon check using the cluster center position.
// Only colors the cluster if its center actually falls inside a saved polygon.
const getClusterPolygonColor = (position: { lat: () => number; lng: () => number }): string => {
  const lat = position.lat()
  const lng = position.lng()

  for (const poly of activePoligonosForMap.value) {
    if (!poly.area?.coordinates?.[0] || poly.area.coordinates[0].length < 4 || !poly.color_hex) {
      continue
    }

    try {
      const pt = turfPoint([lng, lat])
      const pg = turfPolygon(poly.area.coordinates as number[][][])
      if (booleanPointInPolygon(pt, pg)) {
        return poly.color_hex
      }
    } catch {
      // Skip polygons with invalid geometry.
    }
  }

  return CLUSTER_ICON_COLOR
}

const applyMarkerColors = (colorMap: Record<string, string>) => {
  markerColorMap.value = colorMap

  lastRenderedMarkerPayloads.value.forEach((marker, index) => {
    const instance = markerInstances.value[index]
    if (!instance) {
      return
    }

    const polygonColor = colorMap[marker.id]
    instance.setIcon({ url: createPinIconUrl(PIN_ICON_COLOR, polygonColor ?? '#ffffff') })
  })

  // Force cluster re-render so cluster icons pick up the updated dominant color.
  if (markerClustererInstance.value) {
    markerClustererInstance.value.clearMarkers()
    markerClustererInstance.value.addMarkers(markerInstances.value as any)
  }
}

const runColoringWorker = () => {
  if (!coloringWorkerInstance.value) {
    return
  }

  if (lastRenderedMarkerPayloads.value.length === 0) {
    return
  }

  const activePolygons = activePoligonosForMap.value.filter(
    (p) => p.area?.coordinates?.[0] && p.area.coordinates[0].length >= 4 && p.color_hex,
  )

  if (activePolygons.length === 0) {
    // No polygons to classify — clear the color map and reset to default icons.
    applyMarkerColors({})
    return
  }

  const version = ++coloringWorkerVersion.value

  // Deep-clone coordinates to strip Vue reactive proxies before postMessage.
  // The structured clone algorithm used by postMessage cannot clone Proxy objects.
  coloringWorkerInstance.value.postMessage({
    version,
    markers: lastRenderedMarkerPayloads.value.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng })),
    polygons: activePolygons.map((p) => ({
      id: p.id,
      color: p.color_hex,
      coordinates: JSON.parse(JSON.stringify(p.area.coordinates)) as number[][][],
    })),
  })
}

const initColoringWorker = () => {
  if (coloringWorkerInstance.value) {
    return
  }

  coloringWorkerInstance.value = new Worker(
    new URL('../workers/polygon-coloring.worker.ts', import.meta.url),
    { type: 'module' },
  )

  coloringWorkerInstance.value.onmessage = (event: MessageEvent<ColoringWorkerResponse>) => {
    if (event.data.version !== coloringWorkerVersion.value) {
      return
    }

    applyMarkerColors(event.data.colorMap)
  }

  coloringWorkerInstance.value.onerror = () => {
    // Coloring is non-critical — silently skip on worker error.
  }
}

const renderMarkers = (markers: MarkerPayload[]) => {
  traceMapFlow('renderMarkers:start', { incomingMarkers: markers.length })

  const googleMaps = getGoogleMapsApi()
  if (!googleMaps || !mapInstance.value) {
    pendingMarkers.value = markers
    traceMapFlow('renderMarkers:deferred', { pendingMarkers: pendingMarkers.value.length })
    return
  }

  markerClustererInstance.value?.clearMarkers()
  releaseMarkerReferences()

  markerInstances.value = markers.map((marker) =>
    new googleMaps.Marker({
      position: { lat: marker.lat, lng: marker.lng },
      title: marker.title,
      icon: {
        url: createPinIconUrl(PIN_ICON_COLOR),
      },
    }),
  )

  lastRenderedMarkerPayloads.value = markers

  markerInstances.value.forEach((markerInstance, index) => {
    const marker = markers[index]
    const tooltipHtml = buildTooltipHtml(marker.title, getPointTooltipLines(marker))

    markerInstance.addListener('mouseover', () => {
      openMapTooltip(markerInstance, tooltipHtml)
    })

    markerInstance.addListener('mouseout', () => {
      closeMapTooltip()
    })
  })

  if (!markerClustererInstance.value) {
    markerClustererInstance.value = new MarkerClusterer({
      map: mapInstance.value as any,
      markers: [],
      algorithm: new SuperClusterAlgorithm({
        radius: CLUSTER_RADIUS_PX,
      }),
      renderer: {
        render: ({ count, position, markers }) =>
          (() => {
            const dominantColor = getClusterPolygonColor(
              position as { lat: () => number; lng: () => number },
            )
            const clusterMarker = new googleMaps.Marker({
            position,
            zIndex: 1000 + count,
            title: formatClusterTooltip(count, markers),
            icon: {
              url: createClusterPinIconUrl(count, dominantColor),
            },
            })

            const sampleNames = (markers ?? [])
              .map((marker) => {
                if (
                  typeof marker === 'object'
                  && marker !== null
                  && 'getTitle' in marker
                  && typeof (marker as { getTitle?: () => string | null }).getTitle === 'function'
                ) {
                  return (marker as { getTitle: () => string | null }).getTitle() ?? null
                }

                return null
              })
              .filter((title): title is string => Boolean(title))
              .slice(0, 3)

            const tooltipHtml = buildTooltipHtml(`${count} points in this area`, [
              sampleNames.length > 0
                ? `Examples: ${sampleNames.join(', ')}`
                : 'Zoom in to inspect individual points.',
            ])

            clusterMarker.addListener('mouseover', () => {
              openMapTooltip(clusterMarker, tooltipHtml)
            })

            clusterMarker.addListener('mouseout', () => {
              closeMapTooltip()
            })

            return clusterMarker
          })(),
      },
    })

    traceMapFlow('renderMarkers:clusterCreated')
  }

  try {
    markerClustererInstance.value.clearMarkers()
    markerClustererInstance.value.addMarkers(markerInstances.value as any)
    traceMapFlow('renderMarkers:clusterUpdated', { clusteredMarkers: markerInstances.value.length })
  } catch (error) {
    console.error('[MapFlow] renderMarkers:clusterError', {
      error,
      markersLength: markerInstances.value.length,
      viewportKey: lastViewportRequestKey.value,
    })
    throw error
  }

  pendingMarkers.value = []
  traceMapFlow('renderMarkers:end')

  // Classify markers against polygons asynchronously in the coloring worker.
  runColoringWorker()
}

const initializeMarkerWorker = () => {
  if (markerWorker.value) {
    return
  }

  markerWorker.value = new Worker(
    new URL('../workers/clientes-markers.worker.ts', import.meta.url),
    { type: 'module' },
  )

  markerWorker.value.onmessage = (event: MessageEvent<MarkerWorkerResponse>) => {
    traceMapFlow('worker:onmessage', {
      responseVersion: event.data.version,
      responseMarkers: event.data.markers.length,
    })

    if (event.data.version !== latestWorkerVersion.value) {
      traceMapFlow('worker:onmessage:ignoredStale')
      return
    }

    renderMarkers(event.data.markers)

    if (!hasResolvedInitialMapLoading.value) {
      resolveInitialMapLoading(
        event.data.markers.length > 0
          ? 'Map and points loaded successfully.'
          : 'Map loaded. No points found in this area.',
      )
    }

    if (isPostLoginPointsLoading.value) {
      finishPostLoginPointsLoading(
        event.data.markers.length > 0
          ? 'Points loaded successfully.'
          : 'No points found in this area.',
      )
    }
  }

  markerWorker.value.onerror = () => {
    mapLoadStatus.value = 'error'
    mapStatusMessage.value = 'Marker worker failed while processing data.'
    finishPostLoginPointsLoading('Could not load points after login.')
  }
}

const processViewportClientesInWorker = () => {
  if (!markerWorker.value) {
    return
  }

  const version = ++latestWorkerVersion.value

  const plainClientes = viewportClientes.value.map((cliente) => ({
    id: cliente.id,
    cliente_id: cliente.cliente_id,
    nombre: cliente.nombre,
    longitud: cliente.longitud,
    latitud: cliente.latitud,
  }))

  const message: MarkerWorkerRequest = {
    version,
    clientes: plainClientes,
  }

  traceMapFlow('worker:postMessage', {
    version,
    clientesLength: plainClientes.length,
  })

  markerWorker.value.postMessage(message)
}

const toFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null
}

const getViewportFromMap = () => {
  const bounds = mapInstance.value?.getBounds()
  if (!bounds) {
    return null
  }

  const southWest = bounds.getSouthWest()
  const northEast = bounds.getNorthEast()

  return {
    lngMin: southWest.lng(),
    latMin: southWest.lat(),
    lngMax: northEast.lng(),
    latMax: northEast.lat(),
  }
}

const getViewportRequestKey = (viewport: {
  lngMin: number
  latMin: number
  lngMax: number
  latMax: number
}) => [
  viewport.lngMin.toFixed(6),
  viewport.latMin.toFixed(6),
  viewport.lngMax.toFixed(6),
  viewport.latMax.toFixed(6),
].join('|')

const fetchViewportClientes = async () => {
  if (!isAuthenticated.value) {
    return
  }

  const viewport = getViewportFromMap()
  if (!viewport) {
    return
  }

  const viewportRequestKey = getViewportRequestKey(viewport)
  if (viewportRequestKey === lastViewportRequestKey.value) {
    traceMapFlow('fetchViewportClientes:skipSameViewport', { viewportRequestKey })
    return
  }

  lastViewportRequestKey.value = viewportRequestKey

  const fetchVersion = ++latestFetchVersion.value
  traceMapFlow('fetchViewportClientes:start', {
    fetchVersion,
    viewportRequestKey,
  })

  try {
    const clientesEnViewport = await getClientesInViewport({
      lngMin: viewport.lngMin,
      latMin: viewport.latMin,
      lngMax: viewport.lngMax,
      latMax: viewport.latMax,
      limit: 5000,
    })

    if (fetchVersion !== latestFetchVersion.value) {
      traceMapFlow('fetchViewportClientes:ignoredStaleSuccess', { fetchVersion })
      return
    }

    viewportClientes.value = (clientesEnViewport as ClienteWithOptionalCoords[])
      .map((cliente) => {
        const longitud = toFiniteNumber(cliente.longitud)
        const latitud = toFiniteNumber(cliente.latitud)

        if (longitud === null || latitud === null) {
          return null
        }

        return {
          id: cliente.id,
          cliente_id: cliente.cliente_id,
          nombre: cliente.nombre,
          longitud,
          latitud,
        }
      })
      .filter((cliente): cliente is ClienteViewportItem => cliente !== null)
  } catch {
    if (fetchVersion !== latestFetchVersion.value) {
      traceMapFlow('fetchViewportClientes:ignoredStaleError', { fetchVersion })
      return
    }

    viewportClientes.value = []
    traceMapFlow('fetchViewportClientes:error', { fetchVersion })
  }

  if (fetchVersion !== latestFetchVersion.value) {
    traceMapFlow('fetchViewportClientes:ignoredStaleAfterProcess', { fetchVersion })
    return
  }

  traceMapFlow('fetchViewportClientes:end', {
    fetchVersion,
    resultClientes: viewportClientes.value.length,
  })

  processViewportClientesInWorker()
}

const scheduleViewportFetch = () => {
  if (!isAuthenticated.value) {
    return
  }

  if (viewportFetchDebounceTimer.value) {
    window.clearTimeout(viewportFetchDebounceTimer.value)
  }

  viewportFetchDebounceTimer.value = window.setTimeout(() => {
    traceMapFlow('scheduleViewportFetch:fire')
    fetchViewportClientes()
  }, 500)
}

const createMap = () => {
  const googleMaps = getGoogleMapsApi()

  const mapElement = document.getElementById('dashboard-google-map')

  if (!googleMaps || !mapElement) {
    mapLoadStatus.value = 'error'
    mapStatusMessage.value = 'Google Maps not available. Check API script and key.'
    return false
  }

  // Keep default center/zoom lightweight until map data is wired in.
  mapInstance.value = new googleMaps.Map(mapElement, {
    center: LIMA_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    mapId: googleMapsMapId || undefined,
    styles: darkMapStyles,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  })

  mapLoadStatus.value = 'ready'
  mapStatusMessage.value = 'Google Maps loaded successfully.'
  mapInfoWindow.value = new googleMaps.InfoWindow({
    content: '',
  })

  if (pendingMarkers.value.length > 0) {
    renderMarkers(pendingMarkers.value)
  }

  renderSavedPoligonos()

  mapClickListener.value?.remove()
  mapClickListener.value = mapInstance.value.addListener('click', (event) => {
    if (!isDrawingPolygon.value) {
      return
    }

    if (isSavingPolygon.value) {
      return
    }

    const latLng = event?.latLng
    if (!latLng) {
      return
    }

    const clickedPoint: DraftPoint = {
      lat: latLng.lat(),
      lng: latLng.lng(),
    }

    if (isClickNearInitialPoint(clickedPoint)) {
      void saveDraftPolygon()
      return
    }

    polygonDraftPoints.value.push(clickedPoint)

    renderDraftPolygon()
  })

  return true
}

const clearProtectedDashboardData = () => {
  selectedPoligonoId.value = null
  showPoligonosPanel.value = false
  showVendedoresPanel.value = false
  selectedVendedores.value = []
  savedVendedores.value = []
  generatedPoligonos.value = []
  savedPoligonos.value = []
  viewportClientes.value = []
  pendingMarkers.value = []
  markerColorMap.value = {}
  lastRenderedMarkerPayloads.value = []
  lastViewportRequestKey.value = null
  clearSavedPolygonOverlays()
  clearMarkerCluster()
  clearMapMarkers()
}

watch(
  isAuthenticated,
  async (authenticated) => {
    if (!authenticated) {
      clearProtectedDashboardData()
      finishPostLoginPointsLoading('')
      mapStatusMessage.value = 'Login required to access points and polygons.'
      return
    }

    mapStatusMessage.value = 'Session active. Loading points and polygons...'
    startPostLoginPointsLoading()
    await Promise.allSettled([loadPoligonos(), loadVendedores()])
    globalLoadingStore.setProgress(55)
    globalLoadingStore.setMessage('Loading points...')
    scheduleViewportFetch()
  },
)

onMounted(async () => {
  attachGoogleAuthFailureHandler()
  initializeMarkerWorker()
  initColoringWorker()
  initPolygonGenerationWorker()

  hasResolvedInitialMapLoading.value = false
  globalLoadingStore.begin({
    title: 'Login',
    message: 'Initializing map session...',
    progress: 8,
  })

  mapLoadStatus.value = 'loading'
  mapStatusMessage.value = 'Loading Google Maps script...'
  globalLoadingStore.setProgress(24)
  globalLoadingStore.setMessage('Loading Google Maps script...')

  const mapsReady = await loadGoogleMapsScript()
  if (!mapsReady) {
    mapLoadStatus.value = 'error'
    mapStatusMessage.value = 'Google Maps did not initialize in time.'
    resolveInitialMapLoading('Could not initialize Google Maps.')
    return
  }

  mapStatusMessage.value = 'Rendering Google Map...'
  globalLoadingStore.setProgress(55)
  globalLoadingStore.setMessage('Rendering map and loading points...')
  createMap()

  if (isAuthenticated.value) {
    loadPoligonos()
    loadVendedores()
  } else {
    mapStatusMessage.value = 'Login required to access points and polygons.'
    resolveInitialMapLoading('Map loaded. Login required to access points and polygons.')
  }

  mapIdleListener.value = mapInstance.value?.addListener('idle', () => {
    traceMapFlow('map:idle')
    scheduleViewportFetch()
  }) ?? null

  if (isAuthenticated.value) {
    scheduleViewportFetch()
  }
})

onBeforeUnmount(() => {
  closeMapTooltip()
  mapInfoWindow.value = null
  mapClickListener.value?.remove()
  mapClickListener.value = null
  resetPolygonDrawing()
  clearDraftPointMarkers()
  clearSavedPolygonOverlays()
  clearMarkerCluster()
  clearMapMarkers()
  mapIdleListener.value?.remove()
  mapIdleListener.value = null

  if (viewportFetchDebounceTimer.value) {
    window.clearTimeout(viewportFetchDebounceTimer.value)
    viewportFetchDebounceTimer.value = null
  }

  markerWorker.value?.terminate()
  markerWorker.value = null
  coloringWorkerInstance.value?.terminate()
  coloringWorkerInstance.value = null
  polygonGenerationWorker.value?.terminate()
  polygonGenerationWorker.value = null
})
</script>

<template>
  <section class="relative h-[calc(100vh-220px)] w-full overflow-hidden bg-[var(--app-surface)]">
    <div
      v-if="shouldShowStatusBanner"
      class="absolute left-3 top-3 z-10 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm"
      :class="{
        'border-amber-300 bg-amber-50 text-amber-800': mapLoadStatus === 'ready' && !isAuthenticated,
        'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]': mapLoadStatus === 'loading',
        'border-emerald-300 bg-emerald-50 text-emerald-700': mapLoadStatus === 'ready',
        'border-red-300 bg-red-50 text-red-700': mapLoadStatus === 'error',
      }"
    >
      {{ mapStatusMessage }}
    </div>

    <div
      v-if="showAuthRequiredNotice"
      class="absolute left-1/2 top-16 z-20 w-[min(92vw,680px)] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-center shadow-[0_10px_30px_rgba(146,64,14,0.18)] backdrop-blur-sm"
    >
      <p class="m-0 text-lg font-semibold text-amber-900">
        Sign in to access points and polygons.
      </p>
      <p class="mb-0 mt-1 text-md text-amber-800">
        You can explore the map, but data panels are unlocked only after login or registration.
      </p>
    </div>

    <MapPolygonSidebar
      v-if="isAuthenticated"
      :is-drawing-polygon="isDrawingPolygon"
      :can-save-polygon="canSavePolygon"
      :is-saving-polygon="isSavingPolygon"
      :show-poligonos-panel="showPoligonosPanel"
      :is-loading-polygons="isLoadingPolygons"
      :deleting-poligono-id="deletingPoligonoId"
      :polygon-draft-points-count="polygonDraftPoints.length"
      :saved-poligonos="savedPoligonos"
      :show-vendedores-panel="showVendedoresPanel"
      :is-loading-vendedores="isLoadingVendedores"
      :saved-vendedores="savedVendedores"
      :selected-vendedores="selectedVendedores"
      :points-per-vendor="pointsPerVendor"
      :can-generate-polygons="canGeneratePolygons"
      :is-generating-polygons="isGeneratingPolygons"
      :selected-poligono-id="selectedPoligonoId"
      :selected-color="selectedPolygonColor"
      @toggle-drawing="togglePolygonDrawing"
      @save="saveDraftPolygon"
      @toggle-list="showPoligonosPanel = !showPoligonosPanel"
      @refresh-list="loadPoligonos"
      @toggle-vendors-list="showVendedoresPanel = !showVendedoresPanel"
      @refresh-vendors-list="loadVendedores"
      @generate-polygons="generatePolygonsFromSelection"
      @select-poligono="selectPoligono"
      @delete="removePoligonoById"
      @color-change="(color) => (selectedPolygonColor = color)"
      @update:selected-vendedores="(value) => (selectedVendedores = value)"
      @update:points-per-vendor="(value) => (pointsPerVendor = value)"
    />

    <FloatingPlaceSearch
      v-if="isAuthenticated"
      :map="mapInstance"
      :disabled="mapLoadStatus !== 'ready'"
      @selected="handlePlaceSelected"
    />

    <PoligonoDetailsSidebar
      v-if="selectedPoligono"
      :poligono="selectedPoligono"
      @updated="handlePoligonoUpdated"
      @close="closePoligonoDetails"
    />

    <div
      id="dashboard-google-map"
      class="absolute inset-0 h-full w-full"
      :class="{ 'map-drawing-cursor': isMapDrawingCursor }"
    ></div>
  </section>
</template>

<style scoped>
:global(.map-tooltip) {
  min-width: 200px;
  max-width: 280px;
  border: 1px solid #d4d4d8;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
  padding: 10px 12px;
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #0f172a;
}

:global(.map-tooltip__title) {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
}

:global(.map-tooltip__content) {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

:global(.map-tooltip__line) {
  font-size: 12px;
  color: #334155;
  line-height: 1.35;
}

:global(.map-drawing-cursor),
:global(.map-drawing-cursor *) {
  cursor: pointer !important;
}
</style>
