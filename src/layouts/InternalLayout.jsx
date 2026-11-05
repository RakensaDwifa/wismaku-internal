import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import Badge from '../components/Badge.jsx'

const STAFF_NAV = [
  { to: '/dashboard', label: 'Ringkasan Platform', end: true },
  { to: '/verifikasi-mitra', label: 'Verifikasi Mitra Baru' },
  { to: '/properti', label: 'Katalog Properti Nasional' },
  { to: '/pesanan', label: 'Audit Pesanan Tamu' },
  { to: '/ulasan', label: 'Moderasi Ulasan' },
]

const SUPERADMIN_NAV = [
  { to: '/keuangan/payouts', label: 'Pencairan Bagi Hasil (Payouts)' },
  { to: '/kupon-nasional', label: 'Kupon Subsidi Nasional' },
  { to: '/pengguna', label: 'Manajemen Role Pengguna' },
  { to: '/audit-logs', label: 'Jejak Audit Sistem' },
]

export default function InternalLayout() {
  const { user, isSuperAdmin, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar Nav */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <div className="grid size-9 place-items-center rounded-xl bg-teal-700 font-extrabold text-white">
            W
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
              WismaKu <span className="text-teal-700">HQ</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-400">Backoffice Portal</div>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4" style={{ height: 'calc(100vh - 4rem)' }}>
          <div className="space-y-6 overflow-y-auto">
            {/* Operasional */}
            <div>
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Operasional Harian
              </div>
              <nav className="mt-2 space-y-1" aria-label="Navigasi Operasional">
                {STAFF_NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-800 font-extrabold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Khusus Super Admin */}
            {isSuperAdmin && (
              <div>
                <div className="flex items-center justify-between px-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                    HQ Management
                  </span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-800">
                    ADMIN
                  </span>
                </div>
                <nav className="mt-2 space-y-1" aria-label="Navigasi Super Admin">
                  {SUPERADMIN_NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                          isActive
                            ? 'bg-purple-50 text-purple-900 font-extrabold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* User info & Logout */}
          <div className="border-t border-slate-200 pt-4">
            <div className="mb-3 px-2">
              <div className="truncate text-xs font-bold text-slate-900">{user.name}</div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="truncate text-[11px] text-slate-500">{user.email}</span>
                <Badge status={user.role} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="text-sm font-semibold text-slate-600">
            Platform Operasional & Tata Kelola Internal WismaKu
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Terhubung ke Database Live
          </div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
