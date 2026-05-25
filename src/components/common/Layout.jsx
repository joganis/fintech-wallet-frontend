import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSseEvents } from '../../hooks/useSseEvents'
import Toast from './Toast'
import NotificationBell from './NotificationBell'
import AiChat from './AiChat'

const nav = [
  { path: '/dashboard',    label: 'Dashboard' },
  { path: '/wallets',      label: 'Wallets' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/scheduler',    label: 'Scheduler' },
  { path: '/rewards',      label: 'Rewards' },
  { path: '/analytics',    label: 'Analytics' },
  { path: '/fraud',        label: 'Fraud & Audit' },
  { path: '/community',    label: 'Community' },
]

export default function Layout() {
  useSseEvents()

  const { user, logout } = useAuthStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="h-screen flex overflow-hidden">
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">FintechWallet</h1>
              <p className="text-xs text-gray-400 mt-1">{user?.name}</p>
              <span className={`badge-${user?.level?.toLowerCase() || 'bronze'} mt-1 inline-block`}>
                {user?.level || 'BRONZE'}
              </span>
            </div>
            <NotificationBell />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map(({ path, label }) => (
            <Link key={path} to={path}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith(path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 space-y-1 flex-shrink-0 border-t border-gray-700">
          <Link to="/profile"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname.startsWith('/profile')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </Link>
          <button onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
      <Toast />
      <AiChat />
    </div>
  )
}
