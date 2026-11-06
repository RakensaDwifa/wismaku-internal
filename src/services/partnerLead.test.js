import { describe, it, expect, beforeEach } from 'vitest'
import { getPartnerLeads, approvePartnerLead, PARTNERS_KEY, seedPartnerLeads } from './partnerLead.js'
import { writeList } from './storage.js'

beforeEach(() => {
  localStorage.clear()
  writeList(PARTNERS_KEY, seedPartnerLeads)
})

describe('Partner Lead Service', () => {
  it('mengambil daftar calon pendaftaran mitra', async () => {
    const list = await getPartnerLeads()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0]).toHaveProperty('ownerName')
    expect(list[0]).toHaveProperty('propertyName')
    expect(list[0]).toHaveProperty('email')
  })

  it('dapat menyetujui pendaftaran calon mitra (approvePartnerLead)', async () => {
    const list = await getPartnerLeads()
    const target = list[0]
    await approvePartnerLead(target, { commissionRate: 0.15 })

    const updated = await getPartnerLeads()
    const approved = updated.find((l) => l.id === target.id)
    expect(approved.status).toBe('approved')
  })
})
