/**
 * Input Validation Utilities
 * Schema validation for API requests and user input
 */

import { ErrorCode } from '@/types';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Password validation
 * Minimum 8 characters, at least one uppercase, one lowercase, one number
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Project title validation
 */
export function validateProjectTitle(title: string): ValidationError | null {
  if (!title || title.trim().length === 0) {
    return { field: 'title', message: 'Project title is required' };
  }
  if (title.length > 255) {
    return { field: 'title', message: 'Project title must be less than 255 characters' };
  }
  return null;
}

/**
 * Script validation
 */
export function validateScript(script: string): ValidationError | null {
  if (!script || script.trim().length === 0) {
    return { field: 'script', message: 'Script content is required' };
  }
  if (script.length < 100) {
    return { field: 'script', message: 'Script must be at least 100 characters long' };
  }
  if (script.length > 50000) {
    return { field: 'script', message: 'Script cannot exceed 50,000 characters' };
  }
  return null;
}

/**
 * Voice preset validation
 */
export function validateVoicePreset(voicePresetId: string): ValidationError | null {
  const validPresets = ['professional_narrator', 'energetic_host', 'calm_educator'];
  if (!validPresets.includes(voicePresetId)) {
    return { field: 'voice_preset_id', message: `Invalid voice preset. Must be one of: ${validPresets.join(', ')}` };
  }
  return null;
}

/**
 * Segment text validation
 */
export function validateSegmentText(text: string): ValidationError | null {
  if (!text || text.trim().length === 0) {
    return { field: 'text', message: 'Segment text is required' };
  }
  if (text.length > 2000) {
    return { field: 'text', message: 'Segment text must be less than 2000 characters' };
  }
  return null;
}

/**
 * Asset URL validation
 */
export function validateAssetUrl(url: string): ValidationError | null {
  try {
    new URL(url);
  } catch {
    return { field: 'url', message: 'Invalid URL format' };
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { field: 'url', message: 'URL must use HTTP or HTTPS protocol' };
  }
  return null;
}

/**
 * Duration validation (in seconds)
 */
export function validateDuration(duration: number, minSeconds = 0.5, maxSeconds = 600): ValidationError | null {
  if (typeof duration !== 'number' || isNaN(duration)) {
    return { field: 'duration', message: 'Duration must be a number' };
  }
  if (duration < minSeconds) {
    return { field: 'duration', message: `Duration must be at least ${minSeconds} seconds` };
  }
  if (duration > maxSeconds) {
    return { field: 'duration', message: `Duration cannot exceed ${maxSeconds} seconds` };
  }
  return null;
}

/**
 * Duration mismatch validation (returns warning level)
 * Based on technical-spec.md duration handling strategy
 */
export function validateDurationMismatch(
  selectedDuration: number,
  desiredDuration: number
): { valid: boolean; level: 'silent' | 'warn' | 'block'; speedFactor?: number; message?: string } {
  const percentDiff = Math.abs(selectedDuration - desiredDuration) / desiredDuration;

  if (percentDiff <= 0.05) {
    // ±5% or less: silent adjustment
    const speedFactor = desiredDuration / selectedDuration;
    return {
      valid: true,
      level: 'silent',
      speedFactor,
    };
  }

  if (percentDiff <= 0.2) {
    // ±5-20%: warning level
    const speedFactor = desiredDuration / selectedDuration;
    return {
      valid: true,
      level: 'warn',
      speedFactor,
      message: `Duration mismatch: ${(percentDiff * 100).toFixed(1)}%. Speed will be adjusted to ${(speedFactor * 100).toFixed(1)}% of original.`,
    };
  }

  // >20%: block
  return {
    valid: false,
    level: 'block',
    message: `Duration mismatch too large (${(percentDiff * 100).toFixed(1)}%). Difference cannot exceed 20%.`,
  };
}

/**
 * Placeholder threshold validation
 */
export function validatePlaceholderThreshold(placeholderCount: number, totalSegments: number): { valid: boolean; percentage: number; message?: string } {
  const percentage = totalSegments > 0 ? (placeholderCount / totalSegments) * 100 : 0;

  if (percentage > 30) {
    return {
      valid: false,
      percentage,
      message: `Too many placeholders (${(percentage).toFixed(1)}% of video). Maximum allowed is 30%. Please select assets for more segments.`,
    };
  }

  return {
    valid: true,
    percentage,
  };
}

/**
 * Aspect ratio validation (for Ken Burns effect compatibility)
 */
export function validateAspectRatio(width: number, height: number): { valid: boolean; aspectRatio: number; orientation: 'landscape' | 'portrait' | 'square' } {
  const aspectRatio = width / height;

  // Target is 16:9 = 1.78
  // Allow ±20% tolerance (1.42 - 2.14)
  const isValid = aspectRatio >= 1.42 && aspectRatio <= 2.14;

  let orientation: 'landscape' | 'portrait' | 'square';
  if (aspectRatio > 1.2) {
    orientation = 'landscape';
  } else if (aspectRatio < 0.8) {
    orientation = 'portrait';
  } else {
    orientation = 'square';
  }

  return {
    valid: isValid,
    aspectRatio,
    orientation,
  };
}

/**
 * File size validation (in bytes)
 */
export function validateFileSize(sizeBytes: number, maxMB = 500): ValidationError | null {
  const maxBytes = maxMB * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    return {
      field: 'file_size',
      message: `File size exceeds maximum of ${maxMB}MB (${(sizeBytes / 1024 / 1024).toFixed(2)}MB)`,
    };
  }
  return null;
}

/**
 * Color validation (hex format)
 */
export function validateColor(color: string): ValidationError | null {
  const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
  if (!hexColorRegex.test(color)) {
    return { field: 'color', message: 'Invalid color format. Use hex color (e.g., #FF0000)' };
  }
  return null;
}

/**
 * Rate limit validation
 */
export function validateRateLimit(userPlan: string, rendersUsedThisMonth: number, desiredVideoMinutes: number): { allowed: boolean; message?: string } {
  const limits: Record<string, { monthly: number; maxMinutes: number }> = {
    free: { monthly: 2, maxMinutes: 10 },
    pro: { monthly: 30, maxMinutes: 30 },
    enterprise: { monthly: 999999, maxMinutes: 999999 },
  };

  const limit = limits[userPlan] || limits.free;

  if (rendersUsedThisMonth >= limit.monthly) {
    return {
      allowed: false,
      message: `You have reached your monthly limit of ${limit.monthly} renders. Please upgrade or wait until next month.`,
    };
  }

  if (desiredVideoMinutes > limit.maxMinutes) {
    return {
      allowed: false,
      message: `Your plan allows videos up to ${limit.maxMinutes} minutes. This video would be ${desiredVideoMinutes} minutes.`,
    };
  }

  return { allowed: true };
}

/**
 * Comprehensive request validation helper
 */
export function validateRequest(
  data: Record<string, unknown>,
  schema: Record<string, (value: unknown) => ValidationError | null>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, validator] of Object.entries(schema)) {
    const error = validator(data[field]);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Project State Machine Validator
 * Validates state transitions based on technical-spec.md
 */

export type ProjectStatus = 'draft' | 'processing' | 'ready' | 'rendering' | 'completed' | 'failed';

export function canTransitionTo(currentState: ProjectStatus, newState: ProjectStatus): { valid: boolean; reason?: string } {
  // Allow any state to transition to 'failed'
  if (newState === 'failed') {
    return { valid: true };
  }

  // Define valid state transitions
  const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    draft: ['processing', 'failed'],
    processing: ['ready', 'failed'],
    ready: ['rendering', 'failed'],
    rendering: ['completed', 'failed'],
    completed: [], // No transitions from completed
    failed: [], // No transitions from failed
  };

  const allowed = validTransitions[currentState]?.includes(newState);

  if (!allowed) {
    const validOptions = validTransitions[currentState] || [];
    return {
      valid: false,
      reason: `Cannot transition from "${currentState}" to "${newState}". Valid transitions: ${validOptions.join(', ') || 'none'}`,
    };
  }

  return { valid: true };
}

/**
 * Check if project can be edited
 */
export function canEditProject(status: ProjectStatus): { valid: boolean; reason?: string } {
  if (status !== 'ready') {
    return {
      valid: false,
      reason: 'Can only edit projects in "ready" state',
    };
  }
  return { valid: true };
}

/**
 * Check if project can be deleted
 */
export function canDeleteProject(status: ProjectStatus): { valid: boolean; reason?: string } {
  if (status === 'rendering') {
    return {
      valid: false,
      reason: 'Cannot delete project while rendering is in progress',
    };
  }
  return { valid: true };
}

/**
 * Check if project can be rendered
 */
export function canRenderProject(status: ProjectStatus): { valid: boolean; reason?: string } {
  if (status !== 'ready') {
    return {
      valid: false,
      reason: 'Can only render projects in "ready" state',
    };
  }
  return { valid: true };
}
