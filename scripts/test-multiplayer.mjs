#!/usr/bin/env node
/**
 * Autonomous multiplayer test runner.
 * Usage: node scripts/test-multiplayer.mjs
 *
 * Checks that Firebase emulators are running, builds the Cloud Functions,
 * then runs the full test suite (unit logic + emulator integration + standard unit).
 */
import { execSync } from 'child_process'

async function checkEmulator(name, port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(3000) })
    // Any HTTP response (even 404) means the emulator is listening
    if (res) return
  } catch {
    throw new Error(
      `${name} emulator is not running on port ${port}.\n` +
      `Start emulators first: firebase emulators:start --only auth,firestore,functions`
    )
  }
}

function run(label, command, opts = {}) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${label}`)
  console.log('='.repeat(60))
  try {
    execSync(command, { stdio: 'inherit', ...opts })
    return true
  } catch {
    console.error(`\n[FAIL] ${label}`)
    return false
  }
}

async function main() {
  console.log('\n=== Multiplayer Test Runner ===\n')

  // 1. Verify emulators
  console.log('Checking emulators...')
  await checkEmulator('Auth',      9099)
  await checkEmulator('Firestore', 8080)
  await checkEmulator('Functions', 5001)
  console.log('All emulators running ✓')

  // 2. Build Cloud Functions so the emulator runs the latest code
  const builtOk = run('Build Cloud Functions', 'npm run build', { cwd: './functions' })
  if (!builtOk) {
    console.error('\nFunction build failed — cannot run emulator tests.')
    process.exit(1)
  }

  // 3. Run tests
  const logicOk   = run('Unit tests: pure logic (validation + gameLogic)',
    'npx vitest run --config vitest.multiplayer.config.ts tests/functions')

  const emulOk    = run('Integration tests: Firebase emulator (game flow)',
    'npx vitest run --config vitest.multiplayer.config.ts tests/multiplayer')

  const standardOk = run('Standard unit + integration tests',
    'npx vitest run')

  // 4. Summary
  console.log('\n' + '='.repeat(60))
  console.log('  RESULTS')
  console.log('='.repeat(60))
  console.log(`  Logic tests (pure TS):      ${logicOk    ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Emulator tests (Firebase):  ${emulOk     ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Standard tests (jsdom):     ${standardOk ? '✅ PASS' : '❌ FAIL'}`)
  console.log('='.repeat(60))

  if (!logicOk || !emulOk || !standardOk) {
    console.error('\nSome tests failed. Fix the issues above and re-run.')
    process.exit(1)
  }

  console.log('\nAll tests passed ✓')
  console.log('Ready to build and sync Android:  npm run android-sync\n')
}

main().catch((e) => {
  console.error('\n[ERROR]', e.message)
  process.exit(1)
})
