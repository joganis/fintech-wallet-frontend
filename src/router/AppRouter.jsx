import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import LoginPage    from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import WalletsPage   from '../pages/wallets/WalletsPage'
import TransactionsPage from '../pages/transactions/TransactionsPage'
import SchedulerPage from '../pages/scheduler/SchedulerPage'
import RewardsPage   from '../pages/rewards/RewardsPage'
import AnalyticsPage from '../pages/analytics/AnalyticsPage'
import FraudPage     from '../pages/fraud/FraudPage'
import ProfilePage   from '../pages/profile/ProfilePage'
import CommunityPage from '../pages/community/CommunityPage'
import Layout        from '../components/common/Layout'

function Protected({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="wallets"      element={<WalletsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="scheduler"    element={<SchedulerPage />} />
        <Route path="rewards"      element={<RewardsPage />} />
        <Route path="analytics"    element={<AnalyticsPage />} />
        <Route path="fraud"        element={<FraudPage />} />
        <Route path="community"    element={<CommunityPage />} />
        <Route path="profile"      element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}
