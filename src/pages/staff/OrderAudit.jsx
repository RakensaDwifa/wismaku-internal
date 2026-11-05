import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getAllBookings, cancelBookingByAdmin, completeBookingByAdmin } from '../../services/bookingAdmin.js'
import Badge from '../../components/Badge.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'

export default function OrderAudit() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const { data: bookings, refresh } = useData(
    () => getAllBookings({ status: statusFilter, search }),
    [statusFilter, search],
  )
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [completingBooking, setCompletingBooking] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!bookings) return <PageLoader />

  const handleCancel = async () => {
    if (!cancellingBooking) return
    setBusy(true)
    try {
      await cancelBookingByAdmin(cancellingBooking.id, 'Intervensi CS Backoffice')
      setCancellingBooking(null)
      await refresh()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleComplete = async () => {
    if (!completingBooking) return
    setBusy(true)
    try {
      await completeBookingByAdmin(completingBooking.id)
      setCompletingBooking(null)
      await refresh()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Audit Transaksi Pemesanan Tamu</h1>
        <p className="mt-1 text-sm text-slate-500">
          Penelusuran seluruh reservasi hotel di Indonesia, rincian bagi hasil finansial, dan status
          penguncian dana pencairan mitra.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'confirmed', 'completed', 'pending', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === st
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari ID, Tamu, atau Hotel..."
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-teal-700"
        />
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="Tidak ada pesanan ditemukan"
          description="Ubah filter atau kata kunci pencarian Anda."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">ID & Tanggal Booking</th>
                <th className="px-5 py-3">Tamu</th>
                <th className="px-5 py-3">Hotel & Kamar</th>
                <th className="px-5 py-3">Total / Fee (15%) / Net</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Kunci Payout</th>
                <th className="px-5 py-3 text-right">Aksi CS</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-xs font-bold text-teal-800">{b.id}</div>
                    <div className="text-[11px] text-slate-400">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID') : '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-800">{b.guest_name}</div>
                    <div className="text-xs text-slate-500">{b.phone || b.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800">{b.hotel_name}</div>
                    <div className="text-xs text-slate-500">
                      {b.room_type_name || 'Standar'} ({b.rooms || 1} kamar, {b.nights || 1} malam)
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    <div className="font-bold text-slate-900">
                      Rp {Number(b.total_price || 0).toLocaleString('id-ID')}
                    </div>
                    <div className="text-slate-500">
                      Fee: Rp{' '}
                      {Number(b.platform_fee || Math.round(Number(b.total_price || 0) * 0.15)).toLocaleString(
                        'id-ID',
                      )}
                    </div>
                    <div className="font-semibold text-emerald-700">
                      Net: Rp{' '}
                      {Number(b.partner_net || Math.round(Number(b.total_price || 0) * 0.85)).toLocaleString(
                        'id-ID',
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge status={b.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    {b.payout_id ? (
                      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                        Terkunci ({String(b.payout_id).slice(0, 8)}...)
                      </span>
                    ) : b.status === 'completed' ? (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                        Siap Dicairkan
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {b.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => setCompletingBooking(b)}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Selesaikan
                        </button>
                      )}
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => setCancellingBooking(b)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          Batalkan
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

      {/* Dialog Konfirmasi Batal */}
      <ConfirmDialog
        isOpen={Boolean(cancellingBooking)}
        onClose={() => setCancellingBooking(null)}
        onConfirm={handleCancel}
        title="Batalkan Pesanan (CS)"
        message={`Apakah Anda yakin ingin membatalkan pesanan ${cancellingBooking?.id} (${cancellingBooking?.guest_name})?`}
        confirmText="Batalkan Pesanan"
        danger
        busy={busy}
      />

      {/* Dialog Konfirmasi Selesai */}
      <ConfirmDialog
        isOpen={Boolean(completingBooking)}
        onClose={() => setCompletingBooking(null)}
        onConfirm={handleComplete}
        title="Tandai Pesanan Selesai"
        message={`Selesaikan pesanan ${completingBooking?.id}? Tindakan ini akan memasukkan bagi hasil mitra ke antrean pencairan dana.`}
        confirmText="Tandai Selesai"
        busy={busy}
      />
    </div>
  )
}
