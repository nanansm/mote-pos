import {
  pgSchema,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  bigint,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

export const mp = pgSchema('mote_pos')

// ============================================================================
// better-auth tables (singular names per better-auth convention)
// ============================================================================

export const userRoleEnum = mp.enum('user_role', ['user', 'owner'])

export const user = mp.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  workspaceId: text('workspace_id'),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const session = mp.table('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const account = mp.table('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const verification = mp.table('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================================
// Core mote_pos tables
// ============================================================================

export const businessTypeEnum = mp.enum('business_type', ['resto', 'retail', 'jasa'])
export const cashierRoleEnum = mp.enum('cashier_role', ['cashier', 'manager'])
export const modifierTypeEnum = mp.enum('modifier_type', ['single', 'multiple'])
export const shiftStatusEnum = mp.enum('shift_status', ['open', 'closed'])
export const paymentMethodEnum = mp.enum('payment_method', [
  'cash',
  'qris',
  'transfer',
  'debt',
  'split',
])
export const trxStatusEnum = mp.enum('trx_status', [
  'completed',
  'voided',
  'refunded',
  'partial_refund',
])
export const syncEventTypeEnum = mp.enum('sync_event_type', [
  'transaction',
  'void',
  'refund',
  'shift_close',
  'debt_created',
  'debt_paid',
  'partial_refund',
  'price_override',
  'discount_manual',
])
export const syncStatusEnum = mp.enum('sync_status', ['pending', 'synced', 'failed'])

export const workspaces = mp.table('workspaces', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 32 }),
  businessType: businessTypeEnum('business_type').notNull().default('resto'),
  currency: varchar('currency', { length: 8 }).notNull().default('IDR'),
  klirWorkspaceId: text('klir_workspace_id'),
  klirApiToken: text('klir_api_token'),
  klirSyncEnabled: boolean('klir_sync_enabled').notNull().default(false),
  klirLastSyncAt: timestamp('klir_last_sync_at', { withTimezone: true }),
  autoPrintReceipt: boolean('auto_print_receipt').notNull().default(true),
  autoPrintShiftReport: boolean('auto_print_shift_report').notNull().default(true),
  receiptPaperSize: text('receipt_paper_size').notNull().default('80mm'),
  receiptNote: text('receipt_note'),
  receiptShowPhone: boolean('receipt_show_phone').notNull().default(true),
  receiptShowAddress: boolean('receipt_show_address').notNull().default(true),
  sheetsSyncEnabled: boolean('sheets_sync_enabled').notNull().default(false),
  sheetsSyncUrl: text('sheets_sync_url'),
  sheetsSyncId: text('sheets_sync_id'),
  sheetsLastSyncAt: timestamp('sheets_last_sync_at', { withTimezone: true }),
  sheetsLastSyncStatus: text('sheets_last_sync_status'),
  sheetsLastSyncError: text('sheets_last_sync_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const outlets = mp.table(
  'outlets',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address'),
    phone: varchar('phone', { length: 32 }),
    printerIp: varchar('printer_ip', { length: 64 }),
    printerPort: integer('printer_port').notNull().default(9100),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('outlets_workspace_idx').on(t.workspaceId)],
)

export const cashiers = mp.table(
  'cashiers',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    outletId: text('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    pinHash: text('pin_hash').notNull(),
    role: cashierRoleEnum('role').notNull().default('cashier'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('cashiers_workspace_outlet_name_uniq').on(t.workspaceId, t.outletId, t.name),
    index('cashiers_workspace_idx').on(t.workspaceId),
  ],
)

export const categories = mp.table(
  'categories',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('categories_workspace_idx').on(t.workspaceId)],
)

export const productGroups = mp.table(
  'product_groups',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('product_groups_workspace_idx').on(t.workspaceId),
    index('product_groups_category_idx').on(t.categoryId),
    uniqueIndex('product_groups_workspace_name_unique').on(t.workspaceId, t.name),
  ],
)

