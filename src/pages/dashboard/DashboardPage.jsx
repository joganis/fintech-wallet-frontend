import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { walletService } from '../../services/walletService'
import { notificationService } from '../../services/notificationService'
import { rewardsService } from '../../services/rewardsService'
import { transactionService } from '../../services/transactionService'
import StatCard from '../../components/common/StatCard'
import Spinner from '../../components/common/Spinner'
import { Link } from 'react-router-dom'

function formatCOP(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

function LevelBadge({ level }) {
  const styles = {
    BRONZE: 'bg-amber-100 text-amber-800',
    SILVER: 'bg-gray-100 text-gray-700',
    GOLD: 'bg-yellow-100 text-yellow-800',
    PLATINUM: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[level] || styles.BRONZE}`}>
      {level}
    </span>
  )
}

function WalletCard({ wallet }) {
  const typeColors = {
    SAVINGS: 'bg-green-50 border-green-200',
    DAILY_EXPENSES: 'bg-blue-50 border-blue-200',
    SHOPPING: 'bg-purple-50 border-purple-200',
    TRANSPORT: 'bg-orange-50 border-orange-200',
    INVESTMENT: 'bg-teal-50 border-teal-200',
  }
  return (
    <div className={`border rounded-xl p-4 ${typeColors[wallet.type] || 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{wallet.type.replace('_', ' ')}</p>
          <p className="font-medium text-gray-800 text-sm mt-0.5">{wallet.name}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${wallet.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {wallet.status}
        </span>
      </div>
      <p className="text-xl font-semibold text-gray-900 mt-2">{formatCOP(wallet.balance)}</p>
    </div>
  )
}

function TxRow({ tx }) {
  const isCredit = tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN'
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isCredit ? '+' : '−'}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{tx.description || tx.type.replace('_', ' ')}</p>
          <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString('es-CO')}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
          {isCredit ? '+' : '−'}{formatCOP(tx.amount)}
        </p>
        <span className={`text-xs ${tx.riskLevel === 'HIGH' ? 'text-red-500' : tx.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-gray-400'}`}>
          {tx.riskLevel !== 'LOW' ? `⚠ ${tx.riskLevel}` : tx.status}
        </span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: wallets = [], isLoading: wLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => walletService.list().then(r => r.data.data)
  })

  const { data: rewards } = useQuery({
    queryKey: ['rewards-profile'],
    queryFn: () => rewardsService.profile().then(r => r.data.data)
  })

  const { data: txHistory } = useQuery({
    queryKey: ['transactions', 0],
    queryFn: () => transactionService.history(0, 5).then(r => r.data.data)
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.recent(5).then(r => r.data.data)
  })

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your financial overview</p>
        </div>
        {rewards && (
          <div className="flex items-center gap-3">
            <LevelBadge level={rewards.level} />
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{rewards.totalPoints.toLocaleString()} pts</p>
              <p className="text-xs text-gray-400">{rewards.pointsToNextLevel} to next level</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total balance" value={formatCOP(totalBalance)} color="blue" />
        <StatCard label="Active wallets" value={wallets.filter(w => w.status === 'ACTIVE').length} color="green" />
        <StatCard label="Points" value={(rewards?.totalPoints || 0).toLocaleString()} color="amber" />
        <StatCard label="Level" value={rewards?.level || 'BRONZE'} color="blue" />
      </div>

      {/* Wallets + Recent transactions */}
      <div className="grid grid-cols-2 gap-6">
        {/* Wallets */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3>My wallets</h3>
            <Link to="/wallets" className="text-xs text-blue-600 hover:underline">Manage →</Link>
          </div>
          {wLoading ? <Spinner /> : (
            <div className="space-y-3">
              {wallets.slice(0, 4).map(w => <WalletCard key={w.id} wallet={w} />)}
              {wallets.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm mb-3">No wallets yet</p>
                  <Link to="/wallets" className="btn-primary text-xs">Create wallet</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3>Recent transactions</h3>
            <Link to="/transactions" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          <div>
            {txHistory?.content?.slice(0, 6).map(tx => <TxRow key={tx.id} tx={tx} />) || (
              <p className="text-gray-400 text-sm text-center py-8">No transactions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h3>Notifications</h3>
            <span className="text-xs text-gray-400">{notifications.length} recent</span>
          </div>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                n.type === 'FRAUD_ALERT' ? 'bg-red-50 border border-red-100'
                : n.type === 'LEVEL_UP' ? 'bg-yellow-50 border border-yellow-100'
                : 'bg-gray-50'
              }`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  n.type === 'FRAUD_ALERT' ? 'bg-red-500'
                  : n.type === 'LEVEL_UP' ? 'bg-yellow-500'
                  : n.type === 'LOW_BALANCE' ? 'bg-orange-500'
                  : 'bg-blue-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-800">{n.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
                </div>
                {!n.read && <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
