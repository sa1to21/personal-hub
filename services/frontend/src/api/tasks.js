import axios from 'axios'

const api = axios.create({
  baseURL: '/api/tasks',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const getTasks = async (filters = {}) => {
  const params = {}
  if (filters.status) params.status = filters.status
  if (filters.priority) params.priority = filters.priority
  if (filters.sort_by) params.sort_by = filters.sort_by
  if (filters.order) params.order = filters.order

  const response = await api.get('/', { params })
  return response.data
}

export const createTask = async (data) => {
  const response = await api.post('/', data)
  return response.data
}

export const updateTask = async (id, data) => {
  const response = await api.put(`/${id}`, data)
  return response.data
}

export const deleteTask = async (id) => {
  const response = await api.delete(`/${id}`)
  return response.data
}
