'use client'
// components/Sidebar.tsx — Sidebar Navigation
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { UserRole, ROLE_LABELS } from '@/types'
import { logoutWithSupabase } from '@/app/actions/auth'

interface SidebarProps {
    userRole: UserRole
    userName: string
}

const navItems = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
    { href: '/welds', icon: '🔩', label: 'Quản lý Mối hàn', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
    { href: '/requests', icon: '📋', label: 'Yêu cầu Kiểm tra', roles: ['admin', 'dcc', 'qc'] },
    { href: '/ndt', icon: '🔬', label: 'Kết quả NDT', roles: ['admin', 'dcc', 'qc', 'inspector'] },
    { href: '/drawings', icon: '📐', label: 'Bản vẽ (Drawings)', roles: ['admin', 'dcc', 'qc', 'viewer'] },
    { href: '/import', icon: '📥', label: 'Import Excel', roles: ['admin', 'dcc'] },
    { href: '/admin', icon: '⚙️', label: 'Quản trị hệ thống', roles: ['admin'] },
]

export default function Sidebar({ userRole, userName }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await logoutWithSupabase()
        router.push('/login')
        router.refresh()
    }

    const visibleItems = navItems.filter(item => item.roles.includes(userRole))

    return (
        <div style={{
            width: '240px',
            height: '100vh',
            background: '#0f172a',
            position: 'fixed',
            left: 0, top: 0,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
            borderRight: '1px solid rgba(255,255,255,0.05)',
        }}>
            {/* Logo / Brand */}
            <div style={{
                padding: '20px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px',
                    }}>🔧</div>
                    <div>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>Weld Control</div>
                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Online System</div>
                    </div>
                </div>
                <div style={{
                    marginTop: '12px',
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>THIEN NGA – HAI AU</div>
                    <div style={{ color: '#64748b', fontSize: '0.65rem' }}>Phase 1 • Block 12/11</div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                {visibleItems.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                marginBottom: '2px',
                                textDecoration: 'none',
                                color: isActive ? 'white' : '#64748b',
                                background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent',
                                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                                fontSize: '0.875rem',
                                fontWeight: isActive ? 600 : 400,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* User Info + Logout */}
            <div style={{
                padding: '12px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
                <div style={{
                    padding: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                }}>
                    <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: 500 }}>
                        👤 {userName}
                    </div>
                    <div style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        padding: '2px 8px',
                        background: 'rgba(59,130,246,0.2)',
                        color: '#93c5fd',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                    }}>
                        {ROLE_LABELS[userRole]}
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '8px',
                        background: 'rgba(239,68,68,0.1)',
                        color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                    }}
                >
                    🚪 Đăng xuất
                </button>
            </div>
        </div>
    )
}
