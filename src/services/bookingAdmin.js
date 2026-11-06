import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, readObject, writeObject, notify } from './storage.js'
import { logAuditAction } from './audit.js'
import { getActiveUser } from './auth.js'
import { DATA_EVENT } from '../hooks/useData.js'

export const BOOKINGS_KEY = 'wismaku_internal_bookings'

export const seedBookings = [
  {
    id: 'BK-1001',
    hotel_id: '1',
    hotel_name: 'Wisma Asri Cikini',
    guest_name: 'Ahmad Faisal',
    email: 'ahmad@gmail.com',
    phone: '081234567890',
    check_in: '2026-11-10',
    check_out: '2026-11-12',
    rooms: 1,
    nights: 2,
    room_type_name: 'Deluxe King',
    total_price: 900000,
    platform_fee: 135000,
    partner_net: 765000,
    status: 'confirmed',
    payout_id: null,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'BK-1002',
    hotel_id: '2',
    hotel_name: 'Hotel Sabang Heritage',
    guest_name: 'Dewi Lestari',
    email: 'dewi@gmail.com',
    phone: '081298765432',
    check_in: '2026-11-01',
    check_out: '2026-11-03',
    rooms: 1,
    nights: 2,
    room_type_name: 'Heritage Suite',
    total_price: 1500000,
    platform_fee: 225000,
    partner_net: 1275000,
    status: 'completed',
    payout_id: null,
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
]

export async function getAllBookings({ status, search } = {}) {
  let list
  if (USE_MOCK || !supabase) {
    list = readList(BOOKINGS_KEY)
    if (list.length === 0) {
      writeList(BOOKINGS_KEY, seedBookings)
      list = seedBookings
    }
  } else {
    try {
      let query = supabase.from('bookings').select('*').order('created_at', { ascending: false })
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }
      const { data, error } = await query
      if (error) throw error

      const localOverrides = readObject('wismaku_internal_booking_overrides') || {}
      list = (data ?? []).map((b) => {
        const override = localOverrides[b.id] || {}
        const merged = { ...b, ...override }
        const totalPrice = Number(merged.total_price || 0)
        const platformFee = Number(
          Number(merged.platform_fee) > 0 ? merged.platform_fee : Math.round(totalPrice * 0.15),
        )
        const partnerNet = Number(
          Number(merged.partner_net) > 0 ? merged.partner_net : Math.max(0, totalPrice - platformFee),
        )
        return {
          ...merged,
          total_price: totalPrice,
          platform_fee: platformFee,
          partner_net: partnerNet,
        }
      })
    } catch (err) {
      console.warn('[getAllBookings] Fallback ke storage lokal:', err.message)
      list = readList(BOOKINGS_KEY)
      if (list.length === 0) {
        writeList(BOOKINGS_KEY, seedBookings)
        list = seedBookings
      }
    }
  }

  if (status && status !== 'all') {
    list = list.filter((b) => b.status === status)
  }
  if (search) {
    const q = search.toLowerCase()
    list = list.filter(
      (b) =>
        String(b.id).toLowerCase().includes(q) ||
        (b.guest_name || '').toLowerCase().includes(q) ||
        (b.hotel_name || '').toLowerCase().includes(q),
    )
  }
  return list
}

export async function cancelBookingByAdmin(id, reason = '') {
  const actor = getActiveUser()

  if (USE_MOCK || !supabase) {
    const list = readList(BOOKINGS_KEY).map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
    writeList(BOOKINGS_KEY, list)
  } else {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', String(id))
      if (error) throw error
    } catch (err) {
      console.warn('[cancelBookingByAdmin] Fallback ke storage lokal:', err.message)
      const overrides = readObject('wismaku_internal_booking_overrides') || {}
      overrides[id] = { ...(overrides[id] || {}), status: 'cancelled' }
      writeObject('wismaku_internal_booking_overrides', overrides)
    }
  }

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'booking_cancelled_by_admin',
    targetTable: 'bookings',
    targetId: id,
    details: { reason },
  })

  notify(DATA_EVENT)
  return { success: true }
}

export async function completeBookingByAdmin(id) {
  const actor = getActiveUser()

  if (USE_MOCK || !supabase) {
    const list = readList(BOOKINGS_KEY).map((b) => (b.id === id ? { ...b, status: 'completed' } : b))
    writeList(BOOKINGS_KEY, list)
  } else {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', String(id))
      if (error) throw error
    } catch (err) {
      console.warn('[completeBookingByAdmin] Fallback status override:', err.message)
      const overrides = readObject('wismaku_internal_booking_overrides') || {}
      overrides[id] = { ...(overrides[id] || {}), status: 'completed' }
      writeObject('wismaku_internal_booking_overrides', overrides)
    }
  }

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'booking_completed_by_admin',
    targetTable: 'bookings',
    targetId: id,
    details: { note: 'Check-out dikonfirmasi oleh HQ Backoffice' },
  })

  notify(DATA_EVENT)
  return { success: true }
}
