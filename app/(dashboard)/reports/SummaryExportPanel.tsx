'use client'

import * as XLSX from 'xlsx'
import {
    buildCutOffWeeklyExportRows,
    buildCutOffWeeklyPrintHtml,
    buildMw1ExportRows,
    buildNdtResultExportRows,
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
    ndt_overall_result: string | null
    goc_code: string | null
    weld_finish_date: string | null
    welders: string | null
    overall_status: string | null
    mt_result: string | null
    mt_report_no: string | null
    ut_result: string | null
    ut_report_no: string | null
    rt_result: string | null
    rt_report_no: string | null
    pwht_result: string | null
    defect_length: number | null
    repair_length: number | null
    release_note_date: string | null
    release_note_no: string | null
    transmittal_no: string | null
    mw1_no: string | null
    cut_off: string | null
    excel_row_order: number | null
}

export default function SummaryExportPanel({
    rows,
    projectLabel,
}: {
    rows: SummaryExportSourceRow[]
    projectLabel?: string
}) {
    const exportSheet = (sheetName: string, data: unknown[]) => {
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
        XLSX.writeFile(
            workbook,
            `${sheetName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`
        )
    }

    const handlePrintCutOff = () => {
        const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900')
        if (!printWindow) {
            window.alert('Không mở được cửa sổ in PDF. Vui lòng cho phép popup và thử lại.')
            return
        }

        printWindow.document.open()
        printWindow.document.write(
            buildCutOffWeeklyPrintHtml(buildCutOffWeeklyExportRows(rows), projectLabel),
        )
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
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
                onClick={() => exportSheet('NDT Results', buildNdtResultExportRows(rows))}
            >
                Xuất kết quả NDT
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
            <button type="button" className="btn btn-secondary" onClick={handlePrintCutOff}>
                In / Xuất PDF Cut-Off
            </button>
        </div>
    )
}
