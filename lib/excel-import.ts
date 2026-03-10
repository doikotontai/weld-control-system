import { deriveWeldWorkflow } from '@/lib/weld-workflow'

export interface PreviewRow {
    weld_id: string
    drawing_no: string
    weld_no: string
    joint_family: string
    joint_type: string
    ndt_requirements: string
    position: string
    weld_length: number | null
    thickness: number | null
    thickness_lamcheck: number | null
    wps_no: string
    goc_code: string
    fitup_inspector: string
    fitup_date: string
    fitup_request_no: string
    weld_finish_date: string
    welders: string
    visual_inspector: string
    visual_date: string
    inspection_request_no: string
    backgouge_date: string
    backgouge_request_no: string
    lamcheck_date: string
    lamcheck_request_no: string
    overall_status: string
    ndt_overall_result: string
    mt_result: string
    mt_report_no: string
    ut_result: string
    ut_report_no: string
    rt_result: string
    rt_report_no: string
    lamcheck_report_no: string
    defect_length: number | null
    repair_length: number | null
    release_final_date: string
    release_final_request_no: string
    release_note_date: string
    release_note_no: string
    pwht_result: string
    ndt_after_pwht: string
    cut_off: string
    note: string
    contractor_issue: string
    transmittal_no: string
    mw1_no: string
    stage: string
}

export type WeldUpsertValue = string | number | boolean | null

export interface WeldUpsertRow extends Record<string, WeldUpsertValue> {
    project_id: string
    weld_id: string
    is_repair: boolean
    stage: string
    excel_row_order: number
}

export type ImportFieldKey =
    | 'weld_id'
    | 'drawing_no'
    | 'weld_no'
    | 'joint_family'
    | 'joint_type'
    | 'ndt_requirements'
    | 'position'
    | 'weld_length'
    | 'thickness'
    | 'thickness_lamcheck'
    | 'wps_no'
    | 'goc_code'
    | 'fitup_inspector'
    | 'fitup_date'
    | 'fitup_request_no'
    | 'weld_finish_date'
    | 'welders'
    | 'visual_inspector'
    | 'visual_date'
    | 'inspection_request_no'
    | 'backgouge_date'
    | 'backgouge_request_no'
    | 'lamcheck_date'
    | 'lamcheck_request_no'
    | 'overall_status'
    | 'ndt_overall_result'
    | 'mt_result'
    | 'mt_report_no'
    | 'ut_result'
    | 'ut_report_no'
    | 'rt_result'
    | 'rt_report_no'
    | 'lamcheck_report_no'
    | 'defect_length'
    | 'repair_length'
    | 'release_final_date'
    | 'release_final_request_no'
    | 'release_note_date'
    | 'release_note_no'
    | 'pwht_result'
    | 'ndt_after_pwht'
    | 'cut_off'
    | 'note'
    | 'contractor_issue'
    | 'transmittal_no'
    | 'mw1_no'

export interface ImportFieldDefinition {
    key: ImportFieldKey
    label: string
    required?: boolean
}

export interface ImportColumnOption {
    index: number
    excelColumn: string
    topLabel: string
    subLabel: string
    combinedLabel: string
    normalizedLabel: string
}

export interface ImportLayoutConfig {
    sheetName: string
    profileId: ImportProfileId
    profileLabel: string
    headerRow: number
    subHeaderRow: number | null
    dataStartRow: number
    fieldToColumn: Partial<Record<ImportFieldKey, number>>
    availableColumns: ImportColumnOption[]
    confidence: number
    issues: string[]
}

export interface ImportWorkbookSource {
    fileName: string
    sheets: Record<string, unknown[][]>
}

export interface ParsedWorkbookData {
    preview: PreviewRow[]
    rows: WeldUpsertRow[]
    issues: string[]
}

type ImportProfileId = 'tnha-classic' | 'rcbk' | 'manual'

interface ImportProfileDefinition {
    id: ImportProfileId
    label: string
    headerRow: number
    subHeaderRow: number | null
    dataStartRow: number
    sheetNameHints: RegExp[]
    signatureAliases: string[]
    requiredFields: ImportFieldKey[]
    fieldAliases: Partial<Record<ImportFieldKey, string[]>>
    fixedColumns?: Partial<Record<ImportFieldKey, number>>
    deriveWeldId?: (drawingNo: string | null, weldNo: string | null) => string | null
}

