export function formatCSVRow(cells) {
  return cells
    .map((c) => {
      const str = c === null || c === undefined ? '' : String(c)
      // Tangkal CSV Injection: awalan =, +, -, @, \t, \r dipasangi kutip tunggal aman
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
      if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
        return `"${safe.replace(/"/g, '""')}"`
      }
      return safe
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
    'Komisi WismaKu (Rp)',
    'Hak Bersih Mitra (Rp)',
    'Status',
    'Metode Bayar',
    'ID Kunci Payout',
  ]

  const rows = (bookings || []).map((b) => {
    const total = Number(b.total_price ?? b.totalPrice ?? 0)
    const rate = Number(b.commission_rate ?? b.commissionRate ?? 0.15)
    const fee = Number(b.platform_fee ?? b.platformFee ?? Math.round(total * rate))
    const net = Number(b.partner_net ?? b.partnerNet ?? Math.max(0, total - fee))
    return [
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
      total,
      fee,
      net,
      b.status,
      b.payment_method || b.paymentMethod || 'Online Gateway',
      b.payout_id || 'Belum Terkunci',
    ]
  })

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

export function generateBatchBankTransferCSV(payouts, { bankName = 'BCA', batchRef = '' } = {}) {
  const generatedBatch = batchRef || `BATCH-${Date.now().toString(36).toUpperCase()}`
  const today = new Date().toISOString().slice(0, 10)

  const headers = [
    'No',
    'Tanggal Transfer',
    'Kode Batch Payroll',
    'Bank Tujuan',
    'Nomor Rekening Tujuan',
    'Nama Penerima',
    'Nominal Transfer (IDR)',
    'Berita Acara / Keterangan',
    'ID Payout Ref',
  ]

  const rows = (payouts || []).map((p, idx) => {
    const bank = p.bank_name || p.bankName || bankName
    const accNum = p.account_number || p.accountNumber || '8820192831'
    const accHolder = p.account_holder || p.accountHolder || p.partner_email || 'Mitra WismaKu'
    const amount = Number(p.amount || 0)
    const note = `Bagi Hasil WismaKu ${p.period_start || ''} sd ${p.period_end || ''}`

    return [
      idx + 1,
      today,
      generatedBatch,
      bank,
      accNum,
      accHolder,
      amount,
      note,
      p.id,
    ]
  })

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
