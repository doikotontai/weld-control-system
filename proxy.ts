import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/health']

function isPublicPath(pathname: string) {
    return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

function isFrameworkAsset(pathname: string) {
    return (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/api/')
    )
}

export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl
    const hasAuthCookie = Boolean(req.cookies.get('weld-control-auth')?.value)

    if (isFrameworkAsset(pathname)) {
        return NextResponse.next()
    }

    if (pathname === '/login' && hasAuthCookie) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if (isPublicPath(pathname)) {
        return NextResponse.next()
    }

    if (!hasAuthCookie) {
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
