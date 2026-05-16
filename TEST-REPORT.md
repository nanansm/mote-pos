# Mote POS — Test Report
Generated: 2026-05-16T09:32:01.906Z

## Summary
- Total tests: 30
- Passed: 30
- Failed: 0
- Flaky: 0
- Skipped: 0
- Duration: 30.7s

## Workspace Login Code — Security
- ✅ audit.spec.ts › Workspace Login Code — Security › /k/[invalid-format] returns 404
- ✅ audit.spec.ts › Workspace Login Code — Security › /k/[well-formed-but-unknown] returns 404
- ✅ audit.spec.ts › Workspace Login Code — Security › /login-kasir shows deprecation message
- ✅ audit.spec.ts › Workspace Login Code — Security › /api/cashier/bootstrap returns 410 Gone
- ✅ audit.spec.ts › Workspace Login Code — Security › /api/cashier/login rejects missing login_code
- ✅ audit.spec.ts › Workspace Login Code — Security › /api/cashier/login rejects malformed login_code

## Login Code Generator
- ✅ audit.spec.ts › Login Code Generator › generatePrefix handles common shapes
- ✅ audit.spec.ts › Login Code Generator › generateLoginCode produces valid format
- ✅ audit.spec.ts › Login Code Generator › isValidCodeFormat accepts canonical codes
- ✅ audit.spec.ts › Login Code Generator › isValidCodeFormat rejects invalid codes

## Public Pages (Mobile / Tablet / Desktop)
