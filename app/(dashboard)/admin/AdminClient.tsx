'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, ROLE_LABELS, UserRole } from '@/types'

interface CreateUserResponse {
    error?: string
    user?: Profile
}

interface ProfileRoleTable {
    update(values: { role: UserRole }): {
        eq(column: 'id', value: string): Promise<{ error: { message: string } | null }>
    }
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    admin: 'Toàn quyền',
    dcc: 'Tạo yêu cầu, import dữ liệu',
    qc: 'Quản lý mối hàn, yêu cầu kiểm tra',
    inspector: 'Nhập kết quả NDT',
    viewer: 'Chỉ xem',
}

export default function AdminClient({ users }: { users: Profile[] }) {
    const supabase = createClient()
    const [localUsers, setLocalUsers] = useState(users)
    const [newUser, setNewUser] = useState({
        email: '',
        full_name: '',
        password: '',
        role: 'viewer' as UserRole,
    })
    const [creating, setCreating] = useState(false)
    const [message, setMessage] = useState('')

    const handleCreateUser = async (event: React.FormEvent) => {
        event.preventDefault()
        setCreating(true)
        setMessage('')

        const response = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser),
        })

        const data = (await response.json()) as CreateUserResponse
        if (data.error) {
            setMessage(`Lỗi: ${data.error}`)
        } else {
            setMessage(`Đã tạo người dùng ${newUser.email} thành công.`)
            setNewUser({ email: '', full_name: '', password: '', role: 'viewer' })
            if (data.user) {
                setLocalUsers((previous) => [data.user as Profile, ...previous])
            }
        }

        setCreating(false)
    }

    const handleUpdateRole = async (userId: string, nextRole: UserRole) => {
        const profilesTable = supabase.from('profiles') as unknown as ProfileRoleTable
        const { error } = await profilesTable.update({ role: nextRole }).eq('id', userId)

        if (error) {
            setMessage(`Lỗi: ${error.message}`)
            return
        }

        setLocalUsers((previous) =>
            previous.map((user) => (user.id === userId ? { ...user, role: nextRole } : user))
        )
        setMessage('Đã cập nhật phân quyền.')
    }

    const roleColors: Record<UserRole, string> = {
        admin: '#ef4444',
        dcc: '#3b82f6',
        qc: '#8b5cf6',
        inspector: '#22c55e',
        viewer: '#94a3b8',
    }

    const isError = message.startsWith('Lỗi:')

    return (
        <div className="page-enter">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Quản trị hệ thống</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>Quản lý người dùng và phân quyền</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        alignSelf: 'start',
                    }}
                >
                    <h3 style={{ fontWeight: 600, marginBottom: '20px', color: '#1e40af' }}>
                        Tạo người dùng mới
                    </h3>

                    <form onSubmit={handleCreateUser}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label className="form-label">Email *</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={newUser.email}
                                    onChange={(event) =>
                                        setNewUser((user) => ({ ...user, email: event.target.value }))
                                    }
                                    placeholder="user@company.com"
                                />
                            </div>

                            <div>
                                <label className="form-label">Họ tên *</label>
                                <input
                                    className="form-input"
                                    autoComplete="name"
                                    required
                                    value={newUser.full_name}
                                    onChange={(event) =>
                                        setNewUser((user) => ({ ...user, full_name: event.target.value }))
                                    }
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>

                            <div>
                                <label className="form-label">Mật khẩu tạm *</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={newUser.password}
                                    onChange={(event) =>
                                        setNewUser((user) => ({ ...user, password: event.target.value }))
                                    }
                                    placeholder="Tối thiểu 8 ký tự"
                                />
                            </div>

                            <div>
                                <label className="form-label">Phân quyền *</label>
                                <select
                                    className="form-input"
                                    value={newUser.role}
                                    onChange={(event) =>
                                        setNewUser((user) => ({ ...user, role: event.target.value as UserRole }))
                                    }
                                >
                                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                                        <option key={role} value={role}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {message && (
                                <div
                                    style={{
                                        padding: '10px',
                                        background: isError ? '#fee2e2' : '#dcfce7',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        color: isError ? '#991b1b' : '#166534',
                                    }}
                                >
                                    {message}
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={creating}>
                                {creating ? 'Đang tạo...' : 'Tạo người dùng'}
                            </button>
                        </div>
                    </form>

                    <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <h4 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '0.875rem' }}>
                            Phân quyền
                        </h4>
                        {Object.entries(ROLE_LABELS).map(([role, label]) => (
                            <div
                                key={role}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
                            >
                                <span
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: roleColors[role as UserRole],
                                        flexShrink: 0,
                                    }}
                                />
                                <strong style={{ fontSize: '0.8rem' }}>{label}</strong>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    - {ROLE_DESCRIPTIONS[role as UserRole]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                >
                    <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>
                        Danh sách người dùng ({localUsers.length})
                    </h3>
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
                                {localUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: 500 }}>{user.full_name}</td>
                                        <td style={{ fontSize: '0.875rem', color: '#64748b' }}>{user.email}</td>
                                        <td>
                                            <span
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    background: `${roleColors[user.role]}20`,
                                                    color: roleColors[user.role],
                                                }}
                                            >
                                                {ROLE_LABELS[user.role]}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    background: user.is_active ? '#dcfce7' : '#f1f5f9',
                                                    color: user.is_active ? '#166534' : '#64748b',
                                                }}
                                            >
                                                {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                            </span>
                                        </td>
                                        <td>
                                            <select
                                                style={{
                                                    padding: '4px 8px',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                }}
                                                value={user.role}
                                                onChange={(event) =>
                                                    handleUpdateRole(user.id, event.target.value as UserRole)
                                                }
                                            >
                                                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                                                    <option key={role} value={role}>
                                                        {label}
                                                    </option>
                                                ))}
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
