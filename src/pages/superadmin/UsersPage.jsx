import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getAllUsers, updateUserRole } from '../../services/userAdmin.js'
import Badge from '../../components/Badge.jsx'
import Modal from '../../components/Modal.jsx'
import FormField from '../../components/FormField.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'

const ROLES = [
  { value: 'member', label: 'Member (Konsumen WismaKu)' },
  { value: 'mitra', label: 'Mitra (Pemilik/Pengelola Properti)' },
  { value: 'staff', label: 'Staff (Operasional & CS HQ)' },
  { value: 'superadmin', label: 'Super Admin (Akses Penuh HQ)' },
]

export default function UsersPage() {
  const { data: users, refresh } = useData(() => getAllUsers(), [])
  const [roleFilter, setRoleFilter] = useState('all')
  const [editingUser, setEditingUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState('member')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!users) return <PageLoader />

  const filtered = users.filter((u) => (roleFilter === 'all' ? true : u.role === roleFilter))

  const handleSaveRole = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    setBusy(true)
    setError('')
    try {
      await updateUserRole(editingUser.id, selectedRole)
      setEditingUser(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Manajemen Pengguna & RBAC</h1>
          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-800">
            SUPER ADMIN
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Atur peran akun pengguna (Konsumen, Mitra Extranet, Staff Operasional, atau Super Admin). Perubahan
          hak akses tercatat di riwayat audit keamanan.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {['all', 'member', 'mitra', 'staff', 'superadmin'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition capitalize ${
              roleFilter === r
                ? 'bg-purple-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {r === 'all' ? `Semua Pengguna (${users.length})` : r}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Tidak ada akun dengan peran ini" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Nama & Email</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Peran (Role)</th>
                <th className="px-5 py-3">Bergabung</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{u.name || 'Pengguna WismaKu'}</div>
                    <div className="font-mono text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">
                      {u.provider || 'email'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge status={u.role} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {u.joined_at
                      ? new Date(u.joined_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(u)
                        setSelectedRole(u.role || 'member')
                        setError('')
                      }}
                      className="btn btn-sm btn-outline text-purple-900 hover:border-purple-900"
                    >
                      Ubah Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ubah Role */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Ubah Hak Akses / Role Akun"
      >
        {editingUser && (
          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Pengguna: <strong>{editingUser.name}</strong> ({editingUser.email})
            </div>

            <FormField
              label="Pilih Peran Baru (Role)"
              hint="Perubahan akan menentukan akses login pengguna di ketiga portal web."
            >
              <select
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-purple-800"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </FormField>

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="btn btn-sm btn-outline"
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary bg-purple-900 hover:bg-purple-950"
                disabled={busy}
              >
                {busy ? 'Menyimpan...' : 'Perbarui Role'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
