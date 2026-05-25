import api from './api'
export const transactionService = {
  deposit:  (d) => api.post('/transactions/deposit', d),
  withdraw: (d) => api.post('/transactions/withdraw', d),
  transfer: (d) => api.post('/transactions/transfer', d),
  history:  (p=0,s=20) => api.get(`/transactions?page=${p}&size=${s}`),
  byRange:  (f,t) => api.get(`/transactions/range?from=${f}&to=${t}`),
}
