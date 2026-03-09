'use client'

import { useState } from 'react'
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
            setMessage(`Error: ${res.error}`)
        } else {
            setMessage('Tao du an thanh cong!')
            e.currentTarget.reset()
        }
        setIsCreating(false)
    }

    async function handleDelete(id: string, code: string) {
        const confirmDelete = window.confirm(`CANH BAO:\n\nBan co chac chan muon xoa du an [${code}] khong?\nToan bo du lieu Ban ve, Moi han, Yeu cau kiem tra va Ket qua NDT cua du an nay co the bi mat vinh vien.\n\nHanh dong nay khong the hoan tac!`)
        if (!confirmDelete) return

        setIsDeleting(id)
        setMessage('')

        const res = await deleteProject(id)
        if (res.error) {
            setMessage(`Loi xoa: ${res.error}`)
            alert(`Xoa that bai: ${res.error}`)
        } else {
            setMessage(`Da xoa du an ${code}!`)
        }
        setIsDeleting(null)
    }

    return (
        <div style={{ marginTop: '48px', borderTop: '2px dashed #cbd5e1', paddingTop: '48px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Quan ly du an</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>Them moi hoac xoa du an tren he thong</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', alignSelf: 'start' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', color: '#16a34a' }}>Them du an moi</h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="form-label">Ma du an *</label>
                            <input name="code" className="form-input" required placeholder="VD: TNHA-PH2" />
                        </div>
                        <div>
                            <label className="form-label">Ten du an *</label>
                            <input name="name" className="form-input" required placeholder="Ten du an day du" />
                        </div>
                        <div>
                            <label className="form-label">Khach hang (Client)</label>
                            <input name="client" className="form-input" placeholder="Vietsovpetro" />
                        </div>
                        <div>
                            <label className="form-label">Nha thau (Contractor)</label>
                            <input name="contractor" className="form-input" placeholder="OCD" />
                        </div>
                        <div>
                            <label className="form-label">Vi tri</label>
                            <input name="location" className="form-input" placeholder="Block 12/11" />
                        </div>

                        {message && (
                            <div style={{
                                padding: '10px',
                                background: message.includes('thanh cong') || message.startsWith('Da ') ? '#dcfce7' : '#fee2e2',
                                borderRadius: '6px', fontSize: '0.8rem',
                                color: message.includes('thanh cong') || message.startsWith('Da ') ? '#166534' : '#991b1b'
                            }}>
                                {message}
                            </div>
                        )}

                        <button type="submit" className="btn" style={{ background: '#16a34a', color: 'white', marginTop: '8px' }} disabled={isCreating}>
                            {isCreating ? 'Dang tao...' : 'Tao du an'}
                        </button>
                    </form>
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Danh sach du an ({initialProjects.length})</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ma DA</th>
                                    <th>Ten du an</th>
                                    <th>Thong tin</th>
                                    <th>Ngay tao</th>
                                    <th>Hanh dong</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Chua co du an nao</td>
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
                                                {formatDateTime(proj.created_at)}
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
                                                    {isDeleting === proj.id ? 'Dang xoa...' : 'Xoa'}
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