export const IMPORT_FIELD_DEFINITIONS: ImportFieldDefinition[] = [
    { key: 'weld_id', label: 'Weld ID', required: true },
    { key: 'drawing_no', label: 'Bản vẽ / Drawing', required: true },
    { key: 'weld_no', label: 'Số mối hàn / Weld No', required: true },
    { key: 'joint_family', label: 'Nhóm mối hàn' },
    { key: 'joint_type', label: 'Loại / Cấu hình mối hàn' },
    { key: 'ndt_requirements', label: 'Yêu cầu NDT' },
    { key: 'position', label: 'OD / L / Position' },
    { key: 'weld_length', label: 'Chiều dài mối hàn' },
    { key: 'thickness', label: 'Chiều dày' },
    { key: 'thickness_lamcheck', label: 'Chiều dày Lamcheck' },
    { key: 'wps_no', label: 'WPS No.' },
    { key: 'goc_code', label: 'GOC / System code' },
    { key: 'fitup_inspector', label: 'QC Fit-up' },
    { key: 'fitup_date', label: 'Ngày fit-up đạt' },
    { key: 'fitup_request_no', label: 'Số request fit-up' },
    { key: 'weld_finish_date', label: 'Ngày hàn xong' },
    { key: 'welders', label: 'Welder / Welders ID' },
    { key: 'visual_inspector', label: 'QC visual' },
    { key: 'visual_date', label: 'Ngày visual' },
    { key: 'inspection_request_no', label: 'RQ mời NDT / khách hàng visual' },
    { key: 'backgouge_date', label: 'Ngày backgouge' },
    { key: 'backgouge_request_no', label: 'Request backgouge' },
    { key: 'lamcheck_date', label: 'Ngày lamcheck' },
    { key: 'lamcheck_request_no', label: 'Request lamcheck' },
    { key: 'overall_status', label: 'Status tổng' },
    { key: 'ndt_overall_result', label: 'Kết quả NDT tổng' },
    { key: 'mt_result', label: 'Kết quả MT/PT' },
    { key: 'mt_report_no', label: 'Số report MT/PT' },
    { key: 'ut_result', label: 'Kết quả UT/PAUT' },
    { key: 'ut_report_no', label: 'Số report UT/PAUT' },
    { key: 'rt_result', label: 'Kết quả RT' },
    { key: 'rt_report_no', label: 'Số report RT' },
    { key: 'lamcheck_report_no', label: 'Số report lamcheck' },
    { key: 'defect_length', label: 'Chiều dài khuyết tật' },
    { key: 'repair_length', label: 'Chiều dài sửa chữa' },
    { key: 'release_final_date', label: 'Ngày release final' },
    { key: 'release_final_request_no', label: 'RQ final' },
    { key: 'release_note_date', label: 'Ngày release note' },
    { key: 'release_note_no', label: 'Release note / IRN' },
    { key: 'pwht_result', label: 'Kết quả PWHT' },
    { key: 'ndt_after_pwht', label: 'NDT sau PWHT' },
    { key: 'cut_off', label: 'Cut-off / close-out' },
    { key: 'note', label: 'Ghi chú' },
    { key: 'contractor_issue', label: 'Nhà thầu hỏng' },
    { key: 'transmittal_no', label: 'Transmittal / hoàn công' },
    { key: 'mw1_no', label: 'MW1' },
]

