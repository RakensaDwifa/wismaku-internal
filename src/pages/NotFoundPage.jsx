import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="text-4xl font-black text-slate-300">404</div>
      <h2 className="mt-2 text-lg font-bold text-slate-800">Halaman Tidak Ditemukan</h2>
      <p className="mt-1 text-sm text-slate-500">
        Rute yang Anda tuju tidak tersedia di portal internal WismaKu.
      </p>
      <Link to="/dashboard" className="btn btn-primary mt-4">
        Kembali ke Dashboard
      </Link>
    </div>
  )
}
