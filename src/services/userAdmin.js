import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, notify } from './storage.js'
import { logAuditAction } from './audit.js'
import { getActiveUser, seedInternalUsers } from './auth.js'
import { DATA_EVENT } from '../hooks/useData.js'

export const PROFILES_KEY = 'wismaku_internal_profiles'

export async function getAllUsers() {
  if (USE_MOCK || !supabase) {
    let list = readList(PROFILES_KEY)
    if (list.length === 0) {
      writeList(PROFILES_KEY, seedInternalUsers)
      list = seedInternalUsers
    }
    return list
  }

  let remoteUsers = []
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, provider, role, joined_at')
      .order('joined_at', { ascending: false })
    if (error) throw error
    remoteUsers = data ?? []
  } catch (err) {
    console.warn('[getAllUsers] Fallback ke profiles lokal:', err.message)
  }

  let localUsers = readList(PROFILES_KEY)
  if (localUsers.length === 0) {
    localUsers = seedInternalUsers
    writeList(PROFILES_KEY, localUsers)
  }

  const combined = [...remoteUsers]
  for (const local of localUsers) {
    const existing = combined.find(
      (r) => r.id === local.id || r.email?.toLowerCase() === local.email?.toLowerCase(),
    )
    if (!existing) {
      combined.push(local)
    } else if (local.role && local.role !== existing.role) {
      existing.role = local.role
    }
  }

  return combined
}

export async function updateUserRole(userId, newRole) {
  const actor = getActiveUser()
  if (!['member', 'mitra', 'staff', 'superadmin'].includes(newRole)) {
    throw new Error(`Role "${newRole}" tidak valid.`)
  }

  if (USE_MOCK || !supabase) {
    const list = readList(PROFILES_KEY).map((u) => {
      if (u.id === userId) {
        return { ...u, role: newRole }
      }
      return u
    })
    writeList(PROFILES_KEY, list)
    await logAuditAction({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'user_role_changed',
      targetTable: 'profiles',
      targetId: userId,
      details: { newRole },
    })
    notify(DATA_EVENT)
    return { success: true }
  }

  let userEmail = 'user'
  let oldRole = 'unknown'

  try {
    const { data: user } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', userId)
      .maybeSingle()

    if (user) {
      userEmail = user.email
      oldRole = user.role
    }

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) throw error
  } catch (err) {
    console.warn('[updateUserRole] Fallback ke storage lokal:', err.message)
    let list = readList(PROFILES_KEY)
    if (list.length === 0) list = [...seedInternalUsers]
    list = list.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    writeList(PROFILES_KEY, list)
  }

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'user_role_changed',
    targetTable: 'profiles',
    targetId: userId,
    details: { email: userEmail, oldRole, newRole },
  })

  notify(DATA_EVENT)
  return { success: true }
}
