'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import SyncedTableFrame from '@/components/SyncedTableFrame'
import { createClient } from '@/lib/supabase/client'
import { formatNumber } from '@/lib/formatters'
import { PROJECT_CHANGE_EVENT, readActiveProjectIdFromCookie } from '@/lib/project-selection'
import { STAGE_LABELS } from '@/types'
import { useRoleGuard } from '@/lib/use-role-guard'

type SortDir = 'asc' | 'desc'
type Align = 'right' | 'center'

interface ColSort {
    col: string
    dir: SortDir
}

interface ColFilters {
    [col: string]: string
}

const LIMIT_OPTIONS = [50, 100, 200, 500, 1000, 999999]

const COLUMNS: { key: string; label: string; minWidth?: number; align?: Align }[] = [
    { key: 'excel_row_order', label: '#', minWidth: 48, align: 'center' },
    { key: 'weld_id', label: 'Weld ID', minWidth: 180 },
    { key: 'drawing_no', label: 'Drawing No', minWidth: 140 },
    { key: 'weld_no', label: 'Weld No', minWidth: 80, align: 'center' },
    { key: 'joint_family', label: 'Weld Joints', minWidth: 90 },
    { key: 'joint_type', label: 'Weld Type', minWidth: 90 },
    { key: 'ndt_requirements', label: 'NDT', minWidth: 120 },
    { key: 'position', label: 'OD / L', minWidth: 70, align: 'center' },
    { key: 'weld_length', label: 'Length (mm)', minWidth: 100, align: 'right' },
    { key: 'thickness', label: 'Thickness (mm)', minWidth: 95, align: 'right' },
    { key: 'thickness_lamcheck', label: 'Độ dày LC', minWidth: 95, align: 'right' },
    { key: 'wps_no', label: 'WPS No.', minWidth: 100 },
    { key: 'goc_code', label: 'GOC Code', minWidth: 95 },
    { key: 'fitup_inspector', label: 'QC Fit-Up', minWidth: 100 },
    { key: 'fitup_date', label: 'Ngày FU', minWidth: 95 },
    { key: 'fitup_request_no', label: 'Request FU', minWidth: 95 },
    { key: 'weld_finish_date', label: 'Hoàn thành hàn', minWidth: 105 },
    { key: 'welders', label: "Welders' ID", minWidth: 130 },
    { key: 'visual_inspector', label: 'QC Visual', minWidth: 100 },
    { key: 'visual_date', label: 'Ngày Visual', minWidth: 95 },
    { key: 'inspection_request_no', label: 'RQ NDT', minWidth: 95 },
    { key: 'backgouge_date', label: 'Ngày BG', minWidth: 95 },
    { key: 'backgouge_request_no', label: 'Request BG', minWidth: 95 },
    { key: 'mt_result', label: 'KQ MT', minWidth: 80, align: 'center' },
    { key: 'mt_report_no', label: 'Báo cáo MT', minWidth: 130 },
    { key: 'ut_result', label: 'KQ UT', minWidth: 80, align: 'center' },
    { key: 'ut_report_no', label: 'Báo cáo UT', minWidth: 130 },
    { key: 'rt_result', label: 'KQ RT', minWidth: 80, align: 'center' },
    { key: 'release_note_no', label: 'Release note', minWidth: 150 },
    { key: 'release_note_date', label: 'Ngày release', minWidth: 95 },
    { key: 'stage', label: 'Stage', minWidth: 100 },
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

function ResultBadge({ result }: { result: string | null | undefined }) {
    if (!result) return <span style={{ color: '#94a3b8' }}>-</span>
    const ok = result === 'ACC'
    const rej = result === 'REJ'
    return (
        <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '0.72rem', background: ok ? '#dcfce7' : rej ? '#fee2e2' : '#f1f5f9', color: ok ? '#166534' : rej ? '#991b1b' : '#64748b' }}>
            {result}
        </span>
    )
}

function StageBadge({ stage }: { stage: string | null | undefined }) {
    if (!stage) return <span style={{ color: '#94a3b8' }}>-</span>
    const color = STAGE_COLORS[stage] || '#64748b'
    return (
        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: `${color}18`, color, whiteSpace: 'nowrap' }}>
            {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage}
        </span>
    )
}

function formatDate(value: unknown) {
    return value ? String(value).slice(0, 10) : ''
}

