const VARIANTS = {
  // Status hotel & akun
  aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  nonaktif: 'bg-slate-100 text-slate-700 border-slate-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-teal-50 text-teal-700 border-teal-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',

  // Status booking
  confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',

  // Status payout
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',

  // Roles
  superadmin: 'bg-purple-50 text-purple-700 border-purple-200',
  staff: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  mitra: 'bg-teal-50 text-teal-700 border-teal-200',
  member: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function Badge({ status, children }) {
  const cls = VARIANTS[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}
    >
      {children || status}
    </span>
  )
}
