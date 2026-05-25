import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionService } from '../../services/transactionService'
import Spinner from '../../components/common/Spinner'
import EmptyState from '../../components/common/EmptyState'

const TYPE_META = {
  DEPOSIT:      { label: 'Deposit',    color: 'text-green-600', bgColor: 'bg-green-100', sign: '+' },
  WITHDRAW:     { label: 'Withdraw',   color: 'text-red-600',   bgColor: 'bg-red-100',   sign: '−' },
  TRANSFER_OUT: { label: 'Sent',       color: 'text-red-600',   bgColor: 'bg-red-100',   sign: '−' },
  TRANSFER_IN:  { label: 'Received',   color: 'text-green-600', bgColor: 'bg-green-100', sign: '+' },
}

const RISK = {
  LOW:    { label: '', style: '' },
  MEDIUM: { label: 'Medium risk', style: 'text-amber-600 bg-amber-50' },
  HIGH:   { label: 'High risk',   style: 'text-red-600 bg-red-50' },
}

function fmt(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

function TxRow({ tx, onClick }) {
  const meta = TYPE_META[tx.type] || TYPE_META.DEPOSIT
  const risk = RISK[tx.riskLevel] || RISK.LOW
  const isReversed = tx.status === 'REVERSED'
  return (
    <tr onClick={() => onClick(tx)} className={`cursor-pointer border-b border-gray-50 transition-colors ${isReversed ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}>
      <td className="py-3 pl-4">
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isReversed ? 'bg-orange-100 text-orange-500' : `${meta.bgColor} ${meta.color}`}`}>
            {isReversed ? '↩' : meta.sign}
          </div>
          <div>
            <p className={`text-sm font-medium ${isReversed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{tx.description || meta.label}</p>
            <p className="text-xs text-gray-400">
              {new Date(tx.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 text-xs">
        <span className={`px-2 py-0.5 rounded-full font-medium ${
          isReversed ? 'bg-orange-100 text-orange-600'
          : tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN'
            ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>{isReversed ? 'Reversed' : meta.label}</span>
      </td>
      <td className={`py-3 text-sm font-semibold ${isReversed ? 'text-gray-400 line-through' : meta.color}`}>
        {meta.sign}{fmt(tx.amount)}
      </td>
      <td className="py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
          : tx.status === 'REVERSED' ? 'bg-orange-100 text-orange-600 font-medium'
          : tx.status === 'FAILED' ? 'bg-red-100 text-red-700'
          : 'bg-yellow-100 text-yellow-700'
        }`}>{tx.status}</span>
      </td>
      <td className="py-3 pr-4">
        {risk.label && <span className={`text-xs px-2 py-0.5 rounded-full ${risk.style}`}>{risk.label}</span>}
      </td>
      <td className="py-3 pr-4 text-right">
        <span className={`text-xs font-medium ${tx.pointsGenerated > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
          {tx.pointsGenerated > 0 ? `+${tx.pointsGenerated} pts` : '—'}
        </span>
      </td>
    </tr>
  )
}

function TxDetail({ tx, onClose }) {
  if (!tx) return null
  const meta = TYPE_META[tx.type] || TYPE_META.DEPOSIT
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold">Transaction detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="space-y-3 text-sm">
          {[
            ['ID', tx.id],
            ['Type', meta.label],
            ['Amount', `${meta.sign}${fmt(tx.amount)}`],
            ['Status', tx.status],
            ['Risk', tx.riskLevel],
            ['Points earned', tx.pointsGenerated],
            ['Source wallet', tx.sourceWalletId || '—'],
            ['Dest wallet', tx.destWalletId || '—'],
            ['Description', tx.description || '—'],
            ['Date', new Date(tx.createdAt).toLocaleString('es-CO')],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-800 text-right ml-4">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => transactionService.history(page, 20).then(r => r.data.data),
    keepPreviousData: true,
  })

  const txs = data?.content || []
  const filtered = filter === 'ALL' ? txs
    : filter === 'REVERSED' ? txs.filter(t => t.status === 'REVERSED')
    : txs.filter(t => t.type === filter && t.status !== 'REVERSED')

  return (
    <div className="space-y-5">
      <div>
        <h1>Transaction history</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data?.totalElements || 0} total transactions
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'DEPOSIT', 'WITHDRAW', 'TRANSFER_OUT', 'TRANSFER_IN', 'REVERSED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f
                ? f === 'REVERSED' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-white'
                : f === 'REVERSED' ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f === 'ALL' ? 'All' : f === 'REVERSED' ? '↩ Reversed' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      : filtered.length === 0 ? (
        <EmptyState title="No transactions" description="Make a deposit, withdrawal or transfer to see activity here" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 pl-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Transaction</th>
                <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Risk</th>
                <th className="text-right py-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Points</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => <TxRow key={tx.id} tx={tx} onClick={setSelected} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">← Previous</button>
          <span className="text-sm text-gray-500">Page {page + 1} of {data.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(data.totalPages - 1, p + 1))} disabled={page >= data.totalPages - 1}
            className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next →</button>
        </div>
      )}

      <TxDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
