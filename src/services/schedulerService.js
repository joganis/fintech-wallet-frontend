import api from './api'
export const schedulerService = {
  create: (d)  => api.post('/scheduler', d),
  list:   ()   => api.get('/scheduler'),
  cancel: (id) => api.delete(`/scheduler/${id}`),
}
