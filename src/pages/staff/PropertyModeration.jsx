import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useData } from '../../hooks/useData.js'
import { getAllProperties, setPropertyStatus, updateCommissionRate } from '../../services/propertyAdmin.js'
import Badge from '../../components/Badge.jsx'
import Modal from '../../components/Modal.jsx'
import FormField from '../../components/FormField.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'

export default function PropertyModeration() {
  const { isSuperAdmin } = useAuth()
  const { data: properties, refresh } = useData(() => getAllProperties(), [])
  const [editingCommission, setEditingCommission] = useState(null)
  const [newRate, setNewRate] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  if (!properties) return <PageLoader />

  const handleToggleStatus = async (prop, nextStatus) => {
    setBusyId(prop.id)
    try {
      await setPropertyStatus(prop.id, nextStatus)
      await refresh()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveCommission = async (e) => {
    e.preventDefault()
    if (!editingCommission) return
    setError('')
    try {
      await updateCommissionRate(editingCommission.id, parseFloat(newRate))
      setEditingCommission(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Katalog Properti Nasional</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola ketersediaan tayang seluruh hotel di Indonesia. Anda dapat membekukan (suspend) properti
          bermasalah dan mengatur bagi hasil komisi platform.
        </p>
      </div>

      {properties.length === 0 ? (
        <EmptyState title="Belum ada properti terdaftar" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Nama Hotel & Lokasi</th>
                <th className="px-5 py-3">Mitra Pengelola</th>
                <th className="px-5 py-3">Bagi Hasil WismaKu</th>
                <th className="px-5 py-3">Kamar / Rating</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi Moderasi</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((prop) => (
                <tr key={prop.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{prop.name}</div>
                    <div className="text-xs text-slate-500">
                      {prop.area ? `${prop.area}, ${prop.city}` : prop.city}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-xs text-slate-700">{prop.partnerEmail}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-teal-800">
                        {Math.round(prop.commissionRate * 100)}%
                      </span>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommission(prop)
                            setNewRate(String(prop.commissionRate))
                            setError('')
                          }}
                          className="text-[11px] font-semibold text-slate-400 hover:text-teal-700 underline"
                        >
                          Ubah
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs font-semibold text-slate-700">{prop.roomCount} Tipe Kamar</div>
                    <div className="text-xs text-amber-600">
                      ★ {prop.rating.toFixed(1)} ({prop.reviewCount} ulasan)
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge status={prop.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {prop.status !== 'aktif' && (
                        <button
                          type="button"
                          disabled={busyId === prop.id}
                          onClick={() => handleToggleStatus(prop, 'aktif')}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Aktifkan
                        </button>
                      )}
                      {prop.status === 'aktif' && (
                        <button
                          type="button"
                          disabled={busyId === prop.id}
                          onClick={() => handleToggleStatus(prop, 'nonaktif')}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                          Nonaktifkan
                        </button>
                      )}
                      {prop.status !== 'suspended' && (
                        <button
                          type="button"
                          disabled={busyId === prop.id}
                          onClick={() => handleToggleStatus(prop, 'suspended')}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          Bekukan (Suspend)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Edit Commission Rate (Super Admin Only) */}
      <Modal
        isOpen={Boolean(editingCommission)}
        onClose={() => setEditingCommission(null)}
        title="Sesuaikan Tarif Komisi Platform"
      >
        {editingCommission && (
          <form onSubmit={handleSaveCommission} className="space-y-4">
            <div className="text-xs text-slate-600">
              Properti: <strong>{editingCommission.name}</strong> ({editingCommission.city})
            </div>

            <FormField
              label="Tarif Komisi (Desimal)"
              hint="Contoh: 0.15 untuk 15%, 0.12 untuk 12%, 0.20 untuk 20%."
            >
              <input
                type="number"
                step="0.01"
                min="0.05"
                max="0.5"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-700"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                required
              />
            </FormField>

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCommission(null)}
                className="btn btn-sm btn-outline"
              >
                Batal
              </button>
              <button type="submit" className="btn btn-sm btn-primary">
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