const PROFILE_DEFINITIONS: ImportProfileDefinition[] = [
    {
        id: 'tnha-classic',
        label: 'WELD CONTROL chuẩn TNHA',
        headerRow: 1,
        subHeaderRow: 2,
        dataStartRow: 3,
        sheetNameHints: [/data\s*input/i, /^data$/i],
        signatureAliases: [
            'drawingno',
            'weld no',
            'fit up',
            'visual request mt ut',
            'date bg',
            'date lc',
            'release note',
            'goc system code',
        ],
        requiredFields: ['weld_id', 'drawing_no', 'weld_no'],
        fieldAliases: {
            weld_id: ['&', 'weld id'],
            drawing_no: ['drawingno', 'drawing no'],
            weld_no: ['weld no', 'so m han', 'so moi han'],
            joint_family: ['weld jonts', 'weld joints'],
            joint_type: ['weld type'],
            ndt_requirements: ['ndt'],
            position: ['od l'],
            weld_length: ['length mm'],
            thickness: ['thick mm'],
            thickness_lamcheck: ['thick lamcheck mm'],
            wps_no: ['wps no'],
            goc_code: ['goc system code'],
            fitup_inspector: ['fit up qc fit-up', 'fit up / qc fit-up', 'qc fit-up'],
            fitup_date: ['date ghep dat', 'fit up / date ghep dat'],
            fitup_request_no: ['fit-up request'],
            weld_finish_date: ['finish date'],
            welders: ["welders' id", 'so tho han'],
            visual_inspector: ['visual request mt ut / qc visual', 'qc visual'],
            visual_date: ['date visual request'],
            inspection_request_no: ['request no'],
            backgouge_date: ['date bg'],
            backgouge_request_no: ['request bg'],
            lamcheck_date: ['date lc'],
            lamcheck_request_no: ['request lc'],
            overall_status: ['status'],
            ndt_overall_result: ['ndt result'],
            lamcheck_report_no: ['report lamcheck'],
            defect_length: ['length defect 1'],
            repair_length: ['length repaired'],
            release_final_date: ['date release final'],
            release_final_request_no: ['rq final'],
            release_note_date: ['date release note'],
            release_note_no: ['release note'],
            pwht_result: ['pwht'],
            ndt_after_pwht: ['ndt after pwht'],
            cut_off: ['cut off'],
            note: ['note'],
            contractor_issue: ['nha thau hong'],
            transmittal_no: ['da hoan cong transmittal'],
            mw1_no: ['mw1'],
        },
        fixedColumns: {
            mt_result: 26,
            mt_report_no: 27,
            ut_result: 28,
            ut_report_no: 29,
            rt_result: 30,
            rt_report_no: 31,
        },
        deriveWeldId: (drawingNo, weldNo) => {
            if (!drawingNo || !weldNo) return null
            if (drawingNo.endsWith(weldNo)) return drawingNo
            return `${drawingNo}${weldNo}`
        },
    },
    {
        id: 'rcbk',
        label: 'WELD CONTROL RC&BK',
        headerRow: 3,
        subHeaderRow: 4,
        dataStartRow: 5,
        sheetNameHints: [/data\s*input/i],
        signatureAliases: [
            'drawing no',
            'weld no',
            'fitup acc',
            'request ndt',
            'status after repair',
            'cut off date',
            'cau hinh',
        ],
        requiredFields: ['weld_id', 'drawing_no', 'weld_no'],
        fieldAliases: {
            weld_id: ['no'],
            drawing_no: ['drawing no'],
            weld_no: ['weld no'],
            joint_family: ['type'],
            ndt_requirements: ['ndt'],
            position: ['od'],
            weld_length: ['length mm'],
            thickness: ['thick mm'],
            wps_no: ['wps no'],
            fitup_date: ['fitup acc'],
            fitup_request_no: ['request no'],
            visual_date: ['visual acc'],
            inspection_request_no: ['request ndt'],
            thickness_lamcheck: ['c.day lc', 'c day lc'],
            lamcheck_request_no: ['request ul'],
            welders: ["welders' id"],
            overall_status: ['status'],
            ndt_overall_result: ['ndt'],
            ndt_after_pwht: ['ndt after pwht'],
            lamcheck_report_no: ['lc'],
            defect_length: ['length defect 1'],
            repair_length: ['length repaired'],
            cut_off: ['cut off date'],
            backgouge_date: ['date bg'],
            backgouge_request_no: ['request bg'],
            release_note_no: ['irn'],
            joint_type: ['cau hinh'],
        },
        fixedColumns: {
            mt_result: 18,
            mt_report_no: 19,
            ut_result: 20,
            ut_report_no: 21,
            rt_result: 22,
            rt_report_no: 23,
        },
        deriveWeldId: (drawingNo, weldNo) => {
            if (!drawingNo || !weldNo) return null
            return `${drawingNo}-${weldNo}`
        },
    },
]

