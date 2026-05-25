import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { walletService } from '../services/walletService'

export function useWallets() {
  return useQuery({ queryKey: ['wallets'], queryFn: () => walletService.list().then(r => r.data.data) })
}

export function useCreateWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: walletService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] })
  })
}

export function useDeleteWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: walletService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] })
  })
}
