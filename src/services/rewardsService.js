import api from './api'
export const rewardsService = {
  profile: ()  => api.get('/rewards/profile'),
  redeem:  (d) => api.post('/rewards/redeem', d),
}