const REQUIRED_IMPORT_FIELDS: ImportFieldKey[] = ['weld_id', 'drawing_no', 'weld_no']

function normalizeText(value: unknown): string {
    return value == null ? '' : String(value).trim()
}

function normalizeHeaderLabel(value: unknown): string {
    const normalizedText = normalizeText(value)
    if (normalizedText === '&') {
        return 'weld id'
    }

    return normalizedText
        .replace(/[đĐ]/g, 'd')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
}

function excelColumnName(index: number): string {
    let column = ''
    let current = index + 1
    while (current > 0) {
        const remainder = (current - 1) % 26
        column = String.fromCharCode(65 + remainder) + column
        current = Math.floor((current - 1) / 26)
    }
    return column
}

function parseText(value: unknown): string | null {
    const text = normalizeText(value)
    return text || null
}

function parseResult(value: unknown): string | null {
    const normalized = normalizeText(value).toUpperCase()
    if (!normalized) return null
    if (['ACC', 'ACCEPT', 'ACCEPTED', 'PASS', 'OK', 'FINISH'].includes(normalized)) return 'ACC'
    if (['REJ', 'REJECT', 'REJECTED', 'FAIL'].includes(normalized)) return 'REJ'
    if (['N/A', 'NA', 'NOT APPLICABLE'].includes(normalized)) return 'N/A'
    return null
}

function parseNumber(value: unknown): number | null {
    if (value == null || value === '') return null
    if (typeof value === 'number' && Number.isFinite(value)) return value
    const normalized = normalizeText(value).replace(/,/g, '')
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value: unknown): number | null {
    const parsed = parseNumber(value)
    return parsed == null ? null : Math.trunc(parsed)
}

function parseDate(value: unknown): string | null {
    if (value == null || value === '') return null
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10)
    }

    if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 60000) {
        const utcDays = Math.floor(value - 25569)
        const utcValue = utcDays * 86400
        const date = new Date(utcValue * 1000)
        if (!Number.isNaN(date.getTime())) {
            return date.toISOString().slice(0, 10)
        }
    }

    const text = normalizeText(value)
    if (!text) return null

    const directDate = new Date(text)
    if (!Number.isNaN(directDate.getTime())) {
        return directDate.toISOString().slice(0, 10)
    }

    const dayMonthYear = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dayMonthYear) {
        return `${dayMonthYear[3]}-${dayMonthYear[2].padStart(2, '0')}-${dayMonthYear[1].padStart(2, '0')}`
    }

    return null
}

function buildAvailableColumns(rawData: unknown[][], headerRow: number, subHeaderRow: number | null): ImportColumnOption[] {
    const maxColumns = rawData.reduce((max, row) => Math.max(max, row.length), 0)
    const topRow = rawData[headerRow - 1] || []
    const subRow = subHeaderRow ? rawData[subHeaderRow - 1] || [] : []
    const columns: ImportColumnOption[] = []

    for (let index = 0; index < maxColumns; index += 1) {
        const topLabel = normalizeText(topRow[index])
        const subLabel = normalizeText(subRow[index])
        const combinedLabel = [topLabel, subLabel].filter(Boolean).join(' / ') || `Cột ${excelColumnName(index)}`
        columns.push({
            index,
            excelColumn: excelColumnName(index),
            topLabel,
            subLabel,
            combinedLabel,
            normalizedLabel: normalizeHeaderLabel(combinedLabel),
        })
    }

    return columns
}

function findColumnIndex(columns: ImportColumnOption[], aliases: string[], usedIndices: Set<number>): number | null {
    const normalizedAliases = aliases.map(normalizeHeaderLabel).filter(Boolean)
    if (normalizedAliases.length === 0) return null

    const exact = columns.find((column) => !usedIndices.has(column.index) && normalizedAliases.includes(column.normalizedLabel))
    if (exact) return exact.index

    const partial = columns.find((column) => {
        if (usedIndices.has(column.index)) return false
        if (!column.normalizedLabel) return false
        return normalizedAliases.some((alias) => column.normalizedLabel.includes(alias) || alias.includes(column.normalizedLabel))
    })

    return partial ? partial.index : null
}

