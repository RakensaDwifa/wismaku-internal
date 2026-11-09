import Modal from './Modal.jsx'

export default function PayoutReceiptModal({ payout, onClose }) {
  if (!payout) return null

  const formattedAmount = Number(payout.amount || 0).toLocaleString('id-ID')
  const paidDate = payout.paid_at
    ? new Date(payout.paid_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <Modal isOpen={Boolean(payout)} onClose={onClose} title="Kwitansi Resmi Pencairan Dana">
      <div className="space-y-6">
        {/* Konten Kwitansi Resmi HQ */}
        <div
          id="printable-payout-receipt-hq"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Header Kwitansi */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-teal-700 font-black text-white text-xs">
                  W
                </span>
                <span className="text-base font-black tracking-tight text-slate-900">
                  WismaKu <span className="text-teal-700">HQ</span>
                </span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Bukti Pembayaran Bagi Hasil Mitra (Payout Receipt)
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                LUNAS / PAID
              </span>
              <p className="mt-1 font-mono text-[11px] font-bold text-slate-400">
                #{String(payout.id).slice(0, 16)}
              </p>
            </div>
          </div>

          {/* Rincian Transaksi */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Penerima Dana:</span>
              <p className="font-bold text-slate-800">{payout.partner_email}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Tanggal Transfer:</span>
              <p className="font-bold text-slate-800">{paidDate}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Ref. Bank: <span className="font-mono font-bold">{payout.transfer_ref || 'TRF-AUTO'}</span>
              </p>
            </div>
          </div>

          {/* Periode Operasional */}
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs border border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Periode Bagi Hasil:</span>
            <span className="font-bold text-slate-800">
              {payout.period_start} s.d. {payout.period_end}
            </span>
          </div>

          {/* Total Nominal Transfer */}
          <div className="mt-4 border-t border-slate-200 pt-3 flex justify-between items-baseline">
            <div>
              <span className="text-xs text-slate-500 font-medium">
                Total Dana Bersih Ditransfer ke Mitra:
              </span>
              <p className="text-[10px] text-slate-400 italic">
                *Telah diverifikasi oleh Finance & Superadmin HQ WismaKu
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-700">Rp {formattedAmount}</span>
            </div>
          </div>

          {/* Catatan Legal */}
          <div className="mt-6 border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-400 text-center">
            Dokumen ini merupakan bukti transfer sah yang diterbitkan secara otomatis oleh sistem keuangan
            WismaKu HQ.
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Cetak Kwitansi / Simpan PDF
          </button>
        </div>
      </div>
    </Modal>
  )
}
