/**
 * API Utilities
 * Standardized response formatting, error handling, and HTTP helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { ErrorCode } from '@/types';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// CUSTOM ERROR CLASS
// ============================================================================

export class ApiError extends Error {
  constructor(
    public code: ErrorCode | string,
    public message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/**
 * Build successful API response
 */
export function success<T>(data: T, statusCode: number = 200): [NextResponse<ApiSuccessResponse<T>>, number] {
  return [
    NextResponse.json<ApiSuccessResponse<T>>(
      { success: true, data },
      { status: statusCode }
    ),
    statusCode,
  ];
}

/**
 * Build error API response
 */
export function error(
  code: ErrorCode | string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): [NextResponse<ApiErrorResponse>, number] {
  return [
    NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code,
          message,
          ...(details && { details }),
        },
      },
      { status: statusCode }
    ),
    statusCode,
  ];
}

// ============================================================================
// COMMON ERROR RESPONSES
// ============================================================================

export const ErrorResponses = {
  unauthorized: (message = 'Authentication required'): [NextResponse<ApiErrorResponse>, number] =>
    error(ErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message = 'Access denied'): [NextResponse<ApiErrorResponse>, number] =>
    error(ErrorCode.UNAUTHORIZED, message, 403),

  notFound: (resource = 'Resource'): [NextResponse<ApiErrorResponse>, number] =>
    error(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  badRequest: (message: string, details?: Record<string, unknown>): [NextResponse<ApiErrorResponse>, number] =>
    error(ErrorCode.VALIDATION_ERROR, message, 400, details),

  conflict: (message: string): [NextResponse<ApiErrorResponse>, number] =>
    error('CONFLICT', message, 409),

  tooManyRequests: (retryAfter?: number): [NextResponse<ApiErrorResponse>, number] => {
    const response = error(ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many requests. Please try again later.', 429);
    if (retryAfter) {
      response[0].headers.set('Retry-After', retryAfter.toString());
    }
    return response;
  },

  internalError: (message = 'Internal server error', details?: Record<string, unknown>): [NextResponse<ApiErrorResponse>, number] =>
    error(ErrorCode.INTERNAL_SERVER_ERROR, message, 500, details),

  serviceUnavailable: (message = 'Service temporarily unavailable'): [NextResponse<ApiErrorResponse>, number] =>
    error(ErrorCode.SERVICE_UNAVAILABLE, message, 503),
};

// ============================================================================
// REQUEST HELPERS
// ============================================================================

/**
 * Extract user ID from request (set by middleware)
 */
export function getUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  return userId;
}

/**
 * Extract user email from request
 */
export function getUserEmail(request: NextRequest): string | null {
  return request.headers.get('x-user-email');
}

/**
 * Extract user plan from request
 */
export function getUserPlan(request: NextRequest): string | null {
  return request.headers.get('x-user-plan') || 'free';
}

/**
 * Extract request ID for logging
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || 'unknown';
}

/**
 * Parse JSON body with error handling
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (err) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      400,
      { error: err instanceof Error ? err.message : 'Unknown parsing error' }
    );
  }
}

/**
 * Get query parameter
 */
export function getQueryParam(request: NextRequest, param: string, defaultValue?: string): string | undefined {
  return request.nextUrl.searchParams.get(param) || defaultValue;
}

/**
 * Get query parameter as number
 */
export function getQueryParamNumber(request: NextRequest, param: string, defaultValue?: number): number | undefined {
  const value = request.nextUrl.searchParams.get(param);
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Verify user authorization (check that resource belongs to user)
 */
export function verifyOwnership(resourceUserId: string, currentUserId: string | null): boolean {
  if (!currentUserId) return false;
  return resourceUserId === currentUserId;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Require specific HTTP method
 */
export function requireMethod(request: NextRequest, allowedMethods: string[]): boolean {
  return allowedMethods.includes(request.method);
}

/**
 * Require authentication
 */
export function requireAuth(userId: string | null): userId is string {
  return userId !== null && userId !== undefined;
}

/**
 * Require specific plan type
 */
export function requirePlan(userPlan: string | null, minimumPlan: 'free' | 'pro' | 'enterprise'): boolean {
  const planRank = { free: 1, pro: 2, enterprise: 3 };
  const userRank = planRank[userPlan as keyof typeof planRank] || 1;
  return userRank >= planRank[minimumPlan];
}

// ============================================================================
// LOGGING HELPERS
// ============================================================================

/**
 * Log API request
 */
export function logRequest(
  requestId: string,
  method: string,
  path: string,
  userId?: string | null,
  details?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const user = userId ? ` [User: ${userId}]` : '';
  const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [${requestId}] ${method} ${path}${user}${detailsStr}`);
}

/**
 * Log API error
 */
export function logError(
  requestId: string,
  error: Error | ApiError,
  context?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const errorDetails = error instanceof ApiError
    ? { code: error.code, message: error.message, statusCode: error.statusCode, details: error.details }
    : { message: error.message, stack: error.stack };
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  console.error(`[${timestamp}] [${requestId}] ERROR: ${JSON.stringify(errorDetails)}${contextStr}`);
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

export interface PaginationParams {
  limit: number;
  offset: number;
}

export function getPaginationParams(request: NextRequest, defaultLimit = 20, maxLimit = 100): PaginationParams {
  const limit = Math.min(
    getQueryParamNumber(request, 'limit', defaultLimit) || defaultLimit,
    maxLimit
  );
  const offset = Math.max(getQueryParamNumber(request, 'offset', 0) || 0, 0);

  return { limit, offset };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

// ============================================================================
// ASYNC ROUTE HANDLER WRAPPER
// ============================================================================

/**
 * Wrap async route handlers with error handling
 * Usage: export const POST = asyncHandler(async (req) => { ... })
 */
export function asyncHandler(
  handler: (request: NextRequest) => Promise<[NextResponse, number] | NextResponse>
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);

    try {
      logRequest(requestId, request.method, request.nextUrl.pathname, getUserId(request));

      const result = await handler(request);
      const response = Array.isArray(result) ? result[0] : result;

      return response;
    } catch (err) {
      logError(requestId, err instanceof Error ? err : new Error(String(err)));

      if (err instanceof ApiError) {
        const [response] = error(err.code, err.message, err.statusCode, err.details);
        return response;
      }

      const [response] = ErrorResponses.internalError(
        'An unexpected error occurred',
        { error: err instanceof Error ? err.message : String(err) }
      );
      return response;
    }
  };
}
