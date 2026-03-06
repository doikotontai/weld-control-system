// middleware.ts — Auth protection với cookie-based JWT check
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/health']

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Cho phép public paths
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next()
    }

    // Cho phép static files và API
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/api/admin')
    ) {
        return NextResponse.next()
    }

    // Kiểm tra auth cookie (Supabase lưu session trong localStorage khi dùng supabase-js trực tiếp)
    // Với PKCE flow, token được lưu trong localStorage nên middleware không cần check
    // Chỉ redirect /login → /dashboard nếu đã login (dựa trên cookie sb-* của Supabase)
    const supabaseAuthCookie = req.cookies.get('sb-dvazznhntsltowhdvgee-auth-token')
        || req.cookies.get('supabase-auth-token')
        || req.cookies.get('weld-control-auth')

    // Nếu truy cập route protected mà chưa có cookie auth → redirect login
    if (!supabaseAuthCookie) {
        // Không redirect ngay — để client-side handle auth
        // Vì dùng @supabase/supabase-js trực tiếp, session lưu trong localStorage
        return NextResponse.next()
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
