'use client'

import * as XLSX from 'xlsx'
import {
    buildCutOffWeeklyExportRows,
    buildMw1ExportRows,
    buildWeldTraceExportRows,
} from '@/lib/report-export'

interface SummaryExportSourceRow {
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    joint_type: string | null
    wps_no: string | null
    weld_size: string | null
    ndt_requirements: string | null
    goc_code: string | null
    weld_finish_date: string | null
    welders: string | null
    overall_status: string | null
    release_note_no: string | null
    transmittal_no: string | null
    mw1_no: string | null
    cut_off: string | null
    excel_row_order: number | null
}

export default function SummaryExportPanel({ rows }: { rows: SummaryExportSourceRow[] }) {
    const exportSheet = (sheetName: string, data: unknown[]) => {
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
        XLSX.writeFile(
            workbook,
            `${sheetName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`
        )
    }

    return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <button
                type="button"
                className="btn btn-secondary"
                onClick={() => exportSheet('Weld Trace', buildWeldTraceExportRows(rows))}
            >
                Xuất Weld Trace
            </button>
            <button
                type="button"
                className="btn btn-secondary"
                onClick={() => exportSheet('MW1', buildMw1ExportRows(rows))}
            >
                Xuất MW1
            </button>
            <button
                type="button"
                className="btn btn-secondary"
                onClick={() => exportSheet('Cut-Off Weekly', buildCutOffWeeklyExportRows(rows))}
            >
                Xuất Cut-Off theo tuần
            </button>
        </div>
    )
}
