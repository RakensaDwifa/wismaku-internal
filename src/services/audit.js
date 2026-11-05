import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, notify } from './storage.js'

export const AUDIT_LOGS_KEY = 'wismaku_internal_audit_logs'
export const AUDIT_EVENT = 'wismaku-internal:audit-changed'

export async function logAuditAction({ actorId, actorRole, action, targetTable, targetId, details = {} }) {
  if (USE_MOCK || !supabase) {
    const list = readList(AUDIT_LOGS_KEY)
    const log = {
      id: `LOG-${Date.now().toString(36).toUpperCase()}`,
      actor_id: actorId || 'sys',
      actor_role: actorRole || 'system',
      action,
      target_table: targetTable,
      target_id: String(targetId ?? ''),
      details,
      created_at: new Date().toISOString(),
    }
    list.unshift(log)
    writeList(AUDIT_LOGS_KEY, list)
    notify(AUDIT_EVENT)
    return log
  }

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: actorId || null,
        actor_role: actorRole,
        action,
        target_table: targetTable,
        target_id: targetId ? String(targetId) : null,
        details,
      })
      .select()
      .maybeSingle()

    if (error) {
      console.warn('[AuditLogger] Gagal merekam audit log:', error.message)
    }
    notify(AUDIT_EVENT)
    return data
  } catch (err) {
    console.warn('[AuditLogger] Pengecualian audit log:', err.message)
    return null
  }
}

export async function getAuditLogs({ limit = 100 } = {}) {
  if (USE_MOCK || !supabase) {
    const list = readList(AUDIT_LOGS_KEY)
    return list.slice(0, limit)
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}
