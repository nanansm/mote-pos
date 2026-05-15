'use client'

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'mote-pos-offline'
const DB_VERSION = 1

export type CachedProduct = {
  id: string
  workspaceId: string
  name: string
  sku: string | null
  barcode: string | null
  priceSell: string
  priceCost: string | null
  unit: string
  stockTrack: boolean
  stockCurrent: number
  isActive: boolean
  categoryId: string | null
  categoryName: string | null
  modifierGroupIds: string[]
  updatedAt: number
}

export type CachedCategory = {
  id: string
  workspaceId: string
  name: string
  sortOrder: number
}

export type CachedModifierGroup = {
  id: string
  workspaceId: string
  name: string
  type: 'single' | 'multiple'
  isRequired: boolean
  options: { id: string; name: string; priceAdd: string }[]
}

export type PendingTransaction = {
  uuid: string
  workspaceId: string
  payload: unknown
  createdAt: number
  attempts: number
  lastError?: string
  syncFailed?: boolean
}

export type PendingShiftClose = {
  uuid: string
  workspaceId: string
  shiftId: string
  payload: unknown
  createdAt: number
  attempts: number
  lastError?: string
}

interface OfflineDB extends DBSchema {
  cached_products: {
    key: string
    value: CachedProduct
    indexes: { byWorkspace: string }
  }
  cached_categories: {
    key: string
    value: CachedCategory
    indexes: { byWorkspace: string }
  }
  cached_modifiers: {
    key: string
    value: CachedModifierGroup
    indexes: { byWorkspace: string }
  }
  pending_transactions: {
    key: string
    value: PendingTransaction
    indexes: { byWorkspace: string; byCreated: number }
  }
  pending_shift_closes: {
    key: string
    value: PendingShiftClose
    indexes: { byWorkspace: string }
  }
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null

function getDb() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB only available in browser'))
  }
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cached_products')) {
          const s = db.createObjectStore('cached_products', { keyPath: 'id' })
          s.createIndex('byWorkspace', 'workspaceId')
        }
        if (!db.objectStoreNames.contains('cached_categories')) {
          const s = db.createObjectStore('cached_categories', { keyPath: 'id' })
          s.createIndex('byWorkspace', 'workspaceId')
        }
        if (!db.objectStoreNames.contains('cached_modifiers')) {
          const s = db.createObjectStore('cached_modifiers', { keyPath: 'id' })
          s.createIndex('byWorkspace', 'workspaceId')
        }
        if (!db.objectStoreNames.contains('pending_transactions')) {
          const s = db.createObjectStore('pending_transactions', { keyPath: 'uuid' })
          s.createIndex('byWorkspace', 'workspaceId')
          s.createIndex('byCreated', 'createdAt')
        }
        if (!db.objectStoreNames.contains('pending_shift_closes')) {
          const s = db.createObjectStore('pending_shift_closes', { keyPath: 'uuid' })
          s.createIndex('byWorkspace', 'workspaceId')
        }
      },
    })
  }
  return dbPromise
}

export async function cacheProducts(workspaceId: string, list: Omit<CachedProduct, 'workspaceId' | 'updatedAt'>[]) {
  const db = await getDb()
  const tx = db.transaction('cached_products', 'readwrite')
  const now = Date.now()
  await Promise.all(
    list.map((p) =>
      tx.store.put({
        ...p,
        workspaceId,
        updatedAt: now,
      }),
    ),
  )
  await tx.done
}

export async function getCachedProducts(workspaceId: string): Promise<CachedProduct[]> {
  const db = await getDb()
  return db.getAllFromIndex('cached_products', 'byWorkspace', workspaceId)
}

export async function cacheCategories(workspaceId: string, list: Omit<CachedCategory, 'workspaceId'>[]) {
  const db = await getDb()
  const tx = db.transaction('cached_categories', 'readwrite')
  await Promise.all(list.map((c) => tx.store.put({ ...c, workspaceId })))
  await tx.done
}

export async function getCachedCategories(workspaceId: string): Promise<CachedCategory[]> {
  const db = await getDb()
  return db.getAllFromIndex('cached_categories', 'byWorkspace', workspaceId)
}

export async function cacheModifierGroups(
  workspaceId: string,
  list: Omit<CachedModifierGroup, 'workspaceId'>[],
) {
  const db = await getDb()
  const tx = db.transaction('cached_modifiers', 'readwrite')
  await Promise.all(list.map((g) => tx.store.put({ ...g, workspaceId })))
  await tx.done
}

export async function getCachedModifierGroups(workspaceId: string): Promise<CachedModifierGroup[]> {
  const db = await getDb()
  return db.getAllFromIndex('cached_modifiers', 'byWorkspace', workspaceId)
}

export async function enqueueTransaction(workspaceId: string, payload: unknown): Promise<string> {
  const uuid = crypto.randomUUID()
  const db = await getDb()
  await db.put('pending_transactions', {
    uuid,
    workspaceId,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  })
  return uuid
}

export async function listPendingTransactions(workspaceId: string): Promise<PendingTransaction[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('pending_transactions', 'byWorkspace', workspaceId)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function pendingCount(workspaceId: string): Promise<number> {
  const list = await listPendingTransactions(workspaceId)
  return list.length
}

export async function deletePending(uuid: string) {
  const db = await getDb()
  await db.delete('pending_transactions', uuid)
}

export async function updatePending(updated: PendingTransaction) {
  const db = await getDb()
  await db.put('pending_transactions', updated)
}

export async function enqueueShiftClose(workspaceId: string, shiftId: string, payload: unknown): Promise<string> {
  const uuid = crypto.randomUUID()
  const db = await getDb()
  await db.put('pending_shift_closes', {
    uuid,
    workspaceId,
    shiftId,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  })
  return uuid
}

export async function listPendingShiftCloses(workspaceId: string): Promise<PendingShiftClose[]> {
  const db = await getDb()
  return db.getAllFromIndex('pending_shift_closes', 'byWorkspace', workspaceId)
}

export async function deletePendingShiftClose(uuid: string) {
  const db = await getDb()
  await db.delete('pending_shift_closes', uuid)
}
