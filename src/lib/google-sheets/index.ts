import { google, type sheets_v4 } from 'googleapis'
import { JWT } from 'google-auth-library'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

function parseServiceAccount(): {
  client_email: string
  private_key: string
} | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string }
    if (!parsed.client_email || !parsed.private_key) return null
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
    }
  } catch {
    return null
  }
}

export function getServiceAccountEmail(): string | null {
  return parseServiceAccount()?.client_email ?? null
}

function getAuth(): JWT {
  const acc = parseServiceAccount()
  if (!acc) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON belum diset di environment')
  }
  return new JWT({
    email: acc.client_email,
    key: acc.private_key,
    scopes: SCOPES,
  })
}

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export function extractSheetId(urlOrId: string): string | null {
  if (!urlOrId) return null
  const trimmed = urlOrId.trim()
  // Match patterns:
  //   https://docs.google.com/spreadsheets/d/SHEETID/edit#gid=0
  //   https://docs.google.com/spreadsheets/d/SHEETID
  //   SHEETID (raw, at least 20 chars)
  const m = trimmed.match(/(?:\/d\/|^)([a-zA-Z0-9-_]{20,})/)
  return m?.[1] ?? null
}

export async function testConnection(
  sheetId: string,
): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  try {
    const sheets = getSheetsClient()
    const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'properties.title' })
    return { ok: true, title: res.data.properties?.title ?? 'Untitled' }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

export async function ensureTabs(sheetId: string, tabs: string[]): Promise<void> {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'sheets.properties',
  })
  const existing = new Set(
    (meta.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[],
  )
  const tabsToAdd = tabs.filter((t) => !existing.has(t))
  if (tabsToAdd.length === 0) return
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: tabsToAdd.map((title) => ({ addSheet: { properties: { title } } })),
    },
  })
}

export type WriteOptions = {
  mode?: 'append' | 'replace'
  headerRow?: string[]
}

export async function writeRowsToSheet(
  sheetId: string,
  tabName: string,
  rows: (string | number | null)[][],
  options?: WriteOptions,
): Promise<void> {
  const sheets = getSheetsClient()
  const mode = options?.mode ?? 'replace'
  if (mode === 'replace') {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${tabName}!A:Z`,
    })
    const values = options?.headerRow ? [options.headerRow, ...rows] : rows
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tabName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    })
  }
}

export function errorMessage(err: unknown): string {
  if (!err) return 'unknown error'
  const e = err as { message?: string; errors?: Array<{ message?: string }>; response?: { data?: { error?: { message?: string } } } }
  return (
    e.response?.data?.error?.message ??
    e.errors?.[0]?.message ??
    e.message ??
    String(err)
  )
}
