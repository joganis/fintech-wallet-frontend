import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'

const OP_LABELS = { DEPOSIT: 'Deposit', WITHDRAW: 'Withdrawal', TRANSFER_OUT: 'Transfer' }

export function useSseEvents() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const addToast = useToastStore(s => s.addToast)

  useEffect(() => {
    if (!user?.id) return

    const url = `/api/v1/events/subscribe/${user.id}`
    console.log('[SSE] Connecting userId=%s → %s', user.id, url)
    const es = new EventSource(url)

    es.onopen = () => console.log('[SSE] Connection OPEN userId=%s', user.id)

    es.addEventListener('scheduled-executed', (e) => {
      console.log('[SSE] event: scheduled-executed', e.data)
      qc.invalidateQueries({ queryKey: ['scheduled-ops'] })
      qc.invalidateQueries({ queryKey: ['wallets'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['rewards-profile'] })
      try {
        const { type } = JSON.parse(e.data)
        addToast({ message: `Scheduled ${OP_LABELS[type] || type} executed successfully`, type: 'success' })
      } catch { addToast({ message: 'Scheduled operation executed', type: 'success' }) }
    })

    es.addEventListener('wallet-updated', (e) => {
      console.log('[SSE] event: wallet-updated', e.data)
      qc.invalidateQueries({ queryKey: ['wallets'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['rewards-profile'] })
    })

    es.addEventListener('wallets-updated', () => {
      console.log('[SSE] event: wallets-updated')
      qc.invalidateQueries({ queryKey: ['wallets'] })
    })

    es.addEventListener('transactions-updated', () => {
      console.log('[SSE] event: transactions-updated')
      qc.invalidateQueries({ queryKey: ['transactions'] })
    })

    es.addEventListener('scheduled-updated', () => {
      console.log('[SSE] event: scheduled-updated')
      qc.invalidateQueries({ queryKey: ['scheduled-ops'] })
    })

    es.addEventListener('rewards-updated', () => {
      console.log('[SSE] event: rewards-updated')
      qc.invalidateQueries({ queryKey: ['rewards-profile'] })
    })

    es.addEventListener('reversal-completed', (e) => {
      console.log('[SSE] event: reversal-completed', e.data)
      qc.invalidateQueries({ queryKey: ['wallets'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['reversals'] })
      qc.invalidateQueries({ queryKey: ['rewards-profile'] })
    })

    es.addEventListener('notification', () => {
      console.log('[SSE] event: notification')
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    })

    es.onerror = (e) => {
      console.warn('[SSE] ERROR — readyState=%s', es.readyState, e)
    }

    return () => { console.log('[SSE] Closing userId=%s', user.id); es.close() }

  }, [user?.id, qc])
}
