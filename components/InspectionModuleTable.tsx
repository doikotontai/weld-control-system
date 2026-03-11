'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import SyncedTableFrame from '@/components/SyncedTableFrame'
import { createClient } from '@/lib/supabase/client'
import { PROJECT_CHANGE_EVENT, readActiveProjectIdFromCookie } from '@/lib/project-selection'
import { getDisplayWeldId } from '@/lib/weld-id'
import { STAGE_LABELS } from '@/types'

type ModuleKey = 'fitup' | 'visual' | 'backgouge' | 'lamcheck' | 'ndt'
type FilterMap = Record<string, string>
type FilterOptionsMap = Record<string, Array<{ value: string; label: string }>>
type GenericRow = Record<string, unknown> & { id: string }
type QueryFilter =
    | { type: 'notNull'; column: string }
    | { type: 'anyNotNull'; columns: string[] }

interface ModuleColumn {
    key: string
    label: string
    kind?: 'text' | 'date' | 'link' | 'number' | 'stage' | 'result'
    align?: 'left' | 'center' | 'right'
    suffix?: string
    accentColor?: string
}

interface ModuleConfig {
    title: string
    descriptionPrefix: string
    countLabel: string
    emptyText: string
    filter: QueryFilter
    columns: ModuleColumn[]
    ndtSummary?: boolean
}

const DEFAULT_FILTER_OPTION = { value: '', label: 'Tất cả' }
const PAGE_SIZE = 100

const MODULE_CONFIGS: Record<ModuleKey, ModuleConfig> = {
    fitup: {
        title: 'Fit-Up',
        descriptionPrefix: 'Tương ứng sheet FIT UP',
        countLabel: 'mối hàn đã Fit-Up',
        emptyText: 'Chưa có mối hàn nào có dữ liệu Fit-Up.',
        filter: { type: 'notNull', column: 'fitup_date' },
        columns: [
            { key: 'weld_id', label: 'Weld ID', kind: 'link', accentColor: '#1e40af' },
            { key: 'drawing_no', label: 'Bản vẽ' },
            { key: 'weld_no', label: 'Weld No', align: 'center' },
            { key: 'joint_type', label: 'Loại', align: 'center' },
            { key: 'weld_length', label: 'Chiều dài', kind: 'number', align: 'right', suffix: 'mm' },
            { key: 'goc_code', label: 'GOC Code' },
            { key: 'fitup_inspector', label: 'QC Fit-Up' },
            { key: 'fitup_date', label: 'Ngày Fit-Up', kind: 'date' },
            { key: 'fitup_request_no', label: 'Request Fit-Up', accentColor: '#2563eb' },
            { key: 'weld_finish_date', label: 'Hoàn thành hàn', kind: 'date' },
            { key: 'welders', label: 'Welder ID' },
            { key: 'stage', label: 'Stage', kind: 'stage', align: 'center' },
        ],
    },
    visual: {
        title: 'Visual / Request',
        descriptionPrefix: 'Dữ liệu visual hiện có trong weld master',
        countLabel: 'mối hàn đã visual',
        emptyText: 'Chưa có mối hàn nào có dữ liệu visual.',
        filter: { type: 'notNull', column: 'visual_date' },
        columns: [
            { key: 'weld_id', label: 'Weld ID', kind: 'link', accentColor: '#7c3aed' },
            { key: 'drawing_no', label: 'Bản vẽ' },
            { key: 'weld_no', label: 'Weld No', align: 'center' },
            { key: 'joint_type', label: 'Loại', align: 'center' },
            { key: 'weld_length', label: 'Chiều dài', kind: 'number', align: 'right', suffix: 'mm' },
            { key: 'visual_inspector', label: 'QC Visual' },
            { key: 'visual_date', label: 'Ngày Visual', kind: 'date' },
            { key: 'inspection_request_no', label: 'RQ NDT / KH Visual', accentColor: '#7c3aed' },
            { key: 'backgouge_date', label: 'Ngày BG', kind: 'date' },
            { key: 'backgouge_request_no', label: 'Request BG' },
            { key: 'welders', label: 'Welder ID' },
            { key: 'stage', label: 'Stage', kind: 'stage', align: 'center' },
        ],
    },
    backgouge: {
        title: 'Backgouge',
        descriptionPrefix: 'Tương ứng sheet BACKGOUGE',
        countLabel: 'mối hàn đã Backgouge',
        emptyText: 'Chưa có mối hàn nào có dữ liệu Backgouge.',
        filter: { type: 'notNull', column: 'backgouge_date' },
        columns: [
            { key: 'weld_id', label: 'Weld ID', kind: 'link', accentColor: '#c2410c' },
            { key: 'drawing_no', label: 'Bản vẽ' },
            { key: 'weld_no', label: 'Weld No', align: 'center' },
            { key: 'joint_type', label: 'Loại', align: 'center' },
            { key: 'weld_length', label: 'Chiều dài', kind: 'number', align: 'right', suffix: 'mm' },
            { key: 'goc_code', label: 'GOC Code' },
            { key: 'backgouge_date', label: 'Ngày BG', kind: 'date' },
            { key: 'backgouge_request_no', label: 'Request BG', accentColor: '#c2410c' },
            { key: 'visual_date', label: 'Ngày Visual', kind: 'date' },
            { key: 'welders', label: 'Welder ID' },
            { key: 'stage', label: 'Stage', kind: 'stage', align: 'center' },
        ],
    },
    lamcheck: {
        title: 'Lamcheck',
        descriptionPrefix: 'Tương ứng sheet LAMCHECK',
        countLabel: 'mối hàn đã Lamcheck',
        emptyText: 'Chưa có mối hàn nào có dữ liệu Lamcheck.',
        filter: { type: 'notNull', column: 'lamcheck_date' },
        columns: [
            { key: 'weld_id', label: 'Weld ID', kind: 'link', accentColor: '#065f46' },
            { key: 'drawing_no', label: 'Bản vẽ' },
            { key: 'weld_no', label: 'Weld No', align: 'center' },
            { key: 'joint_type', label: 'Loại', align: 'center' },
            { key: 'thickness_lamcheck', label: 'Độ dày LC', kind: 'number', align: 'right' },
            { key: 'goc_code', label: 'GOC Code' },
            { key: 'lamcheck_date', label: 'Ngày Lamcheck', kind: 'date' },
            { key: 'lamcheck_request_no', label: 'Request Lamcheck', accentColor: '#065f46' },
            { key: 'lamcheck_report_no', label: 'Báo cáo Lamcheck' },
            { key: 'welders', label: 'Welder ID' },
            { key: 'stage', label: 'Stage', kind: 'stage', align: 'center' },
        ],
    },
    ndt: {
        title: 'Kết quả NDT',
        descriptionPrefix: 'Tương ứng sheet REQUEST / NDT RESULTS',
        countLabel: 'mối hàn có kết quả NDT',
        emptyText: 'Chưa có mối hàn nào có kết quả NDT.',
        filter: { type: 'anyNotNull', columns: ['mt_result', 'ut_result', 'rt_result'] },
        ndtSummary: true,
        columns: [
            { key: 'weld_id', label: 'Weld ID', kind: 'link', accentColor: '#854d0e' },
            { key: 'drawing_no', label: 'Bản vẽ' },
            { key: 'weld_no', label: 'Weld No', align: 'center' },
            { key: 'joint_type', label: 'Loại', align: 'center' },
            { key: 'ndt_requirements', label: 'Yêu cầu NDT' },
            { key: 'mt_result', label: 'MT', kind: 'result', align: 'center' },
            { key: 'mt_report_no', label: 'Báo cáo MT' },
            { key: 'ut_result', label: 'UT', kind: 'result', align: 'center' },
            { key: 'ut_report_no', label: 'Báo cáo UT' },
            { key: 'rt_result', label: 'RT', kind: 'result', align: 'center' },
            { key: 'rt_report_no', label: 'Báo cáo RT' },
            { key: 'pwht_result', label: 'PWHT', kind: 'result', align: 'center' },
            { key: 'release_note_no', label: 'Release Note', accentColor: '#0369a1' },
            { key: 'release_note_date', label: 'Ngày Release', kind: 'date' },
            { key: 'defect_length', label: 'Khuyết tật (mm)', kind: 'number', align: 'right' },
            { key: 'repair_length', label: 'Sửa chữa (mm)', kind: 'number', align: 'right' },
            { key: 'welders', label: 'Welder ID' },
        ],
    },
}

function normalizeText(value: unknown) {
    return value == null ? '' : String(value).trim()
}

function formatDateValue(value: unknown) {
    return value != null && value !== '' ? String(value).slice(0, 10) : ''
}

function displayStage(value: unknown) {
    const raw = normalizeText(value)
    if (!raw) {
        return '-'
    }

    if (raw === 'completed') {
        return 'Hoàn thành'
    }

    if (raw === 'rejected') {
        return 'Bị từ chối'
    }

    return STAGE_LABELS[raw as keyof typeof STAGE_LABELS] || raw
}

function displayCellValue(column: ModuleColumn, row: GenericRow) {
    const raw = row[column.key]

    if (column.kind === 'date') {
        return formatDateValue(raw) || '-'
    }

    if (column.kind === 'number') {
        const value = normalizeText(raw)
        return value ? `${value}${column.suffix || ''}` : '-'
    }

    if (column.kind === 'stage') {
        return displayStage(raw)
    }

    return normalizeText(raw) || '-'
}

function filterValueForColumn(column: ModuleColumn, row: GenericRow) {
    const raw = row[column.key]

    if (column.kind === 'date') {
        return formatDateValue(raw)
    }

    return normalizeText(raw)
}

function applyBaseFilter(query: ReturnType<ReturnType<typeof createClient>['from']>, filter: QueryFilter) {
    if (filter.type === 'notNull') {
        return query.not(filter.column, 'is', null)
    }

    return query.or(filter.columns.map((column) => `${column}.not.is.null`).join(','))
}

function ResultBadge({ value }: { value: string }) {
    const accepted = value === 'ACC'
    const rejected = value === 'REJ'

    return (
        <span
            style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.7rem',
                background: accepted ? '#dcfce7' : rejected ? '#fee2e2' : '#f1f5f9',
                color: accepted ? '#166534' : rejected ? '#991b1b' : '#64748b',
            }}
        >
            {value}
        </span>
    )
}

function StageBadge({ value }: { value: string }) {
    const colorMap: Record<string, string> = {
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

    const color = colorMap[value] || '#64748b'
    return (
        <span
            style={{
                padding: '2px 7px',
                borderRadius: '4px',
                background: `${color}18`,
                color,
                fontWeight: 600,
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
            }}
        >
            {displayStage(value)}
        </span>
    )
}

export default function InspectionModuleTable({
    module,
    initialProjectId,
}: {
    module: ModuleKey
    initialProjectId: string | null
}) {
    const supabase = createClient()
    const config = MODULE_CONFIGS[module]
    const [projectId, setProjectId] = useState<string | null>(initialProjectId)
    const [rows, setRows] = useState<GenericRow[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [filters, setFilters] = useState<FilterMap>({})

    useEffect(() => {
        const syncProject = () => {
            const nextProjectId = readActiveProjectIdFromCookie()
            setProjectId((current) => {
                if (current !== nextProjectId) {
                    setPage(0)
                    setFilters({})
                }
                return nextProjectId
            })
        }
        syncProject()
        window.addEventListener(PROJECT_CHANGE_EVENT, syncProject)
        window.addEventListener('focus', syncProject)
        return () => {
            window.removeEventListener(PROJECT_CHANGE_EVENT, syncProject)
            window.removeEventListener('focus', syncProject)
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        const loadRows = async () => {
            if (!projectId) {
                setRows([])
                setLoading(false)
                return
            }

            setLoading(true)
            const allRows: GenericRow[] = []
            const selectColumns = ['id', 'excel_row_order', ...config.columns.map((column) => column.key)].join(',')

            for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
                const from = pageIndex * 1000
                const to = from + 999
                let query = supabase
                    .from('welds')
                    .select(selectColumns)
                    .eq('project_id', projectId)
                    .order('excel_row_order', { ascending: true })
                    .range(from, to)

                query = applyBaseFilter(query, config.filter) as typeof query

                const { data, error } = await query
                if (cancelled || error) {
                    setLoading(false)
                    return
                }

                const currentRows = (data || []) as GenericRow[]
                allRows.push(...currentRows)

                if (currentRows.length < 1000) {
                    break
                }
            }

            if (cancelled) {
                return
            }

            setRows(allRows)
            setLoading(false)
        }

        void loadRows()

        return () => {
            cancelled = true
        }
    }, [config.columns, config.filter, projectId, supabase])

    const filteredRows = rows.filter((row) =>
        config.columns.every((column) => {
            const selected = filters[column.key] || ''
            if (!selected) {
                return true
            }

            return filterValueForColumn(column, row) === selected
        })
    )

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages - 1)
    const pageRows = filteredRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
    const filterOptions = config.columns.reduce<FilterOptionsMap>((acc, column) => {
        const unique = Array.from(
            new Set(
                rows
                    .map((row) => filterValueForColumn(column, row))
                    .filter(Boolean)
            )
        ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))

        acc[column.key] = [
            DEFAULT_FILTER_OPTION,
            ...unique.map((value) => ({
                value,
                label: column.kind === 'stage' ? displayStage(value) : column.key === 'weld_id' ? getDisplayWeldId(value) : value,
            })),
        ]
        return acc
    }, {})

    const resetFilters = () => {
        setFilters({})
        setPage(0)
    }

    const thStyle = {
        padding: '8px 12px',
        fontWeight: 600,
        color: '#475569',
        textAlign: 'left' as const,
        fontSize: '0.75rem',
        textTransform: 'uppercase' as const,
        background: '#f8fafc',
        borderBottom: '2px solid #e2e8f0',
        whiteSpace: 'nowrap' as const,
    }

    const tdStyle = {
        padding: '8px 12px',
        fontSize: '0.8rem',
        borderBottom: '1px solid #f1f5f9',
        color: '#374151',
        whiteSpace: 'nowrap' as const,
    }

    const renderCell = (column: ModuleColumn, row: GenericRow) => {
        const raw = filterValueForColumn(column, row)
        const display = displayCellValue(column, row)

        if (column.kind === 'link') {
            return (
                <Link
                    href={`/welds/${row.id}`}
                    style={{
                        color: column.accentColor || '#1d4ed8',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        textDecoration: 'none',
                    }}
                >
                    {column.key === 'weld_id' ? getDisplayWeldId(display) : display}
                </Link>
            )
        }

        if (column.kind === 'result') {
            return raw ? <ResultBadge value={raw} /> : <span style={{ color: '#94a3b8' }}>-</span>
        }

        if (column.kind === 'stage') {
            return raw ? <StageBadge value={raw} /> : <span style={{ color: '#94a3b8' }}>-</span>
        }

        if (column.accentColor && display !== '-') {
            return <span style={{ fontWeight: 600, color: column.accentColor }}>{display}</span>
        }

        return display
    }

    const ndtCards = config.ndtSummary
        ? [
              { label: 'MT ACC', value: rows.filter((row) => normalizeText(row.mt_result) === 'ACC').length, bg: '#dcfce7', color: '#166534' },
              { label: 'MT REJ', value: rows.filter((row) => normalizeText(row.mt_result) === 'REJ').length, bg: '#fee2e2', color: '#991b1b' },
              { label: 'UT ACC', value: rows.filter((row) => normalizeText(row.ut_result) === 'ACC').length, bg: '#dcfce7', color: '#166534' },
              { label: 'UT REJ', value: rows.filter((row) => normalizeText(row.ut_result) === 'REJ').length, bg: '#fee2e2', color: '#991b1b' },
              { label: 'RT ACC', value: rows.filter((row) => normalizeText(row.rt_result) === 'ACC').length, bg: '#dcfce7', color: '#166534' },
              { label: 'RT REJ', value: rows.filter((row) => normalizeText(row.rt_result) === 'REJ').length, bg: '#fee2e2', color: '#991b1b' },
          ]
        : []

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{config.title}</h1>
                <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem' }}>
                    {projectId
                        ? `${config.descriptionPrefix} - ${rows.length.toLocaleString()} ${config.countLabel}`
                        : 'Chọn dự án để xem'}
                </p>
            </div>

            {!projectId ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', color: '#64748b' }}>
                    Vui lòng chọn dự án ở menu bên trái.
                </div>
            ) : (
                <>
                    {config.ndtSummary && rows.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px', marginBottom: '20px' }}>
                            {ndtCards.map((card) => (
                                <div key={card.label} style={{ background: card.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: card.color, marginTop: '2px' }}>{card.label}</div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px',
                        }}
                    >
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            Hiển thị {filteredRows.length.toLocaleString()} / {rows.length.toLocaleString()} dòng
                        </span>
                        <button className="btn btn-secondary" onClick={resetFilters} disabled={!Object.values(filters).some(Boolean)}>
                            Xóa lọc
                        </button>
                    </div>

                    <SyncedTableFrame>
                        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>#</th>
                                    {config.columns.map((column) => (
                                        <th key={column.key} style={{ ...thStyle, textAlign: column.align || 'left' }}>
                                            {column.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr style={{ background: '#f8fafc' }}>
                                    <td style={{ ...tdStyle, color: '#94a3b8' }}>-</td>
                                    {config.columns.map((column) => (
                                        <td key={column.key} style={{ ...tdStyle, borderTop: '1px solid #e2e8f0', padding: '4px 8px' }}>
                                            <select
                                                value={filters[column.key] || ''}
                                                onChange={(event) => {
                                                    setFilters((current) => ({ ...current, [column.key]: event.target.value }))
                                                    setPage(0)
                                                }}
                                                title={`Lọc theo ${column.label}`}
                                                style={{
                                                    width: '100%',
                                                    minWidth: '120px',
                                                    fontSize: '0.72rem',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '4px',
                                                    padding: '4px 6px',
                                                    background: 'white',
                                                    color: filters[column.key] ? '#0f172a' : '#94a3b8',
                                                }}
                                            >
                                                {filterOptions[column.key]?.map((option) => (
                                                    <option key={`${column.key}-${option.value || 'all'}`} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={config.columns.length + 1} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : pageRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={config.columns.length + 1} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            {config.emptyText}
                                        </td>
                                    </tr>
                                ) : (
                                    pageRows.map((row, index) => (
                                        <tr key={row.id} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                                            <td style={{ ...tdStyle, color: '#94a3b8' }}>{safePage * PAGE_SIZE + index + 1}</td>
                                            {config.columns.map((column) => (
                                                <td key={column.key} style={{ ...tdStyle, textAlign: column.align || 'left' }}>
                                                    {renderCell(column, row)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </SyncedTableFrame>
                </>
            )}

            {!loading && projectId && filteredRows.length > 0 && totalPages > 1 ? (
                <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Trang {safePage + 1}/{totalPages} - Khớp {filteredRows.length} dòng
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={safePage === 0}>
                            Trước
                        </button>
                        <button className="btn btn-secondary" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={safePage >= totalPages - 1}>
                            Sau
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
