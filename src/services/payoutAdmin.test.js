import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPayoutsList,
  getUnpaidCompletedBookings,
  createOnDemandPayout,
  markPayoutAsPaid,
  ensureSeed,
} from './payoutAdmin.js'

beforeEach(() => {
  localStorage.clear()
  ensureSeed()
})

describe('Payout Admin Service', () => {
  it('menampilkan riwayat payout awal', async () => {
    const list = await getPayoutsList()
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].partner_email).toBe('mitra@wismaku.com')
  })

  it('mengelompokkan pesanan selesai yang belum dicairkan', async () => {
    const unpaid = await getUnpaidCompletedBookings()
    expect(unpaid.length).toBeGreaterThan(0)
    const mitraItem = unpaid.find((u) => u.partnerEmail === 'mitra@wismaku.com')
    expect(mitraItem).toBeDefined()
    expect(mitraItem.totalNet).toBeGreaterThan(0)
  })

  it('membuat draft payout on-demand dan mengunci booking', async () => {
    const payout = await createOnDemandPayout({
      partnerEmail: 'mitra@wismaku.com',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-05',
    })

    expect(payout.id).toBeDefined()
    expect(payout.status).toBe('pending')
    expect(payout.amount).toBeGreaterThan(0)

    // Setelah dibuat, pesanan selesai tadi sudah terkunci sehingga unpaid menjadi 0
    const unpaidAfter = await getUnpaidCompletedBookings()
    expect(unpaidAfter.length).toBe(0)
  })

  it('menandai payout lunas dengan bukti transfer bank', async () => {
    const res = await markPayoutAsPaid('p-1', { transferRef: 'TRF-BCA-TEST-123' })
    expect(res.success).toBe(true)
    const payouts = await getPayoutsList()
    const p1 = payouts.find((p) => p.id === 'p-1')
    expect(p1.status).toBe('paid')
    expect(p1.transfer_ref).toBe('TRF-BCA-TEST-123')
  })
})
