'use client'

import { useState, useEffect } from 'react'
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
    weld_no: string
    drawing_no: string
    stage: string
}

export default function RequestForm({ projects, userName }: { projects: Project[], userName: string }) {
    const router = useRouter()
    const supabase = createClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [projectId, setProjectId] = useState('')
    const [requestType, setRequestType] = useState('')

    const [availableWelds, setAvailableWelds] = useState<Weld[]>([])
    const [selectedWeldIds, setSelectedWeldIds] = useState<string[]>([])
    const [loadingWelds, setLoadingWelds] = useState(false)

    // Fetch welds when project changes
    useEffect(() => {
        if (!projectId) {
            setAvailableWelds([])
            setSelectedWeldIds([])
            return
        }

        async function fetchWelds() {
            setLoadingWelds(true)
            const { data, error } = await supabase
                .from('welds')
                .select('id, weld_no, drawing_no, stage')
                .eq('project_id', projectId)
                .order('drawing_no', { ascending: true })
                .order('weld_no', { ascending: true })

            if (data) {
                setAvailableWelds(data)
                setSelectedWeldIds([])
            }
            setLoadingWelds(false)
        }

        fetchWelds()
    }, [projectId, supabase])

    const handleToggleWeld = (id: string) => {
        setSelectedWeldIds(prev =>
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        )
    }

    const filteredWelds = availableWelds
    const handleSelectAll = () => {
        if (selectedWeldIds.length === filteredWelds.length && filteredWelds.length > 0) {
            setSelectedWeldIds([])
        } else {
            setSelectedWeldIds(filteredWelds.map(w => w.id))
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (selectedWeldIds.length === 0) {
            setError('Bạn chưa chọn mối hàn nào! Vui lòng chọn ít nhất 1 mối hàn để đưa vào Yêu cầu kiểm tra.')
            return
        }

        setIsSubmitting(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        formData.append('weld_ids', JSON.stringify(selectedWeldIds))

        const res = await createInspectionRequest(formData)

        if (res.error) {
            setError(res.error)
            setIsSubmitting(false)
        } else {
            router.push('/requests')
            router.refresh()
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {error && (
                <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500 }}>
                    ⚠️ {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Dự án *</label>
                    <select
                        name="project_id"
                        required
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                    >
                        <option value="">-- Chọn Dự án --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.code}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Loại Yêu cầu *</label>
                    <select
                        name="request_type"
                        required
                        value={requestType}
                        onChange={e => setRequestType(e.target.value)}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                    >
                        <option value="">-- Chọn Loại test --</option>
                        <option value="fitup">Fit-Up</option>
                        <option value="visual">Visual</option>
                        <option value="backgouge">Backgouge</option>
                        <option value="lamcheck">Lamcheck</option>
                        <option value="mpi">MPI / MT</option>
                        <option value="final_visual">Final Visual (VS FINAL)</option>
                    </select>
                </div>
            </div>

            {/* DANH SÁCH MỐI HÀN CHỌN VÀO REQUEST */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                        🔗 Danh sách Mối hàn ({selectedWeldIds.length}/{filteredWelds.length} đã chọn)
                    </h3>
                    {projectId && (
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            style={{ padding: '4px 12px', fontSize: '0.75rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
                        >
                            {selectedWeldIds.length === filteredWelds.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    )}
                </div>

                {!projectId ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                        Vui lòng chọn Dự án trước để xem danh sách mối hàn.
                    </div>
                ) : loadingWelds ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                        ⏳ Đang tải dữ liệu mối hàn...
                    </div>
                ) : filteredWelds.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>
                        Không có mối hàn nào trong Dự án này. Hãy tạo mối hàn trước.
                    </div>
                ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto', borderTop: '1px solid #cbd5e1', paddingTop: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                                    <th style={{ padding: '8px', width: '40px' }}>Chọn</th>
                                    <th style={{ padding: '8px' }}>Bản vẽ</th>
                                    <th style={{ padding: '8px' }}>Số Mối hàn</th>
                                    <th style={{ padding: '8px' }}>Stage hiện tại</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWelds.map(w => (
                                    <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0', background: selectedWeldIds.includes(w.id) ? '#eff6ff' : 'transparent' }}>
                                        <td style={{ padding: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedWeldIds.includes(w.id)}
                                                onChange={() => handleToggleWeld(w.id)}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px', color: '#334155' }}>{w.drawing_no}</td>
                                        <td style={{ padding: '8px', fontWeight: 500, color: '#0f172a' }}>{w.weld_no}</td>
                                        <td style={{ padding: '8px' }}>
                                            <span style={{ padding: '2px 8px', background: '#e2e8f0', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                                                {String(w.stage).toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Hạng mục (Item) - Ghi đè tự động</label>
                    <input type="text" name="item" placeholder="Mặc định lấy DS Số MQ" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Task No.</label>
                    <input type="text" name="task_no" placeholder="VD: TASK-001" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Ngày yêu cầu Test</label>
                    <input type="date" name="request_date" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Giờ yêu cầu</label>
                    <input type="time" name="request_time" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Người tạo phiếu</label>
                    <input type="text" name="requested_by" defaultValue={userName} readOnly style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#64748b' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Đơn vị NDT (Inspector Company)</label>
                    <input type="text" name="inspector_company" placeholder="VD: Alpha NDT" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Ghi chú / Remarks</label>
                <textarea name="remarks" rows={2} placeholder="Ghi chú thêm..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                    type="button"
                    onClick={() => router.push('/requests')}
                    style={{ padding: '10px 16px', borderRadius: '6px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 500, cursor: 'pointer' }}
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || selectedWeldIds.length === 0}
                    style={{ padding: '10px 24px', borderRadius: '6px', background: (isSubmitting || selectedWeldIds.length === 0) ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', fontWeight: 500, cursor: (isSubmitting || selectedWeldIds.length === 0) ? 'not-allowed' : 'pointer' }}
                >
                    {isSubmitting ? 'Đang phân tích...' : '✅ Xác nhận Tạo Yêu cầu'}
                </button>
            </div>
        </form>
    )
}
