import api from './api'
export const analyticsService = {
  totalMoved:      (f,t)          => api.get(`/analytics/total-moved?from=${f}&to=${t}`),
  frequency:       (f,t)          => api.get(`/analytics/frequency?from=${f}&to=${t}`),
  topTx:           (n=10)         => api.get(`/analytics/top-transactions?limit=${n}`),
  ranking:         (min=0,max=999999) => api.get(`/analytics/ranking?min=${min}&max=${max}`),
  mostActive:      ()             => api.get('/analytics/most-active-user'),
  network:         (id)           => api.get(`/analytics/transfer-network/${id}`),
  topWallets:      (n=5)          => api.get(`/analytics/top-wallets?limit=${n}`),
  topInteracting:  (n=5)          => api.get(`/analytics/top-interacting-users?limit=${n}`),
  transferGraph:   ()             => api.get('/analytics/transfer-graph'),
  topSenders:      (n=10)         => api.get(`/analytics/top-senders?limit=${n}`),
}
