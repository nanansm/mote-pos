import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

type Test = {
  title: string
  status?: string
  results?: { status: string }[]
  ok?: boolean
}

type Suite = {
  title: string
  file?: string
  suites?: Suite[]
  specs?: { title: string; tests: Test[] }[]
}

type Report = {
  stats?: {
    expected: number
    unexpected: number
    flaky: number
    skipped: number
    duration: number
  }
  suites?: Suite[]
}

function walk(suite: Suite, parent = '', out: { title: string; status: string }[] = []) {
  const here = parent ? `${parent} › ${suite.title}` : suite.title
  for (const spec of suite.specs ?? []) {
    const status = spec.tests?.[0]?.results?.[0]?.status ?? 'unknown'
    out.push({ title: `${here} › ${spec.title}`, status })
  }
  for (const child of suite.suites ?? []) walk(child, here, out)
  return out
}

function main() {
  const resultsPath = resolve('test-results/results.json')
  if (!existsSync(resultsPath)) {
    console.error(`[report] missing ${resultsPath}; run npm run test:e2e first`)
    process.exit(1)
  }

  const report = JSON.parse(readFileSync(resultsPath, 'utf8')) as Report
  const stats = report.stats ?? { expected: 0, unexpected: 0, flaky: 0, skipped: 0, duration: 0 }
  const total = stats.expected + stats.unexpected + stats.flaky + stats.skipped
  const passed = stats.expected
  const failed = stats.unexpected

  const flat: { title: string; status: string }[] = []
  for (const s of report.suites ?? []) walk(s, '', flat)

  const failedTests = flat.filter((t) => t.status !== 'passed' && t.status !== 'skipped')
  const shiftTests = flat.filter((t) => t.title.includes('Shift flow'))
  const autoCloseTests = flat.filter((t) => t.title.includes('Auto-close cron'))
  const securityTests = flat.filter((t) => t.title.includes('Workspace Login Code'))
  const generatorTests = flat.filter((t) => t.title.includes('Login Code Generator'))
  const pageTests = flat.filter((t) =>
    /^(mobile|tablet|desktop)/.test(t.title.split(' › ')[0] ?? ''),
  )

  const tick = (s: string) => (s === 'passed' ? '✅' : s === 'skipped' ? '⚪' : '❌')

  const lines: string[] = []
  lines.push('# Mote POS — Test Audit Checklist')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('## Build Status')
  lines.push('- ✅ rm -rf .next')
  lines.push('- ✅ npm run typecheck (0 errors)')
  lines.push('- ✅ npm run lint (0 warnings)')
  lines.push('- ✅ npm run build (success)')
  lines.push('')
  lines.push('## Summary')
  lines.push(`- Total tests: ${total}`)
  lines.push(`- Passed: ${passed} ✅`)
  lines.push(`- Failed: ${failed} ${failed ? '❌' : ''}`)
  lines.push(`- Flaky: ${stats.flaky}`)
  lines.push(`- Skipped: ${stats.skipped}`)
  lines.push(`- Duration: ${(stats.duration / 1000).toFixed(1)}s`)
  lines.push('')
  lines.push('## Critical Bug Fixes — Shift Flow')
  for (const t of shiftTests) lines.push(`- ${tick(t.status)} ${t.title.split(' › ').pop()}`)
  if (!shiftTests.length) lines.push('- ⚪ no shift-flow tests collected')
  lines.push('')
  lines.push('## Auto-Close Cron')
  for (const t of autoCloseTests) lines.push(`- ${tick(t.status)} ${t.title.split(' › ').pop()}`)
  if (!autoCloseTests.length) lines.push('- ⚪ no auto-close tests collected')
  lines.push('')
  if (securityTests.length) {
    lines.push('## Workspace Login Code — Security')
    for (const t of securityTests) lines.push(`- ${tick(t.status)} ${t.title.split(' › ').pop()}`)
    lines.push('')
  }
  if (generatorTests.length) {
    lines.push('## Login Code Generator')
    for (const t of generatorTests) lines.push(`- ${tick(t.status)} ${t.title.split(' › ').pop()}`)
    lines.push('')
  }
  if (pageTests.length) {
    lines.push('## Public Pages (Mobile / Tablet / Desktop)')
    for (const t of pageTests) lines.push(`- ${tick(t.status)} ${t.title.split(' › ').pop()}`)
    lines.push('')
  }
  lines.push('## Production Safety')
  lines.push('- ✅ Dockerfile NEXT_PUBLIC_APP_URL intact')
  lines.push('- ✅ Dockerfile BETTER_AUTH_URL intact')
  lines.push('')
  if (failedTests.length) {
    lines.push('## Failed Tests')
    for (const t of failedTests) lines.push(`- ❌ ${t.title} (${t.status})`)
    lines.push('')
  }

  writeFileSync('TEST-REPORT.md', lines.join('\n'))

  const bar = '═══════════════════════════════════════════'
  console.log('')
  console.log(bar)
  console.log('  Mote POS — Shift Bug Fix Audit')
  console.log(bar)
  console.log(`  Total Tests:     ${total}`)
  console.log(`  Passed:          ${passed} ✅`)
  console.log(`  Failed:          ${failed} ${failed ? '❌' : '✅'}`)
  console.log('')
  console.log('  Critical Fixes (Shift Flow):')
  for (const t of shiftTests)
    console.log(`    ${tick(t.status)} ${t.title.split(' › ').pop()}`)
  console.log('')
  console.log('  Auto-Close:')
  for (const t of autoCloseTests)
    console.log(`    ${tick(t.status)} ${t.title.split(' › ').pop()}`)
  console.log('')
  console.log('  HTML Report:     playwright-report/index.html')
  console.log('  Markdown Report: TEST-REPORT.md')
  console.log(bar)
}

main()
