import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

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
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (accessToken && refreshToken) {
      fetchUser(accessToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (token) => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password })
    const { accessToken, refreshToken, user } = response.data

    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(user)
  }

  const register = async (email, password) => {
    const response = await axios.post('/api/auth/register', { email, password })
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
