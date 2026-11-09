import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import {
  getPayoutsList,
  getUnpaidCompletedBookings,
  createOnDemandPayout,
  markPayoutAsPaid,
} from '../../services/payoutAdmin.js'
import { generatePayoutsCSV, downloadCSV } from '../../services/export.js'
import { uploadPayoutReceipt } from '../../services/storageUpload.js'
import Badge from '../../components/Badge.jsx'
import Modal from '../../components/Modal.jsx'
import FormField from '../../components/FormField.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import PayoutReceiptModal from '../../components/PayoutReceiptModal.jsx'

export default function PayoutsPage() {
  const { data: payouts, refresh: refreshPayouts } = useData(() => getPayoutsList(), [])
  const { data: unpaidMitra, refresh: refreshUnpaid } = useData(() => getUnpaidCompletedBookings(), [])

  const [generatingFor, setGeneratingFor] = useState(null)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [payingPayout, setPayingPayout] = useState(null)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [transferRef, setTransferRef] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingReceipt(true)
    setError('')
    try {
      const { path } = await uploadPayoutReceipt(file)
      const cleanRef = `TRF-${path.split('/').pop().slice(0, 18).toUpperCase()}`
      if (!transferRef) {
        setTransferRef(cleanRef)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingReceipt(false)
    }
  }

  if (!payouts || !unpaidMitra) return <PageLoader />

  const totalPaid = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const totalPending = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const handleGeneratePayout = async (e) => {
    e.preventDefault()
    if (!generatingFor) return
    setBusy(true)
    setError('')
    try {
      await createOnDemandPayout({
        partnerEmail: generatingFor.partnerEmail,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
      })
      setGeneratingFor(null)
      await Promise.all([refreshPayouts(), refreshUnpaid()])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleMarkPaid = async (e) => {
    e.preventDefault()
    if (!payingPayout) return
    setBusy(true)
    setError('')
    try {
      await markPayoutAsPaid(payingPayout.id, { transferRef })
      setPayingPayout(null)
      setTransferRef('')
      await refreshPayouts()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Pencairan Bagi Hasil Mitra (On-Demand Payouts)
          </h1>
          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-800">
            SUPER ADMIN
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Eksekusi pencairan saldo bersih (85%) bagi hasil mitra untuk pesanan yang telah selesai menginap
          (completed). Sistem otomatis mengunci ID pesanan untuk mencegah pencairan ganda.
        </p>
      </div>

      {/* Ringkasan Finansial Payout */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Total Telah Dicairkan</div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            Rp {totalPaid.toLocaleString('id-ID')}
          </div>
          <div className="mt-1 text-xs text-slate-500">Lunas ditransfer ke rekening mitra</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="text-xs font-bold uppercase text-amber-700">Menunggu Transfer Bank</div>
          <div className="mt-2 text-2xl font-black text-amber-900">
            Rp {totalPending.toLocaleString('id-ID')}
          </div>
          <div className="mt-1 text-xs text-amber-700">Draft payout terbit menunggu input bukti transfer</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Mitra Siap Dicairkan</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{unpaidMitra.length} Mitra</div>
          <div className="mt-1 text-xs text-slate-500">Memiliki reservasi selesai belum masuk payout</div>
        </div>
      </div>

      {/* Antrean Reservasi Selesai yang Siap Dicairkan (On-Demand) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Mitra Dengan Reservasi Selesai (Belum Dicairkan)
          </h2>
          <p className="text-xs text-slate-500">
            Daftar mitra yang dapat dibuatkan tiket pencairan dana baru hari ini.
          </p>
        </div>

        {unpaidMitra.length === 0 ? (
          <p className="text-sm text-slate-400">
            Semua reservasi selesai telah terkunci di riwayat pencairan dana. Tidak ada saldo menggantung.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Email Mitra</th>
                  <th className="px-4 py-2.5">Pesanan Selesai</th>
                  <th className="px-4 py-2.5">Total Hak Bersih (85%)</th>
                  <th className="px-4 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {unpaidMitra.map((item) => (
                  <tr key={item.partnerEmail} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                      {item.partnerEmail}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.count} pesanan selesai</td>
                    <td className="px-4 py-3 font-extrabold text-emerald-700">
                      Rp {item.totalNet.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratingFor(item)
                          setPeriodStart(new Date(Date.now() - 3600000 * 24 * 30).toISOString().slice(0, 10))
                          setPeriodEnd(new Date().toISOString().slice(0, 10))
                          setError('')
                        }}
                        className="btn btn-sm btn-primary"
                      >
                        Buat Payout (On-Demand)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Riwayat Tiket Payouts */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Riwayat Pencairan Dana Mitra</h2>
            <p className="text-xs text-slate-500">
              Daftar pengiriman bagi hasil ke rekening mitra. Status "Lunas" otomatis terlihat di dashboard
              mitra extranet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const csv = generatePayoutsCSV(payouts)
              downloadCSV(`wismaku-rekap-payout-${new Date().toISOString().slice(0, 10)}.csv`, csv)
            }}
            disabled={payouts.length === 0}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            <svg className="h-3.5 w-3.5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Ekspor Rekap (CSV)
          </button>
        </div>

        {payouts.length === 0 ? (
          <EmptyState title="Belum ada riwayat payout" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">ID Payout</th>
                  <th className="px-4 py-3">Email Mitra</th>
                  <th className="px-4 py-3">Jumlah Dicairkan</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bukti Transfer</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                      {p.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.partner_email}</td>
                    <td className="px-4 py-3 font-black text-slate-900">
                      Rp {Number(p.amount || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.period_start} s.d. {p.period_end}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.transfer_ref ? (
                        <div>
                          <div className="font-mono font-bold text-slate-800">{p.transfer_ref}</div>
                          <div className="text-[10px] text-slate-400">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString('id-ID') : '—'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum ditransfer</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingPayout(p)
                            setTransferRef('')
                            setError('')
                          }}
                          className="btn btn-sm btn-primary bg-emerald-600 hover:bg-emerald-700"
                        >
                          Tandai Lunas
                        </button>
                      )}
                      {p.status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(p)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <svg
                            className="size-3.5 text-teal-700"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                            />
                          </svg>
                          Kwitansi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Generate Payout On-Demand */}
      <Modal
        isOpen={Boolean(generatingFor)}
        onClose={() => setGeneratingFor(null)}
        title="Buat Tiket Pencairan Saldo (On-Demand)"
      >
        {generatingFor && (
          <form onSubmit={handleGeneratePayout} className="space-y-4">
            <div className="rounded-lg bg-purple-50 p-3.5 text-xs text-purple-900">
              Sistem akan menghimpun <strong>{generatingFor.count} pesanan selesai</strong> untuk mitra{' '}
              <strong>{generatingFor.partnerEmail}</strong> dengan total nilai bersih{' '}
              <strong>Rp {generatingFor.totalNet.toLocaleString('id-ID')}</strong>. Pesanan ini akan otomatis
              dikunci dengan <code>payout_id</code>.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Periode Mulai">
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Periode Akhir">
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </FormField>
            </div>

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGeneratingFor(null)}
                className="btn btn-sm btn-outline"
                disabled={busy}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
                {busy ? 'Mengunci Pesanan...' : 'Terbitkan Tiket Payout'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Tandai Lunas (Input Bukti Transfer) */}
      <Modal
        isOpen={Boolean(payingPayout)}
        onClose={() => setPayingPayout(null)}
        title="Konfirmasi Pembayaran Payout (Transfer Bank)"
      >
        {payingPayout && (
          <form onSubmit={handleMarkPaid} className="space-y-4">
            <div className="text-xs text-slate-600">
              Mitra: <strong>{payingPayout.partner_email}</strong> • Jumlah:{' '}
              <strong className="text-emerald-700">
                Rp {Number(payingPayout.amount).toLocaleString('id-ID')}
              </strong>
            </div>

            <FormField
              label="Nomor Referensi / Bukti Transfer Bank"
              hint="Masukkan nomor referensi transaksi atau unggah berkas slip transfer bank."
            >
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Contoh: TRF-BCA-20261106-98124"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-700 font-mono"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  required
                />
                <div>
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="sr-only"
                      onChange={handleReceiptUpload}
                      disabled={uploadingReceipt}
                    />
                    <svg
                      className="size-3.5 text-teal-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    {uploadingReceipt ? 'Mengunggah Berkas...' : 'Unggah Slip Bukti Transfer (JPG/PNG/PDF)'}
                  </label>
                </div>
              </div>
            </FormField>

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayingPayout(null)}
                className="btn btn-sm btn-outline"
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary bg-emerald-600 hover:bg-emerald-700"
                disabled={busy}
              >
                {busy ? 'Menyimpan...' : 'Tandai Lunas'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <PayoutReceiptModal payout={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
    </div>
  )
}
