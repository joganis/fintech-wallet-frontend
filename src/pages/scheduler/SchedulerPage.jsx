import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulerService } from '../../services/schedulerService'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import EmptyState from '../../components/common/EmptyState'
import { useQuery as useWallets_ } from '@tanstack/react-query'
import { walletService } from '../../services/walletService'

function fmt(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

const FREQ_LABELS = { ONCE: 'One time', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly' }
const STATUS_STYLE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  EXECUTED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-100 text-red-700',
}

export default function SchedulerPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    sourceWalletId: '', destWalletId: '', type: 'DEPOSIT',
    amount: '', frequency: 'ONCE', nextExecutionAt: '', description: ''
  })

  const { data: ops = [], isLoading } = useQuery({
    queryKey: ['scheduled-ops'],
    queryFn: () => schedulerService.list().then(r => r.data.data)
  })

  const { data: wallets = [] } = useWallets_({
    queryKey: ['wallets'],
    queryFn: () => walletService.list().then(r => r.data.data)
  })

  const create = useMutation({
    mutationFn: schedulerService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-ops'] }); setOpen(false); setError('') },
    onError: e => setError(e.response?.data?.message || 'Failed to schedule operation')
  })

  const cancel = useMutation({
    mutationFn: schedulerService.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-ops'] })
  })

  function parseWalletId(value) {
    const v = String(value).trim()
    if (v.includes('-')) return parseInt(v.split('-').pop(), 10)
    return parseInt(v, 10)
  }

  function localDateTimeMin() {
    const d = new Date(Date.now() + 60000)
    const p = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) return setError('Enter a valid amount')
    if (!form.sourceWalletId) return setError('Select a source wallet')

    const payload = {
      ...form,
      amount,
      sourceWalletId: parseWalletId(form.sourceWalletId),
      destWalletId: form.destWalletId ? parseWalletId(form.destWalletId) : null,
      nextExecutionAt: form.nextExecutionAt
    }
    create.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Scheduled operations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Automatic transfers, deposits and payments — ordered by date using a Min-Heap
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">+ Schedule operation</button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>How it works:</strong> Operations are stored in a priority queue (Min-Heap) ordered by execution date.
        The scheduler runs every minute and processes operations with the earliest date first — O(log n) extraction.
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        : ops.length === 0 ? (
          <EmptyState title="No scheduled operations"
            description="Schedule automatic transfers, recurring savings or periodic payments"
            action={<button onClick={() => setOpen(true)} className="btn-primary">Schedule one</button>} />
        ) : (
          <div className="space-y-3">
            {ops.map(op => (
              <div key={op.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {op.type === 'DEPOSIT' ? '↓' : op.type === 'WITHDRAW' ? '↑' : '→'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{op.description || op.type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {FREQ_LABELS[op.frequency]} · Next: {new Date(op.nextExecutionAt).toLocaleString('es-CO', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{fmt(op.amount)}</p>
                      <p className="text-xs text-gray-400">{op.executionCount} run{op.executionCount !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[op.status] || ''}`}>
                      {op.status}
                    </span>
                    {op.status === 'PENDING' && (
                      <button onClick={() => cancel.mutate(op.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Create modal */}
      <Modal open={open} onClose={() => { setOpen(false); setError('') }} title="Schedule new operation">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {['DEPOSIT', 'WITHDRAW', 'TRANSFER_OUT'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Frequency</label>
              <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Source wallet</label>
            <select className="input" value={form.sourceWalletId} onChange={e => setForm(f => ({ ...f, sourceWalletId: e.target.value }))} required>
              <option value="">Select…</option>
              {wallets.filter(w => w.status === 'ACTIVE').map(w => (
                <option key={w.id} value={w.id}>{w.name} — {fmt(w.balance)}</option>
              ))}
            </select>
          </div>
          {form.type === 'TRANSFER_OUT' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Destination wallet</label>
              <input type="text" className="input" placeholder="e.g. SAV-00003 or 3"
                value={form.destWalletId} onChange={e => setForm(f => ({ ...f, destWalletId: e.target.value }))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (COP)</label>
              <input type="number" step="0.01" min="0.01" className="input" placeholder="0.00"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Execute at</label>
              <input type="datetime-local" className="input"
                value={form.nextExecutionAt} min={localDateTimeMin()}
                onChange={e => setForm(f => ({ ...f, nextExecutionAt: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <input className="input" placeholder="e.g. Monthly rent" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setOpen(false); setError('') }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={create.isPending}>
              {create.isPending ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
