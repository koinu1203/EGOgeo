import axios from 'axios'

export interface AuthPayload {
  correo: string
  password: string
}

export interface AuthResponse {
  token?: string
  accessToken?: string
  message?: string
}

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const registerUser = async (payload: AuthPayload): Promise<AuthResponse> => {
  const { data } = await authApi.post<AuthResponse>('/auth/register', payload)
  return data
}

export const loginUser = async (payload: AuthPayload): Promise<AuthResponse> => {
  const { data } = await authApi.post<AuthResponse>('/auth/login', payload)
  return data
}

export const logoutUser = async (token: string): Promise<AuthResponse> => {
  const { data } = await authApi.post<AuthResponse>(
    '/auth/logout',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  return data
}
