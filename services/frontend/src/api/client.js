import axios from 'axios'

let refreshPromise = null

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) throw new Error('No refresh token')

    const response = await axios.post('/api/auth/refresh', { refreshToken })
    const { accessToken } = response.data
    localStorage.setItem('accessToken', accessToken)
    return accessToken
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export const createApiClient = (baseURL) => {
  const api = axios.create({ baseURL })

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      const url = originalRequest.url || ''
      const isAuthEndpoint = url.includes('/login') || url.includes('/register') || url.includes('/refresh')

      if (
        (error.response?.status === 401 || error.response?.status === 403) &&
        !originalRequest._retry &&
        !isAuthEndpoint
      ) {
        originalRequest._retry = true

        try {
          const newToken = await refreshAccessToken()
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/auth'
          return Promise.reject(error)
        }
      }

      return Promise.reject(error)
    }
  )

  return api
}
