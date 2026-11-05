import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getAllCoupons, createCoupon, toggleCouponActive, deleteCoupon } from '../../services/couponAdmin.js'
import Modal from '../../components/Modal.jsx'
import FormField from '../../components/FormField.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'

export default function CouponsPage() {
  const { data: coupons, refresh } = useData(() => getAllCoupons(), [])
  const [showAdd, setShowAdd] = useState(false)
  const [deletingCode, setDeletingCode] = useState(null)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [discountPct, setDiscountPct] = useState('10')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!coupons) return <PageLoader />

  const handleCreate = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createCoupon({
        code,
        label,
        discount_pct: parseInt(discountPct, 10),
        max_discount: maxDiscount ? parseInt(maxDiscount, 10) : null,
        valid_until: validUntil || null,
        active: true,
      })
      setShowAdd(false)
      setCode('')
      setLabel('')
      setDiscountPct('10')
      setMaxDiscount('')
      setValidUntil('')
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleToggle = async (c) => {
    await toggleCouponActive(c.code, !c.active)
    await refresh()
  }

  const handleDelete = async () => {
    if (!deletingCode) return
    setBusy(true)
    try {
      await deleteCoupon(deletingCode)
      setDeletingCode(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Kupon Diskon Nasional</h1>
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-800">
              SUPER ADMIN
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Kupon subsidi platform yang berlaku untuk seluruh penginapan di wismaku-demo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true)
            setError('')
          }}
          className="btn btn-primary"
        >
          + Tambah Kupon Nasional
        </button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState title="Belum ada kupon nasional" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Kode Kupon</th>
                <th className="px-5 py-3">Deskripsi Promo</th>
                <th className="px-5 py-3">Diskon (%)</th>
                <th className="px-5 py-3">Maksimal Diskon</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.code} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-mono text-sm font-extrabold text-teal-800">{c.code}</td>
                  <td className="px-5 py-3.5 text-slate-700">{c.label || '—'}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">{c.discount_pct}%</td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-600">
                    {c.max_discount ? `Rp ${Number(c.max_discount).toLocaleString('id-ID')}` : 'Tanpa Batas'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {c.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(c)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {c.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCode(c.code)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah Kupon */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Tambah Kupon Promo Nasional">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Kode Kupon" hint="Huruf kapital dan angka tanpa spasi.">
            <input
              type="text"
              placeholder="CONTOH: PROMOAKHIRPEKAN"
              className="w-full rounded-lg border border-slate-300 p-2 text-sm uppercase focus:border-teal-700"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
          </FormField>

          <FormField label="Label Promo">
            <input
              type="text"
              placeholder="Diskon Musim Liburan 20%"
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-700"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Persentase Diskon (%)">
              <input
                type="number"
                min="1"
                max="90"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-700"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Maksimal Potongan (Rp)" hint="Kosongkan jika tanpa batas">
              <input
                type="number"
                placeholder="200000"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-700"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
              />
            </FormField>
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="btn btn-sm btn-outline"
              disabled={busy}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
              {busy ? 'Menyimpan...' : 'Terbitkan Kupon'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog Hapus Kupon */}
      <ConfirmDialog
        isOpen={Boolean(deletingCode)}
        onClose={() => setDeletingCode(null)}
        onConfirm={handleDelete}
        title="Hapus Kupon Nasional"
        message={`Hapus kupon "${deletingCode}" secara permanen? Pengguna tidak akan dapat lagi menggunakan kode ini saat checkout.`}
        confirmText="Hapus Permanen"
        danger
        busy={busy}
      />
    </div>
  )
}
