import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, readObject, writeObject, notify } from './storage.js'
import { logAuditAction } from './audit.js'
import { getActiveUser } from './auth.js'
import { DATA_EVENT } from '../hooks/useData.js'
import { seedBookings } from './bookingAdmin.js'

export const PAYOUTS_KEY = 'wismaku_internal_payouts'
export const BOOKINGS_KEY = 'wismaku_internal_bookings'

export const seedPayouts = [
  {
    id: 'p-1',
    partner_email: 'mitra@wismaku.com',
    amount: 1275000,
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    status: 'paid',
    transfer_ref: 'TRF-BCA-98127391',
    paid_at: '2026-11-02T10:00:00Z',
    created_at: '2026-11-01T08:00:00Z',
  },
]

export function ensureSeed() {
  if (!USE_MOCK) return
  if (readList(PAYOUTS_KEY).length === 0) {
    writeList(PAYOUTS_KEY, seedPayouts)
  }
  if (readList(BOOKINGS_KEY).length === 0) {
    writeList(BOOKINGS_KEY, seedBookings)
  }
}

export async function getPayoutsList() {
  if (USE_MOCK || !supabase) {
    ensureSeed()
    return readList(PAYOUTS_KEY)
  }

  let remoteList = []
  try {
    const { data, error } = await supabase
      .from('partner_payouts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    remoteList = data ?? []
  } catch (err) {
    console.warn('[getPayoutsList] Fallback ke storage lokal:', err.message)
  }

  const localList = readList(PAYOUTS_KEY)
  const combined = [...remoteList]
  for (const item of localList) {
    if (!combined.some((r) => r.id === item.id)) {
      combined.push(item)
    }
  }
  return combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

export async function getUnpaidCompletedBookings() {
  if (USE_MOCK || !supabase) {
    ensureSeed()
    const allBookings = readList(BOOKINGS_KEY)
    const unpaid = allBookings.filter((b) => b.status === 'completed' && !b.payout_id)
    const grouped = new Map()

    for (const b of unpaid) {
      const email = 'mitra@wismaku.com'
      if (!grouped.has(email)) {
        grouped.set(email, { partnerEmail: email, totalNet: 0, count: 0, bookingIds: [] })
      }
      const item = grouped.get(email)
      item.totalNet += Number(
        Number(b.partner_net) > 0 ? b.partner_net : Math.round(Number(b.total_price || 0) * 0.85),
      )
      item.count += 1
      item.bookingIds.push(b.id)
    }
    return Array.from(grouped.values())
  }

  // Live Supabase
  let bookings
  let hotels
  try {
    const [{ data: bData, error: bErr }, { data: hData, error: hErr }] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, hotel_id, status, partner_net, total_price, payout_id, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('hotels').select('id, partner_email'),
    ])

    if (bErr) throw bErr
    if (hErr) throw hErr
    bookings = bData ?? []
    hotels = hData ?? []
  } catch (err) {
    console.warn('[getUnpaidCompletedBookings] Fallback ke storage lokal:', err.message)
    const allBookings = readList(BOOKINGS_KEY)
    const unpaid = allBookings.filter((b) => b.status === 'completed' && !b.payout_id)
    const grouped = new Map()
    for (const b of unpaid) {
      const email = 'mitra@wismaku.com'
      if (!grouped.has(email)) {
        grouped.set(email, { partnerEmail: email, totalNet: 0, count: 0, bookingIds: [] })
      }
      const item = grouped.get(email)
      item.totalNet += Number(
        Number(b.partner_net) > 0 ? b.partner_net : Math.round(Number(b.total_price || 0) * 0.85),
      )
      item.count += 1
      item.bookingIds.push(b.id)
    }
    return Array.from(grouped.values())
  }

  const localOverrides = readObject('wismaku_internal_booking_overrides') || {}
  const ownerByHotel = new Map((hotels ?? []).map((h) => [String(h.id), h.partner_email?.toLowerCase()]))
  const grouped = new Map()

  for (const rawB of bookings) {
    const override = localOverrides[rawB.id] || {}
    const b = { ...rawB, ...override }
    if (b.status !== 'completed' || b.payout_id) continue

    const ownerEmail = ownerByHotel.get(String(b.hotel_id)) || 'mitra@wismaku.com'
    if (!grouped.has(ownerEmail)) {
      grouped.set(ownerEmail, { partnerEmail: ownerEmail, totalNet: 0, count: 0, bookingIds: [] })
    }
    const item = grouped.get(ownerEmail)
    const net = Number(
      Number(b.partner_net) > 0 ? b.partner_net : Math.round(Number(b.total_price || 0) * 0.85),
    )
    item.totalNet += net
    item.count += 1
    item.bookingIds.push(b.id)
  }

  return Array.from(grouped.values())
}

