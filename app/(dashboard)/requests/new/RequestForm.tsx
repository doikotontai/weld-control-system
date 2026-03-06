'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createInspectionRequest } from '@/app/actions/requests'
import { createClient } from '@/lib/supabase/client'

interface Project { id: string; code: string; name: string }

interface Weld {
    id: string
    weld_id: string
    drawing_no: string
    weld_no: string | number
    joint_type: string
    ndt_requirements: string
    weld_length: number
    position: string
    stage: string
    fitup_request_no?: string
    visual_request_no?: string
    backgouge_request_no?: string
    lamcheck_request_no?: string
    mt_report_no?: string
    mt_result?: string
    ut_result?: string
    rt_result?: string
}

// Map request type → DB column that holds the request number
const REQUEST_TYPE_COLUMN: Record<string, string> = {
    fitup: 'fitup_request_no',
    visual: 'visual_request_no',
    backgouge: 'backgouge_request_no',
    lamcheck: 'lamcheck_request_no',
    mpi: 'mt_report_no',   // MPI uses MT report/request
    final_visual: 'visual_request_no',
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
    fitup: '🔩 Fit-Up',
    visual: '👁️ Visual',
    backgouge: '⚙️ Backgouge',
    lamcheck: '🔍 Lamcheck',
    mpi: '🔬 MPI / MT / UT',
    final_visual: '✅ Final Visual (VS FINAL)',
}

// Request No prefix hints per type
const REQUEST_PREFIX: Record<string, string> = {
    fitup: 'F-',
    visual: 'V-',
    backgouge: 'BG-',
    lamcheck: 'LC-',
    mpi: 'MT-',
    final_visual: 'V-',
}

