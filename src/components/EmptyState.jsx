export default function EmptyState({ title = 'Tidak ada data', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-slate-100 text-xl font-bold text-slate-400">
        ∅
      </div>
      <h3 className="mt-3 text-sm font-bold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
