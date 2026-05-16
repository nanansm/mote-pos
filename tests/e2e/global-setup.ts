import path from 'node:path'
import fs from 'node:fs'
import { config as loadEnv } from 'dotenv'
import { Client } from 'pg'
import bcrypt from 'bcryptjs'

// Load .env.local synchronously BEFORE we connect to Postgres.
loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true })

export type CashierFixture = {
  available: boolean
  reason?: string
  loginCode?: string
  workspaceId?: string
  workspaceName?: string
  cashierId?: string
  cashierName?: string
  outletId?: string
  pin?: string
}

const WS_CODE = 'WMBU-9BVC'
const FIXTURE_CASHIER_NAME = 'Handi Kasir Local'
const FIXTURE_PIN = '987654'

const fixturePath = path.resolve(process.cwd(), 'tests/e2e/.fixtures.json')

export default async function globalSetup() {
  let fixture: CashierFixture = { available: false, reason: 'unknown' }

  if (!process.env.DATABASE_URL) {
    fixture = { available: false, reason: 'DATABASE_URL not set' }
    fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2))
    return
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()

    const wsRes = await client.query(
      'select id, name from mote_pos.workspaces where login_code = $1 limit 1',
      [WS_CODE],
    )
    if (wsRes.rowCount === 0) {
      fixture = {
        available: false,
        reason: `workspace ${WS_CODE} not found in DB`,
      }
    } else {
      const ws = wsRes.rows[0] as { id: string; name: string }
      const cRes = await client.query(
        'select id, name, outlet_id from mote_pos.cashiers where workspace_id = $1 and name = $2 limit 1',
        [ws.id, FIXTURE_CASHIER_NAME],
      )
      if (cRes.rowCount === 0) {
        fixture = {
          available: false,
          reason: `cashier "${FIXTURE_CASHIER_NAME}" not found in workspace ${WS_CODE}`,
        }
      } else {
        const c = cRes.rows[0] as {
          id: string
          name: string
          outlet_id: string
        }
        const hash = await bcrypt.hash(FIXTURE_PIN, 10)
        await client.query(
          'update mote_pos.cashiers set pin_hash = $1, is_active = true where id = $2',
          [hash, c.id],
        )
        // Wipe any leftover cashier sessions for this fixture cashier so
        // tests start clean.
        await client.query(
          'delete from mote_pos.cashier_sessions where cashier_id = $1',
          [c.id],
        )
        fixture = {
          available: true,
          loginCode: WS_CODE,
          workspaceId: ws.id,
          workspaceName: ws.name,
          cashierId: c.id,
          cashierName: c.name,
          outletId: c.outlet_id,
          pin: FIXTURE_PIN,
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    fixture = { available: false, reason: `setup error: ${msg}` }
  } finally {
    try {
      await client.end()
    } catch {
      /* ignore */
    }
    fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2))
  }
}