export const products = mp.table(
  'products',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    groupId: text('group_id').notNull().references(() => productGroups.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    variantName: text('variant_name'),
    sku: varchar('sku', { length: 64 }),
    barcode: varchar('barcode', { length: 64 }),
    priceSell: decimal('price_sell', { precision: 15, scale: 2 }).notNull(),
    priceCost: decimal('price_cost', { precision: 15, scale: 2 }),
    unit: varchar('unit', { length: 32 }).notNull().default('pcs'),
    stockTrack: boolean('stock_track').notNull().default(false),
    stockCurrent: integer('stock_current').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('products_workspace_active_idx').on(t.workspaceId, t.isActive),
    index('products_barcode_idx').on(t.barcode),
    index('products_group_idx').on(t.groupId),
  ],
)

export const modifierGroups = mp.table(
  'modifier_groups',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: modifierTypeEnum('type').notNull().default('single'),
    isRequired: boolean('is_required').notNull().default(false),
    minSelect: integer('min_select').notNull().default(0),
    maxSelect: integer('max_select').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('modifier_groups_workspace_idx').on(t.workspaceId)],
)

export const modifierOptions = mp.table(
  'modifier_options',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceAdd: decimal('price_add', { precision: 15, scale: 2 }).notNull().default('0'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [index('modifier_options_group_idx').on(t.groupId)],
)

export const productModifierGroups = mp.table(
  'product_modifier_groups',
  {
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    groupId: text('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.groupId] })],
)

export const shiftSessions = mp.table(
  'shift_sessions',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    outletId: text('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
    cashierId: text('cashier_id').notNull().references(() => cashiers.id, { onDelete: 'restrict' }),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).notNull().default('0'),
    closingBalance: decimal('closing_balance', { precision: 15, scale: 2 }),
    expectedBalance: decimal('expected_balance', { precision: 15, scale: 2 }),
    difference: decimal('difference', { precision: 15, scale: 2 }),
    notes: text('notes'),
    status: shiftStatusEnum('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('shift_workspace_status_idx').on(t.workspaceId, t.status),
    index('shift_cashier_idx').on(t.cashierId),
  ],
)

export const transactions = mp.table(
  'transactions',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    outletId: text('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
    shiftId: text('shift_id').notNull().references(() => shiftSessions.id, { onDelete: 'restrict' }),
    cashierId: text('cashier_id').notNull().references(() => cashiers.id, { onDelete: 'restrict' }),
    trxNumber: varchar('trx_number', { length: 64 }).notNull(),
    trxDate: timestamp('trx_date', { withTimezone: true }).notNull().defaultNow(),
    subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
    discount: decimal('discount', { precision: 15, scale: 2 }).notNull().default('0'),
    tax: decimal('tax', { precision: 15, scale: 2 }).notNull().default('0'),
    total: decimal('total', { precision: 15, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentAmount: decimal('payment_amount', { precision: 15, scale: 2 }).notNull(),
    changeAmount: decimal('change_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    customerName: varchar('customer_name', { length: 128 }),
    customerPhone: text('customer_phone'),
    customerId: text('customer_id'),
    discountType: text('discount_type').notNull().default('amount'),
    notes: text('notes'),
    status: trxStatusEnum('status').notNull().default('completed'),
    voidedBy: text('voided_by').references(() => cashiers.id),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('trx_workspace_number_uniq').on(t.workspaceId, t.trxNumber),
    index('trx_workspace_date_idx').on(t.workspaceId, t.trxDate),
    index('trx_shift_idx').on(t.shiftId),
  ],
)

export const transactionItems = mp.table(
  'transaction_items',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
    productName: text('product_name').notNull(),
    priceUnit: decimal('price_unit', { precision: 15, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    modifiers: jsonb('modifiers').notNull().default([]),
    modifierTotal: decimal('modifier_total', { precision: 15, scale: 2 }).notNull().default('0'),
    discount: decimal('discount', { precision: 15, scale: 2 }).notNull().default('0'),
    discountType: text('discount_type').notNull().default('amount'),
    subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
    notes: text('notes'),
  },
  (t) => [
    index('trxitem_trx_idx').on(t.transactionId),
    index('trxitem_product_idx').on(t.productId),
  ],
)

export const customers = mp.table(
  'customers',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone'),
    notes: text('notes'),
    totalPurchases: bigint('total_purchases', { mode: 'number' }).notNull().default(0),
    totalDebt: bigint('total_debt', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customers_workspace_idx').on(t.workspaceId),
    index('customers_name_idx').on(t.workspaceId, t.name),
  ],
)

export const heldCarts = mp.table(
  'held_carts',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    outletId: text('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
    shiftId: text('shift_id').references(() => shiftSessions.id, { onDelete: 'set null' }),
    cashierId: text('cashier_id').notNull().references(() => cashiers.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    customerName: text('customer_name'),
    customerPhone: text('customer_phone'),
    cartData: jsonb('cart_data').notNull(),
    subtotal: bigint('subtotal', { mode: 'number' }).notNull().default(0),
    itemCount: integer('item_count').notNull().default(0),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('held_carts_workspace_outlet_idx').on(t.workspaceId, t.outletId)],
)

export const transactionPayments = mp.table(
  'transaction_payments',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    method: text('method').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    reference: text('reference'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('transaction_payments_trx_idx').on(t.transactionId)],
)

export const customerDebts = mp.table(
  'customer_debts',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    paidAmount: bigint('paid_amount', { mode: 'number' }).notNull().default(0),
    status: text('status').notNull().default('open'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customer_debts_workspace_status_idx').on(t.workspaceId, t.status),
    index('customer_debts_customer_idx').on(t.customerId),
  ],
)

export const debtPayments = mp.table(
  'debt_payments',
  {
    id: text('id').primaryKey(),
    debtId: text('debt_id').notNull().references(() => customerDebts.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    paymentMethod: text('payment_method').notNull(),
    paidByCashierId: text('paid_by_cashier_id').references(() => cashiers.id, { onDelete: 'set null' }),
    shiftId: text('shift_id').references(() => shiftSessions.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('debt_payments_debt_idx').on(t.debtId)],
)

export const refunds = mp.table(
  'refunds',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    refundAmount: bigint('refund_amount', { mode: 'number' }).notNull(),
    refundMethod: text('refund_method').notNull().default('cash'),
    reason: text('reason').notNull(),
    refundedByCashierId: text('refunded_by_cashier_id').references(() => cashiers.id, { onDelete: 'set null' }),
    approvedByManagerPin: boolean('approved_by_manager_pin').notNull().default(true),
    shiftId: text('shift_id').references(() => shiftSessions.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('refunds_workspace_idx').on(t.workspaceId),
    index('refunds_transaction_idx').on(t.transactionId),
  ],
)

export const refundItems = mp.table(
  'refund_items',
  {
    id: text('id').primaryKey(),
    refundId: text('refund_id').notNull().references(() => refunds.id, { onDelete: 'cascade' }),
    transactionItemId: text('transaction_item_id').notNull().references(() => transactionItems.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull(),
    unitAmount: bigint('unit_amount', { mode: 'number' }).notNull(),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
  },
  (t) => [index('refund_items_refund_idx').on(t.refundId)],
)

export const priceOverrides = mp.table(
  'price_overrides',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    originalPrice: bigint('original_price', { mode: 'number' }).notNull(),
    newPrice: bigint('new_price', { mode: 'number' }).notNull(),
    difference: bigint('difference', { mode: 'number' }).notNull(),
    cashierId: text('cashier_id').references(() => cashiers.id, { onDelete: 'set null' }),
    approvedByManagerPin: boolean('approved_by_manager_pin').notNull().default(true),
    shiftId: text('shift_id').references(() => shiftSessions.id, { onDelete: 'set null' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('price_overrides_workspace_idx').on(t.workspaceId, t.createdAt)],
)

export const auditLogs = mp.table(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    outletId: text('outlet_id').references(() => outlets.id, { onDelete: 'set null' }),
    shiftId: text('shift_id').references(() => shiftSessions.id, { onDelete: 'set null' }),
    cashierId: text('cashier_id').references(() => cashiers.id, { onDelete: 'set null' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_workspace_idx').on(t.workspaceId, t.createdAt),
    index('audit_logs_action_idx').on(t.workspaceId, t.action),
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
  ],
)

export const syncEvents = mp.table(
  'sync_events',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    eventType: syncEventTypeEnum('event_type').notNull(),
    referenceId: text('reference_id').notNull(),
    payload: jsonb('payload').notNull(),
    status: syncStatusEnum('status').notNull().default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sync_workspace_status_idx').on(t.workspaceId, t.status),
    index('sync_created_idx').on(t.createdAt),
  ],
)
