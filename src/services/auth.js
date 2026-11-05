import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'
import { readList, writeList, readObject, writeObject, notify } from './storage.js'

export const USERS_KEY = 'wismaku_internal_users'
export const ACTIVE_KEY = 'wismaku_internal_active'
export const SESSION_EVENT = 'wismaku-internal:session-changed'

export const seedInternalUsers = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Super Admin WismaKu',
    email: 'admin@wismaku.com',
    password: 'password123',
    role: 'superadmin',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Staff Operasional',
    email: 'staff@wismaku.com',
    password: 'password123',
    role: 'staff',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Mitra WismaKu',
    email: 'mitra@wismaku.com',
    password: 'password123',
    role: 'mitra',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    name: 'Budi Konsumen',
    email: 'member@wismaku.com',
    password: 'password123',
    role: 'member',
  },
]

export function ensureSeed() {
  if (!USE_MOCK) return
  if (readList(USERS_KEY).length === 0) {
    writeList(USERS_KEY, seedInternalUsers)
  }
}

export async function login(email, password) {
  const clean = (email || '').trim().toLowerCase()
  if (!clean || !password) {
    throw new Error('Email dan password wajib diisi.')
  }

  if (USE_MOCK || !supabase) {
    ensureSeed()
    const user = readList(USERS_KEY).find((u) => u.email.toLowerCase() === clean)
    if (!user || user.password !== password) {
      throw new Error('Email atau password salah.')
    }
    if (!['staff', 'superadmin'].includes(user.role)) {
      throw new Error('Akses ditolak. Portal ini khusus untuk Staff Operasional dan Super Admin HQ.')
    }
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      loggedInAt: new Date().toISOString(),
    }
    writeObject(ACTIVE_KEY, sessionUser)
    notify(SESSION_EVENT)
    return sessionUser
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: clean, password })
  if (error) {
    throw new Error('Email atau password salah.')
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileErr || !profile) {
    await supabase.auth.signOut().catch(() => {})
    throw new Error('Data profil pengguna tidak ditemukan.')
  }

  if (!['staff', 'superadmin'].includes(profile.role)) {
    await supabase.auth.signOut().catch(() => {})
    throw new Error('Akses ditolak. Portal ini khusus untuk Staff Operasional dan Super Admin HQ.')
  }

  const user = {
    id: profile.id,
    name: profile.name || data.user.email?.split('@')[0],
    email: profile.email || data.user.email,
    role: profile.role,
    loggedInAt: new Date().toISOString(),
  }

  writeObject(ACTIVE_KEY, user)
  notify(SESSION_EVENT)
  return user
}

export function getActiveUser() {
  return readObject(ACTIVE_KEY)
}

export async function logout() {
  if (supabase) {
    await supabase.auth.signOut().catch(() => {})
  }
  writeObject(ACTIVE_KEY, null)
  notify(SESSION_EVENT)
  return null
}
