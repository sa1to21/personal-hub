import { createApiClient } from './client'

const api = createApiClient('/api')

export const getDailyNote = async (date) => {
  const params = date ? { date } : {}
  const response = await api.get('/notes/daily', { params })
  return response.data
}

export const saveDailyNote = async (content, date) => {
  const body = { content }
  if (date) body.date = date
  const response = await api.put('/notes/daily', body)
  return response.data
}
