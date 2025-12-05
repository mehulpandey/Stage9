/**
 * GET /api/health
 * System health check endpoint
 */

import { NextRequest } from 'next/server';
import { asyncHandler, success } from '@/lib/api-utils';
import { getSupabaseServerClient } from '@/lib/database';

export const GET = asyncHandler(async (request: NextRequest) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};

  // Check Supabase connectivity
  try {
    const db = getSupabaseServerClient();
    const { error } = await db.from('users').select('id').limit(1);

    if (error) {
      checks.database = {
        status: 'error',
        message: error.message,
      };
    } else {
      checks.database = { status: 'ok' };
    }
  } catch (err) {
    checks.database = {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  // Check environment variables
  checks.environment = {
    status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'ok'
      : 'error',
    message:
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? undefined
        : 'Missing required environment variables',
  };

  // Overall health status
  const allOk = Object.values(checks).every((check) => check.status === 'ok');

  const [response] = success(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    allOk ? 200 : 503
  );

  return response;
});
