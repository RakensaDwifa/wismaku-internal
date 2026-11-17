import { describe, it, expect } from 'vitest'
import { calculateSlaStatus } from './sla.js'

describe('SLA Timer Utility', () => {
  it('mengembalikan status netral jika waktu dibuat tidak ada', () => {
    const res = calculateSlaStatus(null)
    expect(res.label).toBe('—')
    expect(res.tone).toBe('neutral')
  })

  it('mengembalikan status tersisa normal jika tiket baru dibuat', () => {
    const createdAt = new Date(Date.now() - 3600000 * 2).toISOString() // 2 jam lalu
    const res = calculateSlaStatus(createdAt, 24)
    expect(res.isOverdue).toBe(false)
    expect(res.isFinished).toBe(false)
    expect(res.tone).toBe('info')
    expect(res.label).toMatch(/2[12]j/)
  })

  it('mengembalikan status warning urgent jika sisa waktu kurang dari batas peringatan', () => {
    const createdAt = new Date(Date.now() - 3600000 * 20).toISOString() // 20 jam lalu dari SLA 24j
    const res = calculateSlaStatus(createdAt, 24)
    expect(res.isOverdue).toBe(false)
    expect(res.isUrgent).toBe(true)
    expect(res.tone).toBe('warning')
  })

  it('mengembalikan status overdue jika melewati batas SLA', () => {
    const createdAt = new Date(Date.now() - 3600000 * 26).toISOString() // 26 jam lalu
    const res = calculateSlaStatus(createdAt, 24)
    expect(res.isOverdue).toBe(true)
    expect(res.tone).toBe('danger')
    expect(res.label).toContain('Overdue')
  })

  it('mengembalikan durasi selesai jika tiket sudah direview', () => {
    const createdAt = new Date(Date.now() - 3600000 * 10).toISOString()
    const reviewedAt = new Date(Date.now() - 3600000 * 6).toISOString() // diselesaikan 4 jam kemudian
    const res = calculateSlaStatus(createdAt, 24, reviewedAt)
    expect(res.isFinished).toBe(true)
    expect(res.isOverdue).toBe(false)
    expect(res.tone).toBe('success')
    expect(res.label).toContain('Selesai (4j)')
  })
})
