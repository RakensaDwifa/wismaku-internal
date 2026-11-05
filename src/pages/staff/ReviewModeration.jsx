import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getAllReviews, deleteReviewByAdmin } from '../../services/reviewAdmin.js'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'

export default function ReviewModeration() {
  const { data: reviews, refresh } = useData(() => getAllReviews(), [])
  const [deletingReview, setDeletingReview] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [busy, setBusy] = useState(false)

  if (!reviews) return <PageLoader />

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
          Hapus atau sembunyikan ulasan yang memuat unsur spam, kata-kata kasar, atau promosi ilegal untuk
          menjaga reputasi katalog.
        </p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState title="Belum ada ulasan tamu" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{rev.hotel_name}</h3>
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

                <div className="rounded-lg bg-slate-50 p-3 text-xs italic text-slate-700">"{rev.text}"</div>
              </div>

              <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setDeletingReview(rev)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                >
                  Hapus Ulasan
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
        message={`Hapus ulasan dari "${deletingReview?.name}" pada ${deletingReview?.hotel_name}?`}
        confirmText="Hapus Permanen"
        danger
        busy={busy}
      />
    </div>
  )
}
