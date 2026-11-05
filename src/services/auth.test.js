import { describe, it, expect, beforeEach } from 'vitest'
import { login, logout, getActiveUser, ensureSeed } from './auth.js'

beforeEach(() => {
  localStorage.clear()
  ensureSeed()
})

describe('Internal Auth Service', () => {
  it('berhasil login sebagai superadmin', async () => {
    const user = await login('admin@wismaku.com', 'password123')
    expect(user.role).toBe('superadmin')
    expect(getActiveUser()?.email).toBe('admin@wismaku.com')
  })

  it('berhasil login sebagai staff', async () => {
    const user = await login('staff@wismaku.com', 'password123')
    expect(user.role).toBe('staff')
    expect(getActiveUser()?.role).toBe('staff')
  })

  it('menolak login akun mitra atau member ke portal internal', async () => {
    await expect(login('mitra@wismaku.com', 'password123')).rejects.toThrow(/Akses ditolak/i)
    await expect(login('member@wismaku.com', 'password123')).rejects.toThrow(/Akses ditolak/i)
  })

  it('menolak password yang salah', async () => {
    await expect(login('admin@wismaku.com', 'salah123')).rejects.toThrow(/Email atau password salah/i)
  })

  it('membersihkan sesi saat logout', async () => {
    await login('admin@wismaku.com', 'password123')
    expect(getActiveUser()).not.toBeNull()
    await logout()
    expect(getActiveUser()).toBeNull()
  })
})
