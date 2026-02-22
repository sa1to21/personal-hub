import { createContext, useContext, useState, useEffect } from 'react'
import { createApiClient, refreshAccessToken, isTokenExpiringSoon } from '../api/client'

const AuthContext = createContext(null)
const api = createApiClient('/api/auth')

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken')
      const refreshTokenValue = localStorage.getItem('refreshToken')

      if (!accessToken && !refreshTokenValue) {
        setLoading(false)
        return
      }

      try {
        if (accessToken && !isTokenExpiringSoon(accessToken)) {
          const response = await api.get('/me')
          setUser(response.data)
        } else if (refreshTokenValue) {
          const result = await refreshAccessToken()
          setUser(result.user)
        }
      } catch (error) {
        console.error('Failed to restore session:', error)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    const response = await api.post('/login', { email, password })
    const { accessToken, refreshToken, user } = response.data

    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(user)
  }

  const register = async (email, password) => {
    const response = await api.post('/register', { email, password })
    const { accessToken, refreshToken, user } = response.data

    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    window.location.href = '/auth'
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: 'white'
      }}>
        Загрузка...
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
