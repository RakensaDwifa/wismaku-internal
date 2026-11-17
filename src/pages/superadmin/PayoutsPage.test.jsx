import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PayoutsPage from './PayoutsPage.jsx'
import * as payoutAdminService from '../../services/payoutAdmin.js'
import * as exportService from '../../services/export.js'

describe('PayoutsPage.jsx Component Tests (Multi-select Batch Payout & CSV Export)', () => {
  const samplePayouts = [
    {
      id: 'po-001',
      partnerEmail: 'mitra1@test.com',
      bankName: 'BCA (Bank Central Asia)',
      accountNumber: '1234567890',
      accountHolder: 'Mitra Satu',
      amount: 1500000,
      status: 'pending',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-15',
    },
    {
      id: 'po-002',
      partnerEmail: 'mitra2@test.com',
      bankName: 'Bank Mandiri',
      accountNumber: '9876543210',
      accountHolder: 'Mitra Dua',
      amount: 2500000,
      status: 'pending',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-15',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(payoutAdminService, 'getPayoutsList').mockResolvedValue(samplePayouts)
    vi.spyOn(payoutAdminService, 'getUnpaidCompletedBookings').mockResolvedValue([])
  })

  it('memilih semua checkbox pending, memunculkan bar aksi batch dengan total Rp 4.000.000', async () => {
    render(<PayoutsPage />)

    await waitFor(() => {
      expect(screen.getByText(/po-001/i)).toBeInTheDocument()
    })

    // Checkbox "Pilih semua payout pending" di header tabel
    const selectAllBox = screen.getByTitle('Pilih semua payout pending')
    fireEvent.click(selectAllBox)

    // Bar aksi batch muncul
    expect(screen.getByText(/2 Payout Dipilih/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Rp 4\.000\.000/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/⚡ Eksekusi Batch Lunas \(2\)/i)).toBeInTheDocument()
  })

  it('mengekspor CSV batch payroll saat tombol unduh CSV diklik', async () => {
    const csvSpy = vi.spyOn(exportService, 'generateBatchBankTransferCSV').mockReturnValue('csv-content')
    const dlSpy = vi.spyOn(exportService, 'downloadCSV').mockImplementation(() => {})

    render(<PayoutsPage />)

    await waitFor(() => {
      expect(screen.getByText(/po-001/i)).toBeInTheDocument()
    })

    const selectAllBox = screen.getByTitle('Pilih semua payout pending')
    fireEvent.click(selectAllBox)

    const exportBtn = screen.getByText(/📥 Unduh CSV Batch Payroll/i)
    fireEvent.click(exportBtn)

    expect(csvSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'po-001' }),
        expect.objectContaining({ id: 'po-002' }),
      ]),
      expect.any(Object),
    )
    expect(dlSpy).toHaveBeenCalled()
  })

  it('membuka modal batch payout dan memanggil markBatchPayoutAsPaid saat submit', async () => {
    const batchSpy = vi.spyOn(payoutAdminService, 'markBatchPayoutAsPaid').mockResolvedValue({ ok: true })

    render(<PayoutsPage />)

    await waitFor(() => {
      expect(screen.getByText(/po-001/i)).toBeInTheDocument()
    })

    const selectAllBox = screen.getByTitle('Pilih semua payout pending')
    fireEvent.click(selectAllBox)

    const batchExecBtn = screen.getByText(/⚡ Eksekusi Batch Lunas/i)
    fireEvent.click(batchExecBtn)

    // Modal konfirmasi batch terbuka
    expect(screen.getByText(/Konfirmasi Batch Payout \(2 Tiket Mitra\)/i)).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: /Konfirmasi Batch Payout Lunas/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(batchSpy).toHaveBeenCalledWith(
        ['po-001', 'po-002'],
        expect.objectContaining({
          batchTransferRef: expect.stringContaining('BATCH-'),
        }),
      )
    })
  })
})
