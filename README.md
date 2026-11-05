# WismaKu Internal (HQ Backoffice Portal)

Portal internal terisolasi untuk staf operasional, customer support, dan super admin platform WismaKu. Beroperasi berdampingan dengan portal konsumen (`wismaku-demo`) dan portal mitra (`wismaku-admin`) pada infrastruktur Supabase bersama.

---

## Arsitektur Tiga Portal WismaKu

| Portal               | Direktori          | URL / Port Default | Target Pengguna & Cakupan                                                                                                                      |
| -------------------- | ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **WismaKu B2C**      | `wismaku-demo`     | Port `5173`        | Tamu/konsumen: katalog hotel nasional, booking Midtrans, ulasan, membership.                                                                   |
| **WismaKu Admin**    | `wismaku-admin`    | Port `5174`        | Mitra penginapan: kelola kamar hotel sendiri, pesanan masuk, kupon diskon mitra.                                                               |
| **WismaKu Internal** | `wismaku-internal` | Port `5175`        | Internal HQ: verifikasi mitra baru, audit pesanan CS, moderasi ulasan, kupon nasional, pencairan bagi hasil (payout lock), dan manajemen RBAC. |

---

## Hak Akses & Pembagian Peran Internal

1. **Staff Operasional (`staff`)**:
   - Ringkasan platform (GMV, omzet komisi 15%, status katalog nasional).
   - Verifikasi & onboarding pengajuan mitra baru (mengangkat akun menjadi `mitra` dan membuat data hotel di katalog).
   - Katalog properti nasional (aktivasi, nonaktif, pembekuan/suspend hotel).
   - Audit transaksi pesanan tamu (penyelesaian booking atau pembatalan via CS).
   - Moderasi ulasan tamu (penghapusan spam/konten melanggar).

2. **Super Admin HQ (`superadmin`)**:
   - Seluruh modul staf di atas.
   - **Pencairan Bagi Hasil (On-Demand Payout)**: Menghimpun pesanan completed, menghitung saldo hak bersih mitra (85%), dan **mengunci ID pesanan dengan `payout_id`** agar tidak dapat dicairkan ganda. Konfirmasi status lunas dengan nomor referensi transfer bank.
   - **Kupon Nasional**: Penerbitan voucher diskon subsidi platform untuk seluruh hotel.
   - **Manajemen Pengguna & RBAC**: Pengangkatan peran pengguna (`member`, `mitra`, `staff`, `superadmin`).
   - **Jejak Audit Keamanan (`audit_logs`)**: Pencatatan riwayat setiap aksi mutasi data sensitif.

---

## Akun Bootstrap Internal

Password default untuk seluruh akun bootstrap: `password123`.

- **Super Admin**: `admin@wismaku.com`
- **Staff Operasional**: `staff@wismaku.com`
- **Mitra Penginapan**: `mitra@wismaku.com`

---

## Menjalankan Secara Lokal

```bash
# 1. Masuk ke direktori
cd D:/web/projects/wismaku-internal

# 2. Instalasi dependensi
npm install --legacy-peer-deps

# 3. Jalankan unit test
npm test

# 4. Jalankan dev server (Port 5175)
npm run dev

# 5. Build production
npm run build
```

---

## Stack Teknologi

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS v4
- **Database & Auth**: `@supabase/supabase-js` dengan Row Level Security (RLS)
- **Routing**: React Router v7
- **Testing**: Vitest
