'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, deleteProject } from '@/app/actions/projects'
import { formatDateTime } from '@/lib/formatters'

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
    const router = useRouter()
    const [isCreating, setIsCreating] = useState(false)
    const [message, setMessage] = useState('')
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsCreating(true)
        setMessage('')

        const form = event.currentTarget
        const formData = new FormData(form)
        const result = await createProject(formData)

        if (result.error) {
            setMessage(`Lỗi: ${result.error}`)
        } else {
            setMessage('Tạo dự án thành công.')
            form.reset()
            router.refresh()
        }

        setIsCreating(false)
    }

    async function handleDelete(id: string, code: string) {
        const confirmed = window.confirm(
            `CẢNH BÁO:\n\nBạn có chắc chắn muốn xóa dự án [${code}] không?\nToàn bộ dữ liệu Bản vẽ, Mối hàn, Yêu cầu kiểm tra và Kết quả NDT của dự án này có thể bị mất vĩnh viễn.\n\nHành động này không thể hoàn tác!`
        )

        if (!confirmed) {
            return
        }

        setIsDeleting(id)
        setMessage('')

        const result = await deleteProject(id)
        if (result.error) {
            setMessage(`Lỗi xóa: ${result.error}`)
            alert(`Xóa thất bại: ${result.error}`)
        } else {
            setMessage(`Đã xóa dự án ${code}.`)
            router.refresh()
        }

        setIsDeleting(null)
    }

    const isSuccess = message.includes('thành công') || message.startsWith('Đã ')

    return (
        <div style={{ marginTop: '48px', borderTop: '2px dashed #cbd5e1', paddingTop: '48px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Quản lý dự án</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>Thêm mới hoặc xóa dự án trên hệ thống</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', alignSelf: 'start' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', color: '#16a34a' }}>Thêm dự án mới</h3>

                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="form-label">Mã dự án *</label>
                            <input name="code" className="form-input" required placeholder="VD: TNHA-PH2" />
                        </div>
                        <div>
                            <label className="form-label">Tên dự án *</label>
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
                            <div
                                style={{
                                    padding: '10px',
                                    background: isSuccess ? '#dcfce7' : '#fee2e2',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    color: isSuccess ? '#166534' : '#991b1b',
                                }}
                            >
                                {message}
                            </div>
                        )}

                        <button type="submit" className="btn" style={{ background: '#16a34a', color: 'white', marginTop: '8px' }} disabled={isCreating}>
                            {isCreating ? 'Đang tạo...' : 'Tạo dự án'}
                        </button>
                    </form>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Danh sách dự án ({initialProjects.length})</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Mã DA</th>
                                    <th>Tên dự án</th>
                                    <th>Thông tin</th>
                                    <th>Ngày tạo</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                            Chưa có dự án nào
                                        </td>
                                    </tr>
                                ) : (
                                    initialProjects.map((project) => (
                                        <tr key={project.id}>
                                            <td style={{ fontWeight: 600, color: '#3b82f6' }}>{project.code}</td>
                                            <td style={{ fontWeight: 500 }}>{project.name}</td>
                                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                <div>C: {project.client || 'N/A'}</div>
                                                <div>T: {project.contractor || 'N/A'}</div>
                                            </td>
                                            <td style={{ fontSize: '0.8rem' }}>
                                                <span suppressHydrationWarning>{formatDateTime(project.created_at)}</span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleDelete(project.id, project.code)}
                                                    disabled={isDeleting === project.id}
                                                    style={{
                                                        padding: '6px 10px',
                                                        background: '#fee2e2',
                                                        color: '#b91c1c',
                                                        border: '1px solid #f87171',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        opacity: isDeleting === project.id ? 0.5 : 1,
                                                    }}
                                                >
                                                    {isDeleting === project.id ? 'Đang xóa...' : 'Xóa'}
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
