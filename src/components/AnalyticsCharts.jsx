export default function AnalyticsCharts({ bookings = [], metrics = {} }) {
  // 1. Status aggregation
  const statusCounts = bookings.reduce((acc, b) => {
    const st = b.status || 'pending'
    acc[st] = (acc[st] || 0) + 1
    return acc
  }, {})

  const totalOrders = bookings.length || 1
  const completedCount = statusCounts.completed || 0
  const confirmedCount = statusCounts.confirmed || 0
  const pendingCount = statusCounts.pending || 0
  const cancelledCount = statusCounts.cancelled || 0

  // 2. Payment Method aggregation
  const paymentCounts = bookings.reduce((acc, b) => {
    const rawMethod = (b.payment_method || '').toLowerCase()
    let group = 'Lainnya / Manual'
    if (rawMethod.includes('qris') || rawMethod.includes('gopay')) group = 'QRIS / E-Wallet'
    else if (
      rawMethod.includes('bank') ||
      rawMethod.includes('va') ||
      rawMethod.includes('transfer') ||
      rawMethod.includes('bca') ||
      rawMethod.includes('bni') ||
      rawMethod.includes('bri') ||
      rawMethod.includes('mandiri')
    ) {
      group = 'Virtual Account / Bank'
    } else if (rawMethod.includes('card') || rawMethod.includes('kredit')) {
      group = 'Kartu Kredit / Debit'
    } else if (!rawMethod) {
      group = 'Online Gateway'
    }
    acc[group] = (acc[group] || 0) + 1
    return acc
  }, {})

  // 3. Financial breakdown
  const gmv =
    metrics.gmv ||
    bookings
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0)
  const fee = metrics.platformRevenue || Math.round(gmv * 0.15)
  const partnerNet = Math.max(0, gmv - fee)

  const maxVal = Math.max(gmv, 1)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Visualisasi Keuangan & Pembagian Hasil */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-extrabold text-slate-900">Performa Transaksi & Komisi Platform</h2>
          <p className="text-xs text-slate-500">
            Kalkulasi pembagian hasil otomatis 15% platform fee WismaKu dan 85% hak bersih mitra.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Gross Merchandise Value (GMV)</span>
              <span className="font-bold text-slate-900">Rp {gmv.toLocaleString('id-ID')}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Hak Bersih Mitra (85%)</span>
              <span className="font-bold text-emerald-700">Rp {partnerNet.toLocaleString('id-ID')}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.round((partnerNet / maxVal) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Komisi Platform WismaKu (15%)</span>
              <span className="font-bold text-indigo-700">Rp {fee.toLocaleString('id-ID')}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${Math.round((fee / maxVal) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
          <div>
            <div className="text-[11px] text-slate-500">Total Transaksi</div>
            <div className="mt-0.5 text-sm font-bold text-slate-800">{bookings.length} Pesanan</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Margin Platform</div>
            <div className="mt-0.5 text-sm font-bold text-indigo-700">15.0%</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Alokasi Mitra</div>
            <div className="mt-0.5 text-sm font-bold text-emerald-700">85.0%</div>
          </div>
        </div>
      </div>

      {/* Distribusi Status Transaksi & Pembayaran */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Distribusi Status Pesanan & Pembayaran
            </h2>
            <p className="text-xs text-slate-500">
              Rasio penyelesaian reservasi tamu dan preferensi kanal metode bayar konsumen.
            </p>
          </div>

          {/* Bar Segment Status */}
          <div className="mb-4">
            <div className="text-xs font-bold text-slate-700 mb-2">Rasio Status Pesanan</div>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                title={`Selesai: ${completedCount}`}
                className="bg-emerald-500 transition-all"
                style={{ width: `${(completedCount / totalOrders) * 100}%` }}
              />
              <div
                title={`Dikonfirmasi: ${confirmedCount}`}
                className="bg-teal-600 transition-all"
                style={{ width: `${(confirmedCount / totalOrders) * 100}%` }}
              />
              <div
                title={`Pending: ${pendingCount}`}
                className="bg-amber-400 transition-all"
                style={{ width: `${(pendingCount / totalOrders) * 100}%` }}
              />
              <div
                title={`Dibatalkan: ${cancelledCount}`}
                className="bg-red-400 transition-all"
                style={{ width: `${(cancelledCount / totalOrders) * 100}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]">
              <div>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />
                <span className="font-semibold text-slate-700">Selesai ({completedCount})</span>
              </div>
              <div>
                <span className="inline-block h-2 w-2 rounded-full bg-teal-600 mr-1" />
                <span className="font-semibold text-slate-700">Aktif ({confirmedCount})</span>
              </div>
              <div>
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1" />
                <span className="font-semibold text-slate-700">Draft ({pendingCount})</span>
              </div>
              <div>
                <span className="inline-block h-2 w-2 rounded-full bg-red-400 mr-1" />
                <span className="font-semibold text-slate-700">Batal ({cancelledCount})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="border-t border-slate-100 pt-4">
          <div className="text-xs font-bold text-slate-700 mb-2">Metode Pembayaran Tamu</div>
          <div className="space-y-1.5">
            {Object.entries(paymentCounts).map(([method, count]) => {
              const pct = Math.round((count / totalOrders) * 100)
              return (
                <div key={method} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{method}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-700 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-bold text-slate-800 w-8 text-right">{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
