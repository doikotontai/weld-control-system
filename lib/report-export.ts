export interface WeldTraceSourceRow {
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    joint_type?: string | null
    wps_no?: string | null
    weld_size?: string | null
    ndt_requirements?: string | null
    goc_code?: string | null
    weld_finish_date?: string | null
    welders?: string | null
    overall_status?: string | null
    excel_row_order?: number | null
}

export interface WeldTraceExportRow {
    weld_id: string
    drawing_no: string
    weld_no: string
    joint_type: string
    wps_no: string
    weld_size: string
    ndt_requirements: string
    goc_code: string
    weld_finish_date: string
    welders: string
    status: string
    excel_row_order: number
}

export interface Mw1SourceRow {
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    goc_code?: string | null
    mw1_no?: string | null
    release_note_no?: string | null
    cut_off?: string | null
    overall_status?: string | null
    excel_row_order?: number | null
}

export interface Mw1ExportRow {
    mw1_no: string
    drawing_no: string
    weld_no: string
    weld_id: string
    goc_code: string
    release_note_no: string
    cut_off: string
    status: string
    excel_row_order: number
}

export interface CutOffSourceRow {
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    cut_off?: string | null
    release_note_no?: string | null
    transmittal_no?: string | null
    mw1_no?: string | null
    overall_status?: string | null
    excel_row_order?: number | null
}

export interface CutOffWeeklyExportRow {
    cut_off_week: string
    cut_off: string
    drawing_no: string
    weld_no: string
    weld_id: string
    release_note_no: string
    transmittal_no: string
    mw1_no: string
    status: string
    excel_row_order: number
}

export interface NdtResultSourceRow {
    weld_id: string | null
    drawing_no: string | null
    weld_no: string | null
    ndt_requirements?: string | null
    mt_result?: string | null
    mt_report_no?: string | null
    ut_result?: string | null
    ut_report_no?: string | null
    rt_result?: string | null
    rt_report_no?: string | null
    pwht_result?: string | null
    ndt_overall_result?: string | null
    defect_length?: number | null
    repair_length?: number | null
    release_note_no?: string | null
    release_note_date?: string | null
    overall_status?: string | null
    excel_row_order?: number | null
}

export interface NdtResultExportRow {
    drawing_no: string
    weld_no: string
    weld_id: string
    ndt_requirements: string
    mt_result: string
    mt_report_no: string
    ut_result: string
    ut_report_no: string
    rt_result: string
    rt_report_no: string
    pwht_result: string
    ndt_overall_result: string
    defect_length: number
    repair_length: number
    release_note_no: string
    release_note_date: string
    status: string
    excel_row_order: number
}

function normalizeText(value: unknown) {
    return value == null ? '' : String(value).trim()
}

function sortByDrawingAndOrder<T extends { drawing_no: string; excel_row_order: number; weld_no?: string }>(
    left: T,
    right: T
) {
    return (
        left.drawing_no.localeCompare(right.drawing_no) ||
        left.excel_row_order - right.excel_row_order ||
        normalizeText(left.weld_no).localeCompare(normalizeText(right.weld_no))
    )
}

