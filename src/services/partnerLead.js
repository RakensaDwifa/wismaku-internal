import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, notify } from './storage.js'
import { logAuditAction } from './audit.js'
import { getActiveUser } from './auth.js'
import { DATA_EVENT } from '../hooks/useData.js'

export const PARTNERS_KEY = 'wismaku_internal_partner_leads'

export const seedPartnerLeads = [
  {
    id: 'lead-1',
    owner_name: 'Hendra Gunawan',
    property_name: 'Wisma Asri Cikini',
    city: 'Jakarta',
    email: 'hendra.cikini@example.com',
    status: 'pending',
    submitted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'lead-2',
    owner_name: 'Siti Rahmawati',
    property_name: 'Villa Sejuk Dago',
    city: 'Bandung',
    email: 'siti.dago@example.com',
    status: 'pending',
    submitted_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
]

export async function getPartnerLeads() {
  if (USE_MOCK || !supabase) {
    let list = readList(PARTNERS_KEY)
    if (list.length === 0) {
      writeList(PARTNERS_KEY, seedPartnerLeads)
      list = seedPartnerLeads
    }
    return list
  }

  const [{ data: leads, error }, { data: hotels }] = await Promise.all([
    supabase.from('partners').select('*').order('submitted_at', { ascending: false }),
    supabase.from('hotels').select('partner_email'),
  ])

  if (error) throw new Error(error.message)

  const activePartnerEmails = new Set((hotels ?? []).map((h) => h.partner_email?.toLowerCase()))

  return (leads ?? []).map((l) => ({
    id: l.id,
    userId: l.user_id,
    ownerName: l.owner_name,
    propertyName: l.property_name,
    city: l.city,
    email: l.email,
    submittedAt: l.submitted_at,
    status: l.status || (activePartnerEmails.has(l.email?.toLowerCase()) ? 'approved' : 'pending'),
  }))
}

export async function approvePartnerLead(lead, { commissionRate = 0.15 } = {}) {
  const actor = getActiveUser()
  const cleanEmail = lead.email.trim().toLowerCase()

  if (USE_MOCK || !supabase) {
    const list = readList(PARTNERS_KEY).map((item) =>
      item.id === lead.id ? { ...item, status: 'approved' } : item,
    )
    writeList(PARTNERS_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'partner_lead_approved',
      targetTable: 'partners',
      targetId: lead.id,
      details: { propertyName: lead.propertyName, email: cleanEmail, commissionRate },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  // 1. Buat hotel baru di katalog
  const cleanSlug = lead.propertyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const hotelId = String(Date.now())

  const { error: hotelErr } = await supabase.from('hotels').insert({
    id: hotelId,
    name: lead.propertyName,
    slug: `${cleanSlug}-${hotelId.slice(-4)}`,
    city_id: (lead.city || 'jakarta').toLowerCase().trim(),
    address: `${lead.propertyName}, ${lead.city}`,
    description: `Akomodasi nyaman dan strategis persembahan ${lead.propertyName}.`,
    partner_email: cleanEmail,
    commission_rate: Number(commissionRate) || 0.15,
    policies: { status: 'aktif' },
    room_types: [],
    rating: 0,
    review_count: 0,
  })

  if (hotelErr) throw new Error(`Gagal membuat properti: ${hotelErr.message}`)

  // 2. Naikkan role pengguna di profiles jika profil sudah ada
  await supabase
    .from('profiles')
    .update({ role: 'mitra' })
    .eq('email', cleanEmail)
    .catch(() => {})

  // 3. Catat status di tabel partners jika kolom status didukung
  await supabase
    .from('partners')
    .update({ status: 'approved' })
    .eq('id', lead.id)
    .catch(() => {})

  // 4. Catat Audit Log
  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'partner_lead_approved',
    targetTable: 'partners',
    targetId: lead.id,
    details: { hotelId, propertyName: lead.propertyName, partnerEmail: cleanEmail, commissionRate },
  })

  notify(DATA_EVENT)
  return { success: true, hotelId }
}

export async function rejectPartnerLead(lead, reason = '') {
  const actor = getActiveUser()

  if (USE_MOCK || !supabase) {
    const list = readList(PARTNERS_KEY).map((item) =>
      item.id === lead.id ? { ...item, status: 'rejected', rejectReason: reason } : item,
    )
    writeList(PARTNERS_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'partner_lead_rejected',
      targetTable: 'partners',
      targetId: lead.id,
      details: { email: lead.email, reason },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  await supabase
    .from('partners')
    .update({ status: 'rejected' })
    .eq('id', lead.id)
    .catch(() => {})

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'partner_lead_rejected',
    targetTable: 'partners',
    targetId: lead.id,
    details: { email: lead.email, reason },
  })

  notify(DATA_EVENT)
  return { success: true }
}
