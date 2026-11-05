import { describe, it, expect, beforeEach } from 'vitest'
import { getAllUsers, updateUserRole } from './userAdmin.js'
import { ensureSeed } from './auth.js'

beforeEach(() => {
  localStorage.clear()
  ensureSeed()
})

describe('User Admin Service', () => {
  it('mengambil daftar semua akun pengguna', async () => {
    const users = await getAllUsers()
    expect(users.length).toBeGreaterThanOrEqual(4)
    expect(users.some((u) => u.role === 'superadmin')).toBe(true)
  })

  it('mengubah role pengguna dengan valid', async () => {
    const users = await getAllUsers()
    const member = users.find((u) => u.role === 'member')
    expect(member).toBeDefined()

    await updateUserRole(member.id, 'mitra')
    const updatedUsers = await getAllUsers()
    const updated = updatedUsers.find((u) => u.id === member.id)
    expect(updated.role).toBe('mitra')
  })

  it('menolak role yang tidak dikenal', async () => {
    const users = await getAllUsers()
    await expect(updateUserRole(users[0].id, 'hacker')).rejects.toThrow(/tidak valid/i)
  })
})
