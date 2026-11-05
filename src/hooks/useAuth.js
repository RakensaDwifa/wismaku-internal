import { useState, useEffect } from 'react'
import { getActiveUser, logout as authLogout, SESSION_EVENT } from '../services/auth.js'

export function useAuth() {
  const [user, setUser] = useState(() => getActiveUser())

  useEffect(() => {
    const handleSessionChange = () => {
      setUser(getActiveUser())
    }
    window.addEventListener(SESSION_EVENT, handleSessionChange)
    return () => window.removeEventListener(SESSION_EVENT, handleSessionChange)
  }, [])

  const logout = async () => {
    await authLogout()
    setUser(null)
  }

  return {
    user,
    isStaff: user?.role === 'staff',
    isSuperAdmin: user?.role === 'superadmin',
    logout,
  }
}
