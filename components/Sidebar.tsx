'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logoutWithSupabase } from '@/app/actions/auth'
import { setActiveProject } from '@/app/actions/project-context'
import { ROLE_LABELS, UserRole } from '@/types'

interface Project {
    id: string
    code: string
    name: string
}

interface SidebarProps {
    userRole: UserRole
    userName: string
    projects: Project[]
    currentProjectId: string
}

type NavItem = {
    href: string
    icon: string
    label: string
    roles: UserRole[]
}

type NavSection = {
    section?: string
    items: NavItem[]
}

const navSections: NavSection[] = [
    {
        items: [
            { href: '/dashboard', icon: 'ðŸ“Š', label: 'Dashboard', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
        ],
    },
    {
        section: 'KIá»‚M TRA',
        items: [
            { href: '/inspections/fitup', icon: 'ðŸ”©', label: 'Fit-Up', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
            { href: '/inspections/visual', icon: 'ðŸ‘ï¸', label: 'Visual / Request', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
            { href: '/inspections/backgouge', icon: 'âš™ï¸', label: 'Backgouge', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
            { href: '/inspections/lamcheck', icon: 'ðŸ”', label: 'Lamcheck', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
            { href: '/inspections/ndt', icon: 'ðŸ”¬', label: 'NDT Results', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
            { href: '/requests', icon: 'ðŸ“‹', label: 'YÃªu cáº§u kiá»ƒm tra', roles: ['admin', 'dcc', 'qc'] },
        ],
    },
    {
        section: 'Dá»® LIá»†U',
        items: [
            { href: '/welds', icon: 'ðŸ”©', label: 'Táº¥t cáº£ má»‘i hÃ n', roles: ['admin', 'dcc', 'qc', 'inspector', 'viewer'] },
            { href: '/drawings', icon: 'ðŸ—ºï¸', label: 'Báº£n váº½ / Drawings', roles: ['admin', 'dcc', 'qc', 'viewer'] },
        ],
    },
    {
        section: 'BÃO CÃO',
        items: [
            { href: '/reports/summary', icon: 'ðŸ“Š', label: 'Tá»•ng há»£p', roles: ['admin', 'dcc', 'qc', 'viewer'] },
            { href: '/reports/welder-ndt', icon: 'ðŸ‘·', label: 'NDT by Thá»£ hÃ n', roles: ['admin', 'dcc', 'qc'] },
            { href: '/reports/repair-rate', icon: 'ðŸ“ˆ', label: 'Repair Rate', roles: ['admin', 'dcc', 'qc'] },
        ],
    },
    {
        section: 'QUáº¢N LÃ',
        items: [
            { href: '/import', icon: 'ðŸ“¥', label: 'Import Excel', roles: ['admin', 'dcc'] },
            { href: '/admin', icon: 'ðŸ› ï¸', label: 'Quáº£n trá»‹ há»‡ thá»‘ng', roles: ['admin'] },
        ],
    },
]

export default function Sidebar({ userRole, userName, projects, currentProjectId }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await logoutWithSupabase()
        router.push('/login')
        router.refresh()
    }

    const handleProjectChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        await setActiveProject(event.target.value)
    }

    return (
        <div
            className="dashboard-sidebar"
            style={{
                width: '240px',
                height: '100vh',
                background: '#0f172a',
                position: 'fixed',
                left: 0,
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 50,
                borderRight: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            <div style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div
                        style={{
                            width: '34px',
                            height: '34px',
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                        }}
                    >
                        ðŸ”§
                    </div>
                    <div>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>Weld Control</div>
                        <div style={{ color: '#475569', fontSize: '0.65rem' }}>Online System</div>
                    </div>
                </div>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                    <div
                        style={{
                            color: '#64748b',
                            fontSize: '0.6rem',
                            marginBottom: '4px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                        }}
                    >
                        Dá»° ÃN
                    </div>
                    <select
                        value={currentProjectId}
                        onChange={handleProjectChange}
                        style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '4px',
                            padding: '5px 6px',
                            fontSize: '0.78rem',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="">-- Táº¥t cáº£ --</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.code}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <nav style={{ flex: 1, padding: '6px', overflowY: 'auto' }}>
                {navSections.map((section, sectionIndex) => {
                    const visibleItems = section.items.filter(item => item.roles.includes(userRole))
                    if (visibleItems.length === 0) {
                        return null
                    }

                    return (
                        <div key={section.section ?? `section-${sectionIndex}`} style={{ marginTop: sectionIndex > 0 ? '4px' : 0 }}>
                            {section.section && (
                                <div
                                    style={{
                                        padding: '8px 8px 3px',
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        color: '#334155',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.07em',
                                    }}
                                >
                                    {section.section}
                                </div>
                            )}

                            {visibleItems.map(item => {
                                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 10px',
                                            borderRadius: '6px',
                                            marginBottom: '1px',
                                            textDecoration: 'none',
                                            color: isActive ? 'white' : '#64748b',
                                            background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                                            borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                                            fontSize: '0.82rem',
                                            fontWeight: isActive ? 600 : 400,
                                            transition: 'all 0.12s ease',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.9rem', width: '18px', textAlign: 'center' }}>{item.icon}</span>
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </div>
                    )
                })}
            </nav>

            <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '6px' }}>
                    <div style={{ color: 'white', fontSize: '0.78rem', fontWeight: 500 }}>ðŸ‘¤ {userName}</div>
                    <div
                        style={{
                            display: 'inline-block',
                            marginTop: '3px',
                            padding: '1px 7px',
                            background: 'rgba(59,130,246,0.2)',
                            color: '#93c5fd',
                            borderRadius: '3px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                        }}
                    >
                        {ROLE_LABELS[userRole]}
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '7px',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                    }}
                >
                    ðŸšª ÄÄƒng xuáº¥t
                </button>
            </div>
        </div>
    )
}


