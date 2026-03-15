export interface DrawingRegistryStoredRow {
    id?: string
    project_id: string
    drawing_no: string
    description: string | null
    part: string | null
    nde_pct: string | null
    dossier_transmittal_no?: string | null
    dossier_submission_date?: string | null
    dossier_notes?: string | null
    total_welds: number
    created_at?: string
}

export interface DrawingRegistryWeldRow {
    drawing_no: string | null
    goc_code?: string | null
    fitup_date?: string | null
    visual_date?: string | null
    overall_status?: string | null
    mt_result?: string | null
    ut_result?: string | null
    rt_result?: string | null
    release_note_no?: string | null
    release_note_date?: string | null
    transmittal_no?: string | null
    cut_off?: string | null
    mw1_no?: string | null
}

export interface DrawingRegistryRow extends DrawingRegistryStoredRow {
    sheet_ref: string
    fitup_done: number
    visual_done: number
    ndt_done: number
    release_done: number
    goc_codes: string
    release_notes: string
    latest_release_note_date: string | null
    transmittal_numbers: string
    cut_off_refs: string
    mw1_numbers: string
}

export interface DrawingSyncRow {
    project_id: string
    drawing_no: string
    total_welds: number
}

function normalizeText(value: unknown) {
    return value == null ? '' : String(value).trim()
}

function shouldCountVisualRegistryProgress(visualDate: string, overallStatus: string) {
    if (!visualDate) {
        return false
    }

    const normalizedStatus = overallStatus.trim().toUpperCase()
    return normalizedStatus !== 'REJ' && normalizedStatus !== 'DELETE'
}

function toSortedUniqueText(values: Array<string | null | undefined>) {
    return Array.from(
        new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right)).join(', ')
}

export function extractDrawingSheet(drawingNo: string | null | undefined) {
    const normalized = normalizeText(drawingNo)
    if (!normalized) return ''

    const dwMatch = normalized.match(/DW-([A-Z0-9.\-]+)$/i)
    if (dwMatch) {
        return dwMatch[1]
    }

    const wmMatch = normalized.match(/([A-Z0-9.]+-[A-Z0-9.]+-WM)$/i)
    if (wmMatch) {
        return wmMatch[1]
    }

    const lastToken = normalized.split('-').pop()
    return lastToken ? lastToken.trim() : ''
}

function createEmptyRegistryRow(projectId: string, drawingNo: string): DrawingRegistryRow {
    return {
        project_id: projectId,
        drawing_no: drawingNo,
        description: null,
        part: null,
        nde_pct: null,
        dossier_transmittal_no: null,
        dossier_submission_date: null,
        dossier_notes: null,
        total_welds: 0,
        sheet_ref: extractDrawingSheet(drawingNo),
        fitup_done: 0,
        visual_done: 0,
        ndt_done: 0,
        release_done: 0,
        goc_codes: '',
        release_notes: '',
        latest_release_note_date: null,
        transmittal_numbers: '',
        cut_off_refs: '',
        mw1_numbers: '',
    }
}

export function buildDrawingSyncRows(projectId: string, welds: Array<Pick<DrawingRegistryWeldRow, 'drawing_no'>>): DrawingSyncRow[] {
    const totals = new Map<string, number>()

    for (const weld of welds) {
        const drawingNo = normalizeText(weld.drawing_no)
        if (!drawingNo) continue
        totals.set(drawingNo, (totals.get(drawingNo) ?? 0) + 1)
    }

    return Array.from(totals.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([drawing_no, total_welds]) => ({ project_id: projectId, drawing_no, total_welds }))
}

export function buildDrawingRegistryRows(
    storedRows: DrawingRegistryStoredRow[],
    weldRows: DrawingRegistryWeldRow[],
): DrawingRegistryRow[] {
    const registry = new Map<string, DrawingRegistryRow>()
    const fallbackTotals = new Map<string, number>()
    const fallbackProjectId = storedRows[0]?.project_id || ''

    for (const stored of storedRows) {
        const drawingNo = normalizeText(stored.drawing_no)
        if (!drawingNo) continue
        fallbackTotals.set(drawingNo, stored.total_welds ?? 0)
        registry.set(drawingNo, {
            ...createEmptyRegistryRow(stored.project_id, drawingNo),
            ...stored,
            drawing_no: drawingNo,
            total_welds: 0,
        })
    }

    for (const weld of weldRows) {
        const drawingNo = normalizeText(weld.drawing_no)
        if (!drawingNo) continue

        const row =
            registry.get(drawingNo) ??
            createEmptyRegistryRow(fallbackProjectId, drawingNo)

        row.total_welds += 1
        if (normalizeText(weld.fitup_date)) row.fitup_done += 1
        if (shouldCountVisualRegistryProgress(normalizeText(weld.visual_date), normalizeText(weld.overall_status))) {
            row.visual_done += 1
        }
        if (
            normalizeText(weld.mt_result) ||
            normalizeText(weld.ut_result) ||
            normalizeText(weld.rt_result)
        ) {
            row.ndt_done += 1
        }
        if (normalizeText(weld.release_note_no)) row.release_done += 1

        row.goc_codes = toSortedUniqueText([row.goc_codes, weld.goc_code])
        row.release_notes = toSortedUniqueText([row.release_notes, weld.release_note_no])
        row.transmittal_numbers = toSortedUniqueText([row.transmittal_numbers, weld.transmittal_no])
        row.cut_off_refs = toSortedUniqueText([row.cut_off_refs, weld.cut_off])
        row.mw1_numbers = toSortedUniqueText([row.mw1_numbers, weld.mw1_no])

        const nextReleaseDate = normalizeText(weld.release_note_date) || null
        if (nextReleaseDate && (!row.latest_release_note_date || nextReleaseDate > row.latest_release_note_date)) {
            row.latest_release_note_date = nextReleaseDate
        }

        registry.set(drawingNo, row)
    }

    for (const [drawingNo, row] of registry.entries()) {
        if (row.total_welds === 0 && (fallbackTotals.get(drawingNo) ?? 0) > 0) {
            row.total_welds = fallbackTotals.get(drawingNo) ?? 0
        }
    }

    return Array.from(registry.values()).sort((left, right) => left.drawing_no.localeCompare(right.drawing_no))
}
