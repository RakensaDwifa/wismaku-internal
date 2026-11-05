import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function RequireRole({ roles = ['staff', 'superadmin'], children }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-2xl font-bold text-amber-600">
          !
        </div>
        <h2 className="mt-4 text-lg font-extrabold text-slate-800">Akses Terbatas (Khusus Super Admin)</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Halaman ini memerlukan hak akses Super Admin HQ. Akun Anda saat ini memiliki role{' '}
          <span className="font-bold text-slate-700 capitalize">{user.role}</span>.
        </p>
      </div>
    )
  }

  return children
}
