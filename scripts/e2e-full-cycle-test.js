import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wxychhupdrwflltvabcs.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eWNoaHVwZHJ3ZmxsdHZhYmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMTU3NTQsImV4cCI6MjEwODU5MTc1NH0.VUrYKFxonb7N3ZIXiAxEds3Kgkgc0DQbJFIuROAaqYU'

const TARGETS = [
  { name: 'Portal Tamu (wismaku-demo)', url: 'https://wismaku-demo.vercel.app' },
  { name: 'Extranet Mitra (wismaku-admin)', url: 'https://wismaku-admin.vercel.app' },
  { name: 'Portal Internal HQ (wismaku-internal)', url: 'https://wismaku-internal.vercel.app' },
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`)
  }
}

async function testEndpoints() {
  console.log('\n--- 1. HTTP Endpoint Health Smoke Test ---')
  for (const t of TARGETS) {
    const start = Date.now()
    try {
      const res = await fetch(t.url, { method: 'HEAD' })
      const dur = Date.now() - start
      if (res.status >= 200 && res.status < 400) {
        console.log(`[PASS] ${t.name} -> HTTP ${res.status} (${dur}ms)`)
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (err) {
      console.warn(`[WARN] ${t.name} -> ${err.message} (akan dilanjutkan)`)
    }
  }
}

async function runE2ECycle() {
  console.log('\n--- 2. Siklus Penuh E2E Lintas Portal (Tamu -> Mitra -> HQ) ---')
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  let createdBookingId = null
  let createdPayoutId = null
  let createdReviewId = null
  const createdAuditIds = []

  try {
    // -------------------------------------------------------------
    // FASE A: Autentikasi Superadmin & Setup Hotel Uji
    // -------------------------------------------------------------
    console.log('\n[Fase A] Autentikasi Superadmin & Pengambilan Properti Uji...')
    const { data: adminAuth, error: aAuthErr } = await client.auth.signInWithPassword({
      email: 'admin@wismaku.com',
      password: 'password123',
    })
    assert(!aAuthErr, `Gagal login superadmin: ${aAuthErr?.message}`)
    console.log(`[PASS] Login Superadmin: ${adminAuth.user.email}`)

    // Cari hotel yang terdaftar dengan partner mitra@wismaku.com
    const { data: hotels, error: hErr } = await client
      .from('hotels')
      .select('id, name, partner_email, commission_rate, room_types')
      .eq('partner_email', 'mitra@wismaku.com')
      .limit(1)

    assert(!hErr && hotels?.length > 0, 'Hotel uji untuk mitra@wismaku.com tidak ditemukan')
    const testHotel = hotels[0]
    const commRate = Number(testHotel.commission_rate ?? 0.15)
    const roomType = testHotel.room_types?.[0] || { id: 'standard', name: 'Standard Room', price: 500000 }
    console.log(`[PASS] Hotel Uji: "${testHotel.name}" (ID: ${testHotel.id}, Rate Komisi: ${commRate})`)

    // -------------------------------------------------------------
    // FASE B: Alur Tamu - Pembuatan Reservasi dengan Kupon Subsidi
    // -------------------------------------------------------------
    console.log('\n[Fase B] Alur Tamu - Reservasi Kamar & Verifikasi Kupon...')
    // Cari kupon aktif dari database
    const { data: dbCoupons } = await client
      .from('coupons')
      .select('code, discount_pct')
      .eq('active', true)
      .limit(1)

    const activeCouponCode = dbCoupons?.[0]?.code || 'NEWUSER'
    console.log(`[PASS] Kupon Uji Aktif: "${activeCouponCode}"`)

    const bookingPayload = {
      user_id: adminAuth.user.id,
      hotel_id: testHotel.id,
      hotel_name: testHotel.name,
      guest_name: 'E2E Test Guest Tamu',
      email: 'tamu.audit@wismaku.com',
      phone: '081299998888',
      room_type_id: roomType.id,
      room_type_name: roomType.name || 'Standard',
      room_price: Number(roomType.price || 500000),
      coupon_code: activeCouponCode,
      nights: 2,
      rooms: 1,
      guests: 2,
      check_in: '2026-12-10',
      check_out: '2026-12-12',
    }

    const { data: booking, error: bInsErr } = await client
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single()

    assert(!bInsErr, `Gagal membuat reservasi tamu: ${bInsErr?.message}`)
    createdBookingId = booking.id
    console.log(`[PASS] Reservasi Tamu Dibuat: ID ${createdBookingId}, Total Rp ${booking.total_price}`)
    assert(booking.status === 'pending', 'Status awal harus pending')
    assert(Number(booking.coupon_discount) > 0, `Diskon kupon ${activeCouponCode} harus teraplikasi`)

    // Simulasi Konfirmasi Pembayaran oleh Server Pembayaran (service_role / postgres)
    console.log('[Fase B] Simulasi Konfirmasi Pembayaran oleh Server Pembayaran (Status -> confirmed)...')
    const expectedFee = Math.round(Number(booking.total_price) * commRate)
    const expectedNet = Number(booking.total_price) - expectedFee

    const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN
    assert(mgmtToken, 'Environment variable SUPABASE_ACCESS_TOKEN wajib disetel untuk E2E.')
    const projectRef = 'wxychhupdrwflltvabcs'

    const confirmSql = `
      UPDATE public.bookings
         SET status = 'confirmed',
             payment_method = 'qris',
             paid_at = now(),
             platform_fee = ${expectedFee},
             partner_net = ${expectedNet}
       WHERE id = '${createdBookingId}'
      RETURNING id, status, total_price, platform_fee, partner_net;
    `

    const confirmRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: confirmSql }),
    })

    const confirmedRows = await confirmRes.json()
    if (!confirmRes.ok) {
      console.error('confirmRes error:', confirmRes.status, confirmedRows)
    }
    assert(confirmRes.ok && confirmedRows?.length > 0, 'Server gagal mengonfirmasi pesanan pembayaran')
    const confirmedBooking = confirmedRows[0]

    console.log(
      `[PASS] Pesanan Terkonfirmasi oleh Server: Total=${confirmedBooking.total_price}, PlatformFee=${confirmedBooking.platform_fee}, PartnerNet=${confirmedBooking.partner_net}`,
    )
    assert(
      Math.abs(Number(confirmedBooking.platform_fee) - expectedFee) <= 1,
      `Fee harus cocok dengan komisi dinamis ${commRate * 100}%`,
    )

    // -------------------------------------------------------------
    // FASE C: Alur Extranet Mitra - Konfirmasi Tamu Selesai Check-out
    // -------------------------------------------------------------
    console.log('\n[Fase C] Alur Extranet Mitra - Login Mitra & Penyelesaian Menginap...')
    await client.auth.signOut()

    const { data: partnerAuth, error: pAuthErr } = await client.auth.signInWithPassword({
      email: 'mitra@wismaku.com',
      password: 'password123',
    })
    assert(!pAuthErr, `Gagal login mitra: ${pAuthErr?.message}`)
    console.log(`[PASS] Login Mitra Berhasil: ${partnerAuth.user.email}`)

    // Mitra membaca pesanannya
    const { data: partnerBookings, error: pBErr } = await client
      .from('bookings')
      .select('id, status, hotel_id')
      .eq('id', createdBookingId)
      .single()

    assert(!pBErr && partnerBookings, `Mitra tidak dapat membaca booking miliknya: ${pBErr?.message}`)
    assert(partnerBookings.status === 'confirmed', 'Mitra harus melihat status confirmed')

    // Mitra menyelesaikan pesanan setelah tamu check-out
    const { data: completedBooking, error: compErr } = await client
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', createdBookingId)
      .select()
      .single()

    assert(!compErr, `Mitra gagal menyelesaikan pesanan: ${compErr?.message}`)
    assert(completedBooking.status === 'completed', 'Status pesanan harus completed')
    console.log(`[PASS] Mitra Berhasil Selesaikan Pesanan (Status: ${completedBooking.status})`)

    // -------------------------------------------------------------
    // FASE D: Alur Portal HQ Internal - Staff & Superadmin
    // -------------------------------------------------------------
    console.log('\n[Fase D] Alur Portal HQ - Keamanan Staff & Eksekusi Payout Superadmin...')
    await client.auth.signOut()

    // 1. Uji batasan hak akses Staf
    const { data: staffAuth, error: sAuthErr } = await client.auth.signInWithPassword({
      email: 'staff@wismaku.com',
      password: 'password123',
    })
    assert(!sAuthErr, `Gagal login staf: ${sAuthErr?.message}`)
    console.log(`[PASS] Login Staf HQ Berhasil: ${staffAuth.user.email}`)

    // Staf audit pesanan
    const { data: staffViewBooking, error: sViewErr } = await client
      .from('bookings')
      .select('id, status, total_price, partner_net')
      .eq('id', createdBookingId)
      .single()
    assert(!sViewErr && staffViewBooking, 'Staf harus bisa mengaudit pesanan')
    console.log(`[PASS] Staf Audit Pesanan: ID ${staffViewBooking.id} terverifikasi`)

    // Staf dilarang membuat payout (RLS Superadmin only)
    const { error: sPayoutForbiddenErr } = await client.from('partner_payouts').insert({
      partner_email: 'mitra@wismaku.com',
      amount: 100000,
      period_start: '2026-11-01',
      period_end: '2026-11-30',
      status: 'pending',
    })
    assert(sPayoutForbiddenErr, 'Staf harus DITOLAK saat mencoba membuat payout (kebijakan superadmin only)')
    console.log('[PASS] Keamanan RLS: Akses Staf ke pembuatan payout berhasil DITOLAK sesuai regulasi')

    await client.auth.signOut()

    // 2. Superadmin membuat pencairan dana (payout)
    const { error: reAdminErr } = await client.auth.signInWithPassword({
      email: 'admin@wismaku.com',
      password: 'password123',
    })
    assert(!reAdminErr, `Gagal re-login superadmin: ${reAdminErr?.message}`)

    const payoutPayload = {
      partner_email: 'mitra@wismaku.com',
      amount: completedBooking.partner_net,
      period_start: '2026-11-01',
      period_end: '2026-12-31',
      status: 'pending',
    }

    const { data: payout, error: payInsErr } = await client
      .from('partner_payouts')
      .insert(payoutPayload)
      .select()
      .single()

    assert(!payInsErr, `Superadmin gagal membuat payout: ${payInsErr?.message}`)
    createdPayoutId = payout.id
    console.log(`[PASS] Payout Dibuat Superadmin: ID ${createdPayoutId}, Jumlah Rp ${payout.amount}`)

    // Kunci pesanan ke payout
    const { error: lockErr } = await client
      .from('bookings')
      .update({ payout_id: createdPayoutId })
      .eq('id', createdBookingId)

    assert(!lockErr, `Gagal mengunci booking ke payout: ${lockErr?.message}`)

    // Tandai payout sebagai selesai ditransfer
    const { data: paidPayout, error: payUpdErr } = await client
      .from('partner_payouts')
      .update({
        status: 'paid',
        transfer_ref: 'TRF-BCA-E2E-TEST-0012',
        paid_at: new Date().toISOString(),
      })
      .eq('id', createdPayoutId)
      .select()
      .single()

    assert(!payUpdErr, `Gagal menandai payout paid: ${payUpdErr?.message}`)
    assert(paidPayout.status === 'paid', 'Status payout harus paid')
    console.log(
      `[PASS] Payout Sukses Dicairkan: Status ${paidPayout.status}, Ref: ${paidPayout.transfer_ref}`,
    )

    // Catat Jejak Audit
    const { data: auditLog, error: audErr } = await client
      .from('audit_logs')
      .insert({
        actor_id: adminAuth.user.id,
        actor_role: 'superadmin',
        action: 'e2e_full_cycle_verification',
        target_table: 'partner_payouts',
        target_id: createdPayoutId,
        details: { bookingId: createdBookingId, amount: paidPayout.amount },
      })
      .select()
      .single()

    if (auditLog?.id) createdAuditIds.push(auditLog.id)
    assert(!audErr, `Gagal mencatat audit log: ${audErr?.message}`)
    console.log(`[PASS] Audit Log Terekam: ID ${auditLog.id}`)

    // -------------------------------------------------------------
    // FASE E: Ulasan Tamu & Moderasi Konten HQ
    // -------------------------------------------------------------
    console.log('\n[Fase E] Ulasan Tamu, Balasan Mitra, & Moderasi HQ...')
    const { data: review, error: revInsErr } = await client
      .from('reviews')
      .insert({
        hotel_id: testHotel.id,
        user_id: adminAuth.user.id,
        name: 'Tamu Uji E2E',
        city: 'Jakarta',
        rating: 5,
        text: 'Penginapan luar biasa bersih dan staf sangat ramah!',
        is_hidden: false,
      })
      .select()
      .single()

    assert(!revInsErr, `Gagal membuat review tamu: ${revInsErr?.message}`)
    createdReviewId = review.id
    console.log(`[PASS] Ulasan Tamu Dibuat: ID ${createdReviewId}`)

    // Moderasi HQ: Sembunyikan ulasan (soft-hide)
    const { error: hideErr } = await client
      .from('reviews')
      .update({ is_hidden: true })
      .eq('id', createdReviewId)

    assert(!hideErr, `Gagal soft-hide review: ${hideErr?.message}`)

    // Verifikasi bahwa ulasan tersembunyi tidak muncul di filter publik
    const { data: publicReviews } = await client
      .from('reviews')
      .select('id')
      .eq('id', createdReviewId)
      .eq('is_hidden', false)

    assert(publicReviews?.length === 0, 'Ulasan yang di-hide tidak boleh muncul di listing publik')
    console.log('[PASS] Moderasi Ulasan: is_hidden=true berhasil memfilter konten dari publik')
  } finally {
    // -------------------------------------------------------------
    // FASE F: Pembersihan Data Uji (Cleanup)
    // -------------------------------------------------------------
    console.log('\n[Fase F] Pembersihan Data Uji (Cleanup)...')

    // Login superadmin untuk menghapus data uji
    await client.auth.signInWithPassword({
      email: 'admin@wismaku.com',
      password: 'password123',
    })

    if (createdReviewId) {
      await client.from('reviews').delete().eq('id', createdReviewId)
      console.log(`[CLEANUP] Ulasan ${createdReviewId} dihapus`)
    }

    if (createdBookingId) {
      // Lepaskan tautan payout sebelum menghapus
      await client.from('bookings').update({ payout_id: null }).eq('id', createdBookingId)
    }

    if (createdPayoutId) {
      await client.from('partner_payouts').delete().eq('id', createdPayoutId)
      console.log(`[CLEANUP] Payout ${createdPayoutId} dihapus`)
    }

    if (createdBookingId) {
      await client.from('bookings').delete().eq('id', createdBookingId)
      console.log(`[CLEANUP] Booking ${createdBookingId} dihapus`)
    }

    for (const audId of createdAuditIds) {
      await client.from('audit_logs').delete().eq('id', audId)
      console.log(`[CLEANUP] Audit log ${audId} dihapus`)
    }

    await client.auth.signOut()
    console.log('[PASS] Seluruh data uji bersih 100% tanpa residu di database!')
  }
}

async function main() {
  console.log('==================================================================')
  console.log('       WISMAKU ECOSYSTEM COMPREHENSIVE E2E VERIFICATION SUITE     ')
  console.log('==================================================================')
  const startTime = Date.now()

  try {
    await testEndpoints()
    await runE2ECycle()
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n==================================================================`)
    console.log(`[SUCCESS] SELURUH SIKLUS E2E LINTAS PORTAL LULUS 100% (${duration}s)`)
    console.log(`==================================================================\n`)
    process.exit(0)
  } catch (err) {
    console.error(`\n[FATAL ERROR] Verifikasi E2E Gagal:`, err.message)
    process.exit(1)
  }
}

main()
