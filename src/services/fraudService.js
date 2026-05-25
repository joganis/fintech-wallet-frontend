import api from './api'
export const fraudService = {
  myAudit:       ()  => api.get('/fraud/my-audit'),
  unresolved:    ()  => api.get('/fraud/unresolved'),
  hasCycles:     ()  => api.get('/fraud/has-cycles'),
  network:       (id) => api.get(`/fraud/network/${id}`),
  revertDeposit:  (reason) => api.post('/reversals/revert/deposit',  { reason }),
  revertTransfer: (reason) => api.post('/reversals/revert/transfer', { reason }),
  revertWithdraw: (reason) => api.post('/reversals/revert/withdraw', { reason }),
  reversals:     ()  => api.get('/reversals'),
}
