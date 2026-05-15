export const formatRupiah = (value: number | string) => {
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

export const formatNumber = (value: number | string) => {
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('id-ID').format(n)
}
