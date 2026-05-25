import api from './api'
export const walletService = {
  list:   ()  => api.get('/wallets'),
  create: (d) => api.post('/wallets', d),
  delete: (id)=> api.delete(`/wallets/${id}`),
}
