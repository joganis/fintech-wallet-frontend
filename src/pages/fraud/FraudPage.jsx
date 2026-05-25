import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fraudService } from '../../services/fraudService'
import { useToastStore } from '../../store/toastStore'
import Spinner from '../../components/common/Spinner'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'

const RISK_STYLES = {
  LOW:    'bg-green-100 text-green-800 border border-green-300',
  MEDIUM: 'bg-amber-100 text-amber-800 border border-amber-400',
  HIGH:   'bg-red-100 text-red-800 border border-red-400',
}

const PATTERN_LABELS = {
  RAPID_CONSECUTIVE:    'Rapid consecutive transfers',
  UNUSUALLY_HIGH_AMOUNT:'Unusually high amount',
  FRAGMENTED_TRANSFERS: 'Fragmented transfers (circular)',
  UNUSUAL_HOURS:        'Activity at unusual hours',
  FREQUENCY_SPIKE:      'Frequency spike',
  REPEATED_DESTINATION: 'Repeated destination',
}

const REVERT_TYPES = [
  { key: 'DEPOSIT',      label: 'Deposit',  btn: 'Revert deposit' },
  { key: 'TRANSFER_OUT', label: 'Transfer', btn: 'Revert transfer' },
]

export default function FraudPage() {
  const qc = useQueryClient()
  const addToast = useToastStore(s => s.addToast)

  const [revertType, setRevertType] = useState(null) // null | 'DEPOSIT' | 'TRANSFER_OUT' | 'WITHDRAW'
  const [reason, setReason]         = useState('')
  const [revertError, setRevertError] = useState('')

  const { data: myAudit = [], isLoading: auditLoading } = useQuery({
    queryKey: ['my-audit'],
    queryFn: () => fraudService.myAudit().then(r => r.data.data)
  })

  const { data: reversals = [], isLoading: revLoading } = useQuery({
    queryKey: ['reversals'],
    queryFn: () => fraudService.reversals().then(r => r.data.data)
  })

  const { data: cycles } = useQuery({
    queryKey: ['has-cycles'],
    queryFn: () => fraudService.hasCycles().then(r => r.data.data)
  })

  const revert = useMutation({
    mutationFn: ({ type, reason: r }) => {
      if (type === 'DEPOSIT')      return fraudService.revertDeposit(r)
      if (type === 'TRANSFER_OUT') return fraudService.revertTransfer(r)
      return fraudService.revertWithdraw(r)
    },
    onSuccess: (_, { type }) => {
      qc.invalidateQueries({ queryKey: ['reversals'] })
      qc.invalidateQueries({ queryKey: ['wallets'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['rewards-profile'] })
      const label = REVERT_TYPES.find(t => t.key === type)?.label || type
      addToast({ message: `${label} reversed successfully`, type: 'success' })
      closeModal()
    },
    onError: e => setRevertError(e.response?.data?.message || 'Reversal failed')
  })

  function closeModal() {
    setRevertType(null)
    setReason('')
    setRevertError('')
  }

  const highRisk = myAudit.filter(e => e.riskLevel === 'HIGH')
  const medRisk  = myAudit.filter(e => e.riskLevel === 'MEDIUM')
  const activeType = REVERT_TYPES.find(t => t.key === revertType)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1>Fraud detection & audit</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pattern analysis using Graph DFS/BFS · Stack-based transaction reversal by type
          </p>
        </div>
        <div className="flex gap-2">
          {REVERT_TYPES.map(t => (
            <button key={t.key} onClick={() => setRevertType(t.key)} className="btn-secondary text-sm">
              {t.btn}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-red-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">High risk events</p>
          <p className="text-2xl font-bold text-red-600">{highRisk.length}</p>
        </div>
        <div className="card border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Medium risk</p>
          <p className="text-2xl font-bold text-amber-600">{medRisk.length}</p>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total audit events</p>
          <p className="text-2xl font-bold text-blue-600">{myAudit.length}</p>
        </div>
        <div className={`card border-l-4 ${cycles?.hasCycles ? 'border-l-red-600' : 'border-l-green-500'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Circular patterns</p>
          <p className={`text-2xl font-bold ${cycles?.hasCycles ? 'text-red-600' : 'text-green-600'}`}>
            {cycles?.hasCycles ? 'Detected' : 'None'}
          </p>
        </div>
      </div>

      {/* How fraud detection works */}
      <div className="card bg-gray-50">
        <h3 className="mb-3">How detection works</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { title: 'Graph cycle detection (DFS)', desc: 'The transfer graph is traversed using Depth-First Search. A cycle indicates circular money movement — a common laundering pattern.' },
            { title: 'Sliding window (LinkedList)', desc: 'Recent transaction timestamps are stored in a bounded LinkedList. More than 5 transfers in 2 minutes triggers a RAPID_CONSECUTIVE alert.' },
            { title: 'Statistical deviation (HashMap)', desc: 'Per-user average amount is tracked in a HashMap. Any transaction 3x above the average is flagged as UNUSUALLY_HIGH_AMOUNT.' },
          ].map(({ title, desc }) => (
            <div key={title}>
              <p className="text-xs font-semibold text-gray-700 mb-1">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit events */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3>Audit events</h3>
          <span className="text-xs text-gray-400">{myAudit.length} total events</span>
        </div>
        {auditLoading ? <div className="flex justify-center py-10"><Spinner /></div>
        : myAudit.length === 0 ? (
          <div className="py-12">
            <EmptyState title="No fraud events detected" description="Your account has a clean security record" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {myAudit.map(e => (
              <div key={e.id} className="px-5 py-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    e.riskLevel === 'HIGH' ? 'bg-red-500' : e.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {PATTERN_LABELS[e.patternType] || e.patternType}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(e.detectedAt).toLocaleString('es-CO', { dateStyle:'medium', timeStyle:'short' })}
                      {e.transactionId && ` · TX #${e.transactionId}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${RISK_STYLES[e.riskLevel] || 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
                    {e.riskLevel}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    e.resolved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {e.resolved ? 'Resolved' : 'Open'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reversals history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3>Transaction reversals</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Stack per type (LIFO) — each type has its own independent reversal queue
          </p>
        </div>
        {revLoading ? <div className="flex justify-center py-10"><Spinner /></div>
        : reversals.length === 0 ? (
          <div className="py-10">
            <EmptyState title="No reversals" description="Reversed transactions will appear here" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reversals.map(r => (
              <div key={r.id} className="px-5 py-4 flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-800">TX #{r.originalTxId} reversed</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reason: {r.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.reversedAt || r.createdAt).toLocaleString('es-CO', { dateStyle:'medium', timeStyle:'short' })}
                    {r.pointsDeducted > 0 && ` · −${r.pointsDeducted} pts deducted`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    {new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(r.amountReversed)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                    : r.status === 'REJECTED' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data structure complexity card */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-900">
          <h3 className="text-white font-mono text-sm">Data Structure Performance</h3>
          <p className="text-xs text-gray-400 mt-0.5">Complexity of structures used in fraud detection</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Structure', 'Operation', 'Complexity', 'Used for'].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-gray-500 font-semibold uppercase tracking-wide text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { ds: 'HashMap<Long, LinkedList>',  op: 'get / put',        big: 'O(1)',      use: 'User timestamp windows & destination tracking' },
                { ds: 'LinkedList<LocalDateTime>',  op: 'addFirst / removeLast', big: 'O(1)', use: 'Sliding window of recent tx timestamps' },
                { ds: 'LinkedList<Long>',           op: 'addFirst / iterate',big: 'O(n)',     use: 'Recent destination wallet history per user' },
                { ds: 'Graph<Long> — DFS',          op: 'hasCycle()',       big: 'O(V+E)',    use: 'Circular transfer pattern detection' },
                { ds: 'Graph<Long> — BFS',          op: 'bfs(userId)',      big: 'O(V+E)',    use: 'Transfer network reachability analysis' },
                { ds: 'HashMap<Long, BigDecimal>',  op: 'get / put',        big: 'O(1)',      use: 'Running average per user (deviation check)' },
                { ds: 'HashMap<Long, Integer>',     op: 'get / put',        big: 'O(1)',      use: 'Transaction count per user (avg denominator)' },
              ].map(({ ds, op, big, use }) => (
                <tr key={ds + op} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-blue-700 font-semibold">{ds}</td>
                  <td className="py-3 px-4 text-gray-600">{op}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      big === 'O(1)'   ? 'bg-green-100 text-green-700' :
                      big === 'O(n)'   ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{big}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revert modal */}
      <Modal open={!!revertType} onClose={closeModal}
        title={`Revert last ${activeType?.label || ''}`}>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Stack-based reversal (LIFO):</strong> Undoes your last{' '}
            <strong>{activeType?.label?.toLowerCase()}</strong>, restores the original balance
            and deducts associated points.{' '}
            <span className="block mt-1 text-amber-700">Only reversible within the last 24 hours.</span>
          </div>
          {revertError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-lg">
              {revertError}
            </p>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Reason for reversal</label>
            <textarea className="input resize-none" rows={3}
              placeholder="e.g. Wrong amount entered, duplicate transaction..."
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => revert.mutate({ type: revertType, reason })}
              disabled={!reason.trim() || revert.isPending}
              className="btn-danger flex-1">
              {revert.isPending ? 'Reverting…' : `Revert ${activeType?.label?.toLowerCase() || ''}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
