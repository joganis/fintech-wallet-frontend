import api from './api'
export const authService = {
  register: (d) => api.post('/auth/register', d),
  login:    (d) => api.post('/auth/login', d),
  profile:  ()  => api.get('/users/me'),
  update:   (d) => api.put('/users/me', d),
}
