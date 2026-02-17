import { createApiClient } from './client'

const api = createApiClient('/api/projects')

export const getProjects = async () => {
  const response = await api.get('/')
  return response.data
}

export const getProject = async (id) => {
  const response = await api.get(`/${id}`)
  return response.data
}

export const createProject = async (data) => {
  const response = await api.post('/', data)
  return response.data
}

export const updateProject = async (id, data) => {
  const response = await api.put(`/${id}`, data)
  return response.data
}

export const deleteProject = async (id) => {
  const response = await api.delete(`/${id}`)
  return response.data
}
