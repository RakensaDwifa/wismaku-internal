import { useState } from 'react'
import { useData } from '../../hooks/useData.js'
import { getPartnerLeads, approvePartnerLead, rejectPartnerLead } from '../../services/partnerLead.js'
import Badge from '../../components/Badge.jsx'
import Modal from '../../components/Modal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
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
                    {lead.status === 'pending' ? (
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
                          Setujui Mitra
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingLead(lead)}
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

      {/* Modal Approve Mitra */}
      <Modal
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        title="Persetujuan & Onboarding Mitra"
      >
        {selectedLead && (
          <form onSubmit={handleApprove} className="space-y-4">
            <div className="rounded-lg bg-teal-50 p-3.5 text-xs text-teal-800">
              Menyetujui pendaftaran ini akan membuat entitas hotel di katalog, mengangkat peran profil
              pemilik menjadi <strong>Mitra</strong>, dan mengizinkan login ke <em>wismaku-admin</em>.
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div>
                <strong>Properti:</strong> {selectedLead.propertyName}
              </div>
              <div>
                <strong>Kota:</strong> {selectedLead.city}
              </div>
              <div>
                <strong>Email Pemilik:</strong> {selectedLead.email}
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
              <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
                {busy ? 'Mengonfirmasi...' : 'Setujui & Publikasikan'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Dialog Tolak */}
      <ConfirmDialog
        isOpen={Boolean(rejectingLead)}
        onClose={() => setRejectingLead(null)}
        onConfirm={handleReject}
        title="Tolak Pendaftaran Mitra"
        message={`Apakah Anda yakin ingin menolak pendaftaran properti "${rejectingLead?.propertyName}"?`}
        confirmText="Tolak Pendaftaran"
        danger
        busy={busy}
      />
    </div>
  )
}