export default function RequestForm({ projects, userName }: { projects: Project[]; userName: string }) {
    const router = useRouter()
    const supabase = createClient()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [projectId, setProjectId] = useState('')
    const [requestType, setRequestType] = useState('')
    const [requestNo, setRequestNo] = useState('')
    const [matchedWelds, setMatchedWelds] = useState<Weld[]>([])
    const [loadingWelds, setLoadingWelds] = useState(false)
    const [searched, setSearched] = useState(false)

    // Auto-fill prefix when type changes
    useEffect(() => {
        if (requestType && REQUEST_PREFIX[requestType]) {
            setRequestNo(REQUEST_PREFIX[requestType])
        }
        setMatchedWelds([])
        setSearched(false)
    }, [requestType])

    // Lookup welds by request number
    const lookupWelds = useCallback(async () => {
        if (!projectId || !requestType || !requestNo.trim()) {
            setError('Vui lòng chọn Dự án, Loại yêu cầu và nhập Số Request!')
            return
        }
        setLoadingWelds(true)
        setError('')
        setSearched(true)

        // As requested by user: Always search by visual_request_no (VS Request - Column T in Excel)
        const { data, error: dbErr } = await (supabase.from('welds') as any)
            .select('id, weld_id, drawing_no, weld_no, joint_type, ndt_requirements, weld_length, position, stage, fitup_request_no, visual_request_no, backgouge_request_no, lamcheck_request_no, mt_report_no, mt_result, ut_result, rt_result')
            .eq('project_id', projectId)
            .eq('visual_request_no', requestNo.trim())
            .order('excel_row_order', { ascending: true })

        if (dbErr) {
            setError(`Lỗi tra cứu: ${dbErr.message}`)
        } else {
            setMatchedWelds(data || [])
        }
        setLoadingWelds(false)
    }, [projectId, requestType, requestNo, supabase])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (matchedWelds.length === 0) {
            setError('Không có mối hàn nào! Hãy tìm kiếm trước.')
            return
        }
        setIsSubmitting(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        formData.set('weld_ids', JSON.stringify(matchedWelds.map(w => w.id)))
        formData.set('request_no', requestNo.trim())

        const res = await createInspectionRequest(formData)
        if (res.error) {
            setError(res.error)
            setIsSubmitting(false)
        } else {
            router.push('/requests')
            router.refresh()
        }
    }

    const inputStyle = {
        padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
        outline: 'none', background: 'white', width: '100%', boxSizing: 'border-box' as const,
        fontSize: '0.9rem',
    }
    const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' as const, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
                <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Step 1: Project + Type */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '16px', color: '#1e40af', fontSize: '0.95rem' }}>1️⃣ Chọn Dự án & Loại yêu cầu</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Dự án *</label>
                        <select name="project_id" required value={projectId}
                            onChange={e => { setProjectId(e.target.value); setMatchedWelds([]); setSearched(false) }}
                            style={inputStyle}>
                            <option value="">-- Chọn Dự án --</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Loại Yêu cầu *</label>
                        <select name="request_type" required value={requestType}
                            onChange={e => setRequestType(e.target.value)}
                            style={inputStyle}>
                            <option value="">-- Chọn loại --</option>
                            {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Step 2: Request No lookup */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '4px', color: '#1e40af', fontSize: '0.95rem' }}>2️⃣ Nhập Số Request → Tự động tìm mối hàn</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
                    Nhập số Request (ví dụ: <strong>V-191</strong>) — hệ thống sẽ tìm <em>tất cả mối hàn trong dự án có VS Request = V-191</em>
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>
                            Số Request *
                            {requestType && <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', marginLeft: '6px' }}>
                                (cột: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>visual_request_no</code>)
                            </span>}
                        </label>
                        <input
                            type="text"
                            value={requestNo}
                            onChange={e => { setRequestNo(e.target.value); setMatchedWelds([]); setSearched(false) }}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), lookupWelds())}
                            placeholder={requestType ? `VD: ${REQUEST_PREFIX[requestType] || ''}191` : 'Chọn loại yêu cầu trước'}
                            style={{ ...inputStyle, fontSize: '1rem', fontWeight: 600 }}
                            disabled={!requestType || !projectId}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={lookupWelds}
                        disabled={!projectId || !requestType || !requestNo.trim() || loadingWelds}
                        style={{
                            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer',
                            background: (!projectId || !requestType || !requestNo.trim()) ? '#e2e8f0' : '#2563eb',
                            color: (!projectId || !requestType || !requestNo.trim()) ? '#94a3b8' : 'white',
                            whiteSpace: 'nowrap' as const,
                        }}>
                        {loadingWelds ? '⏳ Đang tìm...' : '🔍 Tìm mối hàn'}
                    </button>
                </div>

                {/* Results */}
                {searched && (
                    <div style={{ marginTop: '16px' }}>
                        {matchedWelds.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', background: '#fef9c3', borderRadius: '8px', color: '#854d0e', fontWeight: 500 }}>
                                ⚠️ Không tìm thấy mối hàn nào có visual_request_no = &quot;{requestNo}&quot;
                                <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#92400e' }}>
                                    Kiểm tra lại Số Request hoặc đảm bảo dữ liệu đã được import từ Excel.
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div style={{ fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '6px 14px', borderRadius: '6px', fontSize: '0.875rem' }}>
                                        ✅ Tìm thấy <strong>{matchedWelds.length}</strong> mối hàn với Request No. <strong>{requestNo}</strong>
                                    </div>
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                        <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                            <tr style={{ color: '#475569' }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>#</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Weld ID</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>DrawingNo</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Weld No</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>NDT</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Length</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>MT</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>UT</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Stage</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matchedWelds.map((w, i) => {
                                                const mtOk = w.mt_result === 'ACC', mtRej = w.mt_result === 'REJ'
                                                const utOk = w.ut_result === 'ACC', utRej = w.ut_result === 'REJ'
                                                return (
                                                    <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                                        <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{i + 1}</td>
                                                        <td style={{ padding: '7px 10px', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem', color: '#1e40af' }}>{w.weld_id}</td>
                                                        <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '0.75rem' }}>{w.drawing_no}</td>
                                                        <td style={{ padding: '7px 10px', fontWeight: 600 }}>{String(w.weld_no)}</td>
                                                        <td style={{ padding: '7px 10px', color: '#64748b' }}>{w.joint_type || '—'}</td>
                                                        <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '0.75rem' }}>{w.ndt_requirements || '—'}</td>
                                                        <td style={{ padding: '7px 10px', color: '#64748b' }}>{w.weld_length != null ? `${w.weld_length}mm` : '—'}</td>
                                                        <td style={{ padding: '7px 10px' }}>
                                                            {w.mt_result ? <span style={{ padding: '1px 6px', borderRadius: '3px', fontWeight: 700, fontSize: '0.7rem', background: mtOk ? '#dcfce7' : mtRej ? '#fee2e2' : '#f1f5f9', color: mtOk ? '#166534' : mtRej ? '#991b1b' : '#64748b' }}>{w.mt_result}</span> : <span style={{ color: '#94a3b8' }}>—</span>}
                                                        </td>
                                                        <td style={{ padding: '7px 10px' }}>
                                                            {w.ut_result ? <span style={{ padding: '1px 6px', borderRadius: '3px', fontWeight: 700, fontSize: '0.7rem', background: utOk ? '#dcfce7' : utRej ? '#fee2e2' : '#f1f5f9', color: utOk ? '#166534' : utRej ? '#991b1b' : '#64748b' }}>{w.ut_result}</span> : <span style={{ color: '#94a3b8' }}>—</span>}
                                                        </td>
                                                        <td style={{ padding: '7px 10px' }}>
                                                            <span style={{ padding: '1px 6px', background: '#e2e8f0', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 500 }}>{String(w.stage || '—').toUpperCase()}</span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Step 3: Extra info */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '16px', color: '#1e40af', fontSize: '0.95rem' }}>3️⃣ Thông tin Yêu cầu</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <div>
                        <label style={labelStyle}>Ngày yêu cầu *</label>
                        <input type="date" name="request_date" required style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Giờ yêu cầu</label>
                        <input type="time" name="request_time" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Người tạo phiếu</label>
                        <input type="text" name="requested_by" defaultValue={userName} readOnly
                            style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }} />
                    </div>
                    <div>
                        <label style={labelStyle}>Đơn vị NDT</label>
                        <input type="text" name="inspector_company" placeholder="VD: Alpha NDT" style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Ghi chú / Remarks</label>
                        <textarea name="remarks" rows={2} placeholder="Ghi chú thêm..."
                            style={{ ...inputStyle, resize: 'vertical' }}></textarea>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => router.push('/requests')}
                    style={{ padding: '10px 20px', borderRadius: '8px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                    Hủy
                </button>
                <button type="submit"
                    disabled={isSubmitting || matchedWelds.length === 0}
                    style={{
                        padding: '10px 28px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer',
                        background: (isSubmitting || matchedWelds.length === 0) ? '#93c5fd' : '#2563eb',
                        color: 'white',
                    }}>
                    {isSubmitting ? '⏳ Đang lưu...' : `✅ Tạo Yêu cầu (${matchedWelds.length} mối hàn)`}
                </button>
            </div>
        </form>
    )
}
