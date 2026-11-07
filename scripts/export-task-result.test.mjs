import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveExportTaskCompletion } from '../src/pages/Export/utils/taskResult.ts'

const payload = {
  sessionIds: Array.from({ length: 3 }, (_, i) => `test-${i}`),
  sessionNames: Array.from({ length: 3 }, (_, i) => `Session ${i}`)
}

test('a partially successful batch is not reported as completed successfully', () => {
  const final = resolveExportTaskCompletion(payload, {
    success: true, successCount: 2, failCount: 1,
    failedSessionIds: ['test-2'], failedSessionErrors: { 'test-2': 'No messages in selected date range' }
  })
  assert.equal(final.status, 'error')
  assert.equal(final.resultSummary.successCount, 2)
  assert.equal(final.resultSummary.failCount, 1)
  assert.equal(final.resultSummary.failedSessions[0].name, 'Session 2')
  assert.match(final.resultSummary.failedSessions[0].error, /No messages/)
  assert.equal(final.progress.current, 3)
  assert.equal(final.progress.phaseTotal, 0)
  assert.equal(final.progress.phaseProgress, 0)
  assert.equal(final.progress.phaseLabel, '成功 2 个会话，失败 1 个会话')
})

test('a successful final result clears stale message progress and failure labels', () => {
  const previous = { phaseLabel: '导出失败', phaseProgress: 0, phaseTotal: 4 }
  const final = resolveExportTaskCompletion(payload, { success: true, successCount: 3, failCount: 0 })
  const progress = { ...previous, ...final.progress }
  assert.equal(final.status, 'success')
  assert.equal(progress.phaseTotal, 0)
  assert.equal(progress.current, 3)
  assert.equal(progress.total, 3)
  assert.doesNotMatch(progress.phaseLabel, /导出失败/)
})

test('fatal results and interrupted batches cannot become successful exports', () => {
  const fatal = resolveExportTaskCompletion(payload, { success: false, error: 'Database unavailable' })
  assert.equal(fatal.status, 'error')
  assert.equal(fatal.resultSummary.failCount, 3)
  assert.equal(fatal.error, 'Database unavailable')
  const stopped = resolveExportTaskCompletion(payload, { success: true, stopped: true, successCount: 0, failCount: 0 })
  assert.equal(stopped.status, 'error')
  assert.equal(stopped.resultSummary.successCount, 0)
  assert.equal(stopped.progress.phaseLabel, '已停止')
})
