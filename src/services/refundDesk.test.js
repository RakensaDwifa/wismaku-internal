import { describe, it, expect, beforeEach } from 'vitest'
import { getRefundRequests, approveRefundRequest, rejectRefundRequest, REFUNDS_KEY } from './refundDesk.js'
import { writeList } from './storage.js'

describe('refundDesk service (wismaku-internal)', () => {
  beforeEach(() => {
    writeList(REFUNDS_KEY, [
      {
        id: 'ref-test-1',
        booking_id: 'BK-999',
        hotel_id: '1',
        guest_name: 'Budi Santoso',
        email: 'budi@example.com',
        amount: 500000,
        reason: 'Penerbangan dibatalkan',
        bank_name: 'BCA',
        account_number: '1234567890',
        account_holder: 'Budi Santoso',
        status: 'pending',
        hq_notes: null,
        created_at: new Date().toISOString(),
      },
    ])
  })

  it('membaca antrean permohonan refund', async () => {
    const list = await getRefundRequests()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe('ref-test-1')
    expect(list[0].amount).toBe(500000)
  })

  it('menyetujui permohonan refund dan mencatat catatan HQ', async () => {
    const res = await approveRefundRequest('ref-test-1', {
      hqNotes: 'Dana telah ditransfer via Rekening Escrow BCA',
    })
    expect(res.success).toBe(true)

    const list = await getRefundRequests()
    expect(list[0].status).toBe('approved')
    expect(list[0].hqNotes).toContain('Escrow BCA')
  })

  it('menolak permohonan refund dengan alasan', async () => {
    const res = await rejectRefundRequest('ref-test-1', {
      hqNotes: 'Pembatalan dilakukan H-0 melewati batas free cancel',
    })
    expect(res.success).toBe(true)

    const list = await getRefundRequests()
    expect(list[0].status).toBe('rejected')
    expect(list[0].hqNotes).toContain('H-0')
  })
})
