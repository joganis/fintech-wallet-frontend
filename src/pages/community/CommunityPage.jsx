import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '../../services/analyticsService'
import { userService } from '../../services/userService'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'

const LEVEL_STYLE = {
  BRONZE:   { badge: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-500'  },
  SILVER:   { badge: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-400'   },
  GOLD:     { badge: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  PLATINUM: { badge: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-500'   },
}

const RANK_COLORS = [
  'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-300',
  'bg-gray-300 text-gray-700 ring-2 ring-gray-200',
  'bg-amber-600 text-white ring-2 ring-amber-400',
]

function RankBadge({ rank }) {
  const cls = RANK_COLORS[rank - 1] || 'bg-gray-100 text-gray-500'
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${cls}`}>
      {rank}
    </div>
  )
}

function ProfileModal({ userId, onClose }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => userService.getUserPublicProfile(userId).then(r => r.data.data),
    enabled: !!userId,
  })

  const lvl = LEVEL_STYLE[profile?.level] || LEVEL_STYLE.BRONZE

  return (
    <Modal open={!!userId} onClose={onClose} title="User profile">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : profile ? (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto select-none">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{profile.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${lvl.badge}`}>
              {profile.level}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Reward points</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{profile.totalPoints.toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">User not found.</p>
      )}
    </Modal>
  )
}

export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)

  const { data: topSenders = [], isLoading: loadingTop } = useQuery({
    queryKey: ['top-senders'],
    queryFn: () => analyticsService.topSenders(10).then(r => r.data.data),
    staleTime: 60_000,
  })

  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ['user-search', activeSearch],
    queryFn: () => userService.searchUsers(activeSearch).then(r => r.data.data),
    enabled: activeSearch.trim().length >= 2,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setActiveSearch(searchQuery)
  }

  return (
    <div className="space-y-6">
      <h1>Community</h1>

      {/* Top senders leaderboard */}
      <div className="card">
        <h3 className="mb-4">Featured users <span className="text-sm font-normal text-gray-400 ml-1">— most transfers (last 90 days)</span></h3>

        {loadingTop ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : topSenders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No transfer data yet.</p>
        ) : (
          <div className="space-y-2">
            {topSenders.map((sender) => {
              const lvl = LEVEL_STYLE[sender.level] || LEVEL_STYLE.BRONZE
              return (
                <button
                  key={sender.userId}
                  onClick={() => setSelectedUserId(sender.userId)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all text-left"
                >
                  <RankBadge rank={sender.rank} />
                  <div className={`w-2 h-2 rounded-full ${lvl.dot}`} />
                  <span className="flex-1 font-medium text-gray-800">{sender.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lvl.badge}`}>
                    {sender.level}
                  </span>
                  <span className="text-sm text-gray-500 min-w-[60px] text-right">
                    {sender.transferCount} transfers
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <h3 className="mb-4">Search user</h3>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            className="input flex-1"
            placeholder="Enter a name (min. 2 characters)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary px-5" disabled={searchQuery.trim().length < 2}>
            Search
          </button>
        </form>

        {activeSearch.trim().length >= 2 && (
          loadingSearch ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No users found for "{activeSearch}".</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => {
                const lvl = LEVEL_STYLE[user.level] || LEVEL_STYLE.BRONZE
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm select-none">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 font-medium text-gray-800">{user.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lvl.badge}`}>
                      {user.level}
                    </span>
                    <span className="text-sm text-gray-400">{user.totalPoints.toLocaleString()} pts</span>
                  </button>
                )
              })}
            </div>
          )
        )}
      </div>

      <ProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  )
}
