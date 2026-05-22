import axios from 'axios'

const AUTH_TOKEN_KEY = 'auth_token'

export interface VendedorItem {
  id: number
  codigo: string
  nombre: string
  fecha_creacion: string
}

export interface CreateVendedorPayload {
  codigo: string
  nombre: string
}

export interface UpdateVendedorPayload {
  codigo: string
  nombre: string
}

const vendedoresApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

vendedoresApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)

  if (!token) {
    return Promise.reject(new Error('Token not found'))
  }

  config.headers = config.headers ?? {}
  config.headers.Authorization = `Bearer ${token}`

  return config
})

export const listVendedores = async (): Promise<VendedorItem[]> => {
  const { data } = await vendedoresApi.get<VendedorItem[]>('/vendedores')
  return data
}

export const createVendedor = async (
  payload: CreateVendedorPayload,
): Promise<VendedorItem> => {
  const { data } = await vendedoresApi.post<VendedorItem>('/vendedores', payload)
  return data
}

export const updateVendedor = async (
  id: number,
  payload: UpdateVendedorPayload,
): Promise<VendedorItem> => {
  const { data } = await vendedoresApi.put<VendedorItem>(`/vendedores/${id}`, payload)
  return data
}

export const deleteVendedor = async (id: number): Promise<void> => {
  await vendedoresApi.delete(`/vendedores/${id}`)
}