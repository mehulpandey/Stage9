/**
 * Authentication Utilities
 * JWT token creation, validation, and session management
 */

import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-must-be-at-least-32-chars');
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '3600'); // 1 hour
const REFRESH_TOKEN_EXPIRATION = parseInt(process.env.REFRESH_TOKEN_EXPIRATION || '604800'); // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  planType: string;
  iat: number;
  exp: number;
}

/**
 * Create JWT access token
 */
export async function createAccessToken(userId: string, email: string, planType: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    userId,
    email,
    planType,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + JWT_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify JWT token
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as JWTPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Extract JWT from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7); // Remove 'Bearer ' prefix
}

/**
 * Extract JWT from cookies
 */
export async function extractTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  return token || null;
}

/**
 * Set auth cookies
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: JWT_EXPIRATION,
  });

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_EXPIRATION,
  });
}

/**
 * Clear auth cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

/**
 * Hash password (use bcrypt in production)
 */
export async function hashPassword(password: string): Promise<string> {
  // This is a placeholder. In production, use bcryptjs
  // For now, we'll assume Supabase Auth handles password hashing
  return password;
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // This is a placeholder. In production, use bcryptjs
  return password === hash;
}

/**
 * Generate refresh token ID (stored in database)
 */
export function generateTokenId(): string {
  return crypto.getRandomValues(new Uint8Array(32)).toString();
}

/**
 * Hash token for database storage
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