function buildFieldToColumn(profile: ImportProfileDefinition, columns: ImportColumnOption[]): Partial<Record<ImportFieldKey, number>> {
    const mapping: Partial<Record<ImportFieldKey, number>> = {}
    const usedIndices = new Set<number>()

    if (profile.fixedColumns) {
        for (const [fieldKey, columnIndex] of Object.entries(profile.fixedColumns) as Array<[ImportFieldKey, number]>) {
            if (columns[columnIndex]) {
                mapping[fieldKey] = columnIndex
                usedIndices.add(columnIndex)
            }
        }
    }

    for (const field of IMPORT_FIELD_DEFINITIONS) {
        if (mapping[field.key] != null) continue
        const aliases = profile.fieldAliases[field.key]
        if (!aliases?.length) continue
        const index = findColumnIndex(columns, aliases, usedIndices)
        if (index != null) {
            mapping[field.key] = index
            usedIndices.add(index)
        }
    }

    return mapping
}

function scoreProfile(rawData: unknown[][], sheetName: string, profile: ImportProfileDefinition) {
    if (rawData.length < profile.dataStartRow) {
        return null
    }

    const columns = buildAvailableColumns(rawData, profile.headerRow, profile.subHeaderRow)
    const mapping = buildFieldToColumn(profile, columns)

    let score = 0
    const maxScore = profile.signatureAliases.length + profile.requiredFields.length + 2
    const normalizedSheetName = normalizeHeaderLabel(sheetName)

    for (const signature of profile.signatureAliases) {
        const normalizedSignature = normalizeHeaderLabel(signature)
        if (columns.some((column) => column.normalizedLabel.includes(normalizedSignature))) {
            score += 1
        }
    }

    for (const requiredField of profile.requiredFields) {
        if (mapping[requiredField] != null) {
            score += 1
        }
    }

    if (profile.sheetNameHints.some((hint) => hint.test(sheetName) || hint.test(normalizedSheetName))) {
        score += 1
    }

    const firstDataRow = rawData[profile.dataStartRow - 1] || []
    if (firstDataRow.length > 0 && (normalizeText(firstDataRow[mapping.drawing_no ?? -1]) || normalizeText(firstDataRow[mapping.weld_no ?? -1]))) {
        score += 1
    }

    return {
        columns,
        mapping,
        confidence: Math.min(score / maxScore, 1),
    }
}

function makeManualLayout(sheetName: string, rawData: unknown[][]): ImportLayoutConfig {
    const headerRow = rawData.length > 0 ? 1 : 0
    const configColumns = headerRow > 0 ? buildAvailableColumns(rawData, headerRow, null) : []
    return {
        sheetName,
        profileId: 'manual',
        profileLabel: 'Tùy chỉnh thủ công',
        headerRow,
        subHeaderRow: null,
        dataStartRow: headerRow > 0 ? 2 : 1,
        fieldToColumn: {},
        availableColumns: configColumns,
        confidence: 0,
        issues: ['Không nhận diện chắc chắn được template. Hãy chỉnh mapping thủ công trước khi import.'],
    }
}

