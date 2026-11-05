import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, notify } from './storage.js'
import { logAuditAction } from './audit.js'
import { getActiveUser } from './auth.js'
import { DATA_EVENT } from '../hooks/useData.js'

export const REVIEWS_KEY = 'wismaku_internal_reviews'

export const seedReviews = [
  {
    id: 'rev-1',
    hotel_id: '1',
    hotel_name: 'Wisma Asri Cikini',
    name: 'Budi Santoso',
    rating: 5,
    text: 'Lokasi strategis, kamar bersih dan staf sangat ramah!',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'rev-2',
    hotel_id: '2',
    hotel_name: 'Hotel Sabang Heritage',
    name: 'Rina Kusuma',
    rating: 1,
    text: 'SPAM TEST: Promo obat pelangsing hubungi nomor 081234567890 murah meriah!',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
]

export async function getAllReviews() {
  if (USE_MOCK || !supabase) {
    let list = readList(REVIEWS_KEY)
    if (list.length === 0) {
      writeList(REVIEWS_KEY, seedReviews)
      list = seedReviews
    }
    return list
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*, hotels(name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => ({
    id: r.id,
    hotel_id: r.hotel_id,
    hotel_name: r.hotels?.name || `Hotel #${r.hotel_id}`,
    name: r.name,
    city: r.city,
    rating: r.rating,
    text: r.text,
    created_at: r.created_at,
  }))
}

export async function deleteReviewByAdmin(reviewId, reason = '') {
  const actor = getActiveUser()

  if (USE_MOCK || !supabase) {
    const list = readList(REVIEWS_KEY).filter((r) => r.id !== reviewId)
    writeList(REVIEWS_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'review_deleted_by_admin',
      targetTable: 'reviews',
      targetId: reviewId,
      details: { reason },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
  if (error) throw new Error(error.message)

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'review_deleted_by_admin',
    targetTable: 'reviews',
    targetId: reviewId,
    details: { reason },
  })

  notify(DATA_EVENT)
  return { success: true }
}
