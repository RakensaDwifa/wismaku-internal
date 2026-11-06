import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAllBookings,
  cancelBookingByAdmin,
  completeBookingByAdmin,
  seedBookings,
  BOOKINGS_KEY,
} from './bookingAdmin.js'
import { writeList } from './storage.js'

beforeEach(() => {
  localStorage.clear()
  writeList(BOOKINGS_KEY, seedBookings)
})

describe('Booking Admin Service', () => {
  it('mengambil semua pesanan dengan kalkulasi split finansial 15% platform dan 85% mitra', async () => {
    const list = await getAllBookings()
    expect(list.length).toBeGreaterThanOrEqual(2)
    for (const b of list) {
      expect(b.total_price).toBeGreaterThan(0)
      expect(b.platform_fee).toBe(Math.round(b.total_price * 0.15))
      expect(b.partner_net).toBe(b.total_price - b.platform_fee)
    }
  })

  it('memfilter pesanan berdasarkan status', async () => {
    const confirmed = await getAllBookings({ status: 'confirmed' })
    expect(confirmed.every((b) => b.status === 'confirmed')).toBe(true)
  })

  it('memfilter pesanan berdasarkan kata kunci pencarian', async () => {
    const searchRes = await getAllBookings({ search: 'Ahmad' })
    expect(searchRes.length).toBe(1)
    expect(searchRes[0].guest_name).toContain('Ahmad')
  })

  it('dapat membatalkan pesanan tamu (cancelBookingByAdmin)', async () => {
    const list = await getAllBookings()
    const target = list[0]
    await cancelBookingByAdmin(target.id, 'Uji pembatalan staf')

    const updatedList = await getAllBookings()
    const cancelled = updatedList.find((b) => b.id === target.id)
    expect(cancelled.status).toBe('cancelled')
  })

  it('dapat mengonfirmasi penyelesaian pesanan (completeBookingByAdmin)', async () => {
    const list = await getAllBookings({ status: 'confirmed' })
    const target = list[0]
    await completeBookingByAdmin(target.id)

    const updatedList = await getAllBookings()
    const completed = updatedList.find((b) => b.id === target.id)
    expect(completed.status).toBe('completed')
  })
})
