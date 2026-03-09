'use client'
// app/(dashboard)/welds/page.tsx â€” Danh sÃ¡ch má»‘i hÃ n vá»›i Sort + Filter theo tá»«ng cá»™t
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { STAGE_LABELS } from '@/types'
import { formatNumber } from '@/lib/formatters'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type SortDir = 'asc' | 'desc'
interface ColSort { col: string; dir: SortDir }
interface ColFilters { [col: string]: string }

const LIMIT_OPTIONS = [50, 100, 200, 500, 1000, 999999] // 999999 represents "All"

// Sortable columns: field name â†’ display header (must match DB column names)
const COLUMNS: { key: string; label: string; minWidth?: number; align?: 'right' | 'center' }[] = [
    { key: 'excel_row_order', label: '#', minWidth: 48, align: 'center' },
    { key: 'weld_id', label: '& (Weld ID)', minWidth: 180 },
    { key: 'drawing_no', label: 'DrawingNo', minWidth: 130 },
    { key: 'weld_no', label: 'Weld No', minWidth: 70, align: 'center' },
    { key: 'joint_family', label: 'Weld Joints', minWidth: 90 },
    { key: 'joint_type', label: 'Weld Type', minWidth: 90 },
    { key: 'ndt_requirements', label: 'NDT', minWidth: 110 },
    { key: 'position', label: 'OD /L', minWidth: 65, align: 'center' },
    { key: 'weld_length', label: 'Length (mm)', minWidth: 90, align: 'right' },
    { key: 'thickness', label: 'Thick (mm)', minWidth: 80, align: 'right' },
    { key: 'thickness_lamcheck', label: 'Thick LC', minWidth: 70, align: 'right' },
    { key: 'wps_no', label: 'WPS No.', minWidth: 90 },
    { key: 'goc_code', label: 'GOC Code', minWidth: 90 },
    { key: 'fitup_inspector', label: 'FU Inspector', minWidth: 100 },
    { key: 'fitup_date', label: 'FU Date', minWidth: 95 },
    { key: 'fitup_request_no', label: 'FU Request', minWidth: 95 },
    { key: 'weld_finish_date', label: 'Weld Finish', minWidth: 90 },
    { key: 'welders', label: "Welders' ID", minWidth: 110 },
    { key: 'visual_inspector', label: 'VS Inspector', minWidth: 100 },
    { key: 'visual_date', label: 'VS Date', minWidth: 95 },
    { key: 'inspection_request_no', label: 'NDT RQ', minWidth: 95 },
    { key: 'backgouge_date', label: 'BG Date', minWidth: 90 },
    { key: 'backgouge_request_no', label: 'BG Request', minWidth: 90 },
    { key: 'mt_result', label: 'MT Result', minWidth: 80, align: 'center' },
    { key: 'mt_report_no', label: 'MT Report', minWidth: 130 },
    { key: 'ut_result', label: 'UT Result', minWidth: 80, align: 'center' },
    { key: 'ut_report_no', label: 'UT Report', minWidth: 130 },
    { key: 'rt_result', label: 'RT Result', minWidth: 80, align: 'center' },
    { key: 'release_note_no', label: 'Release Note', minWidth: 150 },
    { key: 'release_note_date', label: 'Release Date', minWidth: 90 },
    { key: 'stage', label: 'Stage', minWidth: 100 },
]

// Result badge
function ResultBadge({ result }: { result: string | null | undefined }) {
    if (!result) return <span style={{ color: '#94a3b8' }}>â€”</span>
    const ok = result === 'ACC'
    const rej = result === 'REJ'
    return (
        <span style={{
            display: 'inline-block', padding: '1px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '0.72rem',
            background: ok ? '#dcfce7' : rej ? '#fee2e2' : '#f1f5f9',
            color: ok ? '#166534' : rej ? '#991b1b' : '#64748b',
        }}>{result}</span>
    )
}

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
function StageBadge({ stage }: { stage: string | null | undefined }) {
    if (!stage) return <span style={{ color: '#94a3b8' }}>â€”</span>
    const c = STAGE_COLORS[stage] || '#64748b'
    return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: c + '18', color: c, whiteSpace: 'nowrap' }}>{stage}</span>
}

function fmtDate(v: unknown): string {
    if (!v) return ''
    return String(v).slice(0, 10)
}

