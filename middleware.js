import { NextResponse } from 'next/server';
 
export function middleware(request) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Define paths that require authentication
  const protectedPaths = [
    '/dashboard',
    '/upload',
    '/uploads',
    '/settings',
    '/profile',
    '/api/parse-cv',
    '/api/process-cv',
    '/api/get-cvs',
    '/api/get-summaries'
  ];
  
  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  );
  
  // Define public paths that have special redirect rules
  const authPaths = ['/login', '/register'];
  const isAuthPath = authPaths.includes(path);
  
  // Check if user is authenticated through cookies
  const authCookie = request.cookies.get('isLoggedIn')?.value || '';
  const isLoggedIn = !!authCookie;
  
  // Redirect authenticated users away from auth pages
  if (isAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Redirect unauthenticated users away from protected pages
  if (isProtectedPath && !isLoggedIn) {
    const searchParams = new URLSearchParams();
    searchParams.set('from', path);
    
    return NextResponse.redirect(
      new URL(`/login?${searchParams.toString()}`, request.url)
    );
  }
  
  // Otherwise, allow access
  return NextResponse.next();
}
 
// Configure middleware to run on specific paths
export const config = {
  // Skip static files and API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