function renderCell(col: string, weld: Record<string, unknown>) {
    const value = weld[col]

    switch (col) {
        case 'excel_row_order':
            return <span style={{ color: '#94a3b8', fontWeight: 600 }}>{(value as number) || ''}</span>
        case 'weld_id':
            return <Link href={`/welds/${weld.id}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{String(value || '')}</Link>
        case 'drawing_no':
            return <span style={{ color: '#64748b' }}>{String(value || '')}</span>
        case 'weld_no':
        case 'joint_family':
        case 'joint_type':
            return <span style={{ fontWeight: 600 }}>{String(value || '')}</span>
        case 'goc_code':
            return value ? <span style={{ padding: '1px 4px', background: '#f1f5f9', borderRadius: '3px' }}>{String(value)}</span> : null
        case 'wps_no':
            return <span style={{ color: '#6366f1' }}>{String(value || '')}</span>
        case 'weld_length':
            return <span>{formatNumber(value as number | null | undefined)}</span>
        case 'mt_result':
        case 'ut_result':
        case 'rt_result':
            return <ResultBadge result={value as string | null | undefined} />
        case 'release_note_no':
            return <span style={{ fontWeight: 600, color: '#0369a1' }}>{String(value || '')}</span>
        case 'stage':
            return <StageBadge stage={value as string | null | undefined} />
        case 'fitup_date':
        case 'visual_date':
        case 'backgouge_date':
        case 'release_note_date':
        case 'weld_finish_date':
            return <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(value)}</span>
        default:
            return <span style={{ whiteSpace: 'nowrap' }}>{String(value || '')}</span>
    }
}

export default function WeldsPage() {
    const supabase = createClient()
    const searchParams = useSearchParams()
    const drawingFilter = searchParams.get('drawing') || ''
    const { role, checking: checkingRole } = useRoleGuard(['admin', 'dcc', 'qc', 'inspector', 'viewer'])
    const [welds, setWelds] = useState<Record<string, unknown>[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [page, setPage] = useState(0)
    const [limit, setLimit] = useState(50)
    const [sort, setSort] = useState<ColSort>({ col: 'excel_row_order', dir: 'asc' })
    const [colFilters, setColFilters] = useState<ColFilters>({})
    const [globalSearch, setGlobalSearch] = useState(drawingFilter)
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

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
            query = query.or(`weld_id.ilike.%${globalSearch}%,weld_no.ilike.%${globalSearch}%,drawing_no.ilike.%${globalSearch}%,welders.ilike.%${globalSearch}%,joint_family.ilike.%${globalSearch}%`)
        }

        Object.entries(colFilters).forEach(([col, value]) => {
            if (!value.trim()) return
            const numericCols = ['weld_no', 'weld_length', 'thickness', 'thickness_lamcheck', 'excel_row_order']
            query = numericCols.includes(col) ? query.eq(col, value.trim()) : query.ilike(col, `%${value.trim()}%`)
        })

        const { data, count } = await query
        setWelds((data as Record<string, unknown>[]) || [])
        setTotalCount(count || 0)
        setLoading(false)
    }, [colFilters, currentProjectId, globalSearch, limit, page, sort, supabase])

    useEffect(() => {
        if (currentProjectId === null) return
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(fetchWelds, 280)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [currentProjectId, fetchWelds])

    const handleSort = (col: string) => {
        setSort((current) => ({ col, dir: current.col === col && current.dir === 'asc' ? 'desc' : 'asc' }))
        setPage(0)
    }

    const setFilter = (col: string, value: string) => {
        setColFilters((current) => ({ ...current, [col]: value }))
        setPage(0)
    }

    const totalPages = Math.ceil(totalCount / limit)
    const canEdit = role !== null && ['admin', 'dcc', 'qc'].includes(role)

    const handleExport = async () => {
        const { utils, writeFile } = await import('xlsx')
        const worksheet = utils.json_to_sheet(welds)
        const workbook = utils.book_new()
        utils.book_append_sheet(workbook, worksheet, 'Welds')
        writeFile(workbook, `weld-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const SortIcon = ({ col }: { col: string }) => {
        if (sort.col !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>
        return <span style={{ marginLeft: '4px', color: '#3b82f6' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
    }

    if (checkingRole) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang kiểm tra quyền truy cập...</div>
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: 'white', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    {canEdit ? <Link href="/welds/new" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Tạo mới / hàng loạt</Link> : null}
                    <button onClick={handleExport} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>Export Excel</button>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Tìm nhanh: Weld ID, Drawing No, Welders..."
                        value={globalSearch}
                        style={{ flex: 1, minWidth: '220px' }}
                        onChange={(event) => {
                            setGlobalSearch(event.target.value)
                            setPage(0)
                        }}
                    />
                    {(globalSearch || Object.values(colFilters).some(Boolean)) ? (
                        <button className="btn btn-secondary" onClick={() => {
                            setGlobalSearch('')
                            setColFilters({})
                            setPage(0)
                        }}>
                            Xóa lọc
                        </button>
                    ) : null}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>Hiển thị:</span>
                        <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(0) }} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}>
                            {LIMIT_OPTIONS.map((option) => <option key={option} value={option}>{option === 999999 ? 'Tất cả' : option}</option>)}
                        </select>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Đang xem {Math.min(limit, welds.length)}/{totalCount}</span>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: '#64748b' }}>Đang tải...</p>
                    </div>
                ) : (
                    <SyncedTableFrame>
                        <table style={{ fontSize: '0.74rem', borderCollapse: 'collapse', width: '100%' }}>
                            <thead>
                                <tr>
                                    {COLUMNS.map((col) => (
                                        <th key={col.key} style={{ minWidth: col.minWidth, textAlign: col.align || 'left', cursor: 'pointer', userSelect: 'none', background: sort.col === col.key ? '#eff6ff' : undefined, borderBottom: 'none', paddingBottom: '4px' }} onClick={() => handleSort(col.key)} title={`Sắp xếp theo ${col.label}`}>
                                            {col.label}<SortIcon col={col.key} />
                                        </th>
                                    ))}
                                    <th style={{ minWidth: 60 }}>Hành động</th>
                                </tr>
                                <tr style={{ background: '#f8fafc' }}>
                                    {COLUMNS.map((col) => {
                                        const isResult = ['mt_result', 'ut_result', 'rt_result', 'stage'].includes(col.key)
                                        const isExcelRow = col.key === 'excel_row_order'
                                        return (
                                            <td key={col.key} style={{ padding: '3px 6px', borderTop: '1px solid #e2e8f0' }}>
                                                {isExcelRow ? null : isResult ? (
                                                    <select value={colFilters[col.key] || ''} onChange={(event) => setFilter(col.key, event.target.value)} style={{ width: '100%', fontSize: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 4px', background: 'white', outline: 'none', color: colFilters[col.key] ? '#0f172a' : '#94a3b8' }}>
                                                        <option value="">Tất cả</option>
                                                        {col.key === 'stage'
                                                            ? Object.entries(STAGE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)
                                                            : (<><option value="ACC">ACC</option><option value="REJ">REJ</option><option value="N/A">N/A</option></>)}
                                                    </select>
                                                ) : (
                                                    <input type="text" value={colFilters[col.key] || ''} onChange={(event) => setFilter(col.key, event.target.value)} placeholder="Lọc" style={{ width: '100%', fontSize: '0.7rem', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 5px', boxSizing: 'border-box', outline: 'none', background: colFilters[col.key] ? '#eff6ff' : 'white' }} />
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td style={{ borderTop: '1px solid #e2e8f0' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {welds.length === 0 ? (
                                    <tr><td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>{currentProjectId ? 'Không có dữ liệu phù hợp.' : 'Chọn dự án ở menu trái.'}</td></tr>
                                ) : welds.map((weld, index) => (
                                    <tr key={String(weld.id)} style={{ background: index % 2 ? '#fafafa' : 'white' }}>
                                        {COLUMNS.map((col) => <td key={col.key} style={{ textAlign: col.align || 'left', padding: '5px 8px' }}>{renderCell(col.key, weld)}</td>)}
                                        <td style={{ padding: '5px 8px' }}>{canEdit ? <Link href={`/welds/${weld.id}/edit`} style={{ color: '#3b82f6', textDecoration: 'none' }}>Sửa</Link> : <span style={{ color: '#94a3b8' }}>-</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </SyncedTableFrame>
                )}

                {totalPages > 1 ? (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Trang {page + 1}/{totalPages} - {totalCount} mối hàn</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-secondary" onClick={() => setPage(0)} disabled={page === 0}>{'<<'}</button>
                            <button className="btn btn-secondary" onClick={() => setPage((current) => current - 1)} disabled={page === 0}>Trước</button>
                            <button className="btn btn-secondary" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages - 1}>Sau</button>
                            <button className="btn btn-secondary" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>{'>>'}</button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

