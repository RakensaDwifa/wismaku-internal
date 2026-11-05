import { describe, it, expect, beforeEach } from 'vitest'
import { getAllCoupons, createCoupon, toggleCouponActive, deleteCoupon } from './couponAdmin.js'

beforeEach(() => {
  localStorage.clear()
})

describe('Coupon Admin Service', () => {
  it('mengambil daftar kupon default', async () => {
    const list = await getAllCoupons()
    expect(list.length).toBeGreaterThan(0)
    expect(list.some((c) => c.code === 'HEMAT10')).toBe(true)
  })

  it('membuat kupon baru', async () => {
    const created = await createCoupon({
      code: 'SUPERADMIN50',
      label: 'Promo Spesial Superadmin',
      discount_pct: 50,
      max_discount: 500000,
    })
    expect(created.code).toBe('SUPERADMIN50')
    const list = await getAllCoupons()
    expect(list.some((c) => c.code === 'SUPERADMIN50')).toBe(true)
  })

  it('mengaktifkan dan menonaktifkan kupon', async () => {
    await toggleCouponActive('HEMAT10', false)
    let list = await getAllCoupons()
    expect(list.find((c) => c.code === 'HEMAT10').active).toBe(false)

    await toggleCouponActive('HEMAT10', true)
    list = await getAllCoupons()
    expect(list.find((c) => c.code === 'HEMAT10').active).toBe(true)
  })

  it('menghapus kupon', async () => {
    await deleteCoupon('HEMAT10')
    const list = await getAllCoupons()
    expect(list.some((c) => c.code === 'HEMAT10')).toBe(false)
  })
})
