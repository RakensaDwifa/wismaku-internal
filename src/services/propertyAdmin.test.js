import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAllProperties,
  setPropertyStatus,
  updateCommissionRate,
  PROPERTIES_KEY,
  seedProperties,
} from './propertyAdmin.js'
import { writeList } from './storage.js'

beforeEach(() => {
  localStorage.clear()
  writeList(PROPERTIES_KEY, seedProperties)
})

describe('Property Admin Service', () => {
  it('mengambil semua properti katalog', async () => {
    const list = await getAllProperties()
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list[0]).toHaveProperty('commissionRate')
    expect(list[0]).toHaveProperty('partnerEmail')
  })

  it('memperbarui status properti', async () => {
    const list = await getAllProperties()
    await setPropertyStatus(list[0].id, 'nonaktif')

    const updated = await getAllProperties()
    expect(updated[0].status).toBe('nonaktif')
  })

  it('memperbarui komisi properti dalam batas aman (5% - 50%)', async () => {
    const list = await getAllProperties()
    await updateCommissionRate(list[0].id, 0.2)

    const updated = await getAllProperties()
    expect(updated[0].commissionRate).toBe(0.2)
  })

  it('menolak nilai komisi yang tidak valid', async () => {
    const list = await getAllProperties()
    await expect(updateCommissionRate(list[0].id, 0.01)).rejects.toThrow()
    await expect(updateCommissionRate(list[0].id, 0.8)).rejects.toThrow()
  })
})
