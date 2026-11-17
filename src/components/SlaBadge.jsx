import { calculateSlaStatus } from '../utils/sla.js'

export default function SlaBadge({ createdAt, slaHours = 24, reviewedAt = null }) {
  const sla = calculateSlaStatus(createdAt, slaHours, reviewedAt)

  const toneClasses = {
    danger: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
    warning: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
    info: 'bg-teal-50 text-teal-700 border-teal-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-slate-50 text-slate-500 border-slate-200',
  }

  const cls = toneClasses[sla.tone] || toneClasses.neutral

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
      title={`Target SLA: ${slaHours} Jam sejak diajukan`}
    >
      <span
        className={`size-1.5 rounded-full ${
          sla.tone === 'danger'
            ? 'bg-red-600'
            : sla.tone === 'warning'
              ? 'bg-amber-500'
              : sla.tone === 'info'
                ? 'bg-teal-600'
                : 'bg-emerald-600'
        }`}
      />
      {sla.label}
    </span>
  )
}
