import axios from 'axios'

const AUTH_TOKEN_KEY = 'auth_token'

export type PolygonCoordinates = number[][][]

export interface PoligonoItem {
  id: number
  usuario_id: number
  nombre: string
  area: {
    type: 'Polygon'
    coordinates: PolygonCoordinates
  }
  color_hex: string
  estilo_punto: string
  fecha_creacion: string
}

export interface CreatePoligonoPayload {
  nombre?: string
  areaCoordinates: PolygonCoordinates
  colorHex?: string
  estiloPunto?: string
}

export interface CreatePoligonoBulkItemPayload {
  nombre?: string
  areaCoordinates: PolygonCoordinates
  colorHex?: string
  estiloPunto?: string
  vendedorId: number
  clienteIds: number[]
}

export interface CreatePoligonosBulkPayload {
  items: CreatePoligonoBulkItemPayload[]
}

export interface CreatePoligonosBulkResponse {
  polygonIds: number[]
  createdPolygons: number
  vendorAssignmentsUpserted: number
  clientAssignmentsUpserted: number
}

export interface PuntoDentroPoligonoItem {
  id: number
  cliente_id: string
  nombre: string
  moneda: string
  importe_compras: number
  monto_anual: number
  longitud: number
  latitud: number
}

export interface PoligonoPuntosResponse {
  poligonoId: number
  total: number
  totalMontoAnual: number
  points: PuntoDentroPoligonoItem[]
}

export interface PoligonoDetalleResponse {
  poligono: PoligonoItem
  total: number
  totalMontoAnual: number
  points: PuntoDentroPoligonoItem[]
}

const poligonosApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

poligonosApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)

  if (!token) {
    return Promise.reject(new Error('Token not found'))
  }

  config.headers = config.headers ?? {}
  config.headers.Authorization = `Bearer ${token}`

  return config
})

export const listPoligonos = async (): Promise<PoligonoItem[]> => {
  const { data } = await poligonosApi.get<PoligonoItem[]>('/poligonos')
  return data
}

export const createPoligono = async (
  payload: CreatePoligonoPayload,
): Promise<PoligonoItem> => {
  const { data } = await poligonosApi.post<PoligonoItem>('/poligonos', payload)
  return data
}

export const createPoligonosBulk = async (
  payload: CreatePoligonosBulkPayload,
): Promise<CreatePoligonosBulkResponse> => {
  const { data } = await poligonosApi.post<CreatePoligonosBulkResponse>('/poligonos/bulk', payload)
  return data
}

export const getPoligonoPuntos = async (id: number): Promise<PoligonoPuntosResponse> => {
  const { data } = await poligonosApi.get<PoligonoPuntosResponse>(`/poligonos/${id}/puntos`)
  return data
}

export const getPoligonoDetalle = async (id: number): Promise<PoligonoDetalleResponse> => {
  const { data } = await poligonosApi.get<PoligonoDetalleResponse>(`/poligonos/${id}/detalle`)
  return data
}

export const updatePoligono = async (
  id: number,
  payload: CreatePoligonoPayload,
): Promise<PoligonoItem> => {
  const { data } = await poligonosApi.put<PoligonoItem>(`/poligonos/${id}`, payload)
  return data
}

export const deletePoligono = async (id: number): Promise<void> => {
  await poligonosApi.delete(`/poligonos/${id}`)
}
