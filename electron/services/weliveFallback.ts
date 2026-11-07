interface WeliveFailureResult {
  success?: boolean
  successCount?: number
  error?: unknown
  stderr?: unknown
  failedSessionErrors?: Record<string, unknown>
}

export function getWeliveFallbackReason(result: WeliveFailureResult | null | undefined): 'expired' | 'native-crash' | null {
  if (!result || result.success) return null
  const text = [result.error, result.stderr, ...Object.values(result.failedSessionErrors || {})]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join('\n')

  // Only retry a fully failed export: preserve partial results and their errors.
  if (!(Number(result.successCount) > 0) && /\bthis build has expired\b/i.test(text)) {
    return 'expired'
  }
  if (/3221225477|0x?c0000005|-1073741819/i.test(text)) return 'native-crash'
  return null
}
