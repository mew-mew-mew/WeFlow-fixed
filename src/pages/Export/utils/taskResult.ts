import type { ExportTaskPayload, ExportTaskResultSummary } from '../types'

interface ExportResult {
  success?: boolean
  successCount?: number
  failCount?: number
  failedSessionIds?: string[]
  failedSessionErrors?: Record<string, string>
  error?: string
  stopped?: boolean
  paused?: boolean
}

const count = (value: unknown): number => Math.max(0, Math.floor(Number(value) || 0))

export function resolveExportTaskCompletion(payload: ExportTaskPayload, result?: ExportResult | null) {
  const total = payload.sessionIds.length
  const errorMap = result?.failedSessionErrors || {}
  const failedIds = Array.from(new Set([
    ...(result?.failedSessionIds || []), ...Object.keys(errorMap)
  ]))
  const interrupted = Boolean(result?.stopped || result?.paused)
  let failCount = Math.min(total, Math.max(count(result?.failCount), failedIds.length))
  const successCount = Math.min(total, result?.successCount == null
    ? (result?.success && !interrupted ? total - failCount : 0)
    : count(result.successCount))
  if (!result?.success && failCount === 0 && !interrupted) {
    failCount = Math.max(0, total - successCount)
  }
  const successful = result?.success === true && failCount === 0 && !interrupted
  const names = new Map(payload.sessionIds.map((id, index) => [id, payload.sessionNames[index] || id]))
  const resultSummary: ExportTaskResultSummary = {
    successCount,
    failCount,
    failedSessions: failedIds.map(sessionId => ({
      sessionId,
      name: names.get(sessionId) || sessionId,
      error: errorMap[sessionId] || result?.error || '导出失败'
    }))
  }
  const phaseLabel = result?.stopped ? '已停止'
    : result?.paused ? '已暂停'
      : `成功 ${successCount} 个会话，失败 ${failCount} 个会话`

  return {
    status: successful ? 'success' as const : 'error' as const,
    error: result?.error || (successful || failCount > 0 || interrupted ? undefined : '导出失败'),
    resultSummary,
    progress: {
      current: Math.min(total, successCount + failCount),
      total,
      currentName: '',
      phase: 'complete' as const,
      phaseLabel,
      // A settled batch reports sessions, never the last session's message count.
      phaseProgress: 0,
      phaseTotal: 0,
      exportedMessages: 0,
      estimatedTotalMessages: 0,
      collectedMessages: 0
    }
  }
}
