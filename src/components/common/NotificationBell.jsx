import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../../services/notificationService'

const TYPE_ICONS = {
  LOW_BALANCE:        '⚠️',
  LEVEL_UP:           '🏆',
  SCHEDULED_OP_DUE:   '📅',
  SCHEDULED_EXECUTED: '✅',
  OP_REJECTED:        '❌',
  BENEFIT_REDEEMED:   '🎁',
  FRAUD_ALERT:        '🔒',
  TRANSFER_IN:        '💰',
  REVERSAL_COMPLETED: '↩️',
  WALLET_DELETED:     '🗑️',
}

const TYPE_COLORS = {
  LOW_BALANCE:        'border-l-orange-400 bg-orange-50',
  LEVEL_UP:           'border-l-yellow-400 bg-yellow-50',
  SCHEDULED_OP_DUE:   'border-l-blue-400 bg-blue-50',
  SCHEDULED_EXECUTED: 'border-l-green-400 bg-green-50',
  OP_REJECTED:        'border-l-red-400 bg-red-50',
  BENEFIT_REDEEMED:   'border-l-green-500 bg-green-50',
  FRAUD_ALERT:        'border-l-red-600 bg-red-100',
  TRANSFER_IN:        'border-l-green-400 bg-green-50',
  REVERSAL_COMPLETED: 'border-l-orange-400 bg-orange-50',
  WALLET_DELETED:     'border-l-gray-400 bg-gray-50',
}

const TYPE_DOT = {
  LOW_BALANCE:        'bg-orange-400',
  LEVEL_UP:           'bg-yellow-400',
  SCHEDULED_OP_DUE:   'bg-blue-400',
  SCHEDULED_EXECUTED: 'bg-green-400',
  OP_REJECTED:        'bg-red-400',
  BENEFIT_REDEEMED:   'bg-green-500',
  FRAUD_ALERT:        'bg-red-600',
  TRANSFER_IN:        'bg-green-400',
  REVERSAL_COMPLETED: 'bg-orange-400',
  WALLET_DELETED:     'bg-gray-400',
}

const VISIBLE_COUNT = 7

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const qc = useQueryClient()
  const prevIdsRef = useRef(new Set())
  const [freshIds, setFreshIds] = useState(new Set())

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.recent(20).then(r => r.data.data),
    staleTime: 0,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationService.unread().then(r => r.data.data),
    staleTime: 0,
  })

  const markRead = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  // Track newly arrived notifications for slide-in animation
  useEffect(() => {
    const currentIds = new Set(notifications.map(n => n.id))
    const fresh = notifications
      .filter(n => prevIdsRef.current.size > 0 && !prevIdsRef.current.has(n.id))
      .map(n => n.id)
    if (fresh.length > 0) {
      setFreshIds(new Set(fresh))
      const t = setTimeout(() => setFreshIds(new Set()), 700)
      return () => clearTimeout(t)
    }
    prevIdsRef.current = currentIds
  }, [notifications])

  const unreadCount = unreadData?.count || 0
  const visible = notifications.slice(0, VISIBLE_COUNT)
  const extra = notifications.slice(VISIBLE_COUNT)

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && unreadCount > 0) markRead.mutate()
  }

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes bell-panel-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0);      }
        }
        .bell-panel { animation: bell-panel-in 0.2s cubic-bezier(.16,1,.3,1) both; }
        .notif-new  { animation: notif-slide-in 0.35s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      <div className="relative" ref={ref}>
        {/* Bell button */}
        <button
          onClick={handleToggle}
          className={`relative p-1.5 rounded-lg transition-colors ${
            open ? 'text-white bg-white/15' : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
          title="Notifications">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002
                 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388
                 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3
                 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5
              bg-red-500 text-white text-[10px] rounded-full flex items-center
              justify-center font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown — opens to the RIGHT of the bell so it doesn't go off-screen */}
        {open && (
          <div className="bell-panel absolute left-0 top-10 z-[9999]
            w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-100
            overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3
              bg-gradient-to-r from-gray-900 to-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={() => { markRead.mutate(); }}
                className="text-[11px] text-gray-400 hover:text-white transition-colors">
                Mark all read
              </button>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <span className="text-3xl mb-2">🔔</span>
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {visible.map((n, idx) => (
                    <div
                      key={n.id}
                      className={`border-l-4 px-4 py-3 transition-all duration-200
                        ${TYPE_COLORS[n.type] || 'border-l-gray-300 bg-white'}
                        ${n.read ? 'opacity-55' : 'opacity-100'}
                        ${freshIds.has(n.id) ? 'notif-new' : ''}
                        hover:brightness-95`}
                      style={{ animationDelay: freshIds.has(n.id) ? `${idx * 40}ms` : '0ms' }}>
                      <div className="flex items-start gap-2.5">
                        <span className="text-base flex-shrink-0 mt-0.5">
                          {TYPE_ICONS[n.type] || '🔔'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {n.title}
                            </p>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5
                            bg-blue-500 ring-2 ring-blue-100" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extra notifications as compact circles */}
            {extra.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50
                flex items-center gap-2">
                <span className="text-[11px] text-gray-400 flex-shrink-0">
                  +{extra.length} more
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {extra.slice(0, 8).map(n => (
                    <span key={n.id} title={n.title}
                      className={`w-6 h-6 rounded-full flex items-center justify-center
                        text-[11px] cursor-default border-2 border-white shadow-sm
                        ${TYPE_DOT[n.type] || 'bg-gray-300'}`}>
                      {TYPE_ICONS[n.type] || '🔔'}
                    </span>
                  ))}
                  {extra.length > 8 && (
                    <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center
                      justify-center text-[10px] font-bold text-gray-600 border-2 border-white shadow-sm">
                      +{extra.length - 8}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-white
                flex justify-end">
                <button onClick={() => setOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