export function detectWorkbookLayout(source: ImportWorkbookSource): ImportLayoutConfig {
    let bestMatch: (ImportLayoutConfig & { score: number }) | null = null

    for (const [sheetName, rawData] of Object.entries(source.sheets)) {
        for (const profile of PROFILE_DEFINITIONS) {
            const scored = scoreProfile(rawData, sheetName, profile)
            if (!scored) continue

            const missingRequiredFields = profile.requiredFields.filter((fieldKey) => scored.mapping[fieldKey] == null)
            const issues: string[] = []
            if (missingRequiredFields.length > 0) {
                issues.push(`Thiếu cột bắt buộc: ${missingRequiredFields.map((fieldKey) => fieldLabel(fieldKey)).join(', ')}`)
            }

            const candidate: ImportLayoutConfig & { score: number } = {
                sheetName,
                profileId: profile.id,
                profileLabel: profile.label,
                headerRow: profile.headerRow,
                subHeaderRow: profile.subHeaderRow,
                dataStartRow: profile.dataStartRow,
                fieldToColumn: scored.mapping,
                availableColumns: scored.columns,
                confidence: scored.confidence,
                issues,
                score: scored.confidence,
            }

            if (!bestMatch || candidate.score > bestMatch.score) {
                bestMatch = candidate
            }
        }
    }

    if (!bestMatch) {
        const firstSheetName = Object.keys(source.sheets)[0]
        return makeManualLayout(firstSheetName, source.sheets[firstSheetName] || [])
    }

    if (bestMatch.confidence < 0.45) {
        const rawData = source.sheets[bestMatch.sheetName] || []
        const manual = makeManualLayout(bestMatch.sheetName, rawData)
        manual.issues = [
            `Template nhận diện chưa đủ chắc (${Math.round(bestMatch.confidence * 100)}%).`,
            ...bestMatch.issues,
        ]
        return manual
    }

    return bestMatch
}

function fieldLabel(fieldKey: ImportFieldKey) {
    return IMPORT_FIELD_DEFINITIONS.find((field) => field.key === fieldKey)?.label || fieldKey
}

function getCellValue(row: unknown[], columnIndex: number | undefined): unknown {
    if (columnIndex == null || columnIndex < 0) return null
    return row[columnIndex]
}

function deriveWeldId(
    profileId: ImportProfileId,
    mappedValue: string | null,
    drawingNo: string | null,
    weldNo: string | null,
) {
    if (mappedValue) return mappedValue

    const profile = PROFILE_DEFINITIONS.find((item) => item.id === profileId)
    const derived = profile?.deriveWeldId?.(drawingNo, weldNo) ?? null
    return derived || null
}

function isLikelyHeaderRow(row: unknown[]) {
    const leadValues = row.slice(0, 6).map((value) => normalizeHeaderLabel(value))
    return leadValues.some((value) =>
        ['drawing no', 'drawingno', 'weld no', 'weld id', 'fitup acc', 'fit up', 'status', 'request no'].includes(value),
    )
}

