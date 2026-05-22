import axios from 'axios'

const AUTH_TOKEN_KEY = 'auth_token'

export interface ClientesViewportParams {
  lngMin: number
  latMin: number
  lngMax: number
  latMax: number
  limit?: number
}

export interface ClientesCercanosParams {
  longitud: number
  latitud: number
  radioMetros: number
  limite?: number
}

export interface ClienteViewportItem {
  id: number
  cliente_id: string
  nombre: string
  longitud: number
  latitud: number
}

export interface ClienteCercanoItem {
  cliente_id: string
  nombre: string
  ultima_compra: string
  monto_anual: string
  moneda: string
  distancia_metros: number
  longitud?: number
  latitud?: number
}

const clientesApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

clientesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)

  if (!token) {
    return Promise.reject(new Error('Token not found'))
  }

  config.headers = config.headers ?? {}
  config.headers.Authorization = `Bearer ${token}`

  return config
})

export const getClientesInViewport = async (
  params: ClientesViewportParams,
): Promise<ClienteViewportItem[]> => {
  const { data } = await clientesApi.get<ClienteViewportItem[]>('/clientes/viewport', {
    params,
  })

  return data
}

export const getClientesCercanos = async (
  params: ClientesCercanosParams,
): Promise<ClienteCercanoItem[]> => {
  const { data } = await clientesApi.get<ClienteCercanoItem[]>('/clientes/cercanos', {
    params,
  })

  return data
}