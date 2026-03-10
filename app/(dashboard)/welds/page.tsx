'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import SyncedTableFrame from '@/components/SyncedTableFrame'
import { createClient } from '@/lib/supabase/client'
import { formatNumber } from '@/lib/formatters'
import { PROJECT_CHANGE_EVENT, readActiveProjectIdFromCookie } from '@/lib/project-selection'
import { deriveWeldWorkflow } from '@/lib/weld-workflow'
import { STAGE_LABELS } from '@/types'
import { useRoleGuard } from '@/lib/use-role-guard'

type SortDir = 'asc' | 'desc'
type Align = 'right' | 'center'
type InputType = 'text' | 'number' | 'date' | 'select'
type ColFilters = Record<string, string>
type DraftRow = Record<string, string>
type ColumnWidths = Record<string, number>
type TableMessage = { type: 'success' | 'error'; text: string } | null
type WeldRow = Record<string, unknown> & { id: string }

interface WeldUpdateTable {
    update(values: Record<string, string | number | null>): {
        eq(column: 'id', value: string): Promise<{ error: { message: string } | null }>
    }
}

interface ColSort {
    col: string
    dir: SortDir
}

interface SelectOption {
    value: string
    label: string
}

interface ResizeState {
    key: string
    startX: number
    startWidth: number
}

interface ColumnDef {
    key: string
    label: string
    minWidth?: number
    align?: Align
    inputType?: InputType
    options?: SelectOption[]
    readOnly?: boolean
}

const LIMIT_OPTIONS = [50, 100, 200, 500, 1000, 999999]
const ACTION_COLUMN_KEY = '__actions__'
const ACTION_COLUMN_DEFAULT_WIDTH = 180
const COLUMN_RESIZE_STORAGE_KEY = 'weld-management-column-widths-v1'

const RESULT_OPTIONS: SelectOption[] = [
    { value: '', label: '-- Chưa có --' },
    { value: 'ACC', label: 'ACC' },
    { value: 'REJ', label: 'REJ' },
    { value: 'N/A', label: 'N/A' },
]

const OVERALL_NDT_OPTIONS: SelectOption[] = [
    { value: '', label: '-- Chưa có --' },
    { value: 'ACC', label: 'ACC' },
    { value: 'REJ', label: 'REJ' },
]

const FINAL_STATUS_OPTIONS: SelectOption[] = [
    { value: '', label: '-- Tự tính --' },
    { value: 'OK', label: 'OK' },
    { value: 'REPAIR', label: 'REPAIR' },
    { value: 'REJECT', label: 'REJECT' },
]

const JOINT_TYPE_OPTIONS: SelectOption[] = [
    { value: '', label: '-- Chọn --' },
    { value: 'DB', label: 'DB' },
    { value: 'DV', label: 'DV' },
    { value: 'SB', label: 'SB' },
    { value: 'SV', label: 'SV' },
    { value: 'X1', label: 'X1' },
    { value: 'X2', label: 'X2' },
    { value: 'X3', label: 'X3' },
]

const STATUS_OPTIONS: SelectOption[] = [
    { value: '', label: 'Tất cả' },
    { value: 'HAVE NOT WELD', label: 'HAVE NOT WELD' },
    { value: 'NOT YET FITUP', label: 'NOT YET FITUP' },
    { value: 'NOT YET VISUAL', label: 'NOT YET VISUAL' },
    { value: 'NOT YET NDT', label: 'NOT YET NDT' },
    { value: 'FINISH', label: 'FINISH' },
    { value: 'REJ', label: 'REJ' },
    { value: 'DELETE', label: 'DELETE' },
]

const STAGE_OPTIONS: SelectOption[] = [
    { value: '', label: 'Tất cả' },
    ...Object.entries(STAGE_LABELS).map(([value, label]) => ({
        value,
        label:
            value === 'completed'
                ? 'Hoàn thành'
                : value === 'rejected'
                  ? 'Bị từ chối'
                  : label,
    })),
]

const COLUMNS: ColumnDef[] = [
    { key: 'excel_row_order', label: '#', minWidth: 52, align: 'center', inputType: 'number' },
    { key: 'weld_id', label: 'Weld ID', minWidth: 220, inputType: 'text' },
    { key: 'drawing_no', label: 'Bản vẽ', minWidth: 180, inputType: 'text' },
    { key: 'weld_no', label: 'Weld No', minWidth: 90, align: 'center', inputType: 'text' },
    { key: 'joint_family', label: 'Nhóm mối hàn', minWidth: 120, inputType: 'text' },
    { key: 'joint_type', label: 'Loại mối hàn', minWidth: 110, inputType: 'select', options: JOINT_TYPE_OPTIONS },
    { key: 'ndt_requirements', label: 'Yêu cầu NDT', minWidth: 140, inputType: 'text' },
    { key: 'position', label: 'OD / L', minWidth: 90, align: 'center', inputType: 'text' },
    { key: 'weld_length', label: 'Chiều dài', minWidth: 100, align: 'right', inputType: 'number' },
    { key: 'thickness', label: 'Độ dày', minWidth: 90, align: 'right', inputType: 'number' },
    { key: 'thickness_lamcheck', label: 'Độ dày LC', minWidth: 95, align: 'right', inputType: 'number' },
    { key: 'wps_no', label: 'WPS', minWidth: 120, inputType: 'text' },
    { key: 'goc_code', label: 'GOC Code', minWidth: 100, inputType: 'text' },
    { key: 'fitup_inspector', label: 'QC Fit-Up', minWidth: 110, inputType: 'text' },
    { key: 'fitup_date', label: 'Ngày Fit-Up', minWidth: 115, inputType: 'date' },
    { key: 'fitup_request_no', label: 'Request Fit-Up', minWidth: 120, inputType: 'text' },
    { key: 'weld_finish_date', label: 'Hoàn thành hàn', minWidth: 125, inputType: 'date' },
    { key: 'welders', label: 'Welder ID', minWidth: 160, inputType: 'text' },
    { key: 'visual_inspector', label: 'QC Visual', minWidth: 110, inputType: 'text' },
    { key: 'visual_date', label: 'Ngày Visual', minWidth: 115, inputType: 'date' },
    { key: 'inspection_request_no', label: 'RQ NDT / Visual', minWidth: 130, inputType: 'text' },
    { key: 'backgouge_date', label: 'Ngày BG', minWidth: 105, inputType: 'date' },
    { key: 'backgouge_request_no', label: 'Request BG', minWidth: 120, inputType: 'text' },
    { key: 'lamcheck_date', label: 'Ngày Lamcheck', minWidth: 125, inputType: 'date' },
    { key: 'lamcheck_request_no', label: 'Request Lamcheck', minWidth: 135, inputType: 'text' },
    { key: 'lamcheck_report_no', label: 'Báo cáo Lamcheck', minWidth: 145, inputType: 'text' },
    { key: 'ndt_overall_result', label: 'NDT tổng (Z)', minWidth: 105, align: 'center', inputType: 'select', options: OVERALL_NDT_OPTIONS },
    { key: 'mt_result', label: 'KQ MT', minWidth: 80, align: 'center', inputType: 'select', options: RESULT_OPTIONS },
    { key: 'mt_report_no', label: 'Báo cáo MT', minWidth: 135, inputType: 'text' },
    { key: 'ut_result', label: 'KQ UT', minWidth: 80, align: 'center', inputType: 'select', options: RESULT_OPTIONS },
    { key: 'ut_report_no', label: 'Báo cáo UT', minWidth: 135, inputType: 'text' },
    { key: 'rt_result', label: 'KQ RT', minWidth: 80, align: 'center', inputType: 'select', options: RESULT_OPTIONS },
    { key: 'rt_report_no', label: 'Báo cáo RT', minWidth: 135, inputType: 'text' },
    { key: 'pwht_result', label: 'KQ PWHT', minWidth: 90, align: 'center', inputType: 'select', options: RESULT_OPTIONS },
    { key: 'ndt_after_pwht', label: 'NDT sau PWHT', minWidth: 130, inputType: 'text' },
    { key: 'defect_length', label: 'Chiều dài khuyết tật', minWidth: 145, align: 'right', inputType: 'number' },
    { key: 'repair_length', label: 'Chiều dài sửa', minWidth: 125, align: 'right', inputType: 'number' },
    { key: 'release_final_date', label: 'Ngày release final', minWidth: 145, inputType: 'date' },
    { key: 'release_final_request_no', label: 'RQ release final', minWidth: 140, inputType: 'text' },
    { key: 'release_note_no', label: 'Release note', minWidth: 145, inputType: 'text' },
    { key: 'release_note_date', label: 'Ngày release', minWidth: 120, inputType: 'date' },
    { key: 'cut_off', label: 'Cut Off', minWidth: 120, inputType: 'text' },
    { key: 'note', label: 'Ghi chú release', minWidth: 180, inputType: 'text' },
    { key: 'contractor_issue', label: 'Contractor issue', minWidth: 150, inputType: 'text' },
    { key: 'transmittal_no', label: 'Transmittal No', minWidth: 140, inputType: 'text' },
    { key: 'mw1_no', label: 'MW1', minWidth: 120, inputType: 'text' },
    { key: 'overall_status', label: 'Status (Y)', minWidth: 130, inputType: 'select', options: STATUS_OPTIONS, readOnly: true },
    { key: 'stage', label: 'Stage', minWidth: 110, inputType: 'select', options: STAGE_OPTIONS, readOnly: true },
    { key: 'final_status', label: 'Trạng thái cuối', minWidth: 130, inputType: 'select', options: FINAL_STATUS_OPTIONS, readOnly: true },
    { key: 'remarks', label: 'Remarks', minWidth: 220, inputType: 'text' },
]

const STAGE_COLORS: Record<string, string> = {
    fitup: '#0891b2',
    welding: '#92400e',
    visual: '#b45309',
    request: '#0ea5e9',
    backgouge: '#c2410c',
    lamcheck: '#065f46',
    ndt: '#7c3aed',
    release: '#166534',
    cutoff: '#475569',
    mw1: '#06b6d4',
    completed: '#16a34a',
    rejected: '#b91c1c',
}

const DATE_COLUMNS = new Set(
    COLUMNS.filter((column) => column.inputType === 'date').map((column) => column.key)
)
const INTEGER_COLUMNS = new Set(['excel_row_order', 'thickness'])
const READ_ONLY_INLINE_COLUMNS = new Set(['excel_row_order', 'overall_status', 'stage', 'final_status'])

function getDefaultColumnWidths(): ColumnWidths {
    return COLUMNS.reduce<ColumnWidths>(
        (acc, column) => {
            acc[column.key] = column.minWidth || 120
            return acc
        },
        { [ACTION_COLUMN_KEY]: ACTION_COLUMN_DEFAULT_WIDTH }
    )
}

function sanitizeColumnWidths(value: unknown) {
    const defaults = getDefaultColumnWidths()
    if (!value || typeof value !== 'object') {
        return defaults
    }

    const next = { ...defaults }
    for (const [key, width] of Object.entries(value as Record<string, unknown>)) {
        if (typeof width !== 'number' || Number.isNaN(width)) {
            continue
        }
        next[key] = Math.max(72, Math.round(width))
    }

    return next
}

function normalizeText(value: unknown) {
    return value == null ? '' : String(value).trim()
}

function normalizeDate(value: unknown) {
    return value ? String(value).slice(0, 10) : ''
}

function parseNullableNumber(value: string, integer = false) {
    const normalized = normalizeText(value)
    if (!normalized) {
        return null
    }

    const parsed = integer ? Number.parseInt(normalized, 10) : Number.parseFloat(normalized)
    return Number.isNaN(parsed) ? null : parsed
}

function getDisplayWorkflow(weld: Record<string, unknown>) {
    return deriveWeldWorkflow({
        weldNo: normalizeText(weld.weld_no),
        fitupDate: normalizeDate(weld.fitup_date),
        visualDate: normalizeDate(weld.visual_date),
        ndtRequirements: normalizeText(weld.ndt_requirements),
        ndtOverallResult: normalizeText(weld.ndt_overall_result),
        overallStatusRaw: normalizeText(weld.overall_status),
        mtResult: normalizeText(weld.mt_result),
        utResult: normalizeText(weld.ut_result),
        rtResult: normalizeText(weld.rt_result),
        pwhtResult: normalizeText(weld.pwht_result),
        inspectionRequestNo: normalizeText(weld.inspection_request_no),
        backgougeDate: normalizeDate(weld.backgouge_date),
        backgougeRequestNo: normalizeText(weld.backgouge_request_no),
        lamcheckDate: normalizeDate(weld.lamcheck_date),
        lamcheckRequestNo: normalizeText(weld.lamcheck_request_no),
        lamcheckReportNo: normalizeText(weld.lamcheck_report_no),
        releaseFinalDate: normalizeDate(weld.release_final_date),
        releaseFinalRequestNo: normalizeText(weld.release_final_request_no),
        releaseNoteDate: normalizeDate(weld.release_note_date),
        releaseNoteNo: normalizeText(weld.release_note_no),
        cutOff: normalizeText(weld.cut_off),
        mw1No: normalizeText(weld.mw1_no),
    })
}

function buildDraftFromWeld(weld: WeldRow): DraftRow {
    const draft: DraftRow = {}
    for (const column of COLUMNS) {
        draft[column.key] = DATE_COLUMNS.has(column.key) ? normalizeDate(weld[column.key]) : normalizeText(weld[column.key])
    }
    return draft
}

