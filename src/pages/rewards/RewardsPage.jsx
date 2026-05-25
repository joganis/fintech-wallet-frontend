import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rewardsService } from '../../services/rewardsService'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'

const LEVELS = [
  { name: 'BRONZE',   min: 0,    max: 500,  color: 'bg-amber-500',  light: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
  { name: 'SILVER',   min: 501,  max: 1000, color: 'bg-gray-400',   light: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200' },
  { name: 'GOLD',     min: 1001, max: 5000, color: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  { name: 'PLATINUM', min: 5001, max: null, color: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-200' },
]

const LEVEL_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

const BENEFITS = [
  { type: 'POINTS_BONUS',        label: 'Points bonus x2',         cost: 300,  icon: '★',  desc: 'Double points for 24 hours',          requiredLevel: 'BRONZE'   },
  { type: 'COMMISSION_DISCOUNT', label: 'Commission discount 10%', cost: 800,  icon: '%',  desc: 'Save on your next 5 transfers',        requiredLevel: 'SILVER'   },
  { type: 'PRIORITY_OPS',        label: 'Priority processing',     cost: 2000, icon: '⚡', desc: 'Skip the queue on all operations',     requiredLevel: 'GOLD'     },
  { type: 'LIMIT_INCREASE',      label: 'Higher transfer limit',   cost: 5200, icon: '↑',  desc: 'Increase daily limit for 30 days',    requiredLevel: 'PLATINUM' },
]

const STATUS_STYLE = {
  ACTIVE: 'bg-green-100 text-green-700',
  USED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-red-100 text-red-600',
}

export default function RewardsPage() {
  const qc = useQueryClient()
  const [confirmBenefit, setConfirmBenefit] = useState(null)
  const [redeemError, setRedeemError] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['rewards-profile'],
    queryFn: () => rewardsService.profile().then(r => r.data.data),
    staleTime: 0,        // ← siempre considera el dato desactualizado
    refetchOnMount: true // ← refresca cada vez que el componente monta
  })

  const redeem = useMutation({
    mutationFn: (benefitType) => rewardsService.redeem({ benefitType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards-profile'] })
      setConfirmBenefit(null)
      setRedeemError('')
    },
    onError: e => setRedeemError(e.response?.data?.message || 'Redemption failed')
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  const pts = profile?.totalPoints || 0
  const currentLevel = LEVELS.find(l => l.name === profile?.level) || LEVELS[0]
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1]
  const progress = nextLevel ? Math.min(100, ((pts - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100) : 100

  return (
    <div className="space-y-6">
      <h1>Rewards & loyalty</h1>

      {/* Level card */}
      <div className={`border rounded-xl p-6 ${currentLevel.light} ${currentLevel.border}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest ${currentLevel.text}`}>Current level</p>
            <p className={`text-3xl font-bold mt-1 ${currentLevel.text}`}>{profile?.level}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Points</p>
            <p className={`text-4xl font-bold ${currentLevel.text}`}>{pts.toLocaleString()}</p>
          </div>
        </div>

        {nextLevel && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{pts.toLocaleString()} pts</span>
              <span>{profile?.pointsToNextLevel} pts to {nextLevel.name}</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200">
              <div className={`h-full ${currentLevel.color} rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {!nextLevel && (
          <p className={`text-sm font-medium mt-2 ${currentLevel.text}`}>Maximum level reached! 🎉</p>
        )}
      </div>

      {/* Level roadmap */}
      <div className="card">
        <h3 className="mb-4">Level roadmap</h3>
        <div className="flex gap-2">
          {LEVELS.map((l, i) => (
            <div key={l.name} className={`flex-1 p-3 rounded-lg border text-center ${
              l.name === profile?.level ? `${l.light} ${l.border}` : 'bg-gray-50 border-gray-100'
            }`}>
              <div className={`w-8 h-8 rounded-full ${l.color} mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs`}>
                {i + 1}
              </div>
              <p className={`text-xs font-semibold ${l.name === profile?.level ? l.text : 'text-gray-400'}`}>{l.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{l.max ? `${l.min.toLocaleString()}–${l.max.toLocaleString()}` : `${l.min.toLocaleString()}+`}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Available benefits to redeem */}
      <div className="card">
        <h3 className="mb-4">Redeem benefits</h3>
        <div className="grid grid-cols-2 gap-3">
          {BENEFITS.map(b => {
            const userLevelIdx    = LEVEL_ORDER.indexOf(profile?.level || 'BRONZE')
            const requiredLevelIdx = LEVEL_ORDER.indexOf(b.requiredLevel)
            const levelOk   = userLevelIdx >= requiredLevelIdx
            const canAfford = levelOk && pts >= b.cost
            const levelInfo = LEVELS.find(l => l.name === b.requiredLevel)

            return (
              <div key={b.type} className={`border rounded-xl p-4 transition-all ${
                !levelOk
                  ? 'border-gray-100 bg-gray-50 opacity-70'
                  : canAfford
                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    : 'border-gray-100 bg-gray-50 opacity-60'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-base ${
                    levelOk ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                    {!levelOk ? '🔒' : b.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${levelOk ? 'text-gray-800' : 'text-gray-400'}`}>{b.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{b.desc}</p>

                    {/* Level badge */}
                    <div className="mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        levelOk
                          ? `${levelInfo?.light} ${levelInfo?.text}`
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {b.requiredLevel}+
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-semibold ${canAfford ? 'text-amber-600' : 'text-gray-400'}`}>
                        {b.cost.toLocaleString()} pts
                      </span>
                      <button onClick={() => { setConfirmBenefit(b); setRedeemError('') }}
                        disabled={!canAfford}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                          canAfford
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : !levelOk
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}>
                        {!levelOk ? `Needs ${b.requiredLevel}` : canAfford ? 'Redeem' : 'Not enough pts'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Redeemed benefits history */}
      {profile?.activeBenefits?.length > 0 && (
        <div className="card">
          <h3 className="mb-4">Your benefits</h3>
          <div className="space-y-2">
            {profile.activeBenefits.map(b => (
              <div key={b.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{b.type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400">
                    Applied: {new Date(b.appliedAt).toLocaleDateString('es-CO')}
                    {b.expiresAt && ` · Expires: ${new Date(b.expiresAt).toLocaleDateString('es-CO')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{b.pointsCost} pts</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[b.status] || ''}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <Modal open={!!confirmBenefit} onClose={() => { setConfirmBenefit(null); setRedeemError('') }}
        title="Confirm redemption">
        {confirmBenefit && (
          <div className="space-y-4">
            {redeemError && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{redeemError}</p>}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">{confirmBenefit.icon}</div>
              <p className="font-medium text-gray-800">{confirmBenefit.label}</p>
              <p className="text-sm text-gray-500 mt-1">{confirmBenefit.desc}</p>
              <p className="text-amber-600 font-semibold mt-3">{confirmBenefit.cost} points</p>
            </div>
            <p className="text-sm text-gray-600 text-center">
              You have <strong>{pts.toLocaleString()}</strong> pts. After redemption: <strong>{(pts - confirmBenefit.cost).toLocaleString()}</strong> pts.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmBenefit(null); setRedeemError('') }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => redeem.mutate(confirmBenefit.type)} className="btn-primary flex-1" disabled={redeem.isPending}>
                {redeem.isPending ? 'Redeeming…' : 'Confirm redemption'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
