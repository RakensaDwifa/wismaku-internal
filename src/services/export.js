export function formatCSVRow(cells) {
  return cells
    .map((c) => {
      const str = c === null || c === undefined ? '' : String(c)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    .join(',')
}

export function generateBookingsCSV(bookings) {
  const headers = [
    'ID Booking',
    'Tanggal Transaksi',
    'Nama Tamu',
    'Email Tamu',
    'No HP Tamu',
    'Nama Hotel',
    'Tipe Kamar',
    'Kamar',
    'Malam',
    'Check-In',
    'Check-Out',
    'Total Transaksi (Rp)',
    'Komisi WismaKu 15% (Rp)',
    'Hak Bersih Mitra 85% (Rp)',
    'Status',
    'Metode Bayar',
    'ID Kunci Payout',
  ]

  const rows = (bookings || []).map((b) => [
    b.id,
    b.created_at ? new Date(b.created_at).toISOString().slice(0, 10) : '',
    b.guest_name || b.guestName || '',
    b.email || '',
    b.phone || '',
    b.hotel_name || b.propertyName || '',
    b.room_type_name || b.roomTypeName || 'Standar',
    b.rooms || 1,
    b.nights || 1,
    b.check_in || b.checkIn || '',
    b.check_out || b.checkOut || '',
    Number(b.total_price ?? b.totalPrice ?? 0),
    Number(b.platform_fee ?? b.platformFee ?? Math.round(Number(b.total_price || 0) * 0.15)),
    Number(b.partner_net ?? b.partnerNet ?? Math.round(Number(b.total_price || 0) * 0.85)),
    b.status,
    b.payment_method || b.paymentMethod || 'Online Gateway',
    b.payout_id || 'Belum Terkunci',
  ])

  return [formatCSVRow(headers), ...rows.map(formatCSVRow)].join('\r\n')
}

export function generatePayoutsCSV(payouts) {
  const headers = [
    'ID Pencairan',
    'Email Mitra',
    'Periode Awal',
    'Periode Akhir',
    'Nominal Bersih (Rp)',
    'Status',
    'Nomor Bukti Transfer Bank',
    'Waktu Transfer',
    'Waktu Diajukan',
  ]

  const rows = (payouts || []).map((p) => [
    p.id,
    p.partner_email || '',
    p.period_start || '',
    p.period_end || '',
    Number(p.amount || 0),
    p.status,
    p.transfer_ref || 'Belum Ditransfer',
    p.paid_at || '',
    p.created_at || '',
  ])

  return [formatCSVRow(headers), ...rows.map(formatCSVRow)].join('\r\n')
}

export function downloadCSV(filename, content) {
  if (typeof window === 'undefined') return
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
