import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PageLoader from './components/PageLoader.jsx'
import RequireRole from './guards/RequireRole.jsx'
import InternalLayout from './layouts/InternalLayout.jsx'
import { useAuth } from './hooks/useAuth.js'

const LoginPage = lazy(() => import('./pages/login/LoginPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const Dashboard = lazy(() => import('./pages/staff/Dashboard.jsx'))
const PartnerVerification = lazy(() => import('./pages/staff/PartnerVerification.jsx'))
const PropertyModeration = lazy(() => import('./pages/staff/PropertyModeration.jsx'))
const OrderAudit = lazy(() => import('./pages/staff/OrderAudit.jsx'))
const ReviewModeration = lazy(() => import('./pages/staff/ReviewModeration.jsx'))
const PayoutsPage = lazy(() => import('./pages/superadmin/PayoutsPage.jsx'))
const CouponsPage = lazy(() => import('./pages/superadmin/CouponsPage.jsx'))
const UsersPage = lazy(() => import('./pages/superadmin/UsersPage.jsx'))
const AuditLogsPage = lazy(() => import('./pages/superadmin/AuditLogsPage.jsx'))

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Area Internal (Staff & Super Admin) */}
        <Route
          element={
            <RequireRole roles={['staff', 'superadmin']}>
              <InternalLayout />
            </RequireRole>
          }
        >
          {/* Operasional Harian */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/verifikasi-mitra" element={<PartnerVerification />} />
          <Route path="/properti" element={<PropertyModeration />} />
          <Route path="/pesanan" element={<OrderAudit />} />
          <Route path="/ulasan" element={<ReviewModeration />} />

          {/* Khusus Super Admin */}
          <Route
            path="/keuangan/payouts"
            element={
              <RequireRole roles={['superadmin']}>
                <PayoutsPage />
              </RequireRole>
            }
          />
          <Route
            path="/kupon-nasional"
            element={
              <RequireRole roles={['superadmin']}>
                <CouponsPage />
              </RequireRole>
            }
          />
          <Route
            path="/pengguna"
            element={
              <RequireRole roles={['superadmin']}>
                <UsersPage />
              </RequireRole>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <RequireRole roles={['superadmin']}>
                <AuditLogsPage />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
