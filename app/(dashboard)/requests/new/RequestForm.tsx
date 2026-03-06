'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInspectionRequest } from '@/app/actions/requests'

interface Project {
    id: string
    code: string
    name: string
}

export default function RequestForm({ projects, userName }: { projects: Project[], userName: string }) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        setError('')

        const formData = new FormData(e.currentTarget)
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
                <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Dự án *</label>
                    <select name="project_id" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                        <option value="">-- Chọn Dự án --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.code}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Loại Yêu cầu *</label>
                    <select name="request_type" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                        <option value="">-- Chọn Loại test --</option>
                        <option value="fitup">Fit-Up</option>
                        <option value="visual">Visual</option>
                        <option value="backgouge">Backgouge</option>
                        <option value="lamcheck">Lamcheck</option>
                        <option value="mpi">MPI / MT</option>
                        <option value="final_visual">Final Visual (VS FINAL)</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Người yêu cầu</label>
                    <input type="text" name="requested_by" defaultValue={userName} readOnly style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#64748b' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Công ty kiểm định (Inspector)</label>
                    <input type="text" name="inspector_company" placeholder="VD: Alpha NDT" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Ngày yêu cầu</label>
                    <input type="date" name="request_date" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Giờ yêu cầu</label>
                    <input type="time" name="request_time" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Ghi chú / Remarks</label>
                <textarea name="remarks" rows={3} placeholder="Ghi chú thêm..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}></textarea>
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
                    disabled={isSubmitting}
                    style={{ padding: '10px 24px', borderRadius: '6px', background: isSubmitting ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', fontWeight: 500, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                    {isSubmitting ? 'Đang tạo...' : 'Tạo Yêu cầu'}
                </button>
            </div>
        </form>
    )
}
