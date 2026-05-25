import api from './api'
export const notificationService = {
  recent:   (n=20) => api.get(`/notifications?limit=${n}`),
  unread:   ()     => api.get('/notifications/unread-count'),
  markRead: ()     => api.patch('/notifications/mark-read'),
}
