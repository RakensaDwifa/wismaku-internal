import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../services/auth.js'
import ErrorBanner from '../../components/ErrorBanner.jsx'
import FormField from '../../components/FormField.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const doLogin = async (e, cred) => {
    if (e) e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(cred?.email ?? email, cred?.password ?? password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-teal-600 text-2xl font-black text-white shadow-lg">
            W
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">WismaKu HQ Backoffice</h1>
          <p className="mt-1 text-sm text-slate-400">Portal Akses Khusus Staff & Super Admin</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-8 shadow-2xl backdrop-blur-md">
          <ErrorBanner message={error} onDismiss={() => setError('')} />

          <form onSubmit={doLogin} className="mt-4 space-y-4">
            <FormField label={<span className="text-slate-300">Email Akun Internal</span>}>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@wismaku.com"
                required
              />
            </FormField>

            <FormField label={<span className="text-slate-300">Kata Sandi</span>}>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-500"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </FormField>

            <button
              className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Memverifikasi...' : 'Masuk ke Backoffice'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-700/60 pt-5">
            <p className="text-center text-xs font-semibold text-slate-400">Akses Cepat Demo Akun Internal</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-teal-300 hover:bg-slate-700"
                onClick={() => doLogin(null, { email: 'admin@wismaku.com', password: 'password123' })}
              >
                Super Admin HQ
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-slate-700"
                onClick={() => doLogin(null, { email: 'staff@wismaku.com', password: 'password123' })}
              >
                Staff Operasional
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-500">
              Password default: <code className="text-slate-400">password123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
