import test from 'node:test'
import assert from 'node:assert/strict'

import { fetchAllBatches } from '../lib/fetch-all-batches.ts'

test('fetchAllBatches keeps requesting pages until the final partial page', async () => {
    const pageCalls: Array<[number, number]> = []

    const rows = await fetchAllBatches({
        pageSize: 3,
        fetchPage: async (from, to) => {
            pageCalls.push([from, to])

            if (from === 0) {
                return ['A', 'B', 'C']
            }

            if (from === 3) {
                return ['D', 'E', 'F']
            }

            if (from === 6) {
                return ['G']
            }

            return []
        },
    })

    assert.deepEqual(rows, ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    assert.deepEqual(pageCalls, [
        [0, 2],
        [3, 5],
        [6, 8],
    ])
})

test('fetchAllBatches stops when a page is shorter than the configured page size', async () => {
    let calls = 0

    const rows = await fetchAllBatches({
        pageSize: 4,
        fetchPage: async () => {
            calls += 1
            return ['only', 'two']
        },
    })

    assert.deepEqual(rows, ['only', 'two'])
    assert.equal(calls, 1)
})
