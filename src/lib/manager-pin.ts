import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { db } from './db'
import { cashiers } from './db/schema'

export type ManagerCheck =
  | { ok: true; cashierId: string; cashierName: string }
  | { ok: false; reason: string }

export async function verifyManagerPin(
  workspaceId: string,
  pin: string,
): Promise<ManagerCheck> {
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false, reason: 'PIN harus 6 digit angka' }
  }
  const managers = await db
    .select({ id: cashiers.id, name: cashiers.name, pinHash: cashiers.pinHash })
    .from(cashiers)
    .where(
      and(
        eq(cashiers.workspaceId, workspaceId),
        eq(cashiers.role, 'manager'),
        eq(cashiers.isActive, true),
      ),
    )
  if (!managers.length) return { ok: false, reason: 'tidak ada manager aktif' }

  for (const m of managers) {
    if (await bcrypt.compare(pin, m.pinHash)) {
      return { ok: true, cashierId: m.id, cashierName: m.name }
    }
  }
  return { ok: false, reason: 'PIN manager salah' }
}
