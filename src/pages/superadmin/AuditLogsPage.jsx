import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData.js'
import { getAuditLogs } from '../../services/audit.js'
import Badge from '../../components/Badge.jsx'
import Modal from '../../components/Modal.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'

const ACTION_LABELS = {
  booking_cancelled_by_admin: { label: 'Batal Pesanan', color: 'bg-red-50 text-red-700 border-red-200' },
  booking_completed_by_admin: {
    label: 'Pesanan Selesai',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  payout_created: { label: 'Pencairan Diterbitkan', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  payout_marked_paid: { label: 'Payout Ditransfer', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  coupon_created: { label: 'Buat Kupon', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  coupon_status_toggled: { label: 'Toggle Kupon', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  coupon_deleted: { label: 'Hapus Kupon', color: 'bg-red-50 text-red-600 border-red-200' },
  user_role_changed: { label: 'Ubah Role Akun', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  partner_lead_approved: { label: 'Setujui Calon Mitra', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  property_status_updated: { label: 'Status Properti', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  review_soft_hidden: { label: 'Tangguhkan Ulasan', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  review_restored: { label: 'Pulihkan Ulasan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  review_deleted_by_admin: { label: 'Hapus Ulasan', color: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export default function AuditLogsPage() {
  const { data: logs } = useData(() => getAuditLogs({ limit: 200 }), [])
  const [selectedLog, setSelectedLog] = useState(null)
  const [tableFilter, setTableFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredLogs = useMemo(() => {
    if (!logs) return []
    return logs.filter((log) => {
      if (tableFilter !== 'all' && log.target_table !== tableFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchAction = (log.action || '').toLowerCase().includes(q)
        const matchTarget = (log.target_id || '').toLowerCase().includes(q)
        const matchRole = (log.actor_role || '').toLowerCase().includes(q)
        const matchDetails = JSON.stringify(log.details || {})
          .toLowerCase()
          .includes(q)
        if (!matchAction && !matchTarget && !matchRole && !matchDetails) return false
      }
      return true
    })
  }, [logs, tableFilter, search])

  if (!logs) return <PageLoader />

  const financialLogsCount = logs.filter(
    (l) => l.target_table === 'partner_payouts' || l.target_table === 'bookings',
  ).length
  const accessLogsCount = logs.filter((l) => l.target_table === 'profiles').length

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Jejak Audit Aktivitas Sistem</h1>
          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-800">
            SUPER ADMIN
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Rekam jejak mutasi data sensitif (persetujuan mitra, perubahan status pesanan, penerbitan payout,
          dan perubahan role pengguna) untuk kepatuhan keamanan.
        </p>
      </div>

      {/* Ringkasan Log Stat */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Log Terekam</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{logs.length}</div>
          <div className="text-xs text-slate-500">Aktivitas terlacak secara persisten</div>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-teal-700">Audit Finansial & Pesanan</div>
          <div className="mt-1 text-2xl font-black text-teal-900">{financialLogsCount}</div>
          <div className="text-xs text-teal-700">Intervensi transaksi, batal, dan payout</div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-purple-700">Audit Hak Akses & Akun</div>
          <div className="mt-1 text-2xl font-black text-purple-900">{accessLogsCount}</div>
          <div className="text-xs text-purple-700">Perubahan peran (role) pengguna</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Semua Modul' },
            { id: 'bookings', label: 'Pesanan' },
            { id: 'partner_payouts', label: 'Payout Mitra' },
            { id: 'coupons', label: 'Kupon' },
            { id: 'profiles', label: 'Pengguna' },
            { id: 'reviews', label: 'Ulasan' },
            { id: 'partners', label: 'Mitra Lead' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTableFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                tableFilter === tab.id
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari aksi, aktor, atau ID..."
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-teal-700"
        />
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState
          title="Tidak ada log audit yang cocok"
          description="Coba ganti filter modul atau kata kunci pencarian Anda."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Waktu</th>
                <th className="px-5 py-3">Aktor</th>
                <th className="px-5 py-3">Tindakan (Action)</th>
                <th className="px-5 py-3">Tabel / Target ID</th>
                <th className="px-5 py-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const actionMeta = ACTION_LABELS[log.action] || {
                  label: log.action,
                  color: 'bg-slate-100 text-slate-700 border-slate-200',
                }

                return (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Badge status={log.actor_role} />
                        <span className="font-mono text-[11px] text-slate-400">
                          {log.actor_id ? `${String(log.actor_id).slice(0, 8)}...` : 'system'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold border ${actionMeta.color}`}
                      >
                        {actionMeta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">{log.target_table}</div>
                      <div className="text-[11px] text-teal-800">{log.target_id || '—'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
                      >
                        Buka Payload
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detail JSON */}
      <Modal isOpen={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} title="Rincian Payload Audit">
        {selectedLog && (
          <div className="space-y-4">
            <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <strong>Aksi:</strong>{' '}
                <span className="font-mono font-bold text-slate-800">{selectedLog.action}</span>
              </div>
              <div>
                <strong>Target:</strong>{' '}
                <span className="font-mono text-slate-800">
                  {selectedLog.target_table} ({selectedLog.target_id || 'N/A'})
                </span>
              </div>
              <div>
                <strong>Aktor:</strong>{' '}
                <span className="font-mono text-slate-800">
                  {selectedLog.actor_role} ({selectedLog.actor_id || 'system'})
                </span>
              </div>
              <div>
                <strong>Waktu:</strong> {new Date(selectedLog.created_at).toLocaleString('id-ID')}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-700 mb-1">Rincian Data (JSON Payload):</div>
              <pre className="max-h-72 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg bg-teal-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-teal-800"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
