import { describe, it, expect } from 'vitest'
import { formatCSVRow, generateBookingsCSV, generatePayoutsCSV } from './export.js'

describe('Export Utility Service', () => {
  it('formatCSVRow menangani string biasa dan string dengan koma/kutip', () => {
    expect(formatCSVRow(['a', 'b', 'c'])).toBe('a,b,c')
    expect(formatCSVRow(['a,b', 'test "quote"', 'normal'])).toBe('"a,b","test ""quote""",normal')
    expect(formatCSVRow([null, undefined, 123])).toBe(',,123')
  })

  it('generateBookingsCSV menghasilkan header dan baris CSV pesanan yang akurat', () => {
    const mockBookings = [
      {
        id: 'BK-101',
        created_at: '2026-11-01T10:00:00.000Z',
        guest_name: 'Budi Santoso',
        email: 'budi@example.com',
        phone: '08123456789',
        hotel_name: 'Hotel Wisma Asri',
        room_type_name: 'Deluxe',
        rooms: 1,
        nights: 2,
        check_in: '2026-11-02',
        check_out: '2026-11-04',
        total_price: 1000000,
        platform_fee: 150000,
        partner_net: 850000,
        status: 'completed',
        payment_method: 'qris',
        payout_id: 'PAY-123',
      },
    ]

    const csv = generateBookingsCSV(mockBookings)
    expect(csv).toContain('ID Booking,Tanggal Transaksi,Nama Tamu')
    expect(csv).toContain('BK-101')
    expect(csv).toContain('Budi Santoso')
    expect(csv).toContain('1000000')
    expect(csv).toContain('150000')
    expect(csv).toContain('850000')
    expect(csv).toContain('PAY-123')
  })

  it('generatePayoutsCSV menghasilkan header dan baris CSV payout mitra yang akurat', () => {
    const mockPayouts = [
      {
        id: 'PAY-999',
        partner_email: 'mitra@wismaku.com',
        period_start: '2026-10-01',
        period_end: '2026-10-31',
        amount: 4500000,
        status: 'paid',
        transfer_ref: 'TRF-BCA-987654',
        paid_at: '2026-11-02T12:00:00.000Z',
        created_at: '2026-11-01T08:00:00.000Z',
      },
    ]

    const csv = generatePayoutsCSV(mockPayouts)
    expect(csv).toContain('ID Pencairan,Email Mitra,Periode Awal')
    expect(csv).toContain('PAY-999')
    expect(csv).toContain('mitra@wismaku.com')
    expect(csv).toContain('4500000')
    expect(csv).toContain('TRF-BCA-987654')
  })
})
