import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import OrderAudit from './OrderAudit.jsx'
import * as bookingAdminService from '../../services/bookingAdmin.js'
import * as refundDeskService from '../../services/refundDesk.js'

describe('OrderAudit.jsx Component Tests (Tab Refund, Setujui/Tolak Refund & Bukti Mitra)', () => {
  const sampleRefund = {
    id: 'ref-audit-1',
    bookingId: 'book-audit-1',
    guestName: 'Citra Kirana',
    email: 'citra@test.com',
    bankName: 'BCA',
    accountNumber: '11223344',
    accountHolder: 'Citra K',
    amount: 350000,
    reason: 'AC kamar mati dan bocor',
    partnerResponse: 'Telah dipindahkan ke kamar VIP lain',
    partnerEvidenceUrl: 'https://cdn.wismaku.com/evidence/room-vip.jpg',
    status: 'pending',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(bookingAdminService, 'getAllBookings').mockResolvedValue([])
    vi.spyOn(refundDeskService, 'getRefundRequests').mockResolvedValue([sampleRefund])
  })

  it('berpindah ke tab refund, menampilkan sanggahan mitra dan tautan bukti', async () => {
    render(<OrderAudit />)

    await waitFor(() => {
      expect(screen.getByText(/Audit Transaksi & Meja Sengketa/i)).toBeInTheDocument()
    })

    // Klik tab Pengajuan Refund
    const refundTab = screen.getByRole('button', { name: /Meja Refund & Sengketa/i })
    fireEvent.click(refundTab)

    // Data refund tampil
    expect(screen.getByText('Citra Kirana')).toBeInTheDocument()
    expect(screen.getByText(/⚖️ Sanggahan Mitra/i)).toBeInTheDocument()
    expect(screen.getByText(/Telah dipindahkan ke kamar VIP lain/i)).toBeInTheDocument()

    // Tautan bukti mitra ada dan tersanitasi
    const evidenceLink = screen.getByRole('link', { name: /🔗 Bukti Sanggah Mitra/i })
    expect(evidenceLink).toHaveAttribute('href', 'https://cdn.wismaku.com/evidence/room-vip.jpg')
    expect(evidenceLink).toHaveAttribute('target', '_blank')
    expect(evidenceLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('tombol Setujui membuka modal dan memanggil approveRefundRequest', async () => {
    const approveSpy = vi.spyOn(refundDeskService, 'approveRefundRequest').mockResolvedValue({ ok: true })

    render(<OrderAudit />)

    await waitFor(() => {
      expect(screen.getByText(/Audit Transaksi & Meja Sengketa/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Meja Refund & Sengketa/i }))

    const approveBtn = screen.getByRole('button', { name: 'Setujui' })
    fireEvent.click(approveBtn)

    // Modal terbuka
    expect(screen.getByText(/Setujui Pengembalian Dana/i)).toBeInTheDocument()

    const notesInput = screen.getByPlaceholderText(/misal: Refund diproses via BCA/i)
    fireEvent.change(notesInput, { target: { value: 'TRF-REF-BCA-123' } })

    const submitConfirmBtn = screen.getByRole('button', { name: /Konfirmasi Setujui Refund/i })
    fireEvent.click(submitConfirmBtn)

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('ref-audit-1', expect.objectContaining({
        hqNotes: 'TRF-REF-BCA-123',
      }))
    })
  })

  it('tombol Tolak membuka modal dan memanggil rejectRefundRequest dengan alasan', async () => {
    const rejectSpy = vi.spyOn(refundDeskService, 'rejectRefundRequest').mockResolvedValue({ ok: true })

    render(<OrderAudit />)
    await waitFor(() => {
      expect(screen.getByText(/Audit Transaksi & Meja Sengketa/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Meja Refund & Sengketa/i }))

    const rejectBtn = screen.getByRole('button', { name: 'Tolak' })
    fireEvent.click(rejectBtn)

    // Modal penolakan terbuka
    expect(screen.getByText(/Tolak Pengembalian Dana/i)).toBeInTheDocument()

    const inputReason = screen.getByPlaceholderText(/misal: Melewati batas waktu pembatalan gratis/i)
    fireEvent.change(inputReason, { target: { value: 'Mitra telah memberikan kompensasi kamar VIP setara' } })

    const confirmRejectBtn = screen.getByRole('button', { name: /Tolak Pengajuan Refund/i })
    fireEvent.click(confirmRejectBtn)

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith('ref-audit-1', expect.objectContaining({
        hqNotes: 'Mitra telah memberikan kompensasi kamar VIP setara',
      }))
    })
  })
})
