# Mote POS — Test Report

Generated: 2026-05-21

## Prompt 9 Summary (Bug fix tutup shift + mobile/tablet responsive)

### TASK 1 — Bug Fix Tutup Shift (CRITICAL)

#### Code changes
- [x] `/api/shifts/close` — added DB write VERIFICATION step after commit
- [x] `/api/shifts/close` — instrumentation logging (`[shift close] BEGIN/LOCK/UPDATE/COMMIT/VERIFY`)
- [x] `/api/shifts/close` — `Cache-Control: no-store` on all responses
- [x] `/api/shifts/[id]` — `Cache-Control: no-store` to prevent stale-shift reads
- [x] `tutup-shift/page.tsx` — strict `submitState` machine (`idle | submitting | done`)
- [x] `tutup-shift/page.tsx` — fetch `/api/shifts/[id]` with `cache: 'no-store'`
- [x] `tutup-shift/page.tsx` — fetch `/api/shifts/close` with `cache: 'no-store'`
- [x] New audit action `shift_close_failed_silently` recorded when DB verify fails

#### Auto-redirect / auto-submit audit
- [x] `kasir/buka-shift/page.tsx` — confirmed no `useEffect` that auto-submits
- [x] `kasir/kasir-client.tsx` — only `router.replace('/kasir/buka-shift')` if no
      `pos:shift_id` in localStorage. After close, localStorage is cleared and
      user is redirected to `/kasir/shift-closed` directly (no chain).
- [x] `cashier-shell.tsx` — no auto-create-shift logic
- [x] `dashboard/page.tsx` — no auto-create-shift logic

#### Dockerfile (production safety)
- [x] `COPY --from=builder /app/src/scripts ./src/scripts` added
- [x] `ENV NEXT_PUBLIC_APP_URL=https://pos.motekreatif.com` intact
- [x] `ENV BETTER_AUTH_URL=https://pos.motekreatif.com` intact

#### Repair script
- [x] `src/scripts/repair-stuck-shifts.ts` idempotent — closes shifts open > 48h
- [x] `npm run repair:shifts` available in package.json
- [x] Per-shift `expected = opening + cash_in` from `transaction_payments`

### TASK 2 — Mobile + Tablet Responsive Polish

#### Layout primitives
- [x] `src/components/layout/mobile-header.tsx` — sticky header with:
      hamburger (44x44), workspace name 13px, outlet + online dot 10px,
      Tutup Shift pill (auto-injected if `pos:shift_id` present)
- [x] `cashier-shell.tsx` — refactored to use slide-in drawer (280px / 75vw),
      backdrop, body-scroll lock, route-change auto-close
- [x] `app-shell.tsx` — same pattern for owner pages
- [x] Touch targets ≥44px on all nav items + login + qty stepper

#### Login Kasir `/k/[code]`
- [x] Uses native `<input type="password" inputmode="numeric" maxLength={8}>`
- [x] `autoFocus` already set when cashier selected
- [x] No custom number pad anywhere — already correct

## Playwright tests added
- `tests/e2e/shift-close-repro.spec.ts` — REPRO test for Tutup Shift bug:
  - UI close → DB shows status='closed' (catches silent rollback)
  - submitState machine blocks double-click (exactly 1 close API call fires)
- `tests/e2e/responsive.spec.ts` — viewport smoke tests:
  - Mobile 360x800: hamburger visible, drawer hidden, touch target ≥40px
  - Tablet 768x1024: still uses mobile header (<lg breakpoint)
  - Desktop 1280x800: sidebar visible, hamburger hidden
  - Mobile header renders shop name

## Build verification
- [x] `rm -rf .next`
- [x] `npm run typecheck` — 0 errors
- [x] `npm run lint` — 0 warnings
- [x] `npm run build` — Compiled successfully in 12.8s

## Local test run (2026-05-21)
- 14 passed · 1 flaky-then-passed · 1 skipped (across shift-close-repro + responsive + shift-flow)
- All REPRO assertions hold: UI close → DB status='closed' + only 1 close API call fires

## Other fixes applied during test stabilization
- `tests/e2e/helpers.ts` — shared `clearLoginRateLimit()` (workers load `.env.local`)
- `tests/e2e/global-setup.ts` — clears rate-limit keys once at startup
- All 3 spec files use `test.beforeEach(clearLoginRateLimit)`
- `tests/e2e/shift-flow.spec.ts` — `openShiftViaApi` now returns the existing
  shiftId from the 409 body (was throwing); fallback to `/api/cashier/me` reads
  `session.shiftId` correctly
- `src/app/api/cashier/login/route.ts` — rate-limit constants made
  env-configurable (`CASHIER_LOGIN_RATE_LIMIT_MAX/_WINDOW_SEC/_BLOCK_DURATION_SEC`)
- `.env.local` raises limits for local dev / e2e; production stays at the safe defaults
- `src/scripts/repair-stuck-shifts.ts` — explicit `.env.local` load
- Local DB migration 0017 applied (adds `cashiers.is_owner_cashier`)