function parseRowToPreview(
    row: unknown[],
    layout: ImportLayoutConfig,
): PreviewRow | null {
    const pick = (fieldKey: ImportFieldKey) => getCellValue(row, layout.fieldToColumn[fieldKey])

    const drawingNo = parseText(pick('drawing_no'))
    const weldNo = parseText(pick('weld_no'))
    const weldId = deriveWeldId(layout.profileId, parseText(pick('weld_id')), drawingNo, weldNo)

    if (!weldId && !drawingNo && !weldNo) {
        return null
    }

    if (isLikelyHeaderRow(row)) {
        return null
    }

    const mtResult = parseResult(pick('mt_result'))
    const utResult = parseResult(pick('ut_result'))
    const rtResult = parseResult(pick('rt_result'))
    const workflow = deriveWeldWorkflow({
        weldNo,
        fitupDate: parseDate(pick('fitup_date')),
        visualDate: parseDate(pick('visual_date')),
        ndtRequirements: parseText(pick('ndt_requirements')),
        ndtOverallResult: parseText(pick('ndt_overall_result')),
        overallStatusRaw: parseText(pick('overall_status')),
        mtResult,
        utResult,
        rtResult,
        pwhtResult: parseResult(pick('pwht_result')),
        inspectionRequestNo: parseText(pick('inspection_request_no')),
        backgougeDate: parseDate(pick('backgouge_date')),
        backgougeRequestNo: parseText(pick('backgouge_request_no')),
        lamcheckDate: parseDate(pick('lamcheck_date')),
        lamcheckRequestNo: parseText(pick('lamcheck_request_no')),
        lamcheckReportNo: parseText(pick('lamcheck_report_no')),
        releaseFinalDate: parseDate(pick('release_final_date')),
        releaseFinalRequestNo: parseText(pick('release_final_request_no')),
        releaseNoteDate: parseDate(pick('release_note_date')),
        releaseNoteNo: parseText(pick('release_note_no')),
        cutOff: parseText(pick('cut_off')),
        mw1No: parseText(pick('mw1_no')),
    })

    return {
        weld_id: weldId || '',
        drawing_no: drawingNo || '',
        weld_no: weldNo || '',
        joint_family: parseText(pick('joint_family')) || '',
        joint_type: parseText(pick('joint_type')) || '',
        ndt_requirements: parseText(pick('ndt_requirements')) || '',
        position: parseText(pick('position')) || '',
        weld_length: parseNumber(pick('weld_length')),
        thickness: parseInteger(pick('thickness')),
        thickness_lamcheck: parseNumber(pick('thickness_lamcheck')),
        wps_no: parseText(pick('wps_no')) || '',
        goc_code: parseText(pick('goc_code')) || '',
        fitup_inspector: parseText(pick('fitup_inspector')) || '',
        fitup_date: parseDate(pick('fitup_date')) || '',
        fitup_request_no: parseText(pick('fitup_request_no')) || '',
        weld_finish_date: parseDate(pick('weld_finish_date')) || '',
        welders: parseText(pick('welders')) || '',
        visual_inspector: parseText(pick('visual_inspector')) || '',
        visual_date: parseDate(pick('visual_date')) || '',
        inspection_request_no: parseText(pick('inspection_request_no')) || '',
        backgouge_date: parseDate(pick('backgouge_date')) || '',
        backgouge_request_no: parseText(pick('backgouge_request_no')) || '',
        lamcheck_date: parseDate(pick('lamcheck_date')) || '',
        lamcheck_request_no: parseText(pick('lamcheck_request_no')) || '',
        overall_status: workflow.overallStatus,
        ndt_overall_result: workflow.ndtOverallResult || '',
        mt_result: mtResult || '',
        mt_report_no: parseText(pick('mt_report_no')) || '',
        ut_result: utResult || '',
        ut_report_no: parseText(pick('ut_report_no')) || '',
        rt_result: rtResult || '',
        rt_report_no: parseText(pick('rt_report_no')) || '',
        lamcheck_report_no: parseText(pick('lamcheck_report_no')) || '',
        defect_length: parseNumber(pick('defect_length')),
        repair_length: parseNumber(pick('repair_length')),
        release_final_date: parseDate(pick('release_final_date')) || '',
        release_final_request_no: parseText(pick('release_final_request_no')) || '',
        release_note_date: parseDate(pick('release_note_date')) || '',
        release_note_no: parseText(pick('release_note_no')) || '',
        pwht_result: parseResult(pick('pwht_result')) || '',
        ndt_after_pwht: parseText(pick('ndt_after_pwht')) || '',
        cut_off: parseDate(pick('cut_off')) || parseText(pick('cut_off')) || '',
        note: parseText(pick('note')) || '',
        contractor_issue: parseText(pick('contractor_issue')) || '',
        transmittal_no: parseText(pick('transmittal_no')) || '',
        mw1_no: parseText(pick('mw1_no')) || '',
        stage: workflow.stage,
    }
}

