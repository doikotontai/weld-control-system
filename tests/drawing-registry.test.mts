import test from 'node:test'
import assert from 'node:assert/strict'

import {
    buildDrawingRegistryRows,
    buildDrawingSyncRows,
} from '../lib/drawing-registry.ts'

test('buildDrawingSyncRows groups welds by drawing and counts total welds', () => {
    const rows = buildDrawingSyncRows('project-1', [
        { drawing_no: 'DW-001' },
        { drawing_no: 'DW-001' },
        { drawing_no: 'DW-002' },
        { drawing_no: '' },
    ])

    assert.deepEqual(rows, [
        { project_id: 'project-1', drawing_no: 'DW-001', total_welds: 2 },
        { project_id: 'project-1', drawing_no: 'DW-002', total_welds: 1 },
    ])
})

test('buildDrawingRegistryRows merges stored drawing metadata with weld progress and aggregated refs', () => {
    const rows = buildDrawingRegistryRows(
        [
            {
                id: 'drawing-1',
                project_id: 'project-1',
                drawing_no: 'DW-001',
                description: 'Padeye layout',
                part: 'TOPSIDE',
                nde_pct: '100%',
                total_welds: 0,
                created_at: '2026-03-15T00:00:00Z',
            },
            {
                id: 'drawing-2',
                project_id: 'project-1',
                drawing_no: 'DW-003',
                description: 'No weld yet',
                part: null,
                nde_pct: null,
                total_welds: 0,
                created_at: '2026-03-15T00:00:00Z',
            },
        ],
        [
            {
                drawing_no: 'DW-001',
                goc_code: 'ST-01',
                fitup_date: '2026-03-10',
                visual_date: '2026-03-11',
                mt_result: 'ACC',
                ut_result: null,
                rt_result: null,
                release_note_no: 'IRN-01',
                release_note_date: '2026-03-12',
                transmittal_no: 'TR-001',
                cut_off: '2026-03-14',
                mw1_no: 'MW1-A',
            },
            {
                drawing_no: 'DW-001',
                goc_code: 'ST-02',
                fitup_date: null,
                visual_date: null,
                mt_result: null,
                ut_result: 'ACC',
                rt_result: null,
                release_note_no: 'IRN-02',
                release_note_date: '2026-03-13',
                transmittal_no: 'TR-001',
                cut_off: '2026-03-14',
                mw1_no: 'MW1-B',
            },
            {
                drawing_no: 'DW-002',
                goc_code: 'ST-03',
                fitup_date: null,
                visual_date: null,
                mt_result: null,
                ut_result: null,
                rt_result: null,
                release_note_no: null,
                release_note_date: null,
                transmittal_no: null,
                cut_off: null,
                mw1_no: null,
            },
        ],
    )

    assert.equal(rows.length, 3)

    assert.deepEqual(rows[0], {
        id: 'drawing-1',
        project_id: 'project-1',
        drawing_no: 'DW-001',
        description: 'Padeye layout',
        part: 'TOPSIDE',
        nde_pct: '100%',
        total_welds: 2,
        fitup_done: 1,
        visual_done: 1,
        ndt_done: 2,
        release_done: 2,
        goc_codes: 'ST-01, ST-02',
        release_notes: 'IRN-01, IRN-02',
        latest_release_note_date: '2026-03-13',
        transmittal_numbers: 'TR-001',
        cut_off_refs: '2026-03-14',
        mw1_numbers: 'MW1-A, MW1-B',
        created_at: '2026-03-15T00:00:00Z',
    })

    assert.equal(rows[1].drawing_no, 'DW-002')
    assert.equal(rows[1].total_welds, 1)
    assert.equal(rows[1].description, null)

    assert.equal(rows[2].drawing_no, 'DW-003')
    assert.equal(rows[2].total_welds, 0)
    assert.equal(rows[2].description, 'No weld yet')
})

test('buildDrawingRegistryRows does not double count totals when stored rows already have synced total_welds', () => {
    const rows = buildDrawingRegistryRows(
        [
            {
                id: 'drawing-1',
                project_id: 'project-1',
                drawing_no: 'DW-001',
                description: 'Already synced',
                part: null,
                nde_pct: null,
                total_welds: 2,
                created_at: '2026-03-15T00:00:00Z',
            },
        ],
        [
            {
                drawing_no: 'DW-001',
                goc_code: 'ST-01',
                fitup_date: '2026-03-10',
                visual_date: null,
                mt_result: null,
                ut_result: null,
                rt_result: null,
                release_note_no: null,
                release_note_date: null,
                transmittal_no: null,
                cut_off: null,
                mw1_no: null,
            },
            {
                drawing_no: 'DW-001',
                goc_code: 'ST-02',
                fitup_date: null,
                visual_date: null,
                mt_result: null,
                ut_result: null,
                rt_result: null,
                release_note_no: null,
                release_note_date: null,
                transmittal_no: null,
                cut_off: null,
                mw1_no: null,
            },
        ],
    )

    assert.equal(rows[0].total_welds, 2)
})
