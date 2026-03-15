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
