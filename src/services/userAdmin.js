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

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, provider, role, joined_at')
    .order('joined_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
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

  const { data: user, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)

  const { error: updateErr } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
  if (updateErr) throw new Error(updateErr.message)

  await logAuditAction({
    actorId: actor?.id,
    actorRole: actor?.role,
    action: 'user_role_changed',
    targetTable: 'profiles',
    targetId: userId,
    details: { email: user.email, oldRole: user.role, newRole },
  })

  notify(DATA_EVENT)
  return { success: true }
}
