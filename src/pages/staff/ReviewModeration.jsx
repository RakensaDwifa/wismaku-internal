import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getAllReviews, deleteReviewByAdmin, toggleReviewVisibility } from '../../services/reviewAdmin.js'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'

export default function ReviewModeration() {
  const { data: reviews, refresh } = useData(() => getAllReviews(), [])
  const [filter, setFilter] = useState('all')
  const [deletingReview, setDeletingReview] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [busy, setBusy] = useState(false)

  if (!reviews) return <PageLoader />

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'published') return !r.hidden
    if (filter === 'hidden') return r.hidden
    return true
  })

  const handleToggleHide = async (rev) => {
    setBusy(true)
    try {
      await toggleReviewVisibility(rev.id, !rev.hidden)
      await refresh()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingReview) return
    setBusy(true)
    try {
      await deleteReviewByAdmin(deletingReview.id, deleteReason || 'Pelanggaran pedoman konten')
      setDeletingReview(null)
      setDeleteReason('')
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
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Moderasi Ulasan Penginapan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tangguhkan (soft-hide) atau hapus permanen ulasan yang memuat unsur spam, kata-kata kasar, atau
          promosi ilegal untuk menjaga kredibilitas ekosistem.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'all', label: `Semua (${reviews.length})` },
          { id: 'published', label: `Tayang Publik (${reviews.filter((r) => !r.hidden).length})` },
          { id: 'hidden', label: `Ditangguhkan (${reviews.filter((r) => r.hidden).length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              filter === tab.id
                ? 'bg-teal-700 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredReviews.length === 0 ? (
        <EmptyState title="Tidak ada ulasan dalam kategori ini" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition ${
                rev.hidden ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{rev.hotel_name}</h3>
                      {rev.hidden ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Ditangguhkan
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Tayang
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Oleh <strong>{rev.name}</strong> •{' '}
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString('id-ID') : '—'}
                    </p>
                  </div>
                  <div className="flex text-amber-500">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </div>
                </div>

                <div
                  className={`rounded-lg p-3 text-xs italic ${
                    rev.hidden ? 'bg-amber-50/80 text-amber-900' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  "{rev.text}"
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => handleToggleHide(rev)}
                  disabled={busy}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    rev.hidden
                      ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {rev.hidden ? 'Tampilkan Kembali' : 'Tangguhkan (Soft-Hide)'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingReview(rev)}
                  disabled={busy}
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                >
                  Hapus Permanen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Hapus Ulasan */}
      <ConfirmDialog
        isOpen={Boolean(deletingReview)}
        onClose={() => setDeletingReview(null)}
        onConfirm={handleDelete}
        title="Hapus Ulasan Bermasalah"
        message={`Hapus permanen ulasan dari "${deletingReview?.name}" pada ${deletingReview?.hotel_name}?`}
        confirmText="Hapus Permanen"
        danger
        busy={busy}
      />
    </div>
  )
}
