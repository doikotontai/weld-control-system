'use client'
// app/(dashboard)/welds/page.tsx — Danh sách mối hàn
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Weld, WeldStage, NDTResult, STAGE_LABELS } from '@/types'

// Local filter state type with loose string types for form inputs
interface FilterState {
    search: string
    stage: string
    mt_result: string
    ut_result: string
    goc_code: string
}

const LIMIT = 50

export default function WeldsPage() {
    const supabase = createClient()
    const [welds, setWelds] = useState<Weld[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [page, setPage] = useState(0)
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        stage: '',
        mt_result: '',
        ut_result: '',
        goc_code: '',
    })
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

    // Parse current Project ID from cookie on mount
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;)\s*weld-control-project-id=([^;]+)/)
            setCurrentProjectId(match ? match[1] : null)
        }
    }, [])

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
            .order('updated_at', { ascending: false })
            .range(page * LIMIT, (page + 1) * LIMIT - 1) as any

        if (filters.search) {
            query = query.or(`weld_id.ilike.%${filters.search}%,weld_no.ilike.%${filters.search}%,drawing_no.ilike.%${filters.search}%,welders.ilike.%${filters.search}%`)
        }
        if (filters.stage) query = query.eq('stage', filters.stage as WeldStage)
        if (filters.mt_result) query = query.eq('mt_result', filters.mt_result as NDTResult)
        if (filters.ut_result) query = query.eq('ut_result', filters.ut_result as NDTResult)
        if (filters.goc_code) query = query.ilike('goc_code', `%${filters.goc_code}%`)

        const { data, count } = await query
        setWelds((data as Weld[]) || [])
        setTotalCount(count || 0)
        setLoading(false)
    }, [filters, page, supabase, currentProjectId])

    useEffect(() => {
        if (currentProjectId !== null) {
            fetchWelds()
        }
    }, [fetchWelds, currentProjectId])

    const handleExport = async () => {
        // Export to Excel using xlsx library
        const { utils, writeFile } = await import('xlsx')
        const ws = utils.json_to_sheet(welds)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Welds')
        writeFile(wb, `weld-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    return (
        <div className="page-enter">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>🔩 Quản lý Mối hàn</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>
                        {currentProjectId ? `${totalCount.toLocaleString()} mối hàn trong dự án` : 'Vui lòng chọn Dự án ở thẻ menu trái.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleExport} className="btn btn-secondary">
                        📤 Export Excel
                    </button>
                    <Link href="/welds/new" className="btn btn-primary">
                        ➕ Tạo mối hàn mới
                    </Link>
                </div>
            </div>

            {/* Filter Bar */}
            <div style={{
                background: 'white',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
            }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <label className="form-label">🔍 Tìm kiếm</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Weld ID, Bản vẽ, Thợ hàn..."
                        value={filters.search}
                        onChange={e => { setPage(0); setFilters(f => ({ ...f, search: e.target.value })) }}
                    />
                </div>
                <div style={{ minWidth: '140px' }}>
                    <label className="form-label">Stage</label>
                    <select
                        className="form-input"
                        value={filters.stage}
                        onChange={e => { setPage(0); setFilters(f => ({ ...f, stage: e.target.value })) }}
                    >
                        <option value="">Tất cả</option>
                        {Object.entries(STAGE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                </div>
                <div style={{ minWidth: '100px' }}>
                    <label className="form-label">MT Result</label>
                    <select className="form-input" value={filters.mt_result ?? ''} onChange={e => { setPage(0); setFilters(f => ({ ...f, mt_result: e.target.value })) }}>
                        <option value="">Tất cả</option>
                        <option value="ACC">ACC</option>
                        <option value="REJ">REJ</option>
                        <option value="N/A">N/A</option>
                    </select>
                </div>
                <div style={{ minWidth: '100px' }}>
                    <label className="form-label">UT Result</label>
                    <select className="form-input" value={filters.ut_result ?? ''} onChange={e => { setPage(0); setFilters(f => ({ ...f, ut_result: e.target.value })) }}>
                        <option value="">Tất cả</option>
                        <option value="ACC">ACC</option>
                        <option value="REJ">REJ</option>
                        <option value="N/A">N/A</option>
                    </select>
                </div>
                <div style={{ minWidth: '100px' }}>
                    <label className="form-label">GOC Code</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="ST-22"
                        value={filters.goc_code}
                        onChange={e => { setPage(0); setFilters(f => ({ ...f, goc_code: e.target.value })) }}
                    />
                </div>
                <button className="btn btn-secondary" onClick={() => { setFilters({ search: '', stage: '', mt_result: '', ut_result: '', goc_code: '' }); setPage(0) }}>
                    🔄 Xóa lọc
                </button>
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: '#64748b' }}>Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table style={{ fontSize: '0.75rem', minWidth: '1800px' }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: '180px' }}>Weld ID</th>
                                    <th style={{ minWidth: '140px' }}>Bản vẽ</th>
                                    <th>Mối #</th>
                                    <th>Joints</th>
                                    <th>Type</th>
                                    <th>NDT Req</th>
                                    <th>GOC</th>
                                    <th>WPS</th>
                                    <th>Dài (mm)</th>
                                    <th>Dày (mm)</th>
                                    <th>Thợ hàn</th>
                                    <th>FU Inspector</th>
                                    <th>FU Date</th>
                                    <th>FU Request</th>
                                    <th>VS Inspector</th>
                                    <th>VS Date</th>
                                    <th>VS Request</th>
                                    <th>BG Date</th>
                                    <th>BG Request</th>
                                    <th>MT</th>
                                    <th>MT Report</th>
                                    <th>UT</th>
                                    <th>UT Report</th>
                                    <th>RT</th>
                                    <th>IRN No</th>
                                    <th>IRN Date</th>
                                    <th>Stage</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {welds.length === 0 ? (
                                    <tr>
                                        <td colSpan={29} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                            Không có dữ liệu. Hãy import Excel hoặc tạo mối hàn mới.
                                        </td>
                                    </tr>
                                ) : welds.map(weld => (
                                    <tr key={weld.id}>
                                        <td>
                                            <Link href={`/welds/${weld.id}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
                                                {weld.weld_id}
                                            </Link>
                                        </td>
                                        <td style={{ color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weld.drawing_no}</td>
                                        <td style={{ fontWeight: 500, textAlign: 'center' }}>{weld.weld_no}</td>
                                        <td style={{ fontWeight: 600 }}>{(weld as any).joint_family}</td>
                                        <td style={{ fontWeight: 600, color: '#374151' }}>{weld.joint_type}</td>
                                        <td style={{ color: '#64748b', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weld.ndt_requirements}</td>
                                        <td><span style={{ padding: '1px 4px', background: '#f1f5f9', borderRadius: '3px' }}>{weld.goc_code}</span></td>
                                        <td style={{ color: '#64748b' }}>{weld.wps_no}</td>
                                        <td style={{ textAlign: 'right' }}>{weld.weld_length?.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}>{weld.thickness}</td>
                                        <td style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weld.welders}</td>
                                        <td>{weld.fitup_inspector}</td>
                                        <td style={{ color: '#64748b' }}>{weld.fitup_date ? String(weld.fitup_date).slice(0, 10) : ''}</td>
                                        <td>{weld.fitup_request_no}</td>
                                        <td>{(weld as any).visual_inspector}</td>
                                        <td style={{ color: '#64748b' }}>{weld.visual_date ? String(weld.visual_date).slice(0, 10) : ''}</td>
                                        <td>{weld.visual_request_no}</td>
                                        <td style={{ color: '#64748b' }}>{weld.backgouge_date ? String(weld.backgouge_date).slice(0, 10) : ''}</td>
                                        <td>{weld.backgouge_request_no}</td>
                                        <td><ResultBadge result={weld.mt_result} /></td>
                                        <td style={{ color: '#64748b' }}>{weld.mt_report_no}</td>
                                        <td><ResultBadge result={weld.ut_result} /></td>
                                        <td style={{ color: '#64748b' }}>{weld.ut_report_no}</td>
                                        <td><ResultBadge result={weld.rt_result} /></td>
                                        <td style={{ fontWeight: 600, color: '#0369a1' }}>{weld.irn_no}</td>
                                        <td style={{ color: '#64748b' }}>{weld.irn_date ? String(weld.irn_date).slice(0, 10) : ''}</td>
                                        <td><StageBadge stage={weld.stage} /></td>
                                        <td>
                                            <Link href={`/welds/${weld.id}/edit`} style={{ color: '#3b82f6', textDecoration: 'none' }}>✏️ Sửa</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        Trang {page + 1} / {Math.ceil(totalCount / LIMIT)} — Hiện {welds.length}/{totalCount}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Trước</button>
                        <button className="btn btn-secondary" disabled={(page + 1) * LIMIT >= totalCount} onClick={() => setPage(p => p + 1)}>Tiếp →</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ResultBadge({ result }: { result: string | null }) {
    const styles = {
        ACC: { bg: '#dcfce7', color: '#166534' },
        REJ: { bg: '#fee2e2', color: '#991b1b' },
        'N/A': { bg: '#f1f5f9', color: '#64748b' },
    }
    const s = result ? styles[result as keyof typeof styles] : styles['N/A']
    return (
        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: s?.bg || '#f1f5f9', color: s?.color || '#64748b' }}>
            {result || '—'}
        </span>
    )
}

function StageBadge({ stage }: { stage: string }) {
    const colors: Record<string, string> = {
        completed: '#22c55e', rejected: '#ef4444', mpi: '#ec4899',
        ut: '#06b6d4', visual: '#f97316', welding: '#f59e0b',
        fitup: '#3b82f6', backgouge: '#8b5cf6', lamcheck: '#6366f1',
    }
    const c = colors[stage] || '#94a3b8'
    return (
        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: c + '20', color: c }}>
            {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage}
        </span>
    )
}
