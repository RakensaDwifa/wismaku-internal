import { supabase } from '../lib/supabase.js'
import { USE_MOCK } from './api.js'

export async function uploadPayoutReceipt(file) {
  if (!file) throw new Error('File tidak ditemukan.')

  const maxBytes = 5 * 1024 * 1024 // 5MB
  if (file.size > maxBytes) {
    throw new Error('Ukuran file bukti transfer maksimal 5 MB.')
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!validTypes.includes(file.type)) {
    throw new Error('Format file harus berupa JPG, PNG, WEBP, atau PDF.')
  }

  if (USE_MOCK || !supabase) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ publicUrl: reader.result, path: file.name })
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const cleanName = `payout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const filePath = `transfers/${cleanName}`

  const { error: uploadError } = await supabase.storage
    .from('payout-receipts')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    throw new Error(`Gagal mengunggah bukti transfer: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from('payout-receipts').getPublicUrl(filePath)
  return { publicUrl: data.publicUrl, path: filePath }
}
