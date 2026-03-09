'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInspectionRequest } from '@/app/actions/requests'
import { createClient } from '@/lib/supabase/client'

interface Project {
    id: string
    code: string
    name: string
}

interface Weld {
    id: string
    weld_id: string
    drawing_no: string
    weld_no: string
    joint_type: string
    ndt_requirements: string
    weld_length: number
    position: string
    stage: string
    mt_result?: string
    ut_result?: string
}

const REQUEST_TYPE_COLUMN: Record<string, string> = {
    fitup: 'fitup_request_no',
    backgouge: 'backgouge_request_no',
    lamcheck: 'lamcheck_request_no',
    request: 'inspection_request_no',
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
    fitup: 'Fit-Up',
    backgouge: 'Backgouge',
    lamcheck: 'Lamcheck',
    request: 'NDT / Khach hang visual',
}

const REQUEST_PREFIX: Record<string, string> = {
    fitup: 'F-',
    backgouge: 'BG-',
    lamcheck: 'UL-',
    request: 'V-',
}

const inputStyle = {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    background: 'white',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontSize: '0.9rem',
}

const labelStyle = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '4px',
    display: 'block' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
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

    const lookupWelds = useCallback(async () => {
        if (!projectId || !requestType || !requestNo.trim()) {
            setError('Vui long chon du an, loai yeu cau va nhap so request.')
            return
        }

        const column = REQUEST_TYPE_COLUMN[requestType]
        if (!column) {
            return
        }

        setLoadingWelds(true)
        setError('')
        setSearched(true)

        const { data, error: dbError } = await supabase
            .from('welds')
            .select('id, weld_id, drawing_no, weld_no, joint_type, ndt_requirements, weld_length, position, stage, mt_result, ut_result')
            .eq('project_id', projectId)
            .eq(column, requestNo.trim())
            .order('excel_row_order', { ascending: true })

        if (dbError) {
            setError(`Loi tra cuu: ${dbError.message}`)
        } else {
            setMatchedWelds((data || []) as Weld[])
        }

        setLoadingWelds(false)
    }, [projectId, requestNo, requestType, supabase])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (matchedWelds.length === 0) {
            setError('Khong co moi han nao duoc chon. Hay tra cuu truoc.')
            return
        }

        setIsSubmitting(true)
        setError('')

        const formData = new FormData(event.currentTarget)
        formData.set('weld_ids', JSON.stringify(matchedWelds.map((weld) => weld.id)))
        formData.set('request_no', requestNo.trim())

        const result = await createInspectionRequest(formData)
        if (result.error) {
            setError(result.error)
            setIsSubmitting(false)
            return
        }

        router.push('/requests')
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
                <div
                    style={{
                        padding: '12px 16px',
                        background: '#fee2e2',
                        color: '#b91c1c',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                    }}
                >
                    {error}
                </div>
            )}

            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '16px', color: '#1e40af', fontSize: '0.95rem' }}>Buoc 1: Chon du an va loai yeu cau</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Du an *</label>
                        <select
                            name="project_id"
                            required
                            value={projectId}
                            onChange={(event) => {
                                setProjectId(event.target.value)
                                setMatchedWelds([])
                                setSearched(false)
                            }}
                            style={inputStyle}
                        >
                            <option value="">-- Chon du an --</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.code} - {project.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Loai yeu cau *</label>
                        <select
                            name="request_type"
                            required
                            value={requestType}
                            onChange={(event) => {
                                const nextType = event.target.value
                                setRequestType(nextType)
                                setRequestNo(nextType ? REQUEST_PREFIX[nextType] || '' : '')
                                setMatchedWelds([])
                                setSearched(false)
                            }}
                            style={inputStyle}
                        >
                            <option value="">-- Chon loai --</option>
                            {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '4px', color: '#1e40af', fontSize: '0.95rem' }}>Buoc 2: Nhap so request va tra cuu moi han</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
                    Nhap dung so request da duoc QC gan trong weld master, vi du <strong>V-191</strong>. He thong se do theo cot tuong ung trong du lieu import tu Excel.
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>
                            So request *
                            {requestType && (
                                <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', marginLeft: '6px' }}>
                                    (cot DB: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>{REQUEST_TYPE_COLUMN[requestType]}</code>)
                                </span>
                            )}
                        </label>
                        <input
                            type="text"
                            value={requestNo}
                            onChange={(event) => {
                                setRequestNo(event.target.value)
                                setMatchedWelds([])
                                setSearched(false)
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void lookupWelds()
                                }
                            }}
                            placeholder={requestType ? `VD: ${REQUEST_PREFIX[requestType] || ''}191` : 'Chon loai yeu cau truoc'}
                            style={{ ...inputStyle, fontSize: '1rem', fontWeight: 600 }}
                            disabled={!requestType || !projectId}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => void lookupWelds()}
                        disabled={!projectId || !requestType || !requestNo.trim() || loadingWelds}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: !projectId || !requestType || !requestNo.trim() ? '#e2e8f0' : '#2563eb',
                            color: !projectId || !requestType || !requestNo.trim() ? '#94a3b8' : 'white',
                            whiteSpace: 'nowrap' as const,
                        }}
                    >
                        {loadingWelds ? 'Dang tim...' : 'Tim moi han'}
                    </button>
                </div>

                {searched && (
                    <div style={{ marginTop: '16px' }}>
                        {matchedWelds.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', background: '#fef9c3', borderRadius: '8px', color: '#854d0e', fontWeight: 500 }}>
                                Khong tim thay moi han nao co {REQUEST_TYPE_COLUMN[requestType]} = &quot;{requestNo}&quot;.
                                <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#92400e' }}>
                                    Kiem tra lai so request hoac bao dam du lieu da duoc import tu Excel.
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div style={{ fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '6px 14px', borderRadius: '6px', fontSize: '0.875rem' }}>
                                        Tim thay <strong>{matchedWelds.length}</strong> moi han voi request <strong>{requestNo}</strong>
                                    </div>
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                        <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                            <tr style={{ color: '#475569' }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>#</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Weld ID</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Drawing No</th>
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
                                            {matchedWelds.map((weld, index) => {
                                                const mtOk = weld.mt_result === 'ACC'
                                                const mtRejected = weld.mt_result === 'REJ'
                                                const utOk = weld.ut_result === 'ACC'
                                                const utRejected = weld.ut_result === 'REJ'

                                                return (
                                                    <tr
                                                        key={weld.id}
                                                        style={{
                                                            borderBottom: '1px solid #f1f5f9',
                                                            background: index % 2 === 0 ? 'white' : '#fafafa',
                                                        }}
                                                    >
                                                        <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{index + 1}</td>
                                                        <td style={{ padding: '7px 10px', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem', color: '#1e40af' }}>{weld.weld_id}</td>
                                                        <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '0.75rem' }}>{weld.drawing_no}</td>
                                                        <td style={{ padding: '7px 10px', fontWeight: 600 }}>{String(weld.weld_no)}</td>
                                                        <td style={{ padding: '7px 10px', color: '#64748b' }}>{weld.joint_type || '-'}</td>
                                                        <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '0.75rem' }}>{weld.ndt_requirements || '-'}</td>
                                                        <td style={{ padding: '7px 10px', color: '#64748b' }}>{weld.weld_length != null ? `${weld.weld_length} mm` : '-'}</td>
                                                        <td style={{ padding: '7px 10px' }}>
                                                            {weld.mt_result ? (
                                                                <span
                                                                    style={{
                                                                        padding: '1px 6px',
                                                                        borderRadius: '3px',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.7rem',
                                                                        background: mtOk ? '#dcfce7' : mtRejected ? '#fee2e2' : '#f1f5f9',
                                                                        color: mtOk ? '#166534' : mtRejected ? '#991b1b' : '#64748b',
                                                                    }}
                                                                >
                                                                    {weld.mt_result}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8' }}>-</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '7px 10px' }}>
                                                            {weld.ut_result ? (
                                                                <span
                                                                    style={{
                                                                        padding: '1px 6px',
                                                                        borderRadius: '3px',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.7rem',
                                                                        background: utOk ? '#dcfce7' : utRejected ? '#fee2e2' : '#f1f5f9',
                                                                        color: utOk ? '#166534' : utRejected ? '#991b1b' : '#64748b',
                                                                    }}
                                                                >
                                                                    {weld.ut_result}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8' }}>-</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '7px 10px' }}>
                                                            <span style={{ padding: '1px 6px', background: '#e2e8f0', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 500 }}>
                                                                {String(weld.stage || '-').toUpperCase()}
                                                            </span>
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

            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '16px', color: '#1e40af', fontSize: '0.95rem' }}>Buoc 3: Thong tin yeu cau</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <div>
                        <label style={labelStyle}>Ngay yeu cau *</label>
                        <input type="date" name="request_date" required style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Gio yeu cau</label>
                        <input type="time" name="request_time" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Nguoi tao phieu</label>
                        <input
                            type="text"
                            name="requested_by"
                            defaultValue={userName}
                            readOnly
                            style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Don vi NDT / kiem tra</label>
                        <input type="text" name="inspector_company" placeholder="VD: Alpha NDT" style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Ghi chu</label>
                        <textarea name="remarks" rows={2} placeholder="Ghi chu them..." style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                    type="button"
                    onClick={() => router.push('/requests')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        background: 'white',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Huy
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || matchedWelds.length === 0}
                    style={{
                        padding: '10px 28px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: isSubmitting || matchedWelds.length === 0 ? '#93c5fd' : '#2563eb',
                        color: 'white',
                    }}
                >
                    {isSubmitting ? 'Dang luu...' : `Tao yeu cau (${matchedWelds.length} moi han)`}
                </button>
            </div>
        </form>
    )
}


