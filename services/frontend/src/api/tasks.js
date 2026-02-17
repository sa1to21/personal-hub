import { createApiClient } from './client'

const api = createApiClient('/api')

// Tasks
export const getProjectTasks = async (projectId, filters = {}) => {
  const params = {}
  if (filters.status) params.status = filters.status
  if (filters.priority) params.priority = filters.priority
  if (filters.sort_by) params.sort_by = filters.sort_by
  if (filters.order) params.order = filters.order

  const response = await api.get(`/tasks/project/${projectId}`, { params })
  return response.data
}

export const getTask = async (id) => {
  const response = await api.get(`/tasks/${id}`)
  return response.data
}

export const createTask = async (projectId, data) => {
  const response = await api.post(`/tasks/project/${projectId}`, data)
  return response.data
}

export const updateTask = async (id, data) => {
  const response = await api.put(`/tasks/${id}`, data)
  return response.data
}

export const updateTaskStatus = async (id, status) => {
  const response = await api.patch(`/tasks/${id}/status`, { status })
  return response.data
}

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`)
  return response.data
}

// Checklists
export const addChecklistItem = async (taskId, data) => {
  const response = await api.post(`/checklists/task/${taskId}`, data)
  return response.data
}

export const updateChecklistItem = async (id, data) => {
  const response = await api.put(`/checklists/${id}`, data)
  return response.data
}

export const toggleChecklistItem = async (id) => {
  const response = await api.patch(`/checklists/${id}/toggle`)
  return response.data
}

export const deleteChecklistItem = async (id) => {
  const response = await api.delete(`/checklists/${id}`)
  return response.data
}

// Labels
export const getProjectLabels = async (projectId) => {
  const response = await api.get(`/labels/project/${projectId}`)
  return response.data
}

export const createLabel = async (projectId, data) => {
  const response = await api.post(`/labels/project/${projectId}`, data)
  return response.data
}

export const deleteLabel = async (id) => {
  const response = await api.delete(`/labels/${id}`)
  return response.data
}

export const attachLabel = async (taskId, labelId) => {
  const response = await api.post(`/labels/task/${taskId}/${labelId}`)
  return response.data
}

export const removeLabel = async (taskId, labelId) => {
  const response = await api.delete(`/labels/task/${taskId}/${labelId}`)
  return response.data
}
