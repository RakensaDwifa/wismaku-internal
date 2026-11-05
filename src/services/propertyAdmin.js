import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, notify } from './storage.js'
import { logAuditAction } from './audit.js'
import { getActiveUser } from './auth.js'
import { DATA_EVENT } from '../hooks/useData.js'

export const PROPERTIES_KEY = 'wismaku_internal_properties'

export const seedProperties = [
  {
    id: '1',
    name: 'Wisma Asri Cikini',
    city: 'Jakarta',
    area: 'Menteng',
    partnerEmail: 'mitra@wismaku.com',
    commissionRate: 0.15,
    status: 'aktif',
    rating: 4.8,
    reviewCount: 124,
    roomCount: 4,
  },
  {
    id: '2',
    name: 'Hotel Sabang Heritage',
    city: 'Bandung',
    area: 'Dago',
    partnerEmail: 'mitra@wismaku.com',
    commissionRate: 0.15,
    status: 'aktif',
    rating: 4.7,
    reviewCount: 98,
    roomCount: 3,
  },
  {
    id: '3',
    name: 'Wisma Surya Malioboro',
    city: 'Yogyakarta',
    area: 'Malioboro',
    partnerEmail: 'mitra@wismaku.com',
    commissionRate: 0.15,
    status: 'aktif',
    rating: 4.9,
    reviewCount: 215,
    roomCount: 5,
  },
]

export async function getAllProperties() {
  if (USE_MOCK || !supabase) {
    let list = readList(PROPERTIES_KEY)
    if (list.length === 0) {
      writeList(PROPERTIES_KEY, seedProperties)
      list = seedProperties
    }
    return list
  }

  const { data, error } = await supabase
    .from('hotels')
    .select('*, cities(name)')
    .order('id', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.cities?.name || row.city_id,
    area: row.area || '',
    partnerEmail: row.partner_email || '—',
    commissionRate: Number(row.commission_rate ?? 0.15),
    status: row.policies?.status || 'aktif',
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    roomCount: (row.room_types ?? []).length,
    policies: row.policies || {},
  }))
}

export async function setPropertyStatus(propertyId, status) {
  const actor = getActiveUser()

  if (USE_MOCK || !supabase) {
    const list = readList(PROPERTIES_KEY).map((p) => (p.id === propertyId ? { ...p, status } : p))
    writeList(PROPERTIES_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'property_status_updated',
      targetTable: 'hotels',
      targetId: propertyId,
      details: { newStatus: status },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  const { data: prop, error: fetchErr } = await supabase
    .from('hotels')
    .select('policies, name')
    .eq('id', String(propertyId))
    .single()

  if (fetchErr) throw new Error(fetchErr.message)

  const updatedPolicies = { ...(prop.policies || {}), status }
  const { error } = await supabase
    .from('hotels')
    .update({ policies: updatedPolicies })
    .eq('id', String(propertyId))

  if (error) throw new Error(error.message)

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'property_status_updated',
    targetTable: 'hotels',
    targetId: propertyId,
    details: { propertyName: prop.name, oldStatus: prop.policies?.status, newStatus: status },
  })

  notify(DATA_EVENT)
  return { success: true }
}

export async function updateCommissionRate(propertyId, rate) {
  const actor = getActiveUser()
  const numRate = Number(rate)
  if (isNaN(numRate) || numRate < 0.05 || numRate > 0.5) {
    throw new Error('Komisi harus berupa desimal antara 0.05 (5%) dan 0.50 (50%).')
  }

  if (USE_MOCK || !supabase) {
    const list = readList(PROPERTIES_KEY).map((p) =>
      p.id === propertyId ? { ...p, commissionRate: numRate } : p,
    )
    writeList(PROPERTIES_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'property_commission_updated',
      targetTable: 'hotels',
      targetId: propertyId,
      details: { newCommissionRate: numRate },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  const { error } = await supabase
    .from('hotels')
    .update({ commission_rate: numRate })
    .eq('id', String(propertyId))

  if (error) throw new Error(error.message)

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'property_commission_updated',
    targetTable: 'hotels',
    targetId: propertyId,
    details: { commissionRate: numRate },
  })

  notify(DATA_EVENT)
  return { success: true }
}