function buildInlineUpdatePayload(draft: DraftRow) {
    const workflow = deriveWeldWorkflow({
        weldNo: draft.weld_no,
        fitupDate: draft.fitup_date,
        visualDate: draft.visual_date,
        ndtRequirements: draft.ndt_requirements,
        ndtOverallResult: draft.ndt_overall_result,
        overallStatusRaw: draft.overall_status,
        mtResult: draft.mt_result,
        utResult: draft.ut_result,
        rtResult: draft.rt_result,
        pwhtResult: draft.pwht_result,
        inspectionRequestNo: draft.inspection_request_no,
        backgougeDate: draft.backgouge_date,
        backgougeRequestNo: draft.backgouge_request_no,
        lamcheckDate: draft.lamcheck_date,
        lamcheckRequestNo: draft.lamcheck_request_no,
        lamcheckReportNo: draft.lamcheck_report_no,
        releaseFinalDate: draft.release_final_date,
        releaseFinalRequestNo: draft.release_final_request_no,
        releaseNoteDate: draft.release_note_date,
        releaseNoteNo: draft.release_note_no,
        cutOff: draft.cut_off,
        mw1No: draft.mw1_no,
    })

    return {
        weld_id: normalizeText(draft.weld_id) || null,
        drawing_no: normalizeText(draft.drawing_no) || null,
        weld_no: normalizeText(draft.weld_no) || null,
        joint_family: normalizeText(draft.joint_family) || null,
        joint_type: normalizeText(draft.joint_type) || null,
        ndt_requirements: normalizeText(draft.ndt_requirements) || null,
        position: normalizeText(draft.position) || null,
        weld_length: parseNullableNumber(draft.weld_length),
        thickness: parseNullableNumber(draft.thickness, true),
        thickness_lamcheck: parseNullableNumber(draft.thickness_lamcheck),
        wps_no: normalizeText(draft.wps_no) || null,
        goc_code: normalizeText(draft.goc_code) || null,
        fitup_inspector: normalizeText(draft.fitup_inspector) || null,
        fitup_date: normalizeText(draft.fitup_date) || null,
        fitup_request_no: normalizeText(draft.fitup_request_no) || null,
        weld_finish_date: normalizeText(draft.weld_finish_date) || null,
        welders: normalizeText(draft.welders) || null,
        visual_inspector: normalizeText(draft.visual_inspector) || null,
        visual_date: normalizeText(draft.visual_date) || null,
        inspection_request_no: normalizeText(draft.inspection_request_no) || null,
        backgouge_date: normalizeText(draft.backgouge_date) || null,
        backgouge_request_no: normalizeText(draft.backgouge_request_no) || null,
        lamcheck_date: normalizeText(draft.lamcheck_date) || null,
        lamcheck_request_no: normalizeText(draft.lamcheck_request_no) || null,
        lamcheck_report_no: normalizeText(draft.lamcheck_report_no) || null,
        ndt_overall_result: normalizeText(draft.ndt_overall_result) || null,
        mt_result: normalizeText(draft.mt_result) || null,
        mt_report_no: normalizeText(draft.mt_report_no) || null,
        ut_result: normalizeText(draft.ut_result) || null,
        ut_report_no: normalizeText(draft.ut_report_no) || null,
        rt_result: normalizeText(draft.rt_result) || null,
        rt_report_no: normalizeText(draft.rt_report_no) || null,
        pwht_result: normalizeText(draft.pwht_result) || null,
        ndt_after_pwht: normalizeText(draft.ndt_after_pwht) || null,
        defect_length: parseNullableNumber(draft.defect_length),
        repair_length: parseNullableNumber(draft.repair_length),
        release_final_date: normalizeText(draft.release_final_date) || null,
        release_final_request_no: normalizeText(draft.release_final_request_no) || null,
        release_note_no: normalizeText(draft.release_note_no) || null,
        release_note_date: normalizeText(draft.release_note_date) || null,
        cut_off: normalizeText(draft.cut_off) || null,
        note: normalizeText(draft.note) || null,
        contractor_issue: normalizeText(draft.contractor_issue) || null,
        transmittal_no: normalizeText(draft.transmittal_no) || null,
        mw1_no: normalizeText(draft.mw1_no) || null,
        overall_status: workflow.overallStatus,
        stage: workflow.stage,
        final_status: workflow.finalStatus,
        remarks: normalizeText(draft.remarks) || null,
    }
}

function ResultBadge({ result }: { result: string | null | undefined }) {
    if (!result) {
        return <span style={{ color: '#94a3b8' }}>-</span>
    }

    const ok = result === 'ACC'
    const rej = result === 'REJ'

    return (
        <span
            style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.72rem',
                background: ok ? '#dcfce7' : rej ? '#fee2e2' : '#f1f5f9',
                color: ok ? '#166534' : rej ? '#991b1b' : '#64748b',
            }}
        >
            {result}
        </span>
    )
}

function StageBadge({ stage }: { stage: string | null | undefined }) {
    if (!stage) {
        return <span style={{ color: '#94a3b8' }}>-</span>
    }

    const color = STAGE_COLORS[stage] || '#64748b'
    const label =
        stage === 'completed'
            ? 'Hoàn thành'
            : stage === 'rejected'
              ? 'Bị từ chối'
              : STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage

    return (
        <span
            style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                background: `${color}18`,
                color,
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </span>
    )
}

function StatusBadge({ status }: { status: string | null | undefined }) {
    if (!status) {
        return <span style={{ color: '#94a3b8' }}>-</span>
    }

    const color =
        status === 'FINISH'
            ? '#166534'
            : status === 'REJ' || status === 'DELETE'
              ? '#b91c1c'
              : '#b45309'

    return (
        <span
            style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                background: `${color}18`,
                color,
                whiteSpace: 'nowrap',
            }}
        >
            {status}
        </span>
    )
}

function FinalStatusBadge({ status }: { status: string | null | undefined }) {
    if (!status) {
        return <span style={{ color: '#94a3b8' }}>-</span>
    }

    const color = status === 'OK' ? '#166534' : status === 'REJECT' ? '#b91c1c' : '#b45309'

    return (
        <span
            style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                background: `${color}18`,
                color,
                whiteSpace: 'nowrap',
            }}
        >
            {status}
        </span>
    )
}

