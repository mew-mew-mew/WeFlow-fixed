import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getWeliveFallbackReason } from '../electron/services/weliveFallback.ts'

test('retries the reported expiry failure, including per-session bridge errors', () => {
  const error = 'error: this build has expired [welive-diagnostics] exit=1 (0x00000001)'
  assert.equal(getWeliveFallbackReason({ success: false, successCount: 0,
    failedSessionErrors: { 'test-session': error } }), 'expired')
  assert.equal(getWeliveFallbackReason({ success: false, stderr: 'This build has expired' }), 'expired')
})

test('does not replace successful, partial, or unrelated failed exports', () => {
  assert.equal(getWeliveFallbackReason({ success: true, stderr: 'this build has expired' }), null)
  assert.equal(getWeliveFallbackReason({ success: false, successCount: 1, error: 'this build has expired' }), null)
  assert.equal(getWeliveFallbackReason({ success: false, error: 'invalid database key' }), null)
  assert.equal(getWeliveFallbackReason({ success: false, error: 'JSONL data is incomplete' }), null)
  assert.equal(getWeliveFallbackReason(null), null)
})

test('preserves the existing native access-violation fallback', () => {
  for (const code of ['3221225477', '0xC0000005', '-1073741819']) {
    assert.equal(getWeliveFallbackReason({ success: false, error: code }), 'native-crash')
  }
})