// â”€â”€â”€ Cell renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderCell(col: string, weld: Record<string, unknown>) {
    const v = weld[col]
    switch (col) {
        case 'excel_row_order': return <span style={{ color: '#94a3b8', fontWeight: 600 }}>{v as number || ''}</span>
        case 'weld_id': return <Link href={`/welds/${weld.id}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{v as string}</Link>
        case 'drawing_no': return <span style={{ color: '#64748b' }}>{v as string}</span>
        case 'weld_no': return <span>{String(v || '')}</span>
        case 'joint_family': return <span style={{ fontWeight: 600 }}>{v as string}</span>
        case 'joint_type': return <span style={{ fontWeight: 600 }}>{v as string}</span>
        case 'goc_code': return v ? <span style={{ padding: '1px 4px', background: '#f1f5f9', borderRadius: '3px' }}>{v as string}</span> : null
        case 'wps_no': return <span style={{ color: '#6366f1' }}>{v as string}</span>
        case 'weld_length': return <span>{formatNumber(v as number | null | undefined)}</span>
        case 'mt_result': case 'ut_result': case 'rt_result': return <ResultBadge result={v as string} />
        case 'release_note_no': return <span style={{ fontWeight: 600, color: '#0369a1' }}>{v as string}</span>
        case 'stage': return <StageBadge stage={v as string} />
        case 'fitup_date': case 'visual_date': case 'backgouge_date': case 'release_note_date':
        case 'weld_finish_date': return <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(v)}</span>
        default: return <span style={{ whiteSpace: 'nowrap' }}>{v as string || ''}</span>
    }
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function WeldsPage() {
    const supabase = createClient()
    const [welds, setWelds] = useState<Record<string, unknown>[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [page, setPage] = useState(0)
    const [limit, setLimit] = useState(50)
    const [sort, setSort] = useState<ColSort>({ col: 'excel_row_order', dir: 'asc' })
    const [colFilters, setColFilters] = useState<ColFilters>({})
    const [globalSearch, setGlobalSearch] = useState('')
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;)\s*weld-control-project-id=([^;]+)/)
            setCurrentProjectId(match ? match[1] : null)
        }
    }, [])

    const fetchWelds = useCallback(async () => {
        if (!currentProjectId) {
            setWelds([]); setTotalCount(0); setLoading(false); return
        }
        setLoading(true)
        let query = supabase
            .from('welds')
            .select('*', { count: 'exact' })
            .eq('project_id', currentProjectId)
            .order(sort.col || 'excel_row_order', { ascending: sort.dir === 'asc', nullsFirst: sort.dir === 'asc' })
            .range(page * limit, (page + 1) * limit - 1)

        // Global search
        if (globalSearch.trim()) {
            query = query.or(`weld_id.ilike.%${globalSearch}%,weld_no.ilike.%${globalSearch}%,drawing_no.ilike.%${globalSearch}%,welders.ilike.%${globalSearch}%,joint_family.ilike.%${globalSearch}%`)
        }
        // Per-column filters
        Object.entries(colFilters).forEach(([col, val]) => {
            if (!val?.trim()) return
            const numericCols = ['weld_no', 'weld_length', 'thickness', 'thickness_lamcheck', 'excel_row_order']
            if (numericCols.includes(col)) {
                query = query.eq(col, val.trim())
            } else {
                query = query.ilike(col, `%${val.trim()}%`)
            }
        })

        const { data, count } = await query
        setWelds((data as Record<string, unknown>[]) || [])
        setTotalCount(count || 0)
        setLoading(false)
    }, [colFilters, globalSearch, page, limit, sort, supabase, currentProjectId])

    useEffect(() => {
        if (currentProjectId !== null) {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(fetchWelds, 280)
        }
    }, [fetchWelds, currentProjectId])

    const handleSort = (col: string) => {
        setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }))
        setPage(0)
    }

    const setFilter = (col: string, val: string) => {
        setColFilters(f => ({ ...f, [col]: val }))
        setPage(0)
    }

    const totalPages = Math.ceil(totalCount / limit)

    const handleExport = async () => {
        const { utils, writeFile } = await import('xlsx')
        const ws = utils.json_to_sheet(welds)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Welds')
        writeFile(wb, `weld-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const SortIcon = ({ col }: { col: string }) => {
        if (sort.col !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>â‡…</span>
        return <span style={{ marginLeft: '4px', color: '#3b82f6' }}>{sort.dir === 'asc' ? 'â†‘' : 'â†“'}</span>
    }

    return (
        <div className="page-enter">
            {/* Header & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>ðŸ”© Quáº£n lÃ½ Má»‘i hÃ n</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>
                        {currentProjectId ? `${formatNumber(totalCount)} má»‘i hÃ n` : 'Chá»n Dá»± Ã¡n á»Ÿ menu trÃ¡i'}
                    </p>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: 'white', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    {/* Primary Actions */}
                    <Link href="/welds/new" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>âž• Táº¡o má»›i</Link>
                    <button onClick={handleExport} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>ðŸ“¤ Export Excel</button>

                    {/* Search */}
                    <input
                        type="text"
                        className="form-input"
                        placeholder="ðŸ” TÃ¬m nhanh: Weld ID, DrawingNo, Welders..."
                        value={globalSearch}
                        style={{ flex: 1, minWidth: '220px' }}
                        onChange={e => { setGlobalSearch(e.target.value); setPage(0) }}
                    />

                    {(globalSearch || Object.values(colFilters).some(v => v)) && (
                        <button className="btn btn-secondary" onClick={() => { setGlobalSearch(''); setColFilters({}); setPage(0) }} style={{ whiteSpace: 'nowrap' }}>
                            âœ• XÃ³a lá»c
                        </button>
                    )}

                    {/* Pagination Limit */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>Hiá»ƒn thá»‹:</span>
                        <select
                            value={limit}
                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
                        >
                            {LIMIT_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt === 999999 ? 'Táº¥t cáº£' : opt}</option>
                            ))}
                        </select>
                    </div>

                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        Äang xem {Math.min(limit, welds.length)}/{totalCount}
                    </span>
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: '#64748b' }}>Äang táº£i...</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table style={{ fontSize: '0.74rem', borderCollapse: 'collapse', width: '100%' }}>
                            <thead>
                                {/* Row 1: Sortable column headers */}
                                <tr>
                                    {COLUMNS.map(col => (
                                        <th
                                            key={col.key}
                                            style={{
                                                minWidth: col.minWidth, textAlign: col.align || 'left',
                                                cursor: 'pointer', userSelect: 'none',
                                                background: sort.col === col.key ? '#eff6ff' : undefined,
                                                borderBottom: 'none', paddingBottom: '4px',
                                            }}
                                            onClick={() => handleSort(col.key)}
                                            title={`Sáº¯p xáº¿p theo ${col.label}`}
                                        >
                                            {col.label}<SortIcon col={col.key} />
                                        </th>
                                    ))}
                                    <th style={{ minWidth: 60 }}>Action</th>
                                </tr>
                                {/* Row 2: Per-column filter inputs */}
                                <tr style={{ background: '#f8fafc' }}>
                                    {COLUMNS.map(col => {
                                        const isResult = ['mt_result', 'ut_result', 'rt_result', 'stage'].includes(col.key)
                                        const isExcelRow = col.key === 'excel_row_order'
                                        return (
                                            <td key={col.key} style={{ padding: '3px 6px', borderTop: '1px solid #e2e8f0' }}>
                                                {isExcelRow ? null : isResult ? (
                                                    <select
                                                        value={colFilters[col.key] || ''}
                                                        onChange={e => setFilter(col.key, e.target.value)}
                                                        style={{
                                                            width: '100%', fontSize: '0.7rem', border: '1px solid #e2e8f0',
                                                            borderRadius: '4px', padding: '2px 4px', background: 'white',
                                                            outline: 'none', color: colFilters[col.key] ? '#0f172a' : '#94a3b8',
                                                        }}
                                                    >
                                                        <option value="">All</option>
                                                        {col.key === 'stage'
                                                            ? Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)
                                                            : <>
                                                                <option value="ACC">ACC</option>
                                                                <option value="REJ">REJ</option>
                                                                <option value="N/A">N/A</option>
                                                            </>
                                                        }
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={colFilters[col.key] || ''}
                                                        onChange={e => setFilter(col.key, e.target.value)}
                                                        placeholder="ðŸ”"
                                                        style={{
                                                            width: '100%', fontSize: '0.7rem', border: '1px solid #e2e8f0',
                                                            borderRadius: '4px', padding: '2px 5px', boxSizing: 'border-box',
                                                            outline: 'none', background: colFilters[col.key] ? '#eff6ff' : 'white',
                                                        }}
                                                    />
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td style={{ borderTop: '1px solid #e2e8f0' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {welds.length === 0 ? (
                                    <tr>
                                        <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                            {currentProjectId ? 'KhÃ´ng cÃ³ dá»¯ liá»‡u phÃ¹ há»£p.' : 'Chá»n Dá»± Ã¡n á»Ÿ menu trÃ¡i.'}
                                        </td>
                                    </tr>
                                ) : welds.map((weld, idx) => (
                                    <tr key={String(weld.id)} style={{ background: idx % 2 ? '#fafafa' : 'white' }}>
                                        {COLUMNS.map(col => (
                                            <td key={col.key} style={{ textAlign: col.align || 'left', padding: '5px 8px' }}>
                                                {renderCell(col.key, weld)}
                                            </td>
                                        ))}
                                        <td style={{ padding: '5px 8px' }}>
                                            <Link href={`/welds/${weld.id}/edit`} style={{ color: '#3b82f6', textDecoration: 'none' }}>âœï¸</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Trang {page + 1}/{totalPages} â€” {totalCount} má»‘i hÃ n
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-secondary" onClick={() => setPage(0)} disabled={page === 0}>Â«</button>
                            <button className="btn btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page === 0}>â€¹ TrÆ°á»›c</button>
                            <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Sau â€º</button>
                            <button className="btn btn-secondary" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Â»</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}



