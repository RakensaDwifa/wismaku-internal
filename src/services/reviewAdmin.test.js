import { describe, it, expect, beforeEach } from 'vitest'
import { getAllReviews, deleteReviewByAdmin, REVIEWS_KEY, seedReviews } from './reviewAdmin.js'
import { writeList } from './storage.js'

beforeEach(() => {
  localStorage.clear()
  writeList(REVIEWS_KEY, seedReviews)
})

describe('Review Admin Service', () => {
  it('mengambil daftar semua ulasan tamu', async () => {
    const list = await getAllReviews()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0]).toHaveProperty('hotel_name')
    expect(list[0]).toHaveProperty('rating')
  })

  it('dapat menghapus ulasan bermasalah / spam', async () => {
    const list = await getAllReviews()
    const target = list.find((r) => r.text.includes('SPAM')) || list[1]
    await deleteReviewByAdmin(target.id, 'Spam iklan obat')

    const updated = await getAllReviews()
    expect(updated.some((r) => r.id === target.id)).toBe(false)
  })
})
