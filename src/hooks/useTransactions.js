import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '../services/transactionService'

export function useTransactionHistory(page = 0) {
  return useQuery({
    queryKey: ['transactions', page],
    queryFn: () => transactionService.history(page).then(r => r.data.data)
  })
}

export function useDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: transactionService.deposit,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wallets'] }); qc.invalidateQueries({ queryKey: ['transactions'] });qc.invalidateQueries({ queryKey: ['rewards-profile'] })}
  })
}

export function useWithdraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: transactionService.withdraw,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['rewards-profile'] }) 
    }
  })
}

export function useTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: transactionService.transfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['rewards-profile'] }) // ← agregar
    }
  })
}
