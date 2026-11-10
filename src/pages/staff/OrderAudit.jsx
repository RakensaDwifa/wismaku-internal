import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getAllBookings, cancelBookingByAdmin, completeBookingByAdmin } from '../../services/bookingAdmin.js'
import { getRefundRequests, approveRefundRequest, rejectRefundRequest } from '../../services/refundDesk.js'
import { generateBookingsCSV, downloadCSV } from '../../services/export.js'
import Badge from '../../components/Badge.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import FormField from '../../components/FormField.jsx'
import Modal from '../../components/Modal.jsx'

export default function OrderAudit() {
  const [activeTab, setActiveTab] = useState('orders') // 'orders' | 'refunds'
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const { data: bookings, refresh } = useData(
    () => getAllBookings({ status: statusFilter, search }),
    [statusFilter, search],
  )

  // State Refund Desk
  const [refundStatusFilter, setRefundStatusFilter] = useState('all')
  const { data: refunds, refresh: refreshRefunds } = useData(
    () => getRefundRequests({ status: refundStatusFilter, search }),
    [refundStatusFilter, search],
  )
  const [approvingRefund, setApprovingRefund] = useState(null)
  const [rejectingRefund, setRejectingRefund] = useState(null)
  const [refundNotes, setRefundNotes] = useState('')

  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [completingBooking, setCompletingBooking] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!bookings || !refunds) return <PageLoader />

  const pendingRefundCount = (refunds || []).filter((r) => r.status === 'pending').length

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

  const handleApproveRefundSubmit = async (e) => {
    e.preventDefault()
    if (!approvingRefund) return
    setBusy(true)
    try {
      await approveRefundRequest(approvingRefund.id, {
        hqNotes: refundNotes || 'Disetujui: Dana dikembalikan ke rekening tujuan tamu',
      })
      setApprovingRefund(null)
      setRefundNotes('')
      await Promise.all([refreshRefunds(), refresh()])
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleRejectRefundSubmit = async (e) => {
    e.preventDefault()
    if (!rejectingRefund) return
    setBusy(true)
    try {
      await rejectRefundRequest(rejectingRefund.id, {
        hqNotes: refundNotes || 'Ditolak: Tidak memenuhi ketentuan pengembalian dana',
      })
      setRejectingRefund(null)
      setRefundNotes('')
      await refreshRefunds()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Audit Transaksi & Meja Sengketa (Refund Desk)
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Penelusuran seluruh reservasi hotel di Indonesia, rincian bagi hasil finansial, dan audit pengajuan
          pengembalian dana tamu.
        </p>
      </div>

      {/* Tab Navigasi: Audit Pesanan vs Meja Refund */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 text-xs font-extrabold transition border-b-2 ${
            activeTab === 'orders'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Reservasi Pemesanan ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('refunds')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold transition border-b-2 ${
            activeTab === 'refunds'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Meja Refund & Sengketa (Refund Desk)</span>
          {pendingRefundCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {pendingRefundCount} Butuh Review
            </span>
          )}
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
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

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari ID, Tamu, atau Hotel..."
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-teal-700"
              />
              <button
                type="button"
                onClick={() => {
                  const csv = generateBookingsCSV(bookings)
                  downloadCSV(`wismaku-audit-pesanan-${new Date().toISOString().slice(0, 10)}.csv`, csv)
                }}
                disabled={bookings.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <svg
                  className="h-3.5 w-3.5 text-teal-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Ekspor CSV
              </button>
            </div>
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
                    <th className="px-5 py-3">Total / Fee / Net Mitra</th>
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
                          Fee ({Math.round(Number(b.commission_rate ?? 0.15) * 100)}%): Rp{' '}
                          {Number(
                            b.platform_fee ||
                              Math.round(Number(b.total_price || 0) * Number(b.commission_rate ?? 0.15)),
                          ).toLocaleString('id-ID')}
                        </div>
                        <div className="font-semibold text-emerald-700">
                          Net: Rp{' '}
                          {Number(
                            b.partner_net ||
                              Math.max(
                                0,
                                Number(b.total_price || 0) -
                                  Math.round(Number(b.total_price || 0) * Number(b.commission_rate ?? 0.15)),
                              ),
                          ).toLocaleString('id-ID')}
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(b)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Detail
                          </button>
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
        </>
      ) : (
        /* Tab Meja Refund & Sengketa */
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRefundStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    refundStatusFilter === st
                      ? 'bg-teal-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st === 'all'
                    ? 'Semua Status'
                    : st === 'pending'
                      ? 'Menunggu Review'
                      : st === 'approved'
                        ? 'Disetujui'
                        : 'Ditolak'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari ID, Booking, atau Tamu..."
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-teal-700"
              />
            </div>
          </div>

          {refunds.length === 0 ? (
            <EmptyState
              title="Tidak ada permohonan refund"
              description="Seluruh permohonan telah ditangani atau ubah filter pencarian Anda."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">ID & Booking</th>
                    <th className="px-5 py-3">Pemesan & Email</th>
                    <th className="px-5 py-3">Rekening Tujuan Refund</th>
                    <th className="px-5 py-3">Nominal Refund</th>
                    <th className="px-5 py-3">Alasan Pengajuan</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Tindakan HQ</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-xs font-bold text-teal-800">#{r.id.slice(0, 8)}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          Book #{r.bookingId.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800">{r.guestName}</div>
                        <div className="text-xs text-slate-500">{r.email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-bold text-slate-800">
                          {r.bankName} - {r.accountNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">a/n {r.accountHolder}</div>
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-teal-800 text-xs">
                        Rp {r.amount.toLocaleString('id-ID')}
                      </td>
                      <td
                        className="px-5 py-3.5 text-xs text-slate-700 max-w-[200px] truncate"
                        title={r.reason}
                      >
                        {r.reason}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            r.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'rejected'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {r.status === 'approved'
                            ? 'Disetujui'
                            : r.status === 'rejected'
                              ? 'Ditolak'
                              : 'Menunggu Review'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setApprovingRefund(r)
                                setRefundNotes('')
                              }}
                              className="rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-800"
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingRefund(r)
                                setRefundNotes('')
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">
                            {r.hqNotes || 'Selesai ditangani'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
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

      {/* Modal Detail Pesanan Tamu */}
      <Modal
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title={`Detail Reservasi #${selectedBooking?.id}`}
      >
        {selectedBooking && (
          <div className="space-y-4 text-xs">
            {/* Status & ID */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div>
                <span className="font-mono text-xs font-bold text-teal-800">{selectedBooking.id}</span>
                <div className="text-[11px] text-slate-500">
                  Dibuat:{' '}
                  {selectedBooking.created_at
                    ? new Date(selectedBooking.created_at).toLocaleString('id-ID')
                    : '—'}
                </div>
              </div>
              <Badge status={selectedBooking.status} />
            </div>

            {/* Informasi Tamu */}
            <div className="rounded-lg border border-slate-100 p-3 space-y-1.5">
              <div className="font-bold text-slate-900 text-xs">Informasi Tamu</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400">Nama:</span>{' '}
                  <strong className="text-slate-800">{selectedBooking.guest_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400">No. HP:</span>{' '}
                  <strong className="text-slate-800">{selectedBooking.phone || '—'}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Email:</span>{' '}
                  <strong className="text-slate-800">{selectedBooking.email || '—'}</strong>
                </div>
              </div>
            </div>

            {/* Informasi Penginapan */}
            <div className="rounded-lg border border-slate-100 p-3 space-y-1.5">
              <div className="font-bold text-slate-900 text-xs">Informasi Menginap</div>
              <div className="text-slate-700">
                <div className="font-semibold">{selectedBooking.hotel_name}</div>
                <div className="text-slate-500">
                  Tipe: {selectedBooking.room_type_name || 'Standar'} • {selectedBooking.rooms || 1} Kamar •{' '}
                  {selectedBooking.nights || 1} Malam
                </div>
                <div className="mt-1 text-slate-500">
                  Jadwal: {selectedBooking.check_in || '—'} s.d. {selectedBooking.check_out || '—'}
                </div>
              </div>
            </div>

            {/* Rincian Finansial & Split 15/85 */}
            <div className="rounded-lg border border-slate-100 p-3 space-y-2 bg-slate-50/50">
              <div className="font-bold text-slate-900 text-xs">Rincian Finansial & Pembagian Hasil</div>
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Total Transaksi Tamu:</span>
                  <span className="font-bold text-slate-900">
                    Rp {Number(selectedBooking.total_price || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                {Number(selectedBooking.coupon_discount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon Kupon ({selectedBooking.coupon_code}):</span>
                    <span>- Rp {Number(selectedBooking.coupon_discount).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                  <span>
                    Komisi Platform ({Math.round(Number(selectedBooking.commission_rate ?? 0.15) * 100)}%):
                  </span>
                  <span className="font-semibold text-slate-700">
                    Rp{' '}
                    {Number(
                      selectedBooking.platform_fee ||
                        Math.round(
                          Number(selectedBooking.total_price || 0) *
                            Number(selectedBooking.commission_rate ?? 0.15),
                        ),
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>
                    Hak Bersih Mitra (
                    {100 - Math.round(Number(selectedBooking.commission_rate ?? 0.15) * 100)}%):
                  </span>
                  <span>
                    Rp{' '}
                    {Number(
                      selectedBooking.partner_net ||
                        Math.max(
                          0,
                          Number(selectedBooking.total_price || 0) -
                            Math.round(
                              Number(selectedBooking.total_price || 0) *
                                Number(selectedBooking.commission_rate ?? 0.15),
                            ),
                        ),
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Pembayaran & Payout */}
            <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-slate-600">
              <div>
                <div className="text-[11px] text-slate-400">Metode Bayar:</div>
                <div className="font-medium text-slate-800">
                  {selectedBooking.payment_method || 'Online Payment Gateway'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Status Dana Payout:</div>
                <div className="font-medium">
                  {selectedBooking.payout_id ? (
                    <span className="text-purple-700 font-bold">
                      Terkunci (#{String(selectedBooking.payout_id).slice(0, 8)})
                    </span>
                  ) : selectedBooking.status === 'completed' ? (
                    <span className="text-amber-700 font-bold">Siap Dicairkan</span>
                  ) : (
                    <span className="text-slate-400">Belum Selesai</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {selectedBooking.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => {
                    const b = selectedBooking
                    setSelectedBooking(null)
                    setCompletingBooking(b)
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Selesaikan Pesanan
                </button>
              )}
              {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    const b = selectedBooking
                    setSelectedBooking(null)
                    setCancellingBooking(b)
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                >
                  Batalkan Pesanan
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Persetujuan Refund */}
      {approvingRefund && (
        <Modal
          isOpen={Boolean(approvingRefund)}
          onClose={() => setApprovingRefund(null)}
          title={`Setujui Pengembalian Dana #${approvingRefund.id.slice(0, 8)}`}
        >
          <form onSubmit={handleApproveRefundSubmit} className="space-y-4 text-xs">
            <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3 text-teal-900 space-y-1">
              <div className="flex justify-between font-bold">
                <span>Nilai Pengembalian:</span>
                <span>Rp {approvingRefund.amount.toLocaleString('id-ID')}</span>
              </div>
              <div className="text-[11px] text-teal-800">
                Tujuan: {approvingRefund.bankName} - {approvingRefund.accountNumber} (a/n{' '}
                {approvingRefund.accountHolder})
              </div>
              <div className="text-[11px] text-teal-700">
                Booking ID: {approvingRefund.bookingId} ({approvingRefund.guestName})
              </div>
            </div>

            <FormField label="Catatan Transaksi / Referensi Transfer HQ">
              <input
                type="text"
                required
                placeholder="misal: Refund diproses via BCA KlikBCA Ref #TRX99201"
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-semibold text-slate-800 focus:border-teal-700 focus:outline-none"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingRefund(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-teal-700 px-5 py-2 font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
              >
                {busy ? 'Memproses...' : 'Konfirmasi Setujui Refund'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Penolakan Refund */}
      {rejectingRefund && (
        <Modal
          isOpen={Boolean(rejectingRefund)}
          onClose={() => setRejectingRefund(null)}
          title={`Tolak Pengembalian Dana #${rejectingRefund.id.slice(0, 8)}`}
        >
          <form onSubmit={handleRejectRefundSubmit} className="space-y-4 text-xs">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 space-y-1">
              <div className="font-bold">
                Permohonan senilai Rp {rejectingRefund.amount.toLocaleString('id-ID')} (
                {rejectingRefund.guestName})
              </div>
              <div className="text-[11px] text-red-700">Alasan Tamu: {rejectingRefund.reason}</div>
            </div>

            <FormField label="Alasan Penolakan HQ (Ditampilkan ke Tamu)">
              <input
                type="text"
                required
                placeholder="misal: Melewati batas waktu pembatalan gratis (H-1)"
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-semibold text-slate-800 focus:border-red-600 focus:outline-none"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingRefund(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-red-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? 'Memproses...' : 'Tolak Pengajuan Refund'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
