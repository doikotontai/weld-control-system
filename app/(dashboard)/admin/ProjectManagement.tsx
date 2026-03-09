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
            setMessage(`âŒ ${res.error}`)
        } else {
            setMessage('âœ… Táº¡o dá»± Ã¡n thÃ nh cÃ´ng!')
            e.currentTarget.reset()
        }
        setIsCreating(false)
    }

    async function handleDelete(id: string, code: string) {
        const confirmDelete = window.confirm(`Cáº¢NH BÃO NGUY HIá»‚M:\n\nBáº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a dá»± Ã¡n [${code}] khÃ´ng?\nToÃ n bá»™ dá»¯ liá»‡u Báº£n váº½, Má»‘i hÃ n, YÃªu cáº§u kiá»ƒm tra, vÃ  Káº¿t quáº£ NDT thuá»™c dá»± Ã¡n nÃ y cÃ³ thá»ƒ bá»‹ máº¥t vÄ©nh viá»…n!\n\nHÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c!`)
        if (!confirmDelete) return

        setIsDeleting(id)
        setMessage('')

        const res = await deleteProject(id)
        if (res.error) {
            setMessage(`âŒ Lá»—i xÃ³a: ${res.error}`)
            alert(`XÃ³a tháº¥t báº¡i: ${res.error}`)
        } else {
            setMessage(`âœ… ÄÃ£ xÃ³a dá»± Ã¡n ${code}!`)
        }
        setIsDeleting(null)
    }

    return (
        <div style={{ marginTop: '48px', borderTop: '2px dashed #cbd5e1', paddingTop: '48px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>ðŸ— Quáº£n lÃ½ Dá»± Ã¡n</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>ThÃªm má»›i hoáº·c xÃ³a dá»± Ã¡n trÃªn há»‡ thá»‘ng</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Form Táº¡o Dá»± Ãn */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', alignSelf: 'start' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', color: '#16a34a' }}>âž• ThÃªm Dá»± Ã¡n má»›i</h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label className="form-label">MÃ£ Dá»± Ã¡n *</label>
                            <input name="code" className="form-input" required placeholder="VD: TNHA-PH2" />
                        </div>
                        <div>
                            <label className="form-label">TÃªn Dá»± Ã¡n *</label>
                            <input name="name" className="form-input" required placeholder="TÃªn dá»± Ã¡n Ä‘áº§y Ä‘á»§" />
                        </div>
                        <div>
                            <label className="form-label">KhÃ¡ch hÃ ng (Client)</label>
                            <input name="client" className="form-input" placeholder="Vietsovpetro" />
                        </div>
                        <div>
                            <label className="form-label">NhÃ  tháº§u (Contractor)</label>
                            <input name="contractor" className="form-input" placeholder="OCD" />
                        </div>
                        <div>
                            <label className="form-label">Vá»‹ trÃ­</label>
                            <input name="location" className="form-input" placeholder="Block 12/11" />
                        </div>

                        {message && (
                            <div style={{
                                padding: '10px',
                                background: message.startsWith('âœ…') ? '#dcfce7' : '#fee2e2',
                                borderRadius: '6px', fontSize: '0.8rem',
                                color: message.startsWith('âœ…') ? '#166534' : '#991b1b'
                            }}>
                                {message}
                            </div>
                        )}

                        <button type="submit" className="btn" style={{ background: '#16a34a', color: 'white', marginTop: '8px' }} disabled={isCreating}>
                            {isCreating ? 'â³ Äang táº¡o...' : 'ðŸ— Táº¡o Dá»± Ã¡n'}
                        </button>
                    </form>
                </div>

                {/* Danh sÃ¡ch Dá»± Ãn */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>ðŸ“‹ Danh sÃ¡ch Dá»± Ã¡n ({initialProjects.length})</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>MÃ£ DA</th>
                                    <th>TÃªn Dá»± Ãn</th>
                                    <th>ThÃ´ng tin</th>
                                    <th>NgÃ y táº¡o</th>
                                    <th>HÃ nh Ä‘á»™ng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>ChÆ°a cÃ³ dá»± Ã¡n nÃ o</td>
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
                                                    {isDeleting === proj.id ? 'Äang xÃ³a...' : 'ðŸ—‘ XÃ³a'}
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

