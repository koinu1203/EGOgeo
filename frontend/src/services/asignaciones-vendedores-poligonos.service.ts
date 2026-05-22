import axios from 'axios'

const AUTH_TOKEN_KEY = 'auth_token'

export interface AsignacionVendedorPoligonoItem {
  id: number
  usuario_id: number
  vendedor_id: number
  poligono_id: number
  fecha_asignacion: string
}

export interface CreateAsignacionVendedorPoligonoPayload {
  vendedorId: number
  poligonoId: number
}

export interface UpdateAsignacionVendedorPoligonoPayload {
  vendedorId: number
  poligonoId: number
}

const asignacionesApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

asignacionesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)

  if (!token) {
    return Promise.reject(new Error('Token not found'))
  }

  config.headers = config.headers ?? {}
  config.headers.Authorization = `Bearer ${token}`

  return config
})

export const listAsignacionesVendedoresPoligonos = async (): Promise<AsignacionVendedorPoligonoItem[]> => {
  const { data } = await asignacionesApi.get<AsignacionVendedorPoligonoItem[]>('/asignaciones-vendedores-poligonos')
  return data
}

export const getAsignacionVendedorPoligonoById = async (
  id: number,
): Promise<AsignacionVendedorPoligonoItem> => {
  const { data } = await asignacionesApi.get<AsignacionVendedorPoligonoItem>(`/asignaciones-vendedores-poligonos/${id}`)
  return data
}

export const createAsignacionVendedorPoligono = async (
  payload: CreateAsignacionVendedorPoligonoPayload,
): Promise<AsignacionVendedorPoligonoItem> => {
  const { data } = await asignacionesApi.post<AsignacionVendedorPoligonoItem>('/asignaciones-vendedores-poligonos', payload)
  return data
}

export const updateAsignacionVendedorPoligono = async (
  id: number,
  payload: UpdateAsignacionVendedorPoligonoPayload,
): Promise<AsignacionVendedorPoligonoItem> => {
  const { data } = await asignacionesApi.put<AsignacionVendedorPoligonoItem>(`/asignaciones-vendedores-poligonos/${id}`, payload)
  return data
}

export const deleteAsignacionVendedorPoligono = async (id: number): Promise<void> => {
  await asignacionesApi.delete(`/asignaciones-vendedores-poligonos/${id}`)
}