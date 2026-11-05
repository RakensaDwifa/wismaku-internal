import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'

export async function getPlatformMetrics() {
  if (USE_MOCK || !supabase) {
    return {
      gmv: 48500000,
      platformRevenue: 7275000,
      payoutPending: 2450000,
      totalBookings: 32,
      activeHotels: 6,
      pendingLeads: 2,
      totalUsers: 14,
    }
  }

  try {
    const [
      { data: bookings },
      { count: hotelCount },
      { data: payouts },
      { data: leads },
      { count: profileCount },
    ] = await Promise.all([
      supabase.from('bookings').select('total_price, platform_fee, status, payout_id'),
      supabase.from('hotels').select('*', { count: 'exact', head: true }),
      supabase.from('partner_payouts').select('amount, status'),
      supabase.from('partners').select('id, email'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    const paidBookings = (bookings ?? []).filter((b) => b.status === 'confirmed' || b.status === 'completed')
    const gmv = paidBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)
    const platformRevenue = paidBookings.reduce(
      (sum, b) => sum + Number(b.platform_fee || Math.round(Number(b.total_price || 0) * 0.15)),
      0,
    )

    const pendingPayouts = (payouts ?? [])
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)

    return {
      gmv,
      platformRevenue,
      payoutPending: pendingPayouts,
      totalBookings: (bookings ?? []).length,
      activeHotels: hotelCount ?? 0,
      pendingLeads: (leads ?? []).length,
      totalUsers: profileCount ?? 0,
    }
  } catch (err) {
    console.warn('[getPlatformMetrics] Fallback default metrics:', err.message)
    return {
      gmv: 0,
      platformRevenue: 0,
      payoutPending: 0,
      totalBookings: 0,
      activeHotels: 0,
      pendingLeads: 0,
      totalUsers: 0,
    }
  }
}
