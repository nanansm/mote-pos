export const DEFAULT_PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  qris: 'QRIS',
  transfer: 'Transfer',
  debt: 'Hutang',
  split: 'Split',
  deposit: 'Saldo Titipan',
}

export function getPaymentMethodLabel(
  code: string,
  customLabels?: Record<string, string>,
): string {
  if (!code) return ''
  const c = String(code).toLowerCase()
  return customLabels?.[c] ?? DEFAULT_PAYMENT_LABELS[c] ?? code
}
