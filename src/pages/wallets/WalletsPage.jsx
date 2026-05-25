import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { walletService } from '../../services/walletService'
import { transactionService } from '../../services/transactionService'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import Spinner from '../../components/common/Spinner'
import api from '../../services/api'

const WALLET_TYPES = ['SAVINGS', 'DAILY_EXPENSES', 'SHOPPING', 'TRANSPORT', 'INVESTMENT']
const TYPE_COLORS = {
  SAVINGS:        { bg: 'bg-green-500',  border: 'border-green-200',  text: 'text-green-700' },
  DAILY_EXPENSES: { bg: 'bg-blue-500',   border: 'border-blue-200',   text: 'text-blue-700' },
  SHOPPING:       { bg: 'bg-purple-500', border: 'border-purple-200', text: 'text-purple-700' },
  TRANSPORT:      { bg: 'bg-orange-500', border: 'border-orange-200', text: 'text-orange-700' },
  INVESTMENT:     { bg: 'bg-teal-500',   border: 'border-teal-200',   text: 'text-teal-700' },
}

function parseWalletId(value) {
  const v = String(value).trim()
  if (v.includes('-')) return parseInt(v.split('-').pop(), 10)
  return parseInt(v, 10)
}

function fmt(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(n)
}

function WalletCard({ wallet, onDeposit, onWithdraw, onTransfer, onDeactivate }) {
  const c             = TYPE_COLORS[wallet.type] || TYPE_COLORS.SAVINGS
  const isActive      = wallet.status === 'ACTIVE'
  const isBlocked     = wallet.status === 'BLOCKED'
  const balance       = parseFloat(wallet.balance) || 0
  const canDeactivate = isActive && balance === 0

  return (
    <div className={`border rounded-xl overflow-hidden ${
      isBlocked ? 'border-red-300' : c.border
    }`}>
      <div className={`h-1.5 ${isBlocked ? 'bg-red-500' : c.bg}`} />
      <div className="p-5">

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className={`text-xs font-medium uppercase tracking-wide ${c.text}`}>
              {wallet.type.replace('_', ' ')}
            </p>
            <h3 className="text-gray-900 mt-1">{wallet.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{wallet.walletKey}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isActive   ? 'bg-green-100 text-green-700'
              : isBlocked ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-500'
            }`}>{wallet.status}</span>
            {isBlocked && (
              <span className="text-xs text-red-500 mt-1">🔒 Blocked by security</span>
            )}
          </div>
        </div>

        {/* Balance */}
        <p className="text-2xl font-bold text-gray-900 mb-1">{fmt(balance)}</p>
        <p className="text-xs text-gray-400 mb-3">{wallet.currency}</p>

        {/* Mensaje billetera bloqueada */}
        {isBlocked && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
            <p className="text-xs text-red-700">
              This wallet has been blocked due to suspicious activity.
            </p>
          </div>
        )}

        {/* Botones operación — solo ACTIVE */}
        {isActive && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => onDeposit(wallet)}
              className="flex-1 text-xs py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium">
              Deposit
            </button>
            <button onClick={() => onWithdraw(wallet)}
              className="flex-1 text-xs py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium">
              Withdraw
            </button>
            <button onClick={() => onTransfer(wallet)}
              className="flex-1 text-xs py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium">
              Transfer
            </button>
          </div>
        )}

        {/* Botón deactivate — solo si ACTIVE y saldo = 0 */}
        {canDeactivate && (
          <button onClick={() => onDeactivate(wallet)}
            className="w-full mt-2 text-xs py-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 font-medium border border-gray-200">
            Deactivate wallet
          </button>
        )}

      </div>
    </div>
  )
}

export default function WalletsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [opModal, setOpModal]       = useState(null)
  const [form, setForm]             = useState({ name: '', type: 'SAVINGS' })
  const [opForm, setOpForm]         = useState({ amount: '', description: '', destWalletId: '' })
  const [error, setError]           = useState('')
  const [createError, setCreateError] = useState('')

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => walletService.list().then(r => r.data.data)
  })

  const create = useMutation({
    mutationFn: walletService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] })
      setCreateOpen(false)
      setCreateError('')
      setForm({ name: '', type: 'SAVINGS' })
    },
    onError: e => setCreateError(e.response?.data?.message || 'Could not create wallet')
  })

  const doOp = useMutation({
    mutationFn: (data) => {
      if (opModal.type === 'deposit')  return transactionService.deposit(data)
      if (opModal.type === 'withdraw') return transactionService.withdraw(data)
      return transactionService.transfer(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['rewards-profile'] })
      setOpModal(null)
      setOpForm({ amount: '', description: '', destWalletId: '' })
      setError('')
    },
    onError: (e) => setError(e.response?.data?.message || 'Operation failed')
  })

  const deactivate = useMutation({
    mutationFn: (walletId) => api.patch(`/wallets/${walletId}/status`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallets'] }),
    onError:   (e) => alert(e.response?.data?.message || 'Could not deactivate wallet')
  })

  function handleOp(e) {
    e.preventDefault()
    setError('')
    const amount = parseFloat(opForm.amount)
    if (isNaN(amount) || amount <= 0) return setError('Enter a valid positive amount')

    if (opModal.type === 'transfer') {
      if (!opForm.destWalletId) return setError('Enter a destination wallet key or ID')
      const destId = parseWalletId(opForm.destWalletId)
      if (isNaN(destId)) return setError('Invalid wallet key — use format SAV-00003 or a numeric ID')
      doOp.mutate({
        sourceWalletId: opModal.wallet.id,
        destWalletId:   destId,
        amount,
        description: opForm.description
      })
    } else if (opModal.type === 'deposit') {
      doOp.mutate({ walletId: opModal.wallet.id, amount, description: opForm.description })
    } else {
      doOp.mutate({ walletId: opModal.wallet.id, amount, description: opForm.description })
    }
  }

  const otherWallets = opModal
    ? wallets.filter(w => w.id !== opModal.wallet?.id && w.status === 'ACTIVE')
    : []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>My wallets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">+ New wallet</button>
      </div>

      {isLoading
        ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : wallets.length === 0
          ? <EmptyState title="No wallets yet"
              description="Create your first digital wallet to get started"
              action={<button onClick={() => setCreateOpen(true)} className="btn-primary">Create wallet</button>} />
          : (
            <div className="grid grid-cols-2 gap-5">
              {wallets.map(w => (
                <WalletCard key={w.id} wallet={w}
                  onDeposit={w  => setOpModal({ type: 'deposit',  wallet: w })}
                  onWithdraw={w => setOpModal({ type: 'withdraw', wallet: w })}
                  onTransfer={w => setOpModal({ type: 'transfer', wallet: w })}
                  onDeactivate={w => deactivate.mutate(w.id)}
                />
              ))}
            </div>
          )
      }

      {/* Modal crear billetera */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setCreateError('') }} title="Create new wallet">
        <form onSubmit={e => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          {createError && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{createError}</p>}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Wallet name</label>
            <input className="input" placeholder="e.g. My savings"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
            <select className="input" value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {WALLET_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setCreateOpen(false); setCreateError('') }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal operaciones */}
      <Modal open={!!opModal} onClose={() => { setOpModal(null); setError('') }}
        title={opModal
          ? `${opModal.type.charAt(0).toUpperCase() + opModal.type.slice(1)} — ${opModal.wallet?.name}`
          : ''}>
        {opModal && (
          <form onSubmit={handleOp} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (COP)</label>
              <input type="number" step="0.01" min="0.01" className="input" placeholder="0.00"
                value={opForm.amount}
                onChange={e => setOpForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>

            {opModal.type === 'transfer' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Destination wallet
                </label>
                <select className="input mb-2" value={opForm.destWalletId}
                  onChange={e => setOpForm(f => ({ ...f, destWalletId: e.target.value }))}>
                  <option value="">— My wallets —</option>
                  {otherWallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} · {w.walletKey} — {fmt(parseFloat(w.balance))}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mb-1">Or enter another user's wallet key:</p>
                <input type="text" className="input" placeholder="e.g. SAV-00003"
                  value={opForm.destWalletId}
                  onChange={e => setOpForm(f => ({ ...f, destWalletId: e.target.value }))} />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description (optional)</label>
              <input className="input" placeholder="What's this for?"
                value={opForm.description}
                onChange={e => setOpForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setOpModal(null); setError('') }}
                className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={doOp.isPending}
                className={`flex-1 font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                  opModal.type === 'deposit'  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : opModal.type === 'withdraw' ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'btn-primary'
                }`}>
                {doOp.isPending
                  ? 'Processing…'
                  : opModal.type.charAt(0).toUpperCase() + opModal.type.slice(1)}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}