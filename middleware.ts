import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET
);

if (!process.env.JWT_SECRET) {
    console.error('WARNING: JWT_SECRET not configured!');
}

// Map routes to required permissions
const ROUTE_PERMISSIONS: Record<string, string> = {
    '/finances': 'finances',
    '/clients': 'clients',
    '/projects': 'projects',
    '/production': 'production',
    '/management': 'management',
    '/history': 'history',
    '/suppliers': 'suppliers',
    '/warehouse': 'warehouse',
    '/documents': 'documents',
    '/calendar': 'calendar',
    '/trash': 'trash',
    '/settings': 'settings',
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public tools routes (QR code access)
    if (pathname.startsWith('/tools/')) {
        return NextResponse.next();
    }

    // Allow login page and static assets
    if (
        pathname === '/login' ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('favicon.ico')
    ) {
        return NextResponse.next();
    }

    // Check for auth token
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
        // Redirect to login if no token
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    try {
        // Verify JWT token
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const permissions = payload.permissions as string[];

        // Check permission for specific routes
        for (const [route, requiredPermission] of Object.entries(ROUTE_PERMISSIONS)) {
            if (pathname.startsWith(route)) {
                if (!permissions.includes(requiredPermission)) {
                    // Redirect to home if no permission
                    const homeUrl = new URL('/', request.url);
                    return NextResponse.redirect(homeUrl);
                }
                break;
            }
        }

        // Add user info to headers for server components
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', String(payload.userId));
        requestHeaders.set('x-user-role', String(payload.roleName));
        requestHeaders.set('x-user-permissions', JSON.stringify(permissions));

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch {
        // Invalid token, redirect to login
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('auth-token');
        return response;
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
