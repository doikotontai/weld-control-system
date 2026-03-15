import test from 'node:test'
import assert from 'node:assert/strict'

import {
    buildCutOffWeeklyExportRows,
    buildMw1ExportRows,
    buildWeldTraceExportRows,
} from '../lib/report-export.ts'

test('buildWeldTraceExportRows keeps weld trace rows sorted by drawing and excel order', () => {
    const rows = buildWeldTraceExportRows([
        {
            weld_id: 'DW-002-2',
            drawing_no: 'DW-002',
            weld_no: '2',
            joint_type: 'SV',
            wps_no: 'WPS-2',
            weld_size: '10',
            ndt_requirements: 'MT',
            goc_code: 'ST-02',
            weld_finish_date: '2026-03-12',
            welders: 'W-02',
            overall_status: 'NOT YET NDT',
            excel_row_order: 20,
        },
        {
            weld_id: 'DW-001-1',
            drawing_no: 'DW-001',
            weld_no: '1',
            joint_type: 'SV',
            wps_no: 'WPS-1',
            weld_size: '12',
            ndt_requirements: 'MT&UT',
            goc_code: 'ST-01',
            weld_finish_date: '2026-03-10',
            welders: 'W-01',
            overall_status: 'FINISH',
            excel_row_order: 10,
        },
    ])

    assert.equal(rows[0].drawing_no, 'DW-001')
    assert.equal(rows[1].drawing_no, 'DW-002')
    assert.equal(rows[0].status, 'FINISH')
})

test('buildMw1ExportRows returns only welds with MW1 number and sorts by package then drawing', () => {
    const rows = buildMw1ExportRows([
        {
            weld_id: 'DW-002-2',
            drawing_no: 'DW-002',
            weld_no: '2',
            goc_code: 'ST-02',
            mw1_no: 'MW1-B',
            release_note_no: 'IRN-02',
            cut_off: '2026-03-14',
            overall_status: 'FINISH',
            excel_row_order: 20,
        },
        {
            weld_id: 'DW-001-1',
            drawing_no: 'DW-001',
            weld_no: '1',
            goc_code: 'ST-01',
            mw1_no: 'MW1-A',
            release_note_no: 'IRN-01',
            cut_off: '2026-03-13',
            overall_status: 'FINISH',
            excel_row_order: 10,
        },
        {
            weld_id: 'DW-003-3',
            drawing_no: 'DW-003',
            weld_no: '3',
            goc_code: 'ST-03',
            mw1_no: '',
            release_note_no: null,
            cut_off: null,
            overall_status: 'NOT YET NDT',
            excel_row_order: 30,
        },
    ])

    assert.equal(rows.length, 2)
    assert.equal(rows[0].mw1_no, 'MW1-A')
    assert.equal(rows[1].mw1_no, 'MW1-B')
})

test('buildCutOffWeeklyExportRows groups parseable cut off dates by iso week label', () => {
    const rows = buildCutOffWeeklyExportRows([
        {
            weld_id: 'DW-001-1',
            drawing_no: 'DW-001',
            weld_no: '1',
            cut_off: '2026-03-13',
            release_note_no: 'IRN-01',
            transmittal_no: 'TR-01',
            mw1_no: 'MW1-A',
            overall_status: 'FINISH',
            excel_row_order: 10,
        },
        {
            weld_id: 'DW-002-2',
            drawing_no: 'DW-002',
            weld_no: '2',
            cut_off: 'CUT-REF-A',
            release_note_no: null,
            transmittal_no: null,
            mw1_no: '',
            overall_status: 'NOT YET NDT',
            excel_row_order: 20,
        },
    ])

    assert.equal(rows.length, 2)
    assert.match(rows[0].cut_off_week, /^2026-W\d{2}$/)
    assert.equal(rows[1].cut_off_week, 'Khác / Không rõ tuần')
})
