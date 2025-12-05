/**
 * Supabase Client Utilities
 * Client-side Supabase instance for use in Client Components
 */

import { createBrowserClient } from '@supabase/ssr'

/**
 * Create Supabase client for use in Client Components
 * This handles auth state on the client side
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
