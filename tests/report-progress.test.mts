import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldCountVisualProgress } from '../lib/report-progress.ts'

test('shouldCountVisualProgress counts visual rows that are not rejected or deleted', () => {
    assert.equal(
        shouldCountVisualProgress({
            visualDate: '2026-03-15',
            overallStatus: 'FINISH',
        }),
        true
    )
})

test('shouldCountVisualProgress excludes REJ and DELETE rows from visual totals', () => {
    assert.equal(
        shouldCountVisualProgress({
            visualDate: '2026-03-15',
            overallStatus: 'REJ',
        }),
        false
    )

    assert.equal(
        shouldCountVisualProgress({
            visualDate: '2026-03-15',
            overallStatus: 'DELETE',
        }),
        false
    )
})

test('shouldCountVisualProgress ignores rows without visual date', () => {
    assert.equal(
        shouldCountVisualProgress({
            visualDate: null,
            overallStatus: 'FINISH',
        }),
        false
    )
})
