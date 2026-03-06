'use client'

import { useState } from 'react'
import { createProject, deleteProject } from '@/app/actions/projects'
import { format } from 'date-fns'

interface Project {
    id: string
    code: string
    name: string
    client: string | null
    contractor: string | null
    location: string | null
    created_at: string
}

export default function ProjectManagement({ initialProjects }: { initialProjects: Project[] }) {
    const [isCreating, setIsCreating] = useState(false)
    const [message, setMessage] = useState('')
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsCreating(true)
        setMessage('')

        const formData = new FormData(e.currentTarget)
        const res = await createProject(formData)

        if (res.error) {
            setMessage(`❌ ${res.error}`)
        } else {
            setMessage('✅ Tạo dự án thành công!')
            e.currentTarget.reset()
        }
        setIsCreating(false)
    }

    async function handleDelete(id: string, code: string) {
        const confirmDelete = window.confirm(`CẢNH BÁO NGUY HIỂM:\n\nBạn có chắc chắn muốn xóa dự án [${code}] không?\nToàn bộ dữ liệu Bản vẽ, Mối hàn, Yêu cầu kiểm tra, và Kết quả NDT thuộc dự án này có thể bị mất vĩnh viễn!\n\nHành động này không thể hoàn tác!`)
        if (!confirmDelete) return

        setIsDeleting(id)
        setMessage('')

        const res = await deleteProject(id)
        if (res.error) {
            setMessage(`❌ Lỗi xóa: ${res.error}`)
            alert(`Xóa thất bại: ${res.error}`)
        } else {
            setMessage(`✅ Đã xóa dự án ${code}!`)
        }
        setIsDeleting(null)
    }

    return (
        <div style={{ marginTop: '48px', borderTop: '2px dashed #cbd5e1', paddingTop: '48px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>🏗 Quản lý Dự án</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>Thêm mới hoặc xóa dự án trên hệ thống</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Form Tạo Dự Án */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', alignSelf: 'start' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', color: '#16a34a' }}>➕ Thêm Dự án mới</h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="form-label">Mã Dự án *</label>
                            <input name="code" className="form-input" required placeholder="VD: TNHA-PH2" />
                        </div>
                        <div>
                            <label className="form-label">Tên Dự án *</label>
                            <input name="name" className="form-input" required placeholder="Tên dự án đầy đủ" />
                        </div>
                        <div>
                            <label className="form-label">Khách hàng (Client)</label>
                            <input name="client" className="form-input" placeholder="Vietsovpetro" />
                        </div>
                        <div>
                            <label className="form-label">Nhà thầu (Contractor)</label>
                            <input name="contractor" className="form-input" placeholder="OCD" />
                        </div>
                        <div>
                            <label className="form-label">Vị trí</label>
                            <input name="location" className="form-input" placeholder="Block 12/11" />
                        </div>

                        {message && (
                            <div style={{
                                padding: '10px',
                                background: message.startsWith('✅') ? '#dcfce7' : '#fee2e2',
                                borderRadius: '6px', fontSize: '0.8rem',
                                color: message.startsWith('✅') ? '#166534' : '#991b1b'
                            }}>
                                {message}
                            </div>
                        )}

                        <button type="submit" className="btn" style={{ background: '#16a34a', color: 'white', marginTop: '8px' }} disabled={isCreating}>
                            {isCreating ? '⏳ Đang tạo...' : '🏗 Tạo Dự án'}
                        </button>
                    </form>
                </div>

                {/* Danh sách Dự Án */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>📋 Danh sách Dự án ({initialProjects.length})</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Mã DA</th>
                                    <th>Tên Dự Án</th>
                                    <th>Thông tin</th>
                                    <th>Ngày tạo</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Chưa có dự án nào</td>
                                    </tr>
                                ) : (
                                    initialProjects.map(proj => (
                                        <tr key={proj.id}>
                                            <td style={{ fontWeight: 600, color: '#3b82f6' }}>{proj.code}</td>
                                            <td style={{ fontWeight: 500 }}>{proj.name}</td>
                                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                <div>C: {proj.client || 'N/A'}</div>
                                                <div>T: {proj.contractor || 'N/A'}</div>
                                            </td>
                                            <td style={{ fontSize: '0.8rem' }}>
                                                {format(new Date(proj.created_at), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleDelete(proj.id, proj.code)}
                                                    disabled={isDeleting === proj.id}
                                                    style={{
                                                        padding: '6px 10px', background: '#fee2e2', color: '#b91c1c',
                                                        border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer',
                                                        fontSize: '0.75rem', fontWeight: 600,
                                                        opacity: isDeleting === proj.id ? 0.5 : 1
                                                    }}
                                                >
                                                    {isDeleting === proj.id ? 'Đang xóa...' : '🗑 Xóa'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
