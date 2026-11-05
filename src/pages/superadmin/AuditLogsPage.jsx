import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getAuditLogs } from '../../services/audit.js'
import Badge from '../../components/Badge.jsx'
import Modal from '../../components/Modal.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'

export default function AuditLogsPage() {
  const { data: logs } = useData(() => getAuditLogs({ limit: 100 }), [])
  const [selectedLog, setSelectedLog] = useState(null)

  if (!logs) return <PageLoader />

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

      {logs.length === 0 ? (
        <EmptyState
          title="Belum ada aktivitas tercatat"
          description="Setiap tindakan staf dan admin akan muncul otomatis di sini."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Waktu</th>
                <th className="px-5 py-3">Aktor / Role</th>
                <th className="px-5 py-3">Tindakan (Action)</th>
                <th className="px-5 py-3">Tabel Target</th>
                <th className="px-5 py-3">ID Target</th>
                <th className="px-5 py-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
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
                    <span className="font-mono text-xs font-bold text-slate-800">{log.action}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.target_table}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-teal-800">{log.target_id || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="btn btn-sm btn-outline text-xs"
                    >
                      Buka Payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detail JSON */}
      <Modal isOpen={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} title="Rincian Payload Audit">
        {selectedLog && (
          <div className="space-y-4">
            <div className="space-y-1 text-xs text-slate-600">
              <div>
                <strong>Aksi:</strong> <code className="font-mono">{selectedLog.action}</code>
              </div>
              <div>
                <strong>Tabel:</strong> {selectedLog.target_table} ({selectedLog.target_id})
              </div>
              <div>
                <strong>Waktu:</strong> {new Date(selectedLog.created_at).toLocaleString('id-ID')}
              </div>
            </div>

            <pre className="max-h-72 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedLog(null)} className="btn btn-sm btn-primary">
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
