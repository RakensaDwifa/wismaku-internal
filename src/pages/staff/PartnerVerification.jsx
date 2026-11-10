import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getPartnerLeads, approvePartnerLead, rejectPartnerLead } from '../../services/partnerLead.js'
import Badge from '../../components/Badge.jsx'
import Modal from '../../components/Modal.jsx'
import FormField from '../../components/FormField.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageLoader from '../../components/PageLoader.jsx'

export default function PartnerVerification() {
  const { data: leads, refresh } = useData(() => getPartnerLeads(), [])
  const [filter, setFilter] = useState('all')
  const [selectedLead, setSelectedLead] = useState(null)
  const [rejectingLead, setRejectingLead] = useState(null)
  const [commissionRate, setCommissionRate] = useState('0.15')
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!leads) return <PageLoader />

  const filtered = leads.filter((l) => (filter === 'all' ? true : l.status === filter))

  const handleApprove = async (e) => {
    e.preventDefault()
    if (!selectedLead) return
    setBusy(true)
    setError('')
    try {
      await approvePartnerLead(selectedLead, { commissionRate: parseFloat(commissionRate) || 0.15 })
      setSelectedLead(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!rejectingLead) return
    setBusy(true)
    try {
      await rejectPartnerLead(rejectingLead, rejectReason)
      setRejectingLead(null)
      setRejectReason('')
      await refresh()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Verifikasi Calon Mitra Penginapan
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Tinjau pendaftaran calon mitra dari portal konsumen. Saat disetujui, properti otomatis tayang di
          katalog dan akun pemilik dapat login ke wismaku-admin.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {['all', 'pending', 'approved', 'rejected'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              filter === st
                ? 'bg-teal-700 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st === 'all'
              ? `Semua Pendaftar (${leads.length})`
              : st === 'pending'
                ? `Menunggu (${leads.filter((l) => l.status === 'pending').length})`
                : st === 'approved'
                  ? 'Disetujui'
                  : 'Ditolak'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada data pendaftaran"
          description="Semua pengajuan telah ditindaklanjuti atau ubah filter status Anda."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Nama Properti & Kota</th>
                <th className="px-5 py-3">Nama Pemilik</th>
                <th className="px-5 py-3">Email Mitra</th>
                <th className="px-5 py-3">Legalitas (KYC)</th>
                <th className="px-5 py-3">Tanggal Daftar</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{lead.propertyName}</div>
                    <div className="text-xs text-slate-500">{lead.city}</div>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{lead.ownerName}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{lead.email}</td>
                  <td className="px-5 py-3.5">
                    {lead.kycStatus === 'approved' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        Terverifikasi
                      </span>
                    ) : lead.kycStatus === 'pending' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Tinjau Berkas
                      </span>
                    ) : lead.kycStatus === 'rejected' ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 border border-red-200">
                        Ditolak
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 italic">Belum unggah</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {lead.submittedAt
                      ? new Date(lead.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge status={lead.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {lead.status === 'pending' || lead.kycStatus === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLead(lead)
                            setCommissionRate('0.15')
                            setError('')
                          }}
                          className="btn btn-sm btn-primary"
                        >
                          Tinjau & Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingLead(lead)
                            setRejectReason('')
                          }}
                          className="btn btn-sm btn-outline text-red-600 hover:text-red-700"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        {lead.status === 'approved' ? 'Telah Aktif' : 'Ditolak'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Approve Mitra & Review KYC */}
      <Modal
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        title="Tinjau Berkas KYC & Persetujuan Kemitraan"
      >
        {selectedLead && (
          <form onSubmit={handleApprove} className="space-y-4">
            <div className="rounded-lg bg-teal-50 p-3.5 text-xs text-teal-800">
              Menyetujui pendaftaran ini akan mengonfirmasi keabsahan legalitas pengelola, mengaktifkan hotel
              di katalog publik, dan memberikan akses extranet penuh ke <em>wismaku-admin</em>.
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                Data Identitas Penginapan
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <strong>Properti:</strong> {selectedLead.propertyName}
                </div>
                <div>
                  <strong>Kota:</strong> {selectedLead.city}
                </div>
                <div>
                  <strong>Pemilik:</strong> {selectedLead.ownerName}
                </div>
                <div>
                  <strong>Email:</strong> {selectedLead.email}
                </div>
              </div>
            </div>

            {/* Berkas KYC */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-800">Dokumen Kepatuhan & Legalitas (KYC)</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedLead.kycStatus === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : selectedLead.kycStatus === 'pending'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  Status: {selectedLead.kycStatus}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-slate-100 bg-slate-50/70 p-2.5">
                  <span className="text-slate-400 font-medium">Nomor NIK / KTP:</span>
                  <p className="font-mono font-bold text-slate-800">{selectedLead.idCardNumber || '—'}</p>
                  {selectedLead.idCardUrl ? (
                    <a
                      href={selectedLead.idCardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 underline"
                    >
                      Buka Berkas KTP ↗
                    </a>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic mt-1">Belum ada berkas KTP</p>
                  )}
                </div>

                <div className="rounded border border-slate-100 bg-slate-50/70 p-2.5">
                  <span className="text-slate-400 font-medium">Nomor NIB / NPWP:</span>
                  <p className="font-mono font-bold text-slate-800">{selectedLead.nibOrNpwp || '—'}</p>
                  {selectedLead.businessDocUrl ? (
                    <a
                      href={selectedLead.businessDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 underline"
                    >
                      Buka Berkas NIB/NPWP ↗
                    </a>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic mt-1">Belum ada berkas NIB/NPWP</p>
                  )}
                </div>
              </div>
            </div>

            <FormField
              label="Tarif Komisi Platform (WismaKu Revenue Share)"
              hint="Standar platform 15% (0.15). Sisa 85% menjadi hak bersih mitra."
            >
              <select
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-teal-700"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              >
                <option value="0.10">10% - Spesial Promo Mitra Perdana</option>
                <option value="0.15">15% - Tarif Standar Platform WismaKu</option>
                <option value="0.20">20% - Tarif Premium Terkelola</option>
              </select>
            </FormField>

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="btn btn-sm btn-outline"
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary bg-teal-700 hover:bg-teal-800"
                disabled={busy}
              >
                {busy ? 'Mengonfirmasi...' : 'Setujui & Publikasikan'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Tolak dengan Catatan Revisi */}
      <Modal
        isOpen={Boolean(rejectingLead)}
        onClose={() => setRejectingLead(null)}
        title="Tolak Pendaftaran / Kembalikan Berkas Mitra"
      >
        {rejectingLead && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleReject()
            }}
            className="space-y-4"
          >
            <p className="text-xs text-slate-600">
              Pendaftaran properti <strong>{rejectingLead.propertyName}</strong> ({rejectingLead.email}) akan
              ditandai ditolak. Anda dapat memberikan catatan revisi agar mitra dapat memperbaiki dokumen.
            </p>

            <FormField
              label="Alasan Penolakan / Catatan Revisi untuk Mitra"
              hint="Catatan ini akan tampil di portal extranet mitra pada halaman profil legalitas mereka."
            >
              <textarea
                required
                rows={3}
                placeholder="misal: Foto KTP buram dan nomor NIB tidak terdaftar di OSS. Mohon unggah dokumen scan yang lebih jelas."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-red-600 focus:outline-none"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingLead(null)}
                className="btn btn-sm btn-outline"
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn btn-sm btn-primary bg-red-600 hover:bg-red-700 border-red-600"
              >
                {busy ? 'Memproses...' : 'Tolak & Kirim Catatan'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
