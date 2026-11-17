import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SlaBadge from './SlaBadge.jsx'

describe('SlaBadge.jsx Component Tests', () => {
  it('merender badge SLA terselesaikan jika reviewedAt diisi', () => {
    const createdAt = new Date('2026-11-10T10:00:00Z').toISOString()
    const reviewedAt = new Date('2026-11-10T12:00:00Z').toISOString()

    render(<SlaBadge createdAt={createdAt} reviewedAt={reviewedAt} slaHours={24} />)

    expect(screen.getByText(/Selesai \(\d+j\)/i)).toBeInTheDocument()
  })

  it('merender badge overdue warna merah jika sudah lewat batas SLA', () => {
    // 3 hari yang lalu (melebihi 24 jam)
    const oldDate = new Date(Date.now() - 72 * 3600 * 1000).toISOString()

    render(<SlaBadge createdAt={oldDate} slaHours={24} />)

    const badge = screen.getByText(/Overdue/i)
    expect(badge).toBeInTheDocument()
    expect(badge.closest('span')).toHaveClass('bg-red-50')
  })

  it('merender badge aman warna teal jika pengajuan masih baru', () => {
    // 1 jam yang lalu
    const recentDate = new Date(Date.now() - 1 * 3600 * 1000).toISOString()

    render(<SlaBadge createdAt={recentDate} slaHours={24} />)

    const badge = screen.getByText(/\d+j \d+m/)
    expect(badge).toBeInTheDocument()
    expect(badge.closest('span')).toHaveClass('bg-teal-50')
  })
})
