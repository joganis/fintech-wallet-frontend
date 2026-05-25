import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/authStore'

export function useLogin() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authService.login,
    onSuccess: ({ data }) => {
      setAuth(data.data.token, data.data.user)
      navigate('/dashboard')
    }
  })
}

export function useRegister() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authService.register,
    onSuccess: ({ data }) => {
      setAuth(data.data.token, data.data.user)
      navigate('/dashboard')
    }
  })
}

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: () => authService.profile().then(r => r.data.data) })
}
