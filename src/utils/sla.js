/**
 * Utilitas Penghitung SLA Timer Operasional HQ
 * WismaKu Staff & Superadmin
 */

export function calculateSlaStatus(createdAt, slaHours = 24, reviewedAt = null) {
  if (!createdAt) {
    return { label: '—', tone: 'neutral', isOverdue: false, isUrgent: false }
  }

  const createdTime = new Date(createdAt).getTime()

  // Jika tiket telah diselesaikan / direview
  if (reviewedAt) {
    const reviewedTime = new Date(reviewedAt).getTime()
    const diffHours = Math.max(0, Math.round((reviewedTime - createdTime) / 3600000))
    const wasOverdue = diffHours > slaHours
    return {
      label: wasOverdue ? `Selesai (${diffHours}j - Overdue)` : `Selesai (${diffHours}j)`,
      tone: wasOverdue ? 'danger' : 'success',
      isOverdue: wasOverdue,
      isFinished: true,
    }
  }

  const deadline = createdTime + slaHours * 3600000
  const now = Date.now()
  const remainingMs = deadline - now

  if (remainingMs <= 0) {
    const overHours = Math.floor(Math.abs(remainingMs) / 3600000)
    const overMinutes = Math.floor((Math.abs(remainingMs) % 3600000) / 60000)
    return {
      label: overHours > 0 ? `Overdue (-${overHours}j ${overMinutes}m)` : `Overdue (-${overMinutes}m)`,
      tone: 'danger',
      isOverdue: true,
      isUrgent: true,
      isFinished: false,
    }
  }

  const remHours = Math.floor(remainingMs / 3600000)
  const remMinutes = Math.floor((remainingMs % 3600000) / 60000)
  const isUrgent = remHours < (slaHours <= 24 ? 6 : 12)

  return {
    label: `${remHours}j ${remMinutes}m`,
    tone: isUrgent ? 'warning' : 'info',
    isOverdue: false,
    isUrgent,
    isFinished: false,
  }
}
