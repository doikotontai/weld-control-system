'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithSupabase } from '@/app/actions/auth'

const DEV_MODE = false
const DEV_CREDENTIALS = { email: 'admin@weldcontrol.dev', password: 'Admin@2024' }

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        if (typeof window !== 'undefined' && document.cookie.includes('weld-control-auth=')) {
            router.push('/dashboard')
        }
    }, [router])

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        if (DEV_MODE) {
            if (email.trim() === DEV_CREDENTIALS.email && password === DEV_CREDENTIALS.password) {
                localStorage.setItem(
                    'weld-dev-session',
                    JSON.stringify({
                        id: 'dev-admin-001',
                        email: DEV_CREDENTIALS.email,
                        full_name: 'Admin (Dev Mode)',
                        role: 'admin',
                        is_active: true,
                    })
                )
                router.push('/dashboard')
                return
            }

            setError(`Dev Mode: dùng email "${DEV_CREDENTIALS.email}" / password "${DEV_CREDENTIALS.password}"`)
            setLoading(false)
            return
        }

        try {
            const formData = new FormData()
            formData.append('email', email)
            formData.append('password', password)

            const result = await loginWithSupabase(formData)
            if (result.error) {
                setError(`Lỗi đăng nhập: ${result.error}`)
            } else if (result.success) {
                const nextUrl =
                    typeof window !== 'undefined'
                        ? new URLSearchParams(window.location.search).get('next') || '/dashboard'
                        : '/dashboard'
                router.push(nextUrl)
                router.refresh()
            }
        } catch (err) {
            setError(`Không kết nối được server: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }

        setLoading(false)
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div
                style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    padding: '48px',
                    width: '100%',
                    maxWidth: '440px',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                }}
            >
                {DEV_MODE && (
                    <div
                        style={{
                            background: 'rgba(251,191,36,0.15)',
                            border: '1px solid rgba(251,191,36,0.4)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            marginBottom: '20px',
                            fontSize: '0.8rem',
                        }}
                    >
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>DEV MODE</span>
                        <br />
                        <span style={{ color: '#d97706', fontSize: '0.75rem' }}>
                            Email: {DEV_CREDENTIALS.email}
                            <br />
                            Pass: {DEV_CREDENTIALS.password}
                        </span>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div
                        style={{
                            width: '72px',
                            height: '72px',
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            borderRadius: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            fontSize: '32px',
                            boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
                        }}
                    >
                        🔧
                    </div>
                    <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700 }}>Weld Control Online</h1>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>Email</label>
                        <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            placeholder={DEV_MODE ? DEV_CREDENTIALS.email : 'your.email@company.com'}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                boxSizing: 'border-box',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '0.9rem',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>Mật khẩu</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            placeholder="********"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                boxSizing: 'border-box',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '0.9rem',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {error && (
                        <div
                            style={{
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                color: '#fca5a5',
                                fontSize: '0.85rem',
                                marginBottom: '20px',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: loading ? '#374151' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: loading ? 'none' : '0 4px 14px rgba(59,130,246,0.4)',
                        }}
                    >
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    )
}
