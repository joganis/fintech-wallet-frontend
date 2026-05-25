import api from './api'

export const userService = {
  getProfile:         ()     => api.get('/users/me'),
  updateProfile:      (data) => api.put('/users/me', data),
  deleteAccount:      ()     => api.delete('/users/me'),
  searchUsers:        (q)    => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  getUserPublicProfile: (id) => api.get(`/users/${id}/profile`),
}