function renderReadOnlyCell(column: ColumnDef, weld: WeldRow, columnWidth: number) {
    const workflow = getDisplayWorkflow(weld)
    const value =
        column.key === 'overall_status'
            ? workflow.overallStatus
            : column.key === 'ndt_overall_result'
              ? workflow.ndtOverallResult
              : column.key === 'stage'
                ? workflow.stage
                : column.key === 'final_status'
                  ? workflow.finalStatus
                  : weld[column.key]

    switch (column.key) {
        case 'excel_row_order':
            return <span style={{ color: '#94a3b8', fontWeight: 600 }}>{(value as number) || ''}</span>
        case 'weld_id':
            return (
                <Link
                    href={`/welds/${weld.id}`}
                    style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                    {normalizeText(value)}
                </Link>
            )
        case 'drawing_no':
            return <span style={{ color: '#64748b' }}>{normalizeText(value)}</span>
        case 'joint_family':
        case 'joint_type':
        case 'weld_no':
            return <span style={{ fontWeight: 600 }}>{normalizeText(value)}</span>
        case 'goc_code':
            return value ? (
                <span style={{ padding: '1px 4px', background: '#f1f5f9', borderRadius: '3px' }}>{normalizeText(value)}</span>
            ) : null
        case 'wps_no':
            return <span style={{ color: '#6366f1' }}>{normalizeText(value)}</span>
        case 'weld_length':
        case 'thickness':
        case 'thickness_lamcheck':
        case 'defect_length':
        case 'repair_length':
            return <span>{formatNumber(value as number | null | undefined)}</span>
        case 'ndt_overall_result':
        case 'mt_result':
        case 'ut_result':
        case 'rt_result':
        case 'pwht_result':
            return <ResultBadge result={value as string | null | undefined} />
        case 'overall_status':
            return <StatusBadge status={value as string | null | undefined} />
        case 'final_status':
            return <FinalStatusBadge status={value as string | null | undefined} />
        case 'release_note_no':
            return <span style={{ fontWeight: 600, color: '#0369a1' }}>{normalizeText(value)}</span>
        case 'stage':
            return <StageBadge stage={value as string | null | undefined} />
        default:
            if (DATE_COLUMNS.has(column.key)) {
                return <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{normalizeDate(value)}</span>
            }

            return (
                <span
                    style={{
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        maxWidth: `${Math.max(columnWidth - 18, 60)}px`,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {normalizeText(value)}
                </span>
            )
    }
}

function getFilterOptions(column: ColumnDef): SelectOption[] | null {
    if (column.key === 'overall_status') {
        return STATUS_OPTIONS
    }

    if (column.key === 'stage') {
        return STAGE_OPTIONS
    }

    if (column.key === 'final_status') {
        return [{ value: '', label: 'Tất cả' }, ...FINAL_STATUS_OPTIONS.filter((option) => option.value)]
    }

    if (column.key === 'ndt_overall_result') {
        return [{ value: '', label: 'Tất cả' }, ...OVERALL_NDT_OPTIONS.filter((option) => option.value)]
    }

    if (['mt_result', 'ut_result', 'rt_result', 'pwht_result'].includes(column.key)) {
        return [{ value: '', label: 'Tất cả' }, ...RESULT_OPTIONS.filter((option) => option.value)]
    }

    if (column.key === 'joint_type') {
        return [{ value: '', label: 'Tất cả' }, ...JOINT_TYPE_OPTIONS.filter((option) => option.value)]
    }

    return null
}

export default function WeldsPage() {
    const supabase = createClient()
    const searchParams = useSearchParams()
    const drawingFilter = searchParams.get('drawing') || ''
    const { role, checking: checkingRole } = useRoleGuard(['admin', 'dcc', 'qc', 'inspector', 'viewer'])
    const [welds, setWelds] = useState<WeldRow[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [page, setPage] = useState(0)
    const [limit, setLimit] = useState(50)
    const [sort, setSort] = useState<ColSort>({ col: 'excel_row_order', dir: 'asc' })
    const [colFilters, setColFilters] = useState<ColFilters>({})
    const [globalSearch, setGlobalSearch] = useState(drawingFilter)
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
    const [editingRowId, setEditingRowId] = useState<string | null>(null)
    const [draftRow, setDraftRow] = useState<DraftRow>({})
    const [rowSavingId, setRowSavingId] = useState<string | null>(null)
    const [tableMessage, setTableMessage] = useState<TableMessage>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)
    const resizeStateRef = useRef<ResizeState | null>(null)
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => getDefaultColumnWidths())
    const [draggingColumnKey, setDraggingColumnKey] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        try {
            const raw = window.localStorage.getItem(COLUMN_RESIZE_STORAGE_KEY)
            if (!raw) {
                return
            }
            setColumnWidths(sanitizeColumnWidths(JSON.parse(raw)))
        } catch {
            setColumnWidths(getDefaultColumnWidths())
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        try {
            window.localStorage.setItem(COLUMN_RESIZE_STORAGE_KEY, JSON.stringify(columnWidths))
        } catch {
            // Ignore storage write failures and keep the in-memory widths.
        }
    }, [columnWidths])

    useEffect(() => {
        const stopResize = () => {
            if (!resizeStateRef.current) {
                return
            }

            resizeStateRef.current = null
            setDraggingColumnKey(null)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        const handlePointerMove = (event: PointerEvent) => {
            const active = resizeStateRef.current
            if (!active) {
                return
            }

            const nextWidth = Math.max(72, Math.round(active.startWidth + (event.clientX - active.startX)))
            setColumnWidths((current) => {
                if (current[active.key] === nextWidth) {
                    return current
                }
                return { ...current, [active.key]: nextWidth }
            })
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', stopResize)
        window.addEventListener('pointercancel', stopResize)

        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', stopResize)
            window.removeEventListener('pointercancel', stopResize)
            stopResize()
        }
    }, [])

    useEffect(() => {
        const syncProject = () => setCurrentProjectId(readActiveProjectIdFromCookie())
        syncProject()
        window.addEventListener(PROJECT_CHANGE_EVENT, syncProject)
        window.addEventListener('focus', syncProject)
        return () => {
            window.removeEventListener(PROJECT_CHANGE_EVENT, syncProject)
            window.removeEventListener('focus', syncProject)
        }
    }, [])

    useEffect(() => {
        if (drawingFilter) {
            setGlobalSearch(drawingFilter)
        }
    }, [drawingFilter])

    const fetchWelds = useCallback(async () => {
        if (!currentProjectId) {
            setWelds([])
            setTotalCount(0)
            setLoading(false)
            return
        }

        setLoading(true)

        let query = supabase
            .from('welds')
            .select('*', { count: 'exact' })
            .eq('project_id', currentProjectId)
            .order(sort.col, { ascending: sort.dir === 'asc', nullsFirst: sort.dir === 'asc' })
            .range(page * limit, (page + 1) * limit - 1)

        if (globalSearch.trim()) {
            query = query.or(
                `weld_id.ilike.%${globalSearch}%,weld_no.ilike.%${globalSearch}%,drawing_no.ilike.%${globalSearch}%,welders.ilike.%${globalSearch}%,joint_family.ilike.%${globalSearch}%`
            )
        }

        for (const [column, value] of Object.entries(colFilters)) {
            const trimmed = value.trim()
            if (!trimmed) {
                continue
            }

            const numericColumns = ['excel_row_order', 'weld_length', 'thickness', 'thickness_lamcheck', 'defect_length', 'repair_length']
            query = numericColumns.includes(column) ? query.eq(column, trimmed) : query.ilike(column, `%${trimmed}%`)
        }

        const { data, count } = await query
        setWelds((data as WeldRow[]) || [])
        setTotalCount(count || 0)
        setLoading(false)
    }, [colFilters, currentProjectId, globalSearch, limit, page, sort, supabase])

    useEffect(() => {
        if (currentProjectId === null) {
            return
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(fetchWelds, 280)
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [currentProjectId, fetchWelds])

    const canEdit = role !== null && ['admin', 'dcc', 'qc'].includes(role)
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit)
    const actionColumnWidth = columnWidths[ACTION_COLUMN_KEY] || ACTION_COLUMN_DEFAULT_WIDTH

    const getColumnWidth = (column: ColumnDef) => columnWidths[column.key] || column.minWidth || 120

    const startColumnResize = (key: string, startWidth: number, event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()

        resizeStateRef.current = {
            key,
            startX: event.clientX,
            startWidth,
        }
        setDraggingColumnKey(key)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        if (event.currentTarget.setPointerCapture) {
            event.currentTarget.setPointerCapture(event.pointerId)
        }
    }

    const handleSort = (column: string) => {
        setSort((current) => ({
            col: column,
            dir: current.col === column && current.dir === 'asc' ? 'desc' : 'asc',
        }))
        setPage(0)
    }

    const setFilter = (column: string, value: string) => {
        setColFilters((current) => ({ ...current, [column]: value }))
        setPage(0)
    }

    const handleExport = async () => {
        const { utils, writeFile } = await import('xlsx')
        const worksheet = utils.json_to_sheet(welds)
        const workbook = utils.book_new()
        utils.book_append_sheet(workbook, worksheet, 'Welds')
        writeFile(workbook, `weld-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const startInlineEdit = (weld: WeldRow) => {
        setEditingRowId(String(weld.id))
        setDraftRow(buildDraftFromWeld(weld))
        setTableMessage(null)
    }

    const cancelInlineEdit = () => {
        setEditingRowId(null)
        setDraftRow({})
    }

    const updateDraftField = (column: string, value: string) => {
        setDraftRow((current) => ({ ...current, [column]: value }))
    }

    const saveInlineEdit = async (weldId: string) => {
        setRowSavingId(weldId)
        setTableMessage(null)

        const payload = buildInlineUpdatePayload(draftRow)
        const weldTable = supabase.from('welds') as unknown as WeldUpdateTable
        const { error } = await weldTable.update(payload).eq('id', weldId)

        if (error) {
            setTableMessage({ type: 'error', text: `Không thể lưu dòng này: ${error.message}` })
            setRowSavingId(null)
            return
        }

        setEditingRowId(null)
        setDraftRow({})
        setTableMessage({ type: 'success', text: 'Đã lưu trực tiếp trên bảng.' })
        setRowSavingId(null)
        await fetchWelds()
    }

    const SortIcon = ({ column }: { column: string }) => {
        if (sort.col !== column) {
            return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>
        }

        return <span style={{ marginLeft: '4px', color: '#3b82f6' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
    }

    const renderEditableCell = (column: ColumnDef, weld: WeldRow) => {
        if (READ_ONLY_INLINE_COLUMNS.has(column.key)) {
            const previewWeld = { ...weld, ...buildInlineUpdatePayload(draftRow) }
            return renderReadOnlyCell(column, previewWeld as WeldRow, getColumnWidth(column))
        }

        const currentValue = draftRow[column.key] || ''
        if (column.inputType === 'select') {
            return (
                <select
                    value={currentValue}
                    onChange={(event) => updateDraftField(column.key, event.target.value)}
                    style={{
                        width: '100%',
                        minWidth: '76px',
                        fontSize: '0.72rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        background: 'white',
                        outline: 'none',
                    }}
                >
                    {(column.options || []).map((option) => (
                        <option key={option.value || '__empty__'} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            )
        }

        return (
            <input
                type={column.inputType === 'date' ? 'date' : column.inputType === 'number' ? 'number' : 'text'}
                step={column.inputType === 'number' && !INTEGER_COLUMNS.has(column.key) ? 'any' : undefined}
                value={currentValue}
                onChange={(event) => updateDraftField(column.key, event.target.value)}
                style={{
                    width: '100%',
                    minWidth: '76px',
                    fontSize: '0.72rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    background: 'white',
                }}
            />
        )
    }

    if (checkingRole) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Đang kiểm tra quyền truy cập...
            </div>
        )
    }

    return (
        <div className="page-enter">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Quản lý mối hàn</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>
                        {currentProjectId ? `${formatNumber(totalCount)} mối hàn` : 'Chọn dự án ở menu trái'}
                    </p>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        alignItems: 'center',
                        background: 'white',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                >
                    {canEdit ? (
                        <Link href="/welds/new" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                            Tạo mới / hàng loạt
                        </Link>
                    ) : null}
                    <button onClick={handleExport} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                        Xuất Excel
                    </button>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Tìm nhanh: Weld ID, Drawing, Welder, GOC..."
                        value={globalSearch}
                        style={{ flex: 1, minWidth: '260px' }}
                        onChange={(event) => {
                            setGlobalSearch(event.target.value)
                            setPage(0)
                        }}
                    />
                    {globalSearch || Object.values(colFilters).some(Boolean) ? (
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setGlobalSearch('')
                                setColFilters({})
                                setPage(0)
                            }}
                        >
                            Xóa lọc
                        </button>
                    ) : null}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderLeft: '1px solid #e2e8f0',
                            paddingLeft: '12px',
                        }}
                    >
                        <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>Hiển thị:</span>
                        <select
                            value={limit}
                            onChange={(event) => {
                                setLimit(Number(event.target.value))
                                setPage(0)
                            }}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {LIMIT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option === 999999 ? 'Tất cả' : option}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        Đang xem {Math.min(limit, welds.length)}/{totalCount}
                    </span>
                </div>

                {tableMessage ? (
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: tableMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                            color: tableMessage.type === 'success' ? '#166534' : '#991b1b',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                        }}
                    >
                        {tableMessage.text}
                    </div>
                ) : null}
            </div>

            <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: '#64748b' }}>Đang tải...</p>
                    </div>
                ) : (
                    <SyncedTableFrame>
                        <table style={{ fontSize: '0.74rem', borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
                            <thead>
                                <tr>
                                    {COLUMNS.map((column) => {
                                        const columnWidth = getColumnWidth(column)
                                        return (
                                            <th
                                                key={column.key}
                                                style={{
                                                    width: columnWidth,
                                                    minWidth: columnWidth,
                                                    maxWidth: columnWidth,
                                                    textAlign: column.align || 'left',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    background: sort.col === column.key ? '#eff6ff' : undefined,
                                                    borderBottom: 'none',
                                                    paddingBottom: '4px',
                                                    position: 'relative',
                                                }}
                                                onClick={() => handleSort(column.key)}
                                                title={`Sắp xếp theo ${column.label}`}
                                            >
                                            {column.label}
                                            <SortIcon column={column.key} />
                                            <div
                                                role="presentation"
                                                title={`Kéo để đổi độ rộng cột ${column.label}`}
                                                onPointerDown={(event) => startColumnResize(column.key, columnWidth, event)}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: -4,
                                                    width: '10px',
                                                    height: '100%',
                                                    cursor: 'col-resize',
                                                    touchAction: 'none',
                                                    background:
                                                        draggingColumnKey === column.key
                                                            ? 'rgba(59,130,246,0.18)'
                                                            : 'transparent',
                                                }}
                                            />
                                        </th>
                                        )
                                    })}
                                    <th
                                        style={{
                                            width: actionColumnWidth,
                                            minWidth: actionColumnWidth,
                                            maxWidth: actionColumnWidth,
                                            position: 'relative',
                                        }}
                                    >
                                        Thao tác
                                        <div
                                            role="presentation"
                                            title="Kéo để đổi độ rộng cột thao tác"
                                            onPointerDown={(event) => startColumnResize(ACTION_COLUMN_KEY, actionColumnWidth, event)}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                right: -4,
                                                width: '10px',
                                                height: '100%',
                                                cursor: 'col-resize',
                                                touchAction: 'none',
                                                background:
                                                    draggingColumnKey === ACTION_COLUMN_KEY
                                                        ? 'rgba(59,130,246,0.18)'
                                                        : 'transparent',
                                            }}
                                        />
                                    </th>
                                </tr>
                                <tr style={{ background: '#f8fafc' }}>
                                    {COLUMNS.map((column) => {
                                        const filterOptions = getFilterOptions(column)
                                        const columnWidth = getColumnWidth(column)
                                        return (
                                            <td
                                                key={column.key}
                                                style={{
                                                    width: columnWidth,
                                                    minWidth: columnWidth,
                                                    maxWidth: columnWidth,
                                                    padding: '3px 6px',
                                                    borderTop: '1px solid #e2e8f0',
                                                }}
                                            >
                                                {filterOptions ? (
                                                    <select
                                                        value={colFilters[column.key] || ''}
                                                        onChange={(event) => setFilter(column.key, event.target.value)}
                                                        title={`Lọc theo ${column.label}`}
                                                        style={{
                                                            width: '100%',
                                                            fontSize: '0.7rem',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '4px',
                                                            padding: '2px 4px',
                                                            background: 'white',
                                                            outline: 'none',
                                                            color: colFilters[column.key] ? '#0f172a' : '#94a3b8',
                                                        }}
                                                    >
                                                        {filterOptions.map((option) => (
                                                            <option key={`${column.key}-${option.value || 'all'}`} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={colFilters[column.key] || ''}
                                                        onChange={(event) => setFilter(column.key, event.target.value)}
                                                        placeholder={`Lọc ${column.label}`}
                                                        title={`Lọc theo ${column.label}`}
                                                        style={{
                                                            width: '100%',
                                                            fontSize: '0.7rem',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '4px',
                                                            padding: '2px 5px',
                                                            boxSizing: 'border-box',
                                                            outline: 'none',
                                                            background: colFilters[column.key] ? '#eff6ff' : 'white',
                                                        }}
                                                    />
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td
                                        style={{
                                            width: actionColumnWidth,
                                            minWidth: actionColumnWidth,
                                            maxWidth: actionColumnWidth,
                                            borderTop: '1px solid #e2e8f0',
                                            padding: '3px 6px',
                                            color: '#64748b',
                                            fontSize: '0.72rem',
                                        }}
                                    >
                                        {canEdit ? 'Bấm Sửa dòng hoặc double click để sửa trực tiếp.' : 'Chỉ xem'}
                                    </td>
                                </tr>
                            </thead>
                            <tbody>
                                {welds.length === 0 ? (
                                    <tr>
                                        <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                            {currentProjectId ? 'Không có dữ liệu phù hợp.' : 'Chọn dự án ở menu trái.'}
                                        </td>
                                    </tr>
                                ) : (
                                    welds.map((weld, index) => {
                                        const rowId = String(weld.id)
                                        const editing = editingRowId === rowId
                                        const saving = rowSavingId === rowId

                                        return (
                                            <tr
                                                key={rowId}
                                                style={{ background: editing ? '#fff7ed' : index % 2 ? '#fafafa' : 'white' }}
                                                onDoubleClick={() => {
                                                    if (canEdit && !editing) {
                                                        startInlineEdit(weld)
                                                    }
                                                }}
                                            >
                                                {COLUMNS.map((column) => (
                                                    <td
                                                        key={column.key}
                                                        style={{
                                                            width: getColumnWidth(column),
                                                            minWidth: getColumnWidth(column),
                                                            maxWidth: getColumnWidth(column),
                                                            textAlign: column.align || 'left',
                                                            padding: '5px 8px',
                                                        }}
                                                    >
                                                        {editing
                                                            ? renderEditableCell(column, weld)
                                                            : renderReadOnlyCell(column, weld, getColumnWidth(column))}
                                                    </td>
                                                ))}
                                                <td
                                                    style={{
                                                        width: actionColumnWidth,
                                                        minWidth: actionColumnWidth,
                                                        maxWidth: actionColumnWidth,
                                                        padding: '5px 8px',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {editing ? (
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button className="btn btn-primary" onClick={() => saveInlineEdit(rowId)} disabled={saving}>
                                                                {saving ? 'Đang lưu...' : 'Lưu'}
                                                            </button>
                                                            <button className="btn btn-secondary" onClick={cancelInlineEdit} disabled={saving}>
                                                                Hủy
                                                            </button>
                                                        </div>
                                                    ) : canEdit ? (
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <button
                                                                className="btn btn-secondary"
                                                                style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}
                                                                onClick={() => startInlineEdit(weld)}
                                                            >
                                                                Sửa dòng
                                                            </button>
                                                            <Link href={`/welds/${rowId}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                                Chi tiết
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <Link href={`/welds/${rowId}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                            Chi tiết
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </SyncedTableFrame>
                )}

                {totalPages > 1 ? (
                    <div
                        style={{
                            padding: '12px 16px',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Trang {page + 1}/{totalPages} - {totalCount} mối hàn
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-secondary" onClick={() => setPage(0)} disabled={page === 0}>
                                {'<<'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setPage((current) => current - 1)} disabled={page === 0}>
                                Trước
                            </button>
                            <button className="btn btn-secondary" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages - 1}>
                                Sau
                            </button>
                            <button className="btn btn-secondary" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>
                                {'>>'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
