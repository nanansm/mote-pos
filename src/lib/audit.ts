import { db } from './db'
import { auditLogs } from './db/schema'
import { newId } from './ids'

export type AuditAction =
  | 'price_override'
  | 'void'
  | 'refund'
  | 'discount_manual'
  | 'debt_pay'
  | 'shift_close_offline'
  | 'pin_failed'
  | 'cashier_login'
  | 'cashier_login_failed'
  | 'rate_limit_exceeded'
  | 'workspace_code_regenerated'

export type AuditOptions = {
  workspaceId: string
  outletId?: string | null
  shiftId?: string | null
  cashierId?: string | null
  userId?: string | null
  action: AuditAction
  entityType?: string | null
  entityId?: string | null
  oldValue?: unknown
  newValue?: unknown
  metadata?: unknown
}

export async function logAudit(opts: AuditOptions) {
  await db.insert(auditLogs).values({
    id: newId(),
    workspaceId: opts.workspaceId,
    outletId: opts.outletId ?? null,
    shiftId: opts.shiftId ?? null,
    cashierId: opts.cashierId ?? null,
    userId: opts.userId ?? null,
    action: opts.action,
    entityType: opts.entityType ?? null,
    entityId: opts.entityId ?? null,
    oldValue: (opts.oldValue ?? null) as never,
    newValue: (opts.newValue ?? null) as never,
    metadata: (opts.metadata ?? null) as never,
  })
}
