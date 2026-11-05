import { Link } from 'react-router-dom'
import { useData } from '../../hooks/useData.js'
import { getPlatformMetrics } from '../../services/metrics.js'
import { getPartnerLeads } from '../../services/partnerLead.js'
import { getAllBookings } from '../../services/bookingAdmin.js'
import StatCard from '../../components/StatCard.jsx'
import Badge from '../../components/Badge.jsx'
import PageLoader from '../../components/PageLoader.jsx'

export default function Dashboard() {
  const { data: metrics } = useData(() => getPlatformMetrics(), [])
  const { data: leads } = useData(() => getPartnerLeads(), [])
  const { data: bookings } = useData(() => getAllBookings(), [])

  if (!metrics || !leads || !bookings) return <PageLoader />

  const pendingLeads = leads.filter((l) => l.status === 'pending')
  const recentBookings = bookings.slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Ringkasan Operasional WismaKu HQ
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitoring terpusat aktivitas katalog, transaksi pemesanan tamu, dan pendaftaran mitra penginapan.
        </p>
      </div>

      {/* Grid Metrik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total GMV Pemesanan"
          value={`Rp ${metrics.gmv.toLocaleString('id-ID')}`}
          hint="Gross omzet dari pesanan lunas"
          badge="Nasional"
        />
        <StatCard
          label="Pendapatan WismaKu (15%)"
          value={`Rp ${metrics.platformRevenue.toLocaleString('id-ID')}`}
          hint="Komisi platform bersih WismaKu"
          badge="15% Split"
        />
        <StatCard
          label="Properti Aktif"
          value={metrics.activeHotels}
          hint="Hotel dipasarkan di wismaku-demo"
        />
        <StatCard
          label="Pendaftar Mitra Baru"
          value={pendingLeads.length}
          hint="Menunggu peninjauan & survei"
          badge={pendingLeads.length > 0 ? 'Perlu Tindakan' : 'Clear'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Antrean Lead Mitra */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Pendaftaran Mitra Terbaru</h2>
            <Link to="/verifikasi-mitra" className="text-xs font-bold text-teal-700 hover:underline">
              Lihat Semua ({leads.length})
            </Link>
          </div>

          {leads.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada pendaftaran mitra baru.</p>
          ) : (
            <div className="space-y-3">
              {leads.slice(0, 4).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-800">{lead.propertyName}</div>
                    <div className="text-xs text-slate-500">
                      {lead.ownerName} • {lead.city} • <span className="font-mono">{lead.email}</span>
                    </div>
                  </div>
                  <Badge status={lead.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaksi Terbaru */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Pesanan Masuk Terbaru</h2>
            <Link to="/pesanan" className="text-xs font-bold text-teal-700 hover:underline">
              Audit Pesanan ({bookings.length})
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada transaksi pemesanan.</p>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-700">{b.id}</span>
                      <span className="text-xs font-semibold text-slate-700">{b.guest_name}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {b.hotel_name} • Rp {Number(b.total_price || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <Badge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