function toIsoWeekLabel(value: string) {
    const date = new Date(`${value}T00:00:00Z`)
    if (Number.isNaN(date.getTime())) {
        return 'Khác / Không rõ tuần'
    }

    const working = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = working.getUTCDay() || 7
    working.setUTCDate(working.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((working.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${working.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function buildWeldTraceExportRows(rows: WeldTraceSourceRow[]): WeldTraceExportRow[] {
    return rows
        .map((row) => ({
            weld_id: normalizeText(row.weld_id),
            drawing_no: normalizeText(row.drawing_no),
            weld_no: normalizeText(row.weld_no),
            joint_type: normalizeText(row.joint_type),
            wps_no: normalizeText(row.wps_no),
            weld_size: normalizeText(row.weld_size),
            ndt_requirements: normalizeText(row.ndt_requirements),
            goc_code: normalizeText(row.goc_code),
            weld_finish_date: normalizeText(row.weld_finish_date),
            welders: normalizeText(row.welders),
            status: normalizeText(row.overall_status),
            excel_row_order: Number(row.excel_row_order) || 0,
        }))
        .filter((row) => row.weld_id && row.drawing_no)
        .sort(sortByDrawingAndOrder)
}

export function buildMw1ExportRows(rows: Mw1SourceRow[]): Mw1ExportRow[] {
    return rows
        .map((row) => ({
            mw1_no: normalizeText(row.mw1_no),
            drawing_no: normalizeText(row.drawing_no),
            weld_no: normalizeText(row.weld_no),
            weld_id: normalizeText(row.weld_id),
            goc_code: normalizeText(row.goc_code),
            release_note_no: normalizeText(row.release_note_no),
            cut_off: normalizeText(row.cut_off),
            status: normalizeText(row.overall_status),
            excel_row_order: Number(row.excel_row_order) || 0,
        }))
        .filter((row) => row.mw1_no && row.weld_id)
        .sort((left, right) => left.mw1_no.localeCompare(right.mw1_no) || sortByDrawingAndOrder(left, right))
}

export function buildCutOffWeeklyExportRows(rows: CutOffSourceRow[]): CutOffWeeklyExportRow[] {
    return rows
        .map((row) => {
            const cutOff = normalizeText(row.cut_off)
            return {
                cut_off_week: /^\d{4}-\d{2}-\d{2}$/.test(cutOff)
                    ? toIsoWeekLabel(cutOff)
                    : 'Khác / Không rõ tuần',
                cut_off: cutOff,
                drawing_no: normalizeText(row.drawing_no),
                weld_no: normalizeText(row.weld_no),
                weld_id: normalizeText(row.weld_id),
                release_note_no: normalizeText(row.release_note_no),
                transmittal_no: normalizeText(row.transmittal_no),
                mw1_no: normalizeText(row.mw1_no),
                status: normalizeText(row.overall_status),
                excel_row_order: Number(row.excel_row_order) || 0,
            }
        })
        .filter((row) => row.cut_off && row.weld_id)
        .sort((left, right) => left.cut_off_week.localeCompare(right.cut_off_week) || sortByDrawingAndOrder(left, right))
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

export function buildCutOffWeeklyPrintHtml(
    rows: CutOffWeeklyExportRow[],
    projectLabel = '',
) {
    const safeProjectLabel = projectLabel ? ` - ${escapeHtml(projectLabel)}` : ''
    const bodyRows = rows
        .map(
            (row, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(row.cut_off_week)}</td>
                    <td>${escapeHtml(row.cut_off || '-')}</td>
                    <td>${escapeHtml(row.drawing_no || '-')}</td>
                    <td>${escapeHtml(row.weld_no || '-')}</td>
                    <td>${escapeHtml(row.weld_id || '-')}</td>
                    <td>${escapeHtml(row.release_note_no || '-')}</td>
                    <td>${escapeHtml(row.transmittal_no || '-')}</td>
                    <td>${escapeHtml(row.mw1_no || '-')}</td>
                    <td>${escapeHtml(row.status || '-')}</td>
                </tr>
            `,
        )
        .join('')

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo cáo Cut-Off theo tuần${safeProjectLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 16px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #e2e8f0; font-weight: 700; }
    tbody tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>Báo cáo Cut-Off theo tuần${safeProjectLabel}</h1>
  <p>Xuất từ module Báo cáo tổng hợp.</p>
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Tuần Cut-Off</th>
        <th>Cut-Off</th>
        <th>Bản vẽ</th>
        <th>Weld No</th>
        <th>Weld ID</th>
        <th>Release note</th>
        <th>Transmittal No</th>
        <th>MW1</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</body>
</html>`
}

export function buildNdtResultExportRows(rows: NdtResultSourceRow[]): NdtResultExportRow[] {
    return rows
        .map((row) => ({
            drawing_no: normalizeText(row.drawing_no),
            weld_no: normalizeText(row.weld_no),
            weld_id: normalizeText(row.weld_id),
            ndt_requirements: normalizeText(row.ndt_requirements),
            mt_result: normalizeText(row.mt_result),
            mt_report_no: normalizeText(row.mt_report_no),
            ut_result: normalizeText(row.ut_result),
            ut_report_no: normalizeText(row.ut_report_no),
            rt_result: normalizeText(row.rt_result),
            rt_report_no: normalizeText(row.rt_report_no),
            pwht_result: normalizeText(row.pwht_result),
            ndt_overall_result: normalizeText(row.ndt_overall_result),
            defect_length: Number(row.defect_length) || 0,
            repair_length: Number(row.repair_length) || 0,
            release_note_no: normalizeText(row.release_note_no),
            release_note_date: normalizeText(row.release_note_date),
            status: normalizeText(row.overall_status),
            excel_row_order: Number(row.excel_row_order) || 0,
        }))
        .filter(
            (row) =>
                row.weld_id &&
                (row.mt_result ||
                    row.mt_report_no ||
                    row.ut_result ||
                    row.ut_report_no ||
                    row.rt_result ||
                    row.rt_report_no ||
                    row.pwht_result ||
                    row.ndt_overall_result)
        )
        .sort(sortByDrawingAndOrder)
}
