export const PROJECT_COOKIE_NAME = 'weld-control-project-id'
export const PROJECT_CHANGE_EVENT = 'weld-control-project-changed'

export function readActiveProjectIdFromCookie(): string | null {
    if (typeof document === 'undefined') {
        return null
    }

    const match = document.cookie.match(/(?:^|;)\s*weld-control-project-id=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : null
}

export function writeActiveProjectIdToCookie(projectId: string) {
    if (typeof document === 'undefined') {
        return
    }

    if (projectId) {
        document.cookie = `${PROJECT_COOKIE_NAME}=${encodeURIComponent(projectId)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
        return
    }

    document.cookie = `${PROJECT_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
}

export function dispatchActiveProjectChange(projectId: string | null) {
    if (typeof window === 'undefined') {
        return
    }

    window.dispatchEvent(
        new CustomEvent(PROJECT_CHANGE_EVENT, {
            detail: { projectId },
        })
    )
}
