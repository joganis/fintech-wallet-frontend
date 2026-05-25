import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '../../services/analyticsService'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Spinner from '../../components/common/Spinner'
import StatCard from '../../components/common/StatCard'
import GraphVisualizer from '../../components/common/GraphVisualizer'
import { subDays, formatISO } from 'date-fns'
import { useAuthStore } from '../../store/authStore'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

function fmt(n) {
  return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(n)
}

function fmtShort(n) {
  const num = Number(n)
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}k`
  return `$${num.toFixed(0)}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [graphOpen, setGraphOpen] = useState(false)
  const { user } = useAuthStore()
  const from = formatISO(subDays(new Date(), days))
  const to   = formatISO(new Date())

  const { data: total, isLoading: tLoading } = useQuery({
    queryKey: ['analytics-total', days],
    queryFn: () => analyticsService.totalMoved(from, to).then(r => r.data.data)
  })

  const { data: freq = [], isLoading: fLoading } = useQuery({
    queryKey: ['analytics-freq', days],
    queryFn: () => analyticsService.frequency(from, to).then(r => r.data.data)
  })

  const { data: mostActive } = useQuery({
    queryKey: ['most-active'],
    queryFn: () => analyticsService.mostActive().then(r => r.data.data)
  })

  const { data: topWallets = [] } = useQuery({
    queryKey: ['top-wallets'],
    queryFn: () => analyticsService.topWallets(5).then(r => r.data.data)
  })

  const { data: topInteracting = [] } = useQuery({
    queryKey: ['top-interacting'],
    queryFn: () => analyticsService.topInteracting(5).then(r => r.data.data)
  })

  const { data: graphData } = useQuery({
    queryKey: ['transfer-graph'],
    queryFn: () => analyticsService.transferGraph().then(r => r.data.data),
    enabled: graphOpen,
    staleTime: 60_000,
  })

  const pieData = freq.map(f => ({ name: f.type.replace('_', ' '), value: Number(f.count) }))

  const mostActiveLabel = mostActive && mostActive.userId !== -1
    ? `${mostActive.userName || 'User #' + mostActive.userId} (${mostActive.transferCount ?? 0} transfers)`
    : '—'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Insights powered by Graph, BST and LinkedList structures</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                days === d ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label={`Total moved (${days}d)`}
          value={tLoading ? '…' : fmt(total?.totalAmount || 0)} color="blue" />
        <StatCard label="Most interacted user"
          value={mostActiveLabel} color="green" />
        <StatCard label="Transaction types"
          value={freq.length} sub="Distinct types tracked" color="amber" />
      </div>

      {/* Charts row — DO NOT MODIFY */}
      <div className="grid grid-cols-2 gap-5">
        {/* Bar chart — amount by type */}
        <div className="card">
          <h3 className="mb-4">Amount by transaction type</h3>
          {fLoading ? <Spinner /> : freq.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No data for period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={freq} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="type" tick={{ fontSize: 10 }} tickFormatter={v => v.replace('_',' ')} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalAmount" name="Amount" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart — count by type */}
        <div className="card">
          <h3 className="mb-4">Transaction count distribution</h3>
          {fLoading ? <Spinner /> : pieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No data for period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Count']} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Frequency table — DO NOT MODIFY */}
      {freq.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3>Breakdown by type</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Type', 'Count', 'Total amount', 'Avg per transaction'].map(h => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {freq.map((f, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium text-gray-800">{f.type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-700">{f.count}</td>
                  <td className="py-3 px-5 text-sm font-semibold text-gray-800">{fmt(f.totalAmount)}</td>
                  <td className="py-3 px-5 text-sm text-gray-500">{fmt(f.count > 0 ? f.totalAmount / f.count : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Wallets */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3>Top wallets by usage</h3>
          <p className="text-xs text-gray-400 mt-0.5">Your most active wallets ranked by transaction count</p>
        </div>
        {topWallets.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No wallet transactions yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {topWallets.map((w, i) => (
              <div key={w.walletId} className="flex items-center px-5 py-3 hover:bg-gray-50">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1 ml-3">
                  <p className="text-sm font-medium text-gray-800">{w.walletName}</p>
                  <p className="text-xs text-gray-400">{w.walletType?.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{fmt(w.totalAmount)}</p>
                  <p className="text-xs text-gray-400">{w.transactionCount} txns</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Interacting Users */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3>Users you've interacted with most</h3>
          <p className="text-xs text-gray-400 mt-0.5">Based on outgoing transfers in your network graph</p>
        </div>
        {topInteracting.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No transfer interactions yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {topInteracting.map((u, i) => (
              <div key={u.userId} className="flex items-center px-5 py-3 hover:bg-gray-50">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1 ml-3">
                  <p className="text-sm font-medium text-gray-800">{u.userName}</p>
                  <p className="text-xs text-gray-400">User #{u.userId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{fmt(u.totalAmount)}</p>
                  <p className="text-xs text-gray-400">{u.interactionCount} transfers</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data structures info banner */}
      <div className="grid grid-cols-3 gap-4">
        <div
          onClick={() => setGraphOpen(true)}
          className="card border-l-4 border-l-blue-500 py-3 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
          title="Click to open transfer network visualizer"
        >
          <p className="text-xs font-semibold text-gray-700">Graph (BFS/DFS)</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Transfer network analysis and cycle detection between users</p>
          <p className="text-xs text-blue-500 mt-2 font-medium">Click to visualize →</p>
        </div>
        <div className="card border-l-4 border-l-green-500 py-3">
          <p className="text-xs font-semibold text-gray-700">BST range query</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">User ranking by points — O(k + log n) for loyalty tier reports</p>
        </div>
        <div className="card border-l-4 border-l-amber-500 py-3">
          <p className="text-xs font-semibold text-gray-700">LinkedList traversal</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">Sequential history traversal for frequency and amount aggregation</p>
        </div>
      </div>

      <GraphVisualizer
        open={graphOpen}
        onClose={() => setGraphOpen(false)}
        graphData={graphData}
        currentUserId={user?.id}
      />
    </div>
  )
}
