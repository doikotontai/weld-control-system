'use client'
// app/(dashboard)/admin/AdminClient.tsx
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, UserRole, ROLE_LABELS } from '@/types'

export default function AdminClient({ users }: { users: Profile[] }) {
    const supabase = createClient()
    const [localUsers, setLocalUsers] = useState(users)
    const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'viewer' as UserRole })
    const [creating, setCreating] = useState(false)
    const [message, setMessage] = useState('')

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true); setMessage('')

        // Note: Creating users in Supabase requires service role key
        // This calls a server action or API route
        const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser),
        })

        const data = await res.json()
        if (data.error) {
            setMessage(`❌ Lỗi: ${data.error}`)
        } else {
            setMessage(`✅ Đã tạo user ${newUser.email} thành công!`)
            setNewUser({ email: '', full_name: '', password: '', role: 'viewer' })
            // Refresh user list
            setLocalUsers(prev => [data.user, ...prev])
        }
        setCreating(false)
    }

    const handleUpdateRole = async (userId: string, newRole: UserRole) => {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
        if (!error) {
            setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
            setMessage(`✅ Đã cập nhật role!`)
        }
    }

    const roleColors: Record<UserRole, string> = {
        admin: '#ef4444',
        dcc: '#3b82f6',
        qc: '#8b5cf6',
        inspector: '#22c55e',
        viewer: '#94a3b8',
    }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>⚙️ Quản trị hệ thống</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>Quản lý người dùng và phân quyền</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Create User Form */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', alignSelf: 'start' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', color: '#1e40af' }}>➕ Tạo người dùng mới</h3>
                    <form onSubmit={handleCreateUser}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} placeholder="user@company.com" />
                            </div>
                            <div>
                                <label className="form-label">Họ tên *</label>
                                <input className="form-input" required value={newUser.full_name} onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))} placeholder="Nguyễn Văn A" />
                            </div>
                            <div>
                                <label className="form-label">Mật khẩu tạm *</label>
                                <input className="form-input" type="password" required value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} placeholder="Tối thiểu 8 ký tự" />
                            </div>
                            <div>
                                <label className="form-label">Phân quyền *</label>
                                <select className="form-input" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value as UserRole }))}>
                                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            {message && <div style={{ padding: '10px', background: message.startsWith('✅') ? '#dcfce7' : '#fee2e2', borderRadius: '6px', fontSize: '0.8rem', color: message.startsWith('✅') ? '#166534' : '#991b1b' }}>{message}</div>}
                            <button type="submit" className="btn btn-primary" disabled={creating}>
                                {creating ? '⏳ Đang tạo...' : '👤 Tạo người dùng'}
                            </button>
                        </div>
                    </form>

                    {/* Role Guide */}
                    <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <h4 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '0.875rem' }}>Phân quyền</h4>
                        {Object.entries(ROLE_LABELS).map(([role, label]) => (
                            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: roleColors[role as UserRole], flexShrink: 0 }} />
                                <strong style={{ fontSize: '0.8rem' }}>{label}</strong>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {role === 'admin' && '— Toàn quyền'}
                                    {role === 'dcc' && '— Tạo request, import'}
                                    {role === 'qc' && '— Quản lý weld, request'}
                                    {role === 'inspector' && '— Nhập NDT result'}
                                    {role === 'viewer' && '— Chỉ xem'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* User List */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>👥 Danh sách người dùng ({localUsers.length})</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Họ tên</th>
                                    <th>Email</th>
                                    <th>Phân quyền</th>
                                    <th>Trạng thái</th>
                                    <th>Thay đổi role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {localUsers.map(user => (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: 500 }}>{user.full_name}</td>
                                        <td style={{ fontSize: '0.875rem', color: '#64748b' }}>{user.email}</td>
                                        <td>
                                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: roleColors[user.role] + '20', color: roleColors[user.role] }}>
                                                {ROLE_LABELS[user.role]}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: user.is_active ? '#dcfce7' : '#f1f5f9', color: user.is_active ? '#166534' : '#64748b' }}>
                                                {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                            </span>
                                        </td>
                                        <td>
                                            <select
                                                style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                                                value={user.role}
                                                onChange={e => handleUpdateRole(user.id, e.target.value as UserRole)}
                                            >
                                                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
