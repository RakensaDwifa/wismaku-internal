import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, notify } from './storage.js'
import { logAuditAction } from './audit.js'
import { getActiveUser } from './auth.js'
import { DATA_EVENT } from '../hooks/useData.js'

export const COUPONS_KEY = 'wismaku_internal_coupons'

export const seedCoupons = [
  {
    code: 'HEMAT10',
    label: 'Diskon Spesial 10%',
    discount_pct: 10,
    max_discount: 100000,
    active: true,
  },
  {
    code: 'LIBURAN20',
    label: 'Promo Liburan Akhir Pekan 20%',
    discount_pct: 20,
    max_discount: 250000,
    active: true,
  },
  {
    code: 'WISMAHEMAT',
    label: 'Subsidi Pelanggan Baru 15%',
    discount_pct: 15,
    max_discount: 150000,
    active: false,
  },
]

export function ensureSeed() {
  if (!USE_MOCK) return
  if (readList(COUPONS_KEY).length === 0) {
    writeList(COUPONS_KEY, seedCoupons)
  }
}

export async function getAllCoupons() {
  if (USE_MOCK || !supabase) {
    ensureSeed()
    return readList(COUPONS_KEY)
  }

  let remoteList
  try {
    const { data, error } = await supabase.from('coupons').select('*').order('code', { ascending: true })
    if (error) throw error
    remoteList = data ?? []
  } catch (err) {
    console.warn('[getAllCoupons] Fallback ke storage lokal:', err.message)
    ensureSeed()
    return readList(COUPONS_KEY)
  }

  const localList = readList(COUPONS_KEY)
  const combined = [...remoteList]
  for (const item of localList) {
    if (!combined.some((c) => c.code === item.code)) {
      combined.push(item)
    }
  }
  return combined.sort((a, b) => a.code.localeCompare(b.code))
}

export async function createCoupon(payload) {
  const actor = getActiveUser()
  const cleanCode = (payload.code || '').trim().toUpperCase()
  if (!cleanCode) throw new Error('Kode kupon wajib diisi.')

  const row = {
    code: cleanCode,
    label: payload.label || null,
    discount_pct: Number(payload.discount_pct || 10),
    max_discount: payload.max_discount ? Number(payload.max_discount) : null,
    valid_until: payload.valid_until || null,
    active: payload.active !== false,
  }

  if (USE_MOCK || !supabase) {
    ensureSeed()
    const list = readList(COUPONS_KEY)
    if (list.some((c) => c.code === cleanCode)) {
      throw new Error(`Kupon "${cleanCode}" sudah terdaftar.`)
    }
    list.push(row)
    writeList(COUPONS_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'coupon_created',
      targetTable: 'coupons',
      targetId: cleanCode,
      details: row,
    })
    notify(DATA_EVENT)
    return row
  }

  let result = row
  try {
    const { data, error } = await supabase.from('coupons').insert(row).select().single()
    if (error) throw error
    result = data
  } catch (err) {
    console.warn('[createCoupon] Fallback ke storage lokal:', err.message)
    const list = readList(COUPONS_KEY)
    if (list.some((c) => c.code === cleanCode)) {
      throw new Error(`Kupon "${cleanCode}" sudah terdaftar.`, { cause: err })
    }
    list.push(row)
    writeList(COUPONS_KEY, list)
  }

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'coupon_created',
    targetTable: 'coupons',
    targetId: cleanCode,
    details: row,
  })

  notify(DATA_EVENT)
  return result
}

export async function toggleCouponActive(code, active) {
  const actor = getActiveUser()

  if (USE_MOCK || !supabase) {
    ensureSeed()
    const list = readList(COUPONS_KEY).map((c) => (c.code === code ? { ...c, active } : c))
    writeList(COUPONS_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'coupon_status_toggled',
      targetTable: 'coupons',
      targetId: code,
      details: { active },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  try {
    const { error } = await supabase.from('coupons').update({ active }).eq('code', code)
    if (error) throw error
  } catch (err) {
    console.warn('[toggleCouponActive] Fallback ke storage lokal:', err.message)
    const list = readList(COUPONS_KEY).map((c) => (c.code === code ? { ...c, active } : c))
    writeList(COUPONS_KEY, list)
  }

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'coupon_status_toggled',
    targetTable: 'coupons',
    targetId: code,
    details: { active },
  })

  notify(DATA_EVENT)
  return { success: true }
}

export async function deleteCoupon(code) {
  const actor = getActiveUser()

  if (USE_MOCK || !supabase) {
    ensureSeed()
    const list = readList(COUPONS_KEY).filter((c) => c.code !== code)
    writeList(COUPONS_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'coupon_deleted',
      targetTable: 'coupons',
      targetId: code,
      details: {},
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  try {
    const { error } = await supabase.from('coupons').delete().eq('code', code)
    if (error) throw error
  } catch (err) {
    console.warn('[deleteCoupon] Fallback ke storage lokal:', err.message)
    const list = readList(COUPONS_KEY).filter((c) => c.code !== code)
    writeList(COUPONS_KEY, list)
  }

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'coupon_deleted',
    targetTable: 'coupons',
    targetId: code,
    details: {},
  })

  notify(DATA_EVENT)
  return { success: true }
}
