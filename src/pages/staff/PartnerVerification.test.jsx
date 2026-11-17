import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PartnerVerification from './PartnerVerification.jsx'
import * as partnerLeadService from '../../services/partnerLead.js'

describe('PartnerVerification.jsx Component Tests (Tinjau & Setujui / Tolak Mitra)', () => {
  const sampleLead = {
    id: 'lead-01',
    propertyName: 'Hotel Harmoni Indah',
    city: 'Bandung',
    ownerName: 'Ibu Ratna',
    email: 'ratna@harmoni.test',
    status: 'pending',
    kycStatus: 'pending',
    idCardNumber: '3273012345670001',
    nibOrNpwp: '9120007788990',
    idCardUrl: 'https://cdn.wismaku.com/docs/ktp-ratna.jpg',
    businessDocUrl: 'https://cdn.wismaku.com/docs/nib-harmoni.pdf',
    submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    reviewedAt: null,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(partnerLeadService, 'getPartnerLeads').mockResolvedValue([sampleLead])
  })

  it('merender baris pendaftaran mitra dengan berkas KYC dan badge status', async () => {
    render(<PartnerVerification />)

    await waitFor(() => {
      expect(screen.getByText('Hotel Harmoni Indah')).toBeInTheDocument()
    })

    expect(screen.getByText('Ibu Ratna')).toBeInTheDocument()
    expect(screen.getByText('ratna@harmoni.test')).toBeInTheDocument()
    expect(screen.getByText('Tinjau Berkas')).toBeInTheDocument()

    // Tombol tindakan
    expect(screen.getByRole('button', { name: /Tinjau & Setujui/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tolak' })).toBeInTheDocument()
  })

  it('klik Tinjau & Setujui membuka modal dengan data KYC dan memanggil approvePartnerLead', async () => {
    const approveSpy = vi.spyOn(partnerLeadService, 'approvePartnerLead').mockResolvedValue({ ok: true })

    render(<PartnerVerification />)

    await waitFor(() => {
      expect(screen.getByText('Hotel Harmoni Indah')).toBeInTheDocument()
    })

    const reviewBtn = screen.getByRole('button', { name: /Tinjau & Setujui/i })
    fireEvent.click(reviewBtn)

    // Modal terbuka
    expect(screen.getByText(/Tinjau Berkas KYC & Persetujuan Kemitraan/i)).toBeInTheDocument()
    expect(screen.getByText('3273012345670001')).toBeInTheDocument()
    expect(screen.getByText('9120007788990')).toBeInTheDocument()

    // Submit persetujuan
    const submitBtn = screen.getByRole('button', { name: /Setujui & Publikasikan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'lead-01' }),
        { commissionRate: 0.15 },
      )
    })
  })

  it('klik Tolak membuka modal penolakan dan memanggil rejectPartnerLead', async () => {
    const rejectSpy = vi.spyOn(partnerLeadService, 'rejectPartnerLead').mockResolvedValue({ ok: true })

    render(<PartnerVerification />)

    await waitFor(() => {
      expect(screen.getByText('Hotel Harmoni Indah')).toBeInTheDocument()
    })

    const rejectBtn = screen.getByRole('button', { name: 'Tolak' })
    fireEvent.click(rejectBtn)

    // Modal tolak terbuka
    expect(screen.getByText(/Tolak Pendaftaran \/ Kembalikan Berkas Mitra/i)).toBeInTheDocument()

    const textarea = screen.getByPlaceholderText(/Foto KTP buram dan nomor NIB tidak terdaftar/i)
    fireEvent.change(textarea, { target: { value: 'Foto NIB buram tidak terbaca' } })

    const confirmRejectBtn = screen.getByRole('button', { name: /Tolak & Kirim Catatan/i })
    fireEvent.click(confirmRejectBtn)

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'lead-01' }),
        'Foto NIB buram tidak terbaca',
      )
    })
  })
})
