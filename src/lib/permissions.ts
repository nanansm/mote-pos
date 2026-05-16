import type { AuthContext } from './auth-context'

export const CASHIER_ACTIONS = new Set<string>([
  'transaction:create',
  'transaction:hold',
  'transaction:resume',
  'transaction:read',
  'customer:read',
  'customer:create',
  'customer:update',
  'debt:read',
  'debt:create',
  'debt:pay',
  'deposit:read',
  'deposit:create',
  'deposit:use',
  'pickup:read',
  'pickup:confirm',
  'shift:open',
  'shift:close',
  'product:read',
  'category:read',
  'modifier:read',
  'payment_method:read',
  'report:read',
  'outlet:update_printer',
  'settings:read_outlet',
])

export const OWNER_ACTIONS = new Set<string>([
  'product:create',
  'product:update',
  'product:delete',
  'category:create',
  'category:update',
  'category:delete',
  'modifier:create',
  'modifier:update',
  'modifier:delete',
  'payment_method:create',
  'payment_method:update',
  'payment_method:delete',
  'workspace:update',
  'workspace:delete',
  'settings:integrasi',
  'settings:struk',
  'settings:akun',
  'settings:profil_toko',
  'audit:read',
  'cashier:create',
  'cashier:update',
  'cashier:delete',
  'outlet:update',
])

export const MANAGER_PIN_ACTIONS = new Set<string>([
  'transaction:refund',
  'transaction:void',
  'transaction:price_override',
  'deposit:refund',
  'customer:delete',
  'debt:delete',
])

export function can(ctx: AuthContext | null, action: string): boolean {
  if (!ctx) return false
  if (ctx.type === 'user') return true
  return CASHIER_ACTIONS.has(action)
}

export function requiresManagerPin(action: string): boolean {
  return MANAGER_PIN_ACTIONS.has(action)
}

export function isOwnerOnly(action: string): boolean {
  return OWNER_ACTIONS.has(action) && !CASHIER_ACTIONS.has(action)
}
