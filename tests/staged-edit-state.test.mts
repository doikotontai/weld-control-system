import test from 'node:test'
import assert from 'node:assert/strict'

import {
    createStagedDraft,
    getDirtyStagedIds,
    hasStagedChanges,
    patchStagedDraft,
    removeStagedDraft,
} from '../lib/staged-edit-state.ts'

test('hasStagedChanges returns false when current matches original', () => {
    const draft = createStagedDraft({ weld_no: '1', mt_result: 'ACC' })
    assert.equal(hasStagedChanges(draft), false)
})

test('patchStagedDraft updates only the targeted row and marks it dirty', () => {
    const drafts = {
        rowA: createStagedDraft({ weld_no: '1', mt_result: 'ACC' }),
        rowB: createStagedDraft({ weld_no: '2', mt_result: 'REJ' }),
    }

    const next = patchStagedDraft(drafts, 'rowB', 'mt_result', '')

    assert.equal(next.rowA.current.mt_result, 'ACC')
    assert.equal(next.rowB.current.mt_result, '')
    assert.equal(hasStagedChanges(next.rowA), false)
    assert.equal(hasStagedChanges(next.rowB), true)
    assert.deepEqual(getDirtyStagedIds(next), ['rowB'])
})

test('removeStagedDraft removes the selected row from staged edits', () => {
    const drafts = {
        rowA: createStagedDraft({ weld_no: '1' }),
        rowB: createStagedDraft({ weld_no: '2' }),
    }

    const next = removeStagedDraft(drafts, 'rowA')

    assert.deepEqual(Object.keys(next), ['rowB'])
})
