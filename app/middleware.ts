/**
 * Next.js Middleware
 * Request logging, authentication, rate limiting, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractTokenFromHeader } from '@/lib/auth';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/api/auth/signup', '/api/auth/login', '/api/health'];

// Rate limit storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  unauthenticated: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_UNAUTHENTICATED || '10'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  },
  authenticated: {
    maxRequests: 1000, // Will be overridden by user plan
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  },
};

/**
 * Check rate limit for an identifier (IP or user ID)
 */
function checkRateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const limit = rateLimitStore.get(identifier);

  if (!limit || limit.resetTime < now) {
    // Reset window
    rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, reset: now + config.windowMs };
  }

  if (limit.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      reset: limit.resetTime,
    };
  }

  limit.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - limit.count,
    reset: limit.resetTime,
  };
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const method = request.method;

  // Skip middleware for static assets
  if (path.startsWith('/_next') || path.startsWith('/public')) {
    return NextResponse.next();
  }

  // Add request ID for tracking
  const requestId = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);

  // Check if path requires authentication
  const isPublicPath = PUBLIC_PATHS.some(p => path.startsWith(p));

  // Rate limit by IP or user ID
  let identifier = request.ip || 'unknown';
  let token = null;

  if (!isPublicPath) {
    // Try to extract token for authenticated requests
    const authHeader = request.headers.get('authorization');
    token = extractTokenFromHeader(authHeader);

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        identifier = payload.userId;
      }
    }
  }

  // Apply rate limiting
  const config = token ? RATE_LIMIT_CONFIGS.authenticated : RATE_LIMIT_CONFIGS.unauthenticated;
  const rateLimitResult = checkRateLimit(identifier, config);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: {
            remaining: rateLimitResult.remaining,
            resetAt: new Date(rateLimitResult.reset).toISOString(),
          },
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': (rateLimitResult.reset / 1000).toString(),
        },
      }
    );
  }

  // Check authentication for protected routes
  if (!isPublicPath && !token) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid JWT token.',
        },
      },
      { status: 401 }
    );
  }

  // Verify token is still valid
  if (token) {
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired. Please refresh your token.',
          },
        },
        { status: 401 }
      );
    }

    // Add user context to request headers (will be read by API routes)
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-email', payload.email);
    response.headers.set('x-user-plan', payload.planType);
  }

  // Log request (in production, use structured logging)
  console.log(`[${requestId}] ${method} ${path} - ${rateLimitResult.remaining} requests remaining`);

  return response;
}

/**
 * Middleware config - which routes to apply middleware to
 */
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
