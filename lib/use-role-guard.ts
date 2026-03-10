'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types'

interface AuthMeResponse {
    authenticated: boolean
    user?: {
        id: string
        email: string | null
        full_name: string
        role: UserRole
        is_active: boolean
    }
}

export function useRoleGuard(allowedRoles: UserRole[]) {
    const router = useRouter()
    const [role, setRole] = useState<UserRole | null>(null)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function checkRole() {
            try {
                const response = await fetch('/api/auth/me', { cache: 'no-store' })
                if (!response.ok) {
                    router.replace('/login')
                    return
                }

                const payload = (await response.json()) as AuthMeResponse
                const currentRole = payload.user?.role || 'viewer'

                if (cancelled) {
                    return
                }

                if (!allowedRoles.includes(currentRole)) {
                    router.replace('/dashboard')
                    return
                }

                setRole(currentRole)
            } catch {
                if (!cancelled) {
                    router.replace('/login')
                }
                return
            } finally {
                if (!cancelled) {
                    setChecking(false)
                }
            }
        }

        void checkRole()

        return () => {
            cancelled = true
        }
    }, [allowedRoles, router])

    return {
        role,
        checking,
        allowed: role !== null && allowedRoles.includes(role),
    }
}
