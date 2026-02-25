import { createApiClient } from './client'

const api = createApiClient('/api')

export const getQuickNote = async () => {
  const response = await api.get('/notes/quick')
  return response.data
}

export const saveQuickNote = async (content) => {
  const response = await api.put('/notes/quick', { content })
  return response.data
}