function toUpsertRow(previewRow: PreviewRow, projectId: string, excelRowOrder: number): WeldUpsertRow {
    const weldIdUpper = previewRow.weld_id.toUpperCase()
    return {
        project_id: projectId,
        weld_id: previewRow.weld_id,
        drawing_no: previewRow.drawing_no || null,
        weld_no: previewRow.weld_no || null,
        is_repair: /R\d+$/.test(weldIdUpper) || /R\d+$/.test(previewRow.weld_no.toUpperCase()),
        joint_family: previewRow.joint_family || null,
        joint_type: previewRow.joint_type || null,
        ndt_requirements: previewRow.ndt_requirements || null,
        position: previewRow.position || null,
        weld_length: previewRow.weld_length,
        thickness: previewRow.thickness,
        thickness_lamcheck: previewRow.thickness_lamcheck,
        wps_no: previewRow.wps_no || null,
        goc_code: previewRow.goc_code || null,
        fitup_inspector: previewRow.fitup_inspector || null,
        fitup_date: previewRow.fitup_date || null,
        fitup_request_no: previewRow.fitup_request_no || null,
        weld_finish_date: previewRow.weld_finish_date || null,
        welders: previewRow.welders || null,
        visual_inspector: previewRow.visual_inspector || null,
        visual_date: previewRow.visual_date || null,
        inspection_request_no: previewRow.inspection_request_no || null,
        backgouge_date: previewRow.backgouge_date || null,
        backgouge_request_no: previewRow.backgouge_request_no || null,
        lamcheck_date: previewRow.lamcheck_date || null,
        lamcheck_request_no: previewRow.lamcheck_request_no || null,
        overall_status: previewRow.overall_status || null,
        ndt_overall_result: previewRow.ndt_overall_result || null,
        mt_result: previewRow.mt_result || null,
        mt_report_no: previewRow.mt_report_no || null,
        ut_result: previewRow.ut_result || null,
        ut_report_no: previewRow.ut_report_no || null,
        rt_result: previewRow.rt_result || null,
        rt_report_no: previewRow.rt_report_no || null,
        lamcheck_report_no: previewRow.lamcheck_report_no || null,
        defect_length: previewRow.defect_length,
        repair_length: previewRow.repair_length,
        release_final_date: previewRow.release_final_date || null,
        release_final_request_no: previewRow.release_final_request_no || null,
        release_note_date: previewRow.release_note_date || null,
        release_note_no: previewRow.release_note_no || null,
        pwht_result: previewRow.pwht_result || null,
        ndt_after_pwht: previewRow.ndt_after_pwht || null,
        cut_off: previewRow.cut_off || null,
        note: previewRow.note || null,
        contractor_issue: previewRow.contractor_issue || null,
        transmittal_no: previewRow.transmittal_no || null,
        mw1_no: previewRow.mw1_no || null,
        stage: previewRow.stage,
        final_status: previewRow.overall_status === 'FINISH' ? 'OK' : previewRow.overall_status === 'REJ' ? 'REJECT' : null,
        excel_row_order: excelRowOrder,
    }
}

export function parseWorkbookData(
    source: ImportWorkbookSource,
    layout: ImportLayoutConfig,
    projectId: string | null,
): ParsedWorkbookData {
    const rawData = source.sheets[layout.sheetName] || []
    const issues = [...layout.issues]

    const missingRequired = REQUIRED_IMPORT_FIELDS.filter((fieldKey) => layout.fieldToColumn[fieldKey] == null)
    if (missingRequired.length > 0) {
        issues.push(`Chưa map đủ cột bắt buộc: ${missingRequired.map((fieldKey) => fieldLabel(fieldKey)).join(', ')}`)
    }

    const preview: PreviewRow[] = []
    const rows: WeldUpsertRow[] = []

    let dataRowOrder = 0
    for (let rowIndex = Math.max(layout.dataStartRow - 1, 0); rowIndex < rawData.length; rowIndex += 1) {
        const row = rawData[rowIndex] || []
        const parsedRow = parseRowToPreview(row, layout)
        if (!parsedRow?.weld_id || !parsedRow.drawing_no || !parsedRow.weld_no) {
            continue
        }

        dataRowOrder += 1
        if (preview.length < 10) {
            preview.push(parsedRow)
        }
        if (projectId && missingRequired.length === 0) {
            rows.push(toUpsertRow(parsedRow, projectId, dataRowOrder))
        }
    }

    if (rows.length === 0) {
        if (preview.length === 0) {
            issues.push('Không tìm thấy dòng dữ liệu hợp lệ theo cấu hình hiện tại.')
        } else if (!projectId) {
            issues.push('Đã đọc được dữ liệu preview, nhưng cần chọn dự án trước khi import.')
        }
    }

    return { preview, rows, issues }
}

export function cloneLayoutWithColumns(
    layout: ImportLayoutConfig,
    rawData: unknown[][],
    override?: Partial<Pick<ImportLayoutConfig, 'headerRow' | 'subHeaderRow'>>,
): ImportLayoutConfig {
    const headerRow = override?.headerRow ?? layout.headerRow
    const subHeaderRow = override?.subHeaderRow ?? layout.subHeaderRow
    return {
        ...layout,
        headerRow,
        subHeaderRow,
        availableColumns: buildAvailableColumns(rawData, headerRow, subHeaderRow),
    }
}
