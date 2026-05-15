CREATE SCHEMA "mote_pos";
--> statement-breakpoint
CREATE TYPE "mote_pos"."business_type" AS ENUM('resto', 'retail', 'jasa');--> statement-breakpoint
CREATE TYPE "mote_pos"."cashier_role" AS ENUM('cashier', 'manager');--> statement-breakpoint
CREATE TYPE "mote_pos"."modifier_type" AS ENUM('single', 'multiple');--> statement-breakpoint
CREATE TYPE "mote_pos"."payment_method" AS ENUM('cash', 'qris', 'transfer');--> statement-breakpoint
CREATE TYPE "mote_pos"."shift_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "mote_pos"."sync_event_type" AS ENUM('transaction', 'void', 'refund', 'shift_close');--> statement-breakpoint
CREATE TYPE "mote_pos"."sync_status" AS ENUM('pending', 'synced', 'failed');--> statement-breakpoint
CREATE TYPE "mote_pos"."trx_status" AS ENUM('completed', 'voided', 'refunded');--> statement-breakpoint
CREATE TABLE "mote_pos"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."cashiers" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"name" text NOT NULL,
	"pin_hash" text NOT NULL,
	"role" "mote_pos"."cashier_role" DEFAULT 'cashier' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."categories" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."modifier_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "mote_pos"."modifier_type" DEFAULT 'single' NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."modifier_options" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"name" text NOT NULL,
	"price_add" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."outlets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" varchar(32),
	"printer_ip" varchar(64),
	"printer_port" integer DEFAULT 9100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."product_modifier_groups" (
	"product_id" text NOT NULL,
	"group_id" text NOT NULL,
	CONSTRAINT "product_modifier_groups_product_id_group_id_pk" PRIMARY KEY("product_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."products" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"sku" varchar(64),
	"barcode" varchar(64),
	"price_sell" numeric(15, 2) NOT NULL,
	"price_cost" numeric(15, 2),
	"unit" varchar(32) DEFAULT 'pcs' NOT NULL,
	"stock_track" boolean DEFAULT false NOT NULL,
	"stock_current" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."shift_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"cashier_id" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"closing_balance" numeric(15, 2),
	"expected_balance" numeric(15, 2),
	"difference" numeric(15, 2),
	"notes" text,
	"status" "mote_pos"."shift_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."sync_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"event_type" "mote_pos"."sync_event_type" NOT NULL,
	"reference_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "mote_pos"."sync_status" DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."transaction_items" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"price_unit" numeric(15, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"modifier_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"cashier_id" text NOT NULL,
	"trx_number" varchar(64) NOT NULL,
	"trx_date" timestamp with time zone DEFAULT now() NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) NOT NULL,
	"payment_method" "mote_pos"."payment_method" NOT NULL,
	"payment_amount" numeric(15, 2) NOT NULL,
	"change_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"customer_name" varchar(128),
	"notes" text,
	"status" "mote_pos"."trx_status" DEFAULT 'completed' NOT NULL,
	"voided_by" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"workspace_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mote_pos"."workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" varchar(32),
	"business_type" "mote_pos"."business_type" DEFAULT 'resto' NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mote_pos"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "mote_pos"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."cashiers" ADD CONSTRAINT "cashiers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mote_pos"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."cashiers" ADD CONSTRAINT "cashiers_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "mote_pos"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."categories" ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mote_pos"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."modifier_groups" ADD CONSTRAINT "modifier_groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mote_pos"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."modifier_options" ADD CONSTRAINT "modifier_options_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "mote_pos"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."outlets" ADD CONSTRAINT "outlets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mote_pos"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "mote_pos"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "mote_pos"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."products" ADD CONSTRAINT "products_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mote_pos"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "mote_pos"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "mote_pos"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."shift_sessions" ADD CONSTRAINT "shift_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mote_pos"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."shift_sessions" ADD CONSTRAINT "shift_sessions_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "mote_pos"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."shift_sessions" ADD CONSTRAINT "shift_sessions_cashier_id_cashiers_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "mote_pos"."cashiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."sync_events" ADD CONSTRAINT "sync_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mote_pos"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "mote_pos"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."transaction_items" ADD CONSTRAINT "transaction_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "mote_pos"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."transactions" ADD CONSTRAINT "transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mote_pos"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."transactions" ADD CONSTRAINT "transactions_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "mote_pos"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."transactions" ADD CONSTRAINT "transactions_shift_id_shift_sessions_id_fk" FOREIGN KEY ("shift_id") REFERENCES "mote_pos"."shift_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."transactions" ADD CONSTRAINT "transactions_cashier_id_cashiers_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "mote_pos"."cashiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."transactions" ADD CONSTRAINT "transactions_voided_by_cashiers_id_fk" FOREIGN KEY ("voided_by") REFERENCES "mote_pos"."cashiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mote_pos"."workspaces" ADD CONSTRAINT "workspaces_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "mote_pos"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cashiers_workspace_outlet_name_uniq" ON "mote_pos"."cashiers" USING btree ("workspace_id","outlet_id","name");--> statement-breakpoint
CREATE INDEX "cashiers_workspace_idx" ON "mote_pos"."cashiers" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "categories_workspace_idx" ON "mote_pos"."categories" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "modifier_groups_workspace_idx" ON "mote_pos"."modifier_groups" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "modifier_options_group_idx" ON "mote_pos"."modifier_options" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "outlets_workspace_idx" ON "mote_pos"."outlets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "products_workspace_active_idx" ON "mote_pos"."products" USING btree ("workspace_id","is_active");--> statement-breakpoint
CREATE INDEX "products_barcode_idx" ON "mote_pos"."products" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "shift_workspace_status_idx" ON "mote_pos"."shift_sessions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "shift_cashier_idx" ON "mote_pos"."shift_sessions" USING btree ("cashier_id");--> statement-breakpoint
CREATE INDEX "sync_workspace_status_idx" ON "mote_pos"."sync_events" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "sync_created_idx" ON "mote_pos"."sync_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trxitem_trx_idx" ON "mote_pos"."transaction_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "trxitem_product_idx" ON "mote_pos"."transaction_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trx_workspace_number_uniq" ON "mote_pos"."transactions" USING btree ("workspace_id","trx_number");--> statement-breakpoint
CREATE INDEX "trx_workspace_date_idx" ON "mote_pos"."transactions" USING btree ("workspace_id","trx_date");--> statement-breakpoint
CREATE INDEX "trx_shift_idx" ON "mote_pos"."transactions" USING btree ("shift_id");