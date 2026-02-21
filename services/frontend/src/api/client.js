import axios from 'axios'

let refreshPromise = null

const parseJwtExp = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

const isTokenExpiringSoon = (token) => {
  const exp = parseJwtExp(token)
  if (!exp) return true
  // Обновляем за 60 секунд до истечения
  return Date.now() > exp - 60000
}

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

  api.interceptors.request.use(async (config) => {
    const url = config.url || ''
    const isAuthEndpoint = url.includes('/login') || url.includes('/register') || url.includes('/refresh')

    let token = localStorage.getItem('accessToken')

    if (token && !isAuthEndpoint && isTokenExpiringSoon(token)) {
      try {
        token = await refreshAccessToken()
      } catch {
        // Fallback: отправляем с текущим токеном, response interceptor обработает 401
      }
    }

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
