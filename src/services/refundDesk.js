import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, notify } from './storage.js'
import { logAuditAction } from './audit.js'
import { getActiveUser } from './auth.js'
import { DATA_EVENT } from '../hooks/useData.js'

export const REFUNDS_KEY = 'wismaku_internal_refunds'

export const seedRefunds = [
  {
    id: 'ref-seed-1',
    booking_id: 'BK-1001',
    hotel_id: '1',
    guest_name: 'Ahmad Faisal',
    email: 'ahmad@gmail.com',
    amount: 900000,
    reason: 'Pembatalan darurat agenda dinas kantor',
    bank_name: 'BCA',
    account_number: '1234567890',
    account_holder: 'Ahmad Faisal',
    status: 'pending',
    hq_notes: null,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    reviewed_at: null,
  },
]

export async function getRefundRequests({ status, search } = {}) {
  let list
  if (USE_MOCK || !supabase) {
    list = readList(REFUNDS_KEY)
    if (list.length === 0) {
      writeList(REFUNDS_KEY, seedRefunds)
      list = seedRefunds
    }
  } else {
    let query = supabase.from('refund_requests').select('*').order('created_at', { ascending: false })
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    const { data, error } = await query
    if (error) throw new Error(error.message)
    list = data ?? []
  }

  let mapped = list.map((r) => ({
    id: r.id,
    bookingId: r.booking_id,
    hotelId: r.hotel_id,
    guestName: r.guest_name,
    email: r.email,
    amount: Number(r.amount || 0),
    reason: r.reason,
    bankName: r.bank_name,
    accountNumber: r.account_number,
    accountHolder: r.account_holder,
    status: r.status,
    hqNotes: r.hq_notes,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  }))

  if (status && status !== 'all') {
    mapped = mapped.filter((r) => r.status === status)
  }

  if (search) {
    const q = search.toLowerCase().trim()
    mapped = mapped.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.bookingId.toLowerCase().includes(q) ||
        r.guestName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    )
  }

  return mapped
}

export async function approveRefundRequest(refundId, { hqNotes = 'Disetujui oleh Tim Refund Desk HQ' } = {}) {
  const actor = getActiveUser()
  const reviewedAt = new Date().toISOString()

  if (USE_MOCK || !supabase) {
    const list = readList(REFUNDS_KEY)
    const target = list.find((r) => r.id === refundId)
    if (!target) throw new Error('Pengajuan refund tidak ditemukan.')
    target.status = 'approved'
    target.hq_notes = hqNotes
    target.reviewed_at = reviewedAt
    writeList(REFUNDS_KEY, list)

    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'refund_approved',
      targetTable: 'refund_requests',
      targetId: refundId,
      details: { bookingId: target.booking_id, amount: target.amount, hqNotes },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  // 1. Ambil record refund
  const { data: refund, error: fetchErr } = await supabase
    .from('refund_requests')
    .select('*')
    .eq('id', refundId)
    .single()
  if (fetchErr || !refund) throw new Error(fetchErr?.message || 'Pengajuan refund tidak ditemukan.')

  // 2. Setujui refund
  const { error: updateErr } = await supabase
    .from('refund_requests')
    .update({ status: 'approved', hq_notes: hqNotes, reviewed_at: reviewedAt })
    .eq('id', refundId)
  if (updateErr) throw new Error(updateErr.message)

  // 3. Batalkan booking terkait agar inventori kamar kembali tersedia
  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', refund.booking_id)
    .catch(() => {})

  // 4. Catat audit log
  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'refund_approved',
    targetTable: 'refund_requests',
    targetId: refundId,
    details: { bookingId: refund.booking_id, amount: refund.amount, hqNotes },
  })

  notify(DATA_EVENT)
  return { success: true }
}

export async function rejectRefundRequest(refundId, { hqNotes = 'Ditolak: Kebijakan non-refundable' } = {}) {
  const actor = getActiveUser()
  const reviewedAt = new Date().toISOString()

  if (USE_MOCK || !supabase) {
    const list = readList(REFUNDS_KEY)
    const target = list.find((r) => r.id === refundId)
    if (!target) throw new Error('Pengajuan refund tidak ditemukan.')
    target.status = 'rejected'
    target.hq_notes = hqNotes
    target.reviewed_at = reviewedAt
    writeList(REFUNDS_KEY, list)

    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'refund_rejected',
      targetTable: 'refund_requests',
      targetId: refundId,
      details: { bookingId: target.booking_id, hqNotes },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  const { error } = await supabase
    .from('refund_requests')
    .update({ status: 'rejected', hq_notes: hqNotes, reviewed_at: reviewedAt })
    .eq('id', refundId)

  if (error) throw new Error(error.message)

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'refund_rejected',
    targetTable: 'refund_requests',
    targetId: refundId,
    details: { hqNotes },
  })

  notify(DATA_EVENT)
  return { success: true }
}