export async function createOnDemandPayout({ partnerEmail, periodStart, periodEnd }) {
  const actor = getActiveUser()
  const cleanEmail = String(partnerEmail).trim().toLowerCase()

  if (USE_MOCK || !supabase) {
    ensureSeed()
    const allBookings = readList(BOOKINGS_KEY)
    const eligible = allBookings.filter((b) => b.status === 'completed' && !b.payout_id)
    if (eligible.length === 0) {
      throw new Error(`Tidak ada pesanan selesai yang dapat dicairkan untuk ${cleanEmail}.`)
    }
    const amount = eligible.reduce(
      (sum, b) =>
        sum +
        Number(Number(b.partner_net) > 0 ? b.partner_net : Math.round(Number(b.total_price || 0) * 0.85)),
      0,
    )
    const payoutId = `PAY-${Date.now().toString(36).toUpperCase()}`
    const payout = {
      id: payoutId,
      partner_email: cleanEmail,
      amount,
      period_start: periodStart || new Date(Date.now() - 3600000 * 24 * 30).toISOString().slice(0, 10),
      period_end: periodEnd || new Date().toISOString().slice(0, 10),
      status: 'pending',
      transfer_ref: null,
      paid_at: null,
      created_at: new Date().toISOString(),
    }

    const updatedBookings = allBookings.map((b) =>
      eligible.some((e) => e.id === b.id) ? { ...b, payout_id: payoutId } : b,
    )
    writeList(BOOKINGS_KEY, updatedBookings)

    const payouts = readList(PAYOUTS_KEY)
    payouts.unshift(payout)
    writeList(PAYOUTS_KEY, payouts)

    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout_created',
      targetTable: 'partner_payouts',
      targetId: payoutId,
      details: { partnerEmail: cleanEmail, amount, lockedBookingCount: eligible.length },
    })

    notify(DATA_EVENT)
    return payout
  }

  // Live Supabase flow with local resilience
  const unpaidGroups = await getUnpaidCompletedBookings()
  const matched = unpaidGroups.find((g) => g.partnerEmail.toLowerCase() === cleanEmail)
  if (!matched || matched.bookingIds.length === 0) {
    throw new Error(`Tidak ada reservasi selesai yang siap dicairkan untuk ${cleanEmail}.`)
  }

  const amount = matched.totalNet
  const bookingIds = matched.bookingIds
  const payoutId = `PAY-${Date.now().toString(36).toUpperCase()}`
  let payout = {
    id: payoutId,
    partner_email: cleanEmail,
    amount,
    period_start: periodStart || new Date(Date.now() - 3600000 * 24 * 30).toISOString().slice(0, 10),
    period_end: periodEnd || new Date().toISOString().slice(0, 10),
    status: 'pending',
    transfer_ref: null,
    paid_at: null,
    created_at: new Date().toISOString(),
  }

  try {
    const { data: dbPayout, error: pErr } = await supabase
      .from('partner_payouts')
      .insert({
        partner_email: cleanEmail,
        amount,
        period_start: payout.period_start,
        period_end: payout.period_end,
        status: 'pending',
      })
      .select()
      .single()

    if (!pErr && dbPayout) {
      payout = dbPayout
      await supabase.from('bookings').update({ payout_id: payout.id }).in('id', bookingIds)
    } else {
      throw pErr
    }
  } catch (err) {
    console.warn('[createOnDemandPayout] Fallback ke storage lokal:', err?.message)
    const localPayouts = readList(PAYOUTS_KEY)
    localPayouts.unshift(payout)
    writeList(PAYOUTS_KEY, localPayouts)

    const overrides = readObject('wismaku_internal_booking_overrides') || {}
    for (const bId of bookingIds) {
      overrides[bId] = { ...(overrides[bId] || {}), payout_id: payout.id }
    }
    writeObject('wismaku_internal_booking_overrides', overrides)
  }

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'payout_created',
    targetTable: 'partner_payouts',
    targetId: payout.id,
    details: {
      partnerEmail: cleanEmail,
      amount,
      lockedBookingCount: bookingIds.length,
      bookingIds,
    },
  })

  notify(DATA_EVENT)
  return payout
}

export async function markPayoutAsPaid(payoutId, { transferRef }) {
  const actor = getActiveUser()
  const cleanRef = (transferRef || '').trim()
  if (!cleanRef) {
    throw new Error('Nomor referensi bukti transfer bank wajib diisi.')
  }

  if (USE_MOCK || !supabase) {
    ensureSeed()
    const list = readList(PAYOUTS_KEY).map((p) =>
      p.id === payoutId
        ? {
            ...p,
            status: 'paid',
            transfer_ref: cleanRef,
            paid_at: new Date().toISOString(),
          }
        : p,
    )
    writeList(PAYOUTS_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout_marked_paid',
      targetTable: 'partner_payouts',
      targetId: payoutId,
      details: { transferRef: cleanRef },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  try {
    const { error } = await supabase
      .from('partner_payouts')
      .update({
        status: 'paid',
        transfer_ref: cleanRef,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payoutId)

    if (error) throw error
  } catch (err) {
    console.warn('[markPayoutAsPaid] Fallback ke storage lokal:', err.message)
    const list = readList(PAYOUTS_KEY).map((p) =>
      p.id === payoutId
        ? {
            ...p,
            status: 'paid',
            transfer_ref: cleanRef,
            paid_at: new Date().toISOString(),
          }
        : p,
    )
    writeList(PAYOUTS_KEY, list)
  }

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'payout_marked_paid',
    targetTable: 'partner_payouts',
    targetId: payoutId,
    details: { transferRef: cleanRef },
  })

  notify(DATA_EVENT)
  return { success: true }
}
