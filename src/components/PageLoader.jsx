export default function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700" />
        <span className="text-sm font-medium">Memuat data...</span>
      </div>
    </div>
  )
}
