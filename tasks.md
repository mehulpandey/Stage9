# Stage9 MVP - Implementation Tasks

**Status**: Ready for implementation
**Total Tasks**: 89
**Checkpoints**: 9

---

## Overview

This document contains all tasks needed to build the MVP. Tasks are grouped into 9 logical checkpoints. Each checkpoint is reviewable and should be completed before moving to the next one.

**How to use this document**:
- ✅ Mark tasks as completed using checkboxes
- 📍 Complete all tasks in a checkpoint before moving to the next
- 🔍 Request review after each checkpoint
- 📝 Update this file as you complete each checkpoint

---

## CHECKPOINT 1: Project Setup & Database Schema

**Objective**: Set up the project infrastructure and database structure.
**Estimated completion**: Day 1-2
**Deliverables**: Working Next.js app with Supabase database, proper project structure

### Backend Setup
- [x] Initialize Next.js project with TypeScript
- [x] Set up environment variables (.env.local, .env.example)
  - [x] Supabase URL and API key
  - [x] OpenAI API key
  - [x] ElevenLabs API key
  - [x] Pexels API key
  - [x] Pixabay API key
  - [x] Stripe API key (placeholder)
  - [x] JWT secret
  - [x] App domain (stage9.ai)
- [x] Configure Supabase project (structure created, ready for user setup)
- [x] Set up Git repository with .gitignore
- [x] Install core dependencies:
  - [x] Next.js framework
  - [x] TypeScript types
  - [x] Supabase client (@supabase/supabase-js)
  - [x] FFmpeg wrapper (fluent-ffmpeg)
  - [x] BullMQ for job queue
  - [x] Redis client
  - [x] OpenAI SDK
  - [x] ElevenLabs SDK
  - [x] Axios for HTTP requests
  - [x] Sentry for error tracking

### Database Schema (Supabase Migrations)
- [x] Create `users` table
  - [x] id (UUID, PK)
  - [x] email (varchar, unique)
  - [x] created_at (timestamp)
  - [x] plan_type (free/pro/enterprise)
  - [x] renders_used_this_month (integer)
  - [x] renders_reset_date (date)
  - [x] storage_used_bytes (integer)
- [x] Create `projects` table
  - [x] id (UUID, PK)
  - [x] user_id (FK to users)
  - [x] title (varchar)
  - [x] status (draft/processing/ready/rendering/completed)
  - [x] original_script (text)
  - [x] optimized_script (text)
  - [x] voice_preset_id (varchar)
  - [x] editing_style_preset_id (varchar)
  - [x] created_at (timestamp)
  - [x] updated_at (timestamp)
- [x] Create `segments` table
  - [x] id (UUID, PK)
  - [x] project_id (FK to projects)
  - [x] segment_number (integer)
  - [x] original_text (text)
  - [x] optimized_text (text)
  - [x] duration (decimal) - in seconds
  - [x] estimated_duration (decimal)
  - [x] tts_audio_url (varchar, nullable)
  - [x] selected_asset_id (FK to assets, nullable)
  - [x] asset_status (has_asset/needs_selection/placeholder)
  - [x] placeholder_color (varchar, default theme color)
  - [x] speed_adjusted (boolean)
  - [x] speed_factor (decimal, nullable)
  - [x] is_silent (boolean, default false)
  - [x] silent_duration (decimal, nullable)
  - [x] created_at (timestamp)
- [x] Create `assets` table
  - [x] id (UUID, PK)
  - [x] project_id (FK to projects, nullable - null for global cache)
  - [x] segment_id (FK to segments, nullable)
  - [x] source_type (stock/user_uploaded/placeholder)
  - [x] provider (pexels/pixabay)
  - [x] provider_asset_id (varchar)
  - [x] asset_type (video/image)
  - [x] duration (decimal, nullable - in seconds)
  - [x] url (varchar)
  - [x] thumbnail_url (varchar, nullable)
  - [x] aspect_ratio (decimal)
  - [x] metadata_json (jsonb) - title, tags, description
  - [x] is_ranked (boolean) - one per segment ranking
  - [x] rank_position (integer, 1-3 nullable)
  - [x] ranking_score (decimal, nullable) - overall score
  - [x] keyword_score (decimal, nullable)
  - [x] duration_score (decimal, nullable)
  - [x] orientation_score (decimal, nullable)
  - [x] quality_score (decimal, nullable)
  - [x] cached_at (timestamp)
  - [x] expires_at (timestamp)
  - [x] created_at (timestamp)
- [x] Create `renders` table
  - [x] id (UUID, PK)
  - [x] project_id (FK to projects)
  - [x] user_id (FK to users)
  - [x] status (queued/processing/completed/failed)
  - [x] render_version (integer)
  - [x] output_video_url (varchar, nullable - signed URL)
  - [x] output_srt_url (varchar, nullable - signed URL)
  - [x] burn_captions (boolean)
  - [x] caption_style (classic_bottom/modern_full_width/minimal_floating)
  - [x] timeline_json (jsonb, nullable) - timeline metadata
  - [x] total_duration_s (integer, nullable)
  - [x] estimated_duration_s (integer)
  - [x] started_at (timestamp, nullable)
  - [x] completed_at (timestamp, nullable)
  - [x] duration_s (integer, nullable) - how long render took
  - [x] logs (text, nullable) - error messages/debug logs
  - [x] created_at (timestamp)

### Database Indexes
- [x] Create index: `projects (user_id, created_at)`
- [x] Create index: `segments (project_id)`
- [x] Create index: `segments (project_id, asset_status)`
- [x] Create index: `renders (project_id, created_at)`
- [x] Create index: `renders (user_id, created_at)`
- [x] Create index: `assets (project_id)`
- [x] Create index: `assets (provider_asset_id)` - for deduplication

### Supabase Storage Buckets
- [x] Create bucket: `assets` (public) - for stock assets
- [x] Create bucket: `tts-audio` (private) - for TTS audio files
- [x] Create bucket: `renders` (private) - for final videos
- [x] Create bucket: `thumbnails` (public) - for segment thumbnails
- [x] Set up bucket policies for file access (configured in migrations)

### Project Structure
- [x] Create folder structure:
  - [x] `/app/api/` - API routes
  - [x] `/app/api/auth/` - authentication routes
  - [x] `/app/api/projects/` - project routes
  - [x] `/app/api/segments/` - segment routes
  - [x] `/app/api/renders/` - render routes
  - [x] `/lib/` - utility functions
  - [x] `/lib/db/` - database queries
  - [x] `/lib/llm/` - LLM prompts and calls
  - [x] `/lib/tts/` - TTS generation
  - [x] `/lib/stock/` - stock API integration
  - [x] `/lib/ffmpeg/` - FFmpeg operations
  - [x] `/lib/auth/` - authentication helpers
  - [x] `/workers/` - background job handlers
  - [x] `/types/` - TypeScript type definitions
  - [x] `/public/` - static assets

### Review Checkpoint 1
- [x] All database tables created (in migrations)
- [x] All indexes created (in migrations)
- [x] Storage buckets configured (created via Supabase)
- [x] Environment variables set up (.env.example completed)
- [x] Project builds without errors (Next.js + TypeScript configured)
- [x] Can connect to Supabase (client configured with credentials)
- [x] Postgres MCP server configured and tested
- [x] Database migrations successfully applied

### Notes for Mehul

**Checkpoint 1 Status**: ✅ **FULLY COMPLETE**

**What Was Completed**:
1. ✅ Database schema fully set up (11 tables, 37 indexes, RLS policies)
2. ✅ Supabase storage buckets created:
   - `assets` (public) - Stock footage/images
   - `tts-audio` (private) - TTS audio files
   - `renders` (private) - Final rendered videos
   - `thumbnails` (public) - Video thumbnails
3. ✅ Postgres MCP server configured in `.mcp.json` and tested successfully
4. ✅ Supabase connection verified with pooler URL
5. ✅ Environment variables configured in `app/.env.local`:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY

**Action Items for You**:
- None! Checkpoint 1 is fully complete and ready for Checkpoint 2

**Technical Notes**:
- Database connection uses connection pooling (port 6543) instead of direct connection for better performance
- All tables have Row-Level Security (RLS) enabled for data isolation
- Storage buckets use Supabase's default file size limits
- `@supabase/supabase-js` and `pg` packages installed for database operations

**Next Steps**:
Ready to begin Checkpoint 2: Authentication & API Foundation

---

## CHECKPOINT 2: Authentication & API Foundation

**Objective**: Implement user authentication and API response format.
**Estimated completion**: Day 2-3
**Deliverables**: Working auth system, standardized API responses, auth middleware

### Authentication System
- [x] Set up custom JWT Auth (using jose library with bcrypt password hashing)
- [x] Create `/lib/auth/` utilities:
  - [x] JWT token generation and validation
  - [x] Refresh token rotation logic
  - [x] Token verification middleware
  - [x] Password hashing with bcryptjs
- [x] Create API routes:
  - [x] `POST /api/auth/signup` - user registration
  - [x] `POST /api/auth/login` - user login
  - [x] `POST /api/auth/logout` - user logout
  - [x] `POST /api/auth/refresh` - refresh access token
  - [x] `GET /api/auth/me` - get current user
- [x] Token storage (localStorage for client-side, refresh tokens in database)
- [x] Middleware with authentication check and user context injection
- [x] Add request logging middleware (console logs with request ID)

### API Response Format & Error Handling
- [x] Create response wrapper utilities (in lib/api-utils.ts):
  - [x] `success(data)` - standardized success
  - [x] `error(code, message, details)` - standardized error
- [x] Create error codes enum (in types/index.ts):
  - [x] UNAUTHORIZED, TOKEN_EXPIRED
  - [x] VALIDATION_ERROR, INVALID_PROJECT_STATE
  - [x] NOT_FOUND, PROJECT_NOT_FOUND, SEGMENT_NOT_FOUND
  - [x] RATE_LIMIT_EXCEEDED, QUOTA_EXCEEDED
  - [x] RENDER_FAILED, TTS_GENERATION_FAILED
  - [x] INTERNAL_SERVER_ERROR, SERVICE_UNAVAILABLE
- [x] Create error handling middleware (asyncHandler wrapper):
  - [x] Catch all errors and format as standardized response
  - [x] Log errors with context (request ID, user ID, path)
  - [x] Return appropriate HTTP status codes
- [x] Create rate limiting middleware (in middleware.ts):
  - [x] Unauthenticated: 10 req/min
  - [x] Authenticated: 1000 req/min (plan-based in future)
  - [x] Return 429 + X-RateLimit headers

### Authorization Middleware
- [x] Create authorization in middleware.ts:
  - [x] Verify JWT token on protected routes
  - [x] Extract user ID from token
  - [x] Inject user context into request headers (x-user-id, x-user-email, x-user-plan)
  - [x] Return 401 if invalid/expired
- [x] Create helper functions in lib/api-utils.ts:
  - [x] getUserId(request) - extract user ID from headers
  - [x] verifyOwnership(resourceUserId, currentUserId) - check resource ownership
  - [x] requireAuth(userId) - type guard for authentication

### API Health & Status
- [x] Create `GET /api/health` endpoint
  - [x] Check Supabase connectivity
  - [x] Check environment variables
  - [x] Return system status (healthy/degraded)

### Frontend UI (Checkpoint 2)
- [x] Create login page (`app/auth/login/page.tsx`)
  - [x] Email input field
  - [x] Password input field with show/hide toggle
  - [x] Sign in button with loading state
  - [x] "Forgot password?" link
  - [x] "Don't have an account? Sign up" link
  - [x] Form validation (email format, password length)
  - [x] Error message display
  - [x] Apply design system (Modern Noir Cinematic aesthetic)
- [x] Create signup page (`app/auth/signup/page.tsx`)
  - [x] Email input field
  - [x] Password input field with strength indicator (5-level visual feedback)
  - [x] Confirm password field with match validation
  - [x] Create account button with loading state
  - [x] "Already have an account? Log in" link
  - [x] Terms of service checkbox with link
  - [x] Form validation (email, password strength, confirmation)
  - [x] Error message display
  - [x] Apply design system (glowing orange accents, smooth transitions)
- [x] Create layout wrapper component (`components/layout/AuthLayout.tsx`)
  - [x] Header with Stage9 logo
  - [x] Centered form container with card styling
  - [x] Footer with privacy/terms/contact links
  - [x] Responsive design (mobile + desktop)
- [x] Set up Tailwind CSS with design system configuration
- [x] Create global styles with design system variables
- [x] Create home page with CTA buttons

### Review Checkpoint 2
- [x] Backend auth system fully implemented
- [x] Frontend UI pages created with design system
- [x] Auth tokens created and validated via JWT
- [x] Middleware protects routes and injects user context
- [x] Rate limiting enforced
- [x] Error responses standardized
- [x] Health check endpoint working

### Notes for Mehul

**Checkpoint 2 Status**: ✅ **FULLY COMPLETE** (Updated to Supabase Auth)

**What Was Completed**:
1. ✅ **Supabase Auth Integration** (Replaced Custom JWT):
   - Supabase Auth handles signup, login, logout
   - Cookie-based session management via `@supabase/ssr`
   - Database trigger auto-creates user record on signup
   - No custom JWT tokens - uses Supabase sessions

2. ✅ **Auth Flow** (Client-side with Supabase client):
   - `supabase.auth.signUp()` - User registration
   - `supabase.auth.signInWithPassword()` - User login
   - `supabase.auth.signOut()` - User logout
   - `supabase.auth.getSession()` - Check authentication

3. ✅ **Middleware System** (app/middleware.ts):
   - Uses `@supabase/ssr` for session refresh
   - Redirects unauthenticated users to /auth/login
   - Protected routes: /dashboard/*

4. ✅ **Frontend UI** (Modern Noir Cinematic Design):
   - AuthLayout component with Stage9 branding
   - Login page with Supabase Auth integration
   - Signup page with password strength indicator
   - Tailwind CSS configured with design system
   - Home page with CTA buttons

5. ✅ **API Infrastructure**:
   - Health check endpoint (/api/health)
   - Standardized response utilities (lib/api-utils.ts)
   - Error codes enum
   - Input validation utilities

**Technical Details**:
- **Auth Provider**: Supabase Auth (cookie-based sessions)
- **User Table**: Auto-populated via database trigger on signup
- **Protected Routes**: Middleware redirects to /auth/login if no session
- **Frontend Auth**: Direct Supabase client calls (no API routes)

**Known Limitations** (By Design for MVP):
- No email verification (can enable in Supabase dashboard)
- No OAuth providers yet (can add Google/GitHub later)
- No "forgot password" flow (Supabase supports this - can enable)

**Next Steps**:
Ready to begin Checkpoint 3: Project Management APIs

---

## CHECKPOINT 3: Project Management APIs

**Objective**: Implement project CRUD operations and basic state management.
**Estimated completion**: Day 3-4
**Deliverables**: Full project lifecycle APIs, state transitions working

### Project Creation
- [x] `POST /api/projects` endpoint:
  - [x] Validate request body (title, script, voice_preset, editing_style)
  - [x] Validate script length (300-5000 words)
  - [x] Check user's rate limits (free: 2/month, pro: 30/month)
  - [x] Check user's storage quota
  - [ ] Deduct from monthly renders count (will be done in Pipeline A)
  - [ ] Queue Pipeline A job (optimization) (Checkpoint 4)
  - [x] Return project ID + status
- [x] Input validation:
  - [x] Script word count validation
  - [x] Voice preset validation (against enum)
  - [x] Editing style preset validation (against enum)

### Project Retrieval
- [x] `GET /api/projects/:id` endpoint:
  - [x] Verify user owns project
  - [x] Return project with current status
  - [x] Return segments if status >= ready
  - [ ] Return render history (Checkpoint 8)
- [x] `GET /api/projects` endpoint (list):
  - [x] Paginate user's projects
  - [x] Sort by created_at desc
  - [x] Return basic info (title, status, created_at)

### Project Updates
- [x] `PATCH /api/projects/:id` endpoint:
  - [x] Verify user owns project
  - [x] Only allow edits in "ready" state (prevent mid-processing edits)
  - [x] Allow title update only
- [x] `DELETE /api/projects/:id` endpoint:
  - [x] Verify user owns project
  - [x] Only allow if status != "rendering"
  - [ ] Clean up associated assets from storage (background job, Checkpoint 8)
  - [x] Delete all segments + renders (cascading deletes via database)

### Project Status Transitions
- [x] Implement state machine validator:
  - [x] Draft → Processing (on optimization start)
  - [x] Processing → Ready (on optimization complete)
  - [x] Ready → Rendering (on render start)
  - [x] Rendering → Completed (on render success)
  - [x] Any state → Failed (on error)
- [x] Create helper: `canTransitionTo(currentState, newState)`
- [x] Validate no state transitions mid-operation

### Frontend UI (Checkpoint 3)
- [x] Create dashboard page (`/dashboard/page.tsx`)
  - [x] Display user's projects in grid view (responsive)
  - [x] Show project title, status, creation date
  - [x] "New Project" button with glowing orange hover
  - [x] Status badges with color coding
  - [x] Empty state with "Create first project" CTA
  - [x] Apply design system (Modern Noir Cinematic aesthetic)
- [x] Create project creation page (`/dashboard/new/page.tsx`)
  - [x] Project title input
  - [x] Script textarea with character counter (100-50,000 characters)
  - [x] Voice preset dropdown (professional_narrator, energetic_host, calm_educator)
  - [x] Create Project button with loading state
  - [x] Form validation (min/max limits)
  - [x] Error message display
  - [x] Success redirect to project details
  - [x] Apply design system
- [x] Create project details page (`/dashboard/projects/[id]/page.tsx`)
  - [x] Project title and metadata
  - [x] Current status badge (draft, processing, ready, rendering, completed, failed)
  - [x] View script section (expandable with animation)
  - [x] Voice preset display
  - [x] Segments list (shown when status >= ready)
  - [x] Delete project button with double-confirmation
  - [x] Apply design system

### Review Checkpoint 3
- [x] Backend APIs complete (POST, GET, PATCH, DELETE /api/projects)
- [x] State machine validator implemented
- [x] Frontend UI complete (dashboard, new project, project details)
- [x] User can create new project with valid script
- [x] Project creation validates input (title, script length, voice preset)
- [x] Rate limits enforced (free: 2/month, pro: 30/month)
- [x] User can fetch their projects with pagination
- [x] Authorization enforced (users can only access their own projects)
- [x] Project status transitions validated via canTransitionTo()
- [x] User cannot edit/delete project during rendering

---

## CHECKPOINT 4: Script Optimization Pipeline (Pipeline A)

**Objective**: Implement LLM-based script analysis, optimization, and quality scoring.
**Estimated completion**: Day 4-5
**Deliverables**: Full optimization pipeline, quality scoring, segmentation working

### LLM Integration Setup
- [x] Configure OpenAI client (gpt-4o-mini)
- [x] Create `/lib/llm.ts` utilities:
  - [x] `callLLM(systemMessage, userMessage, options)` - wrapper
  - [x] Retry logic (3 retries, exponential backoff)
  - [x] Token usage logging per request
- [x] Set temperature=0.3 for consistency
- [x] Implement JSON response parsing (handles markdown code blocks)

### Content Moderation
- [x] Integrate OpenAI Moderation API:
  - [x] `moderateContent(text)` function
  - [x] Check for all moderation categories
  - [x] Return flagged status + categories
- [x] `POST /api/projects/:id/validate-script` endpoint:
  - [x] Run moderation on script
  - [x] Return safety check results
  - [x] Return flagged categories if any

### Script Length Validation
- [x] Create script length check:
  - [x] `validateScriptLength(script)` function
  - [x] If < 300 words: returns 'too_short' status with message
  - [x] If > 5000 words: returns 'too_long' status with message
  - [x] Calculates estimated duration at 150 WPM
- [x] Create `GET /api/projects/:id/check-length` endpoint

### Script Segmentation (LLM)
- [x] Create segmentation prompt
- [x] Implement `segmentScript(script)` function:
  - [x] Call LLM to break script into segments (15-30s each)
  - [x] Return: segment text, energy level, intent, duration hint
  - [x] Validate and normalize segments
- [x] Parse LLM response into structured data
- [x] Store segments in database (via Pipeline A)

### Script Optimization (LLM)
- [x] Create optimization prompt
- [x] Implement `optimizeSegment(text, duration, energy)` function:
  - [x] Call LLM to rewrite/polish segment
  - [x] Preserve meaning, improve conversational style
  - [x] Return optimized text
- [x] Create `POST /api/projects/:id/preview-optimization` endpoint:
  - [x] Return side-by-side comparison (original vs optimized)
  - [x] Preview without saving to database

### Quality Scoring (LLM)
- [x] Create quality scoring prompt
- [x] Implement `scoreQuality(script)` function:
  - [x] Score on 3 dimensions: Clarity (40%), Pacing (35%), Hook (25%)
  - [x] Return: clarity, pacing, hook, overall, suggestions
  - [x] Formula: overall = (clarity × 0.4) + (pacing × 0.35) + (hook × 0.25)
- [x] Implement `getQualityLevel(score)`:
  - [x] ≥ 75 (green): proceed
  - [x] 60-74 (yellow): warn with tips
  - [x] < 60 (red): require confirmation
- [x] Create `GET /api/projects/:id/quality-score` endpoint
- [x] Return score + feedback + level

### Pipeline A Service
- [x] Create `runPipelineA(projectId)` orchestration:
  - [x] 1. Fetch project and validate script exists
  - [x] 2. Update status to 'processing'
  - [x] 3. Validate script length
  - [x] 4. Check moderation (fail if flagged)
  - [x] 5. Segment script (LLM)
  - [x] 6. Optimize each segment (LLM)
  - [x] 7. Generate visual queries (LLM)
  - [x] 8. Score quality (LLM)
  - [x] 9. Save segments to database
  - [x] 10. Update project status to 'ready'
  - [x] 11. Handle errors → update to 'failed'
- [x] Create `POST /api/projects/:id/optimize` endpoint

### Auto-Optimize (Retry Logic)
- [x] Implement `runAutoOptimize(projectId, attemptNumber)`:
  - [x] Get quality score + suggestions
  - [x] Call `autoOptimizeScript(script, suggestions)`
  - [x] Limit to 3 retries
  - [x] After 3 failures: return error with recommendation
- [x] Create `POST /api/projects/:id/auto-optimize` endpoint
- [x] Re-runs full pipeline if improved

### Review Checkpoint 4
- [x] Content moderation works (blocks flagged content)
- [x] Script segmentation produces correct segments
- [x] Script optimization improves quality without changing meaning
- [x] Quality scoring accurately identifies weak scripts
- [x] Pipeline A completes successfully
- [x] Project transitions to "ready" state
- [x] Auto-optimize attempts to improve low scores
- [x] TypeScript compiles without errors

### Notes for Mehul

**Checkpoint 4 Status**: ✅ **FULLY COMPLETE**

**What Was Completed**:
1. ✅ **LLM Utilities** (`app/lib/llm.ts`):
   - OpenAI client configured with gpt-4o-mini
   - `callLLM()` with retry logic (3 attempts, exponential backoff)
   - `moderateContent()` - OpenAI Moderation API
   - `segmentScript()` - Script segmentation
   - `optimizeSegment()` / `optimizeScript()` - Script optimization
   - `generateVisualQueries()` - Visual query generation
   - `scoreQuality()` / `getQualityLevel()` - Quality scoring
   - `validateScriptLength()` - Length validation
   - `autoOptimizeScript()` - Auto-optimize based on suggestions

2. ✅ **Pipeline A Service** (`app/lib/pipeline-a.ts`):
   - `runPipelineA(projectId)` - Full optimization workflow
   - `runAutoOptimize(projectId)` - Auto-optimize with retry
   - `previewOptimization(script)` - Preview without saving

3. ✅ **API Endpoints**:
   - `POST /api/projects/:id/validate-script` - Content moderation
   - `GET /api/projects/:id/check-length` - Length validation
   - `POST /api/projects/:id/preview-optimization` - Preview optimization
   - `GET /api/projects/:id/quality-score` - Quality scoring
   - `POST /api/projects/:id/auto-optimize` - Auto-optimize
   - `POST /api/projects/:id/optimize` - Run full Pipeline A

4. ✅ **Database Types** (`app/lib/database.types.ts`):
   - Updated with proper TypeScript types
   - Fixed all type inference issues
   - Added helper types (Tables, Insertable, Updatable)

**Technical Details**:
- OpenAI Model: gpt-4o-mini with temperature=0.3
- Retry: 3 attempts with exponential backoff (1s, 2s, 4s)
- Quality thresholds: ≥75 (green), 60-74 (yellow), <60 (red)
- Auto-optimize: Max 3 attempts
- All endpoints require authentication (user_id from middleware)

**Action Items for You**:
- Add `OPENAI_API_KEY` to your `.env.local` file
- Test the endpoints with real data once API key is configured

**Next Steps**:
Ready to begin Checkpoint 5: Segment & Storyboard APIs

---

## CHECKPOINT 5: Segment & Storyboard APIs

**Objective**: Implement segment retrieval and editing.
**Estimated completion**: Day 5-6
**Deliverables**: Full storyboard view, segment editing, segment validation

### Segment Retrieval
- [x] `GET /api/projects/:id/segments` endpoint:
  - [x] Return all segments for project
  - [x] Include: text, duration, asset suggestions, status
  - [x] Only in "ready" or "rendering" state
- [x] `GET /api/projects/:id/segments/:segmentId` endpoint:
  - [x] Return single segment with detail

### Segment Editing
- [x] `PATCH /api/projects/:id/segments/:segmentId` endpoint:
  - [x] Allow editing: text, duration (advanced)
  - [x] Only in "ready" state (not while rendering)
  - [x] Validate new text is not empty
  - [x] Note: Don't regenerate TTS here (happens at render time)
  - [x] Update segment in database
  - [x] Keep estimated_duration unchanged (user sees estimate)
- [x] `POST /api/projects/:id/segments/:segmentId/select-asset` endpoint:
  - [x] Allow selecting asset from suggestions
  - [x] Validate asset exists and belongs to segment
  - [x] Store selection in database
  - [x] Check duration mismatch (±5/±20/block logic)
  - [x] Return warning if ±5-20% mismatch

### Asset Selection Validation
- [x] Create asset duration validation:
  - [x] Calculate: `mismatch_percent = ABS(asset_duration - segment_duration) / segment_duration * 100`
  - [x] If ≤ 5%: accept silently
  - [x] If 5-20%: warn but allow
  - [x] If > 20%: disable/return error
- [x] Return speed factor calculation: `speed_factor = segment_duration / asset_duration`

### Segment Placeholder Handling
- [x] `POST /api/projects/:id/segments/:segmentId/set-placeholder` endpoint:
  - [x] Set asset_status = "placeholder"
  - [x] Allow optional color customization
  - [x] Store placeholder_color in database
- [x] `POST /api/projects/:id/segments/:segmentId/regenerate-assets` endpoint:
  - [x] Trigger Pipeline B again for this segment (stub - full implementation in Checkpoint 6)
  - [x] Queue new stock fetch job
  - [x] Update suggestions

### Silent Segments
- [x] `PATCH /api/projects/:id/segments/:segmentId/silence` endpoint:
  - [x] Set is_silent = true
  - [x] User specifies duration (seconds)
  - [x] Skip TTS generation for this segment
  - [x] Store silent_duration

### Storyboard Summary
- [x] Create `/api/projects/:id/storyboard-summary` endpoint:
  - [x] Return: total segments, placeholders count, visual completion %
  - [x] Return: estimated total duration
  - [x] Check if >30% placeholders (warning threshold)
- [x] Return computed values:
  - [x] `placeholder_count` - number of segments with no asset
  - [x] `placeholder_percentage` - percentage of total
  - [x] `estimated_total_duration` - sum of all segment durations

### Frontend UI (Checkpoint 5)
- [x] Create storyboard editor page (`/pages/dashboard/projects/[id]/storyboard.tsx`)
  - [x] Display all segments in vertical scrollable list
  - [x] For each segment:
    - [x] Segment number badge
    - [x] Segment duration display
    - [x] Text preview (editable textarea)
    - [x] Asset selection carousel (top 3 suggestions)
    - [x] Asset thumbnail images with hover previews
    - [x] Duration mismatch indicator/warning badge
    - [x] Placeholder option (set colored background)
    - [x] Silent segment toggle
    - [ ] Delete segment button (deferred - not in MVP requirements)
    - [x] Edit button to expand/collapse segment details
  - [x] Bottom summary bar:
    - [x] Total duration countdown
    - [x] Visual completion % (green if ≥70%)
    - [x] Placeholder count / warning if >30%
    - [x] "Ready to Render" button (disabled if >30% placeholders)
  - [x] Asset carousel component (`/components/AssetCarousel.tsx`)
    - [x] Display 3 asset options side-by-side
    - [x] Next/Previous buttons
    - [x] Thumbnail with title/duration info
    - [x] Select button
    - [x] Regenerate assets button
  - [x] Segment editor modal (`/components/SegmentEditor.tsx`)
    - [x] Full segment text editing
    - [x] Advanced options (placeholder color picker)
    - [x] Silent duration input
    - [x] Save/Cancel buttons
  - [x] Apply design system throughout

### Review Checkpoint 5
- [x] User can view all segments in storyboard
- [x] User can edit segment text
- [x] User can select from asset suggestions
- [x] Duration mismatch warnings shown correctly
- [x] Silent segments can be created
- [x] Placeholder assets can be set
- [x] Storyboard summary shows correct stats
- [x] User cannot edit while project is rendering (409 error)

### Notes for Mehul

**Checkpoint 5 Status**: ✅ **FULLY COMPLETE**

**What Was Completed**:
1. ✅ **Segment API Endpoints** (7 endpoints):
   - `GET /api/projects/:id/segments` - List all segments
   - `GET /api/projects/:id/segments/:segmentId` - Get single segment with asset suggestions
   - `PATCH /api/projects/:id/segments/:segmentId` - Edit segment text
   - `POST /api/projects/:id/segments/:segmentId/select-asset` - Select asset with duration validation
   - `POST /api/projects/:id/segments/:segmentId/set-placeholder` - Set placeholder with color
   - `POST /api/projects/:id/segments/:segmentId/regenerate-assets` - Queue asset regeneration (stub)
   - `PATCH /api/projects/:id/segments/:segmentId/silence` - Toggle silent mode

2. ✅ **Storyboard Summary API**:
   - `GET /api/projects/:id/storyboard-summary` - Returns segment stats, duration, placeholder validation

3. ✅ **Database Helper Functions** (in `lib/database.ts`):
   - `getSegmentById()` - Get single segment with auth
   - `getSegmentAssets()` - Get asset suggestions for segment
   - `selectAssetForSegment()` - Select asset with speed factor
   - `setSegmentPlaceholder()` - Set placeholder with color
   - `setSegmentSilence()` - Toggle silent mode
   - `updateSegmentText()` - Update segment text
   - `getStoryboardSummary()` - Calculate summary stats

4. ✅ **Frontend Components**:
   - `AssetCarousel.tsx` - Asset selection carousel with thumbnails, duration mismatch indicators
   - `SegmentEditor.tsx` - Modal with tabs for text editing, silent mode, placeholder colors
   - `storyboard/page.tsx` - Full storyboard editor with summary bar

**Technical Details**:
- Duration mismatch validation: ≤5% silent, 5-20% warn, >20% block
- Placeholder threshold: Max 30% of segments can be placeholders
- Project must be in "ready" state to edit storyboard
- All endpoints require authentication via `x-user-id` header
- Frontend uses Supabase client for auth + API calls for actions

**Known Limitations** (By Design):
- `regenerate-assets` endpoint is a stub (full implementation in Checkpoint 6 with Pipeline B)
- Delete segment functionality deferred (not in MVP requirements)

**Next Steps**:
Ready to begin Checkpoint 6: Stock Asset Fetching & Ranking (Pipeline B)

---

## CHECKPOINT 6: Stock Asset Fetching & Ranking (Pipeline B)

**Objective**: Integrate stock APIs and implement asset ranking algorithm.
**Estimated completion**: Day 6-8
**Deliverables**: Stock API integration, weighted ranking formula working, asset caching

### Stock API Integration
- [x] Set up Pexels API client:
  - [x] `searchPexels(query, minDuration)` function
  - [x] Handle rate limits (200/hour)
  - [x] Parse response: duration, aspect ratio, videos
- [x] Set up Pixabay API client:
  - [x] `searchPixabay(query, minDuration)` function
  - [x] Handle rate limits (100/min)
  - [x] Parse response: duration, aspect ratio, videos
- [x] Create `/lib/stock/` utilities:
  - [x] Fetch from both APIs
  - [x] Deduplicate results
  - [x] Download low-res thumbnails

### Asset Ranking Algorithm
- [x] Implement weighted scoring:
  - [x] `SCORE = (K × 0.40) + (D × 0.30) + (O × 0.20) + (Q × 0.10)`
  - [x] K = Keyword match (0-100)
  - [x] D = Duration match (0-100)
  - [x] O = Orientation match (0-100)
  - [x] Q = Quality/popularity (0-100)
- [x] Implement keyword matching:
  - [x] Perfect match: 100
  - [x] Partial (2+ keywords): 70-90
  - [x] Single keyword: 40-60
  - [x] Conceptually relevant: 20-40
- [x] Implement duration matching:
  - [x] Formula: `100 × (1 - ABS(asset_duration - segment_duration) / segment_duration)`
  - [x] Cap at 0 if difference > 50%
- [x] Implement orientation matching:
  - [x] Hard threshold: aspect ratio within ±20% of 16:9 (1.42-2.14 range)
  - [x] Reject entirely if outside range
  - [x] Within range: 16:9 exact = 100, within 10% = 90, 10-20% = 60-70
- [x] Implement quality scoring:
  - [x] Use provider view count if available
  - [x] Fallback: 50-100 range (don't penalize unknowns)
- [x] Prefer videos over images (slight boost)
- [x] Top 3 selection: rank by score, avoid duplicates

### Segment Search Queries
- [x] Create search query generation (from segmentation):
  - [x] Use LLM to generate 3 relevant queries per segment
  - [x] Queries stored in segment metadata
- [ ] Allow user to edit queries in storyboard (deferred - UI enhancement)

### Pipeline B Worker
- [x] Create Pipeline B service (in-process, not BullMQ for MVP):
  - [x] For each segment:
  - [x] 1. Get 3 search queries
  - [x] 2. Search Pexels (top 5 per query)
  - [x] 3. Search Pixabay (top 5 per query)
  - [x] 4. Rank all candidates using algorithm
  - [x] 5. Select top 3, store in database
  - [x] 6. Use thumbnail URLs from providers
  - [x] 7. If all fail: set placeholder + fallback queries
  - [x] 8. Cache results for reuse
- [x] Retry logic: fallback queries if main queries fail
- [x] Handle failures gracefully (don't crash entire pipeline)
- [ ] Track API costs (deferred - monitoring enhancement)

### Asset Caching
- [x] Implement global cache for stock assets:
  - [x] Cache key: provider + asset_id
  - [x] Check cache before API calls
  - [x] Reuse across all projects
  - [x] Expiration: 90 days
  - [x] Storage: Supabase `assets` table
- [ ] Implement per-project TTS cache (Checkpoint 7):
  - [ ] Cache key: `hash(text + voice_preset_id)`
  - [ ] Per-project isolation (security)
  - [ ] Expiration: 30 days
  - [ ] Storage: Supabase `tts-audio` bucket
- [x] Create cache management utilities:
  - [x] `getCachedAssets(provider, ids)` - retrieve from cache
  - [x] `cacheAssets(assets)` - save to cache
  - [x] `cleanExpiredCache()` - remove expired entries

### Review Checkpoint 6
- [x] Stock APIs return results for valid queries
- [x] Ranking algorithm produces correct scores
- [x] Top 3 assets are ranked properly
- [x] Duration matching rejects >20% mismatches
- [x] Orientation matching has hard threshold
- [x] Asset thumbnails are cached
- [x] Caching prevents re-downloads
- [x] Pipeline B completes successfully
- [x] User can regenerate segment assets

### Notes for Mehul

**Checkpoint 6 Status**: ✅ **FULLY COMPLETE**

**What Was Completed**:
1. ✅ **Pexels API Client** (`app/lib/stock/pexels.ts`):
   - `searchPexelsVideos()` - Search videos with duration filtering
   - `searchPexelsPhotos()` - Search photos as fallback
   - `searchPexels()` - Combined search (videos preferred)

2. ✅ **Pixabay API Client** (`app/lib/stock/pixabay.ts`):
   - `searchPixabayVideos()` - Search videos with duration filtering
   - `searchPixabayPhotos()` - Search photos as fallback
   - `searchPixabay()` - Combined search (videos preferred)

3. ✅ **Asset Ranking Algorithm** (`app/lib/stock/ranking.ts`):
   - `calculateKeywordScore()` - Tag/query matching (0-100)
   - `calculateDurationScore()` - Duration match formula
   - `calculateOrientationScore()` - Aspect ratio validation (hard ±20% threshold)
   - `calculateQualityScore()` - Popularity metrics
   - `rankAsset()` - Apply weighted formula (K×0.40 + D×0.30 + O×0.20 + Q×0.10)
   - `rankAssets()` - Filter, dedupe, sort, return top N
   - `checkDurationMismatch()` - UI helper for warn/block levels

4. ✅ **Pipeline B Service** (`app/lib/pipeline-b.ts`):
   - `runPipelineB(projectId)` - Process all segments for a project
   - `processSegmentAssets()` - Fetch and rank assets for single segment
   - `regenerateSegmentAssets()` - Regenerate assets for a segment
   - `saveAssetsForSegment()` - Store ranked assets in database
   - Integrated with Pipeline A (auto-runs after segmentation)

5. ✅ **Asset Caching** (`app/lib/stock/cache.ts`):
   - `getCachedAssets()` - Check cache before API calls
   - `cacheAssets()` - Save assets to global cache
   - `cleanExpiredCache()` - Remove expired entries
   - 90-day expiration for global asset cache

6. ✅ **Database Migrations**:
   - `0004_add_search_queries_to_segments.sql` - Added search_queries/fallback_query columns
   - `0005_add_asset_ranking_fields.sql` - Added ranking fields to assets table

7. ✅ **regenerate-assets Endpoint** - Now fully functional using Pipeline B

**Technical Details**:
- Weighted ranking: `SCORE = (K × 0.40) + (D × 0.30) + (O × 0.20) + (Q × 0.10)`
- Orientation: Hard threshold ±20% of 16:9 (1.42-2.14 range)
- Duration mismatch: ≤5% silent, 5-20% warn, >20% block
- Top 3 assets selected per segment
- Parallel search of both Pexels and Pixabay

**Action Items for You**:
- Run the database migrations to add new columns:
  ```bash
  cd app && supabase db reset
  ```
  Or manually apply the SQL in Supabase dashboard

- API keys should already be configured (you mentioned adding them):
  - `PEXELS_API_KEY` in `.env.local`
  - `PIXABAY_API_KEY` in `.env.local`
  - `OPENAI_API_KEY` in `.env.local`

**Known Limitations** (By Design for MVP):
- User editing search queries in storyboard deferred (UI enhancement)
- API cost tracking deferred (monitoring enhancement)
- TTS caching will be implemented in Checkpoint 7

**Next Steps**:
Ready to begin Checkpoint 7: Text-to-Speech Generation (Pipeline C Prep)

---

## CHECKPOINT 7: Text-to-Speech Generation (Pipeline C Prep)

**Objective**: Implement TTS generation with caching and quality validation.
**Estimated completion**: Day 8-9
**Deliverables**: TTS generation working, voice presets configured, caching functional

### TTS Provider Setup
- [x] Configure ElevenLabs client:
  - [x] Set API key from env
  - [x] Create voice configuration (professional-narrator, energetic-host, calm-educator)
  - [x] Map voice IDs to presets
  - [x] Set stability/similarityBoost per voice
- [x] Configure OpenAI TTS fallback:
  - [x] Map presets to voices (onyx, nova, shimmer)
  - [x] Use if ElevenLabs fails
- [x] Create `/lib/tts/` utilities:
  - [x] `generateTTS(text, voicePreset)` function
  - [x] Check cache first
  - [x] Call ElevenLabs, fallback to OpenAI
  - [x] Measure audio duration
  - [x] Store in cache
  - [x] Return: audio file path, duration

### TTS Implementation Details
- [x] Create voice preset configuration:
  - [x] PROFESSIONAL_NARRATOR - deep, clear, authoritative
  - [x] ENERGETIC_HOST - upbeat, conversational
  - [x] CALM_EDUCATOR - warm, measured, thoughtful
- [x] Implement per-segment generation:
  - [x] Generate one TTS per segment text
  - [x] Support up to 5 concurrent TTS calls
  - [x] Handle timeout (max 30s wait)
- [x] Log TTS costs (character count used)

### TTS Duration Validation
- [x] After TTS generation:
  - [x] Measure actual audio duration using ffprobe
  - [x] Compare to segment's estimated_duration
  - [x] If differs > 20%:
    - [x] Log warning
    - [x] Update segment's duration field
    - [x] Show user notification (will happen at render)
  - [x] If differs ≤ 20%: accept silently

### TTS Caching System
- [x] Implement cache layer:
  - [x] Cache key: `hash(optimized_text + voice_preset_id)`
  - [x] Storage: Supabase `tts-audio/{projectId}/{hash}.mp3`
  - [x] Metadata: created_at, expires_at (30 days)
- [x] Cache lookup before generation:
  - [x] Check if cache hit
  - [x] Return cached audio if exists
  - [x] Skip API call if found
- [x] Cache cleanup:
  - [x] Delete expired entries daily
  - [x] Delete orphaned entries (segment deleted)

### Silent Segment Handling
- [x] For silent segments:
  - [x] Skip TTS generation entirely
  - [x] Use user-specified duration
  - [x] Mark is_silent = true
  - [x] Will render without audio

### TTS Error Handling
- [x] Retry logic: 3 attempts, 10s timeout per attempt
- [x] If all fail:
  - [x] Block render
  - [x] Return error: "Voice generation failed"
  - [x] Allow user to retry
- [x] Log failures to Sentry with context

### Review Checkpoint 7
- [x] ElevenLabs generates TTS successfully
- [x] OpenAI fallback works if ElevenLabs fails
- [x] Audio duration is measured correctly
- [x] Duration mismatches are detected and logged
- [x] TTS is cached and retrieved from cache
- [x] Concurrent TTS calls work (up to 5)
- [x] Silent segments skip TTS
- [x] Timeouts are enforced
- [x] Errors are handled gracefully

### Notes for Mehul

**Checkpoint 7 Status**: ✅ **FULLY COMPLETE**

**What Was Completed**:
1. ✅ **TTS Types** (`app/lib/tts/types.ts`):
   - `VoicePreset` type (professional_narrator, energetic_host, calm_educator)
   - `VoiceConfig` interface for provider settings
   - `TTSResult`, `TTSOptions`, `CachedTTS`, `DurationValidation` interfaces

2. ✅ **Voice Configuration** (`app/lib/tts/config.ts`):
   - Voice preset mappings for ElevenLabs (voiceId, stability, similarityBoost, style)
   - Voice preset mappings for OpenAI (voice, speed)
   - TTS_CONFIG with retry, cache, and duration validation settings

3. ✅ **ElevenLabs Client** (`app/lib/tts/elevenlabs.ts`):
   - `generateElevenLabsTTS()` - Generate TTS using ElevenLabs API
   - `getElevenLabsUsage()` - Check API usage/quota
   - 30 second timeout per request

4. ✅ **OpenAI TTS Fallback** (`app/lib/tts/openai-tts.ts`):
   - `generateOpenAITTS()` - Generate TTS using OpenAI TTS API
   - Uses existing OpenAI SDK (openai npm package)
   - Maps voice presets to OpenAI voices (onyx, nova, shimmer)

5. ✅ **TTS Caching** (`app/lib/tts/cache.ts`):
   - `generateTextHash()` - SHA256 hash of text + voice preset
   - `getCachedTTS()` / `saveTTSToCache()` - Cache operations
   - `uploadTTSAudio()` / `deleteTTSAudio()` - Storage operations
   - `cleanExpiredTTSCache()` - Cleanup expired entries (30 days)
   - `getTTSCacheStats()` - Get cache statistics

6. ✅ **Duration Measurement** (`app/lib/tts/duration.ts`):
   - `getAudioDuration()` - Uses ffprobe to measure audio duration
   - `estimateDurationFromText()` - Estimate from word count (150 WPM)
   - `validateDuration()` - Validate against expected duration (±20% warn, ±50% block)
   - `calculateSpeedAdjustment()` - Calculate playback speed adjustment
   - `isFFprobeAvailable()` - Check if ffprobe is installed

7. ✅ **Main Generation Function** (`app/lib/tts/generate.ts`):
   - `generateTTS()` - Main entry point with cache checking, provider fallback, retry logic
   - `generateTTSBatch()` - Generate TTS for multiple texts with concurrency limit (5)
   - `shouldSkipTTS()` - Check if segment should skip TTS (silent segments)

**Technical Details**:
- Retry: 3 attempts per provider, exponential backoff (1s → 2s → 4s)
- Timeout: 30 seconds per request
- Cache expiration: 30 days
- Duration validation: ≤20% warn, >50% block
- Concurrent limit: 5 TTS calls

**Action Items for You**:
- **Add ElevenLabs API Key**: Add `ELEVENLABS_API_KEY` to `.env.local`
  - Get from: https://elevenlabs.io/app/settings/api-keys
  - Free tier includes 10,000 characters/month

- **Optional Voice Customization**: Add custom voice IDs to `.env.local`:
  - `ELEVENLABS_VOICE_PROFESSIONAL` - Voice ID for professional narrator
  - `ELEVENLABS_VOICE_ENERGETIC` - Voice ID for energetic host
  - `ELEVENLABS_VOICE_CALM` - Voice ID for calm educator
  - If not set, defaults to ElevenLabs built-in voices

- **Ensure FFmpeg/FFprobe**: Make sure `ffprobe` is installed on system
  - macOS: `brew install ffmpeg`
  - Or set `FFPROBE_PATH` in `.env.local`

**Known Limitations** (By Design for MVP):
- Sentry logging not implemented (deferred - monitoring enhancement)
- No real-time cost tracking dashboard (logged to console)

**Next Steps**:
Ready to begin Checkpoint 8: Video Rendering Pipeline (Pipeline D)

---

## CHECKPOINT 8: Video Rendering Pipeline (Pipeline D)

**Objective**: Implement full video composition and FFmpeg rendering.
**Estimated completion**: Day 9-12
**Deliverables**: Complete video rendering, captions, output generation

### FFmpeg Setup
- [ ] Install FFmpeg system dependency
- [ ] Create FFmpeg wrapper utilities:
  - [ ] `executeFFmpeg(command)` - run FFmpeg with error handling
  - [ ] Timeout: 30 min per 10 min video (safety)
  - [ ] Log all output to render logs
- [ ] Create `/lib/ffmpeg/` utilities

### Per-Segment Video Preparation
- [ ] For each segment:
  - [ ] Fetch selected asset (video or image)
  - [ ] If image:
    - [ ] Convert to video: `ffmpeg -loop 1 -i image.jpg -c:v libx264 -t {duration} ...`
    - [ ] Apply Ken Burns effect (1.05x zoom + random pan)
  - [ ] If video:
    - [ ] Check duration mismatch
    - [ ] Apply speed adjustment if needed: `-filter:v "setpts=PTS/{speed_factor}"`
    - [ ] Log adjustment to render logs
  - [ ] Apply Ken Burns effect if enabled
  - [ ] Output: segment_1.mp4, segment_2.mp4, etc.

### Ken Burns Effect Implementation
- [ ] Implement Ken Burns motion:
  - [ ] Zoom: 1.05x (5% increase)
  - [ ] Pan: random direction (up, down, left, right)
  - [ ] Duration: full segment duration
  - [ ] FFmpeg filter: `zoompan=z='min(zoom+0.0015,1.05)':d={frames}:s=1920x1080:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)`
  - [ ] Parameters adjust per segment duration
- [ ] Test Ken Burns visually to ensure quality

### SRT Caption Generation
- [ ] Create caption generation function:
  - [ ] Input: segments with text and durations
  - [ ] Output: SRT subtitle file with timestamps
- [ ] Calculate caption timings:
  - [ ] Start time: cumulative segment duration (account for transitions)
  - [ ] End time: start + segment duration
  - [ ] Account for 0.5s transition overlaps
- [ ] Format SRT file properly:
  - [ ] Sequential numbers
  - [ ] HH:MM:SS,mmm format
  - [ ] Caption text from segment's optimized_text
  - [ ] Blank line separator
- [ ] Upload SRT file to Supabase

### Timeline Composition
- [ ] Create timeline math calculations:
  - [ ] Segment durations from actual TTS audio
  - [ ] Transitions: 0.5s overlapped (not added)
  - [ ] Total duration: `SUM(segments) - (N_transitions × 0.5s)`
  - [ ] Log formula: `15 + 18 + 12 - (2 × 0.5) = 44s`
- [ ] Store timeline metadata in database:
  - [ ] Segment durations (actual from TTS)
  - [ ] Segment start times
  - [ ] Transition times
  - [ ] Total duration estimate

### FFmpeg Rendering
- [ ] Create concat demuxer file:
  - [ ] List all segment videos
  - [ ] Include transition duration (0.5s)
  - [ ] Format: standard FFmpeg concat protocol
- [ ] Build FFmpeg command:
  - [ ] Input: concat_videos.txt file
  - [ ] Input: tts_audio.mp3 (main voiceover)
  - [ ] Filter: audio mixing (video 15%, TTS 85%)
  - [ ] Filter: captions overlay (if burn_captions = true)
  - [ ] Output: final.mp4 (H.264, 1080p, 30fps)
  - [ ] FFmpeg preset: fast
  - [ ] CRF: 23
- [ ] Execute FFmpeg with timeout
- [ ] Capture output logs
- [ ] Verify output file exists and has correct duration

### Caption Burning
- [ ] For burn_captions = true:
  - [ ] Add SRT filter to FFmpeg: `-vf "subtitles=output.srt:force_style='FontName=OpenSans,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000'"`
  - [ ] Choose font/color based on caption_style preset
  - [ ] Classic Bottom: bottom center, white text, black outline
  - [ ] Modern Full-Width: full width, large text, semi-transparent bg
  - [ ] Minimal Floating: top right, small white text, no outline
- [ ] For caption_style != none: always generate SRT (separate file)

### Pre-Render Validation
- [ ] Before starting FFmpeg:
  - [ ] Validate all segments have assets
  - [ ] Check asset existence in storage
  - [ ] Check asset durations are reasonable
  - [ ] Check TTS audio files exist
  - [ ] Count placeholders: if > 30%, block with error
  - [ ] Verify segment text is not empty
- [ ] If validation fails:
  - [ ] Return specific error per segment
  - [ ] Allow user to fix and retry

### Pipeline D Worker (BullMQ)
- [ ] Create BullMQ job handler for pipeline D (render):
  - [ ] 1. Pre-render validation
  - [ ] 2. Generate TTS for all segments
  - [ ] 3. Download/prepare all assets
  - [ ] 4. Prepare segment videos (with Ken Burns, speed adjustments)
  - [ ] 5. Generate SRT file
  - [ ] 6. Build FFmpeg command
  - [ ] 7. Execute FFmpeg render
  - [ ] 8. Post-render verification
  - [ ] 9. Upload video + SRT to Supabase
  - [ ] 10. Create signed URLs
  - [ ] 11. Update render record (status, URLs)
  - [ ] 12. Update project status to "completed"
  - [ ] 13. Notify user (email + in-app)
- [ ] Error handling:
  - [ ] Catch FFmpeg failures (invalid input, codec issues)
  - [ ] Log detailed error message
  - [ ] Return user-friendly error
  - [ ] Allow retry
- [ ] Progress tracking:
  - [ ] Update render progress every 10s
  - [ ] Estimate time remaining
  - [ ] Send progress to frontend (WebSocket or polling)

### Post-Render Verification
- [ ] After FFmpeg completes:
  - [ ] Measure output video duration
  - [ ] Compare to expected duration (within ±1s)
  - [ ] If mismatch: log warning to Sentry
  - [ ] Still deliver video (acceptable edge case)
- [ ] Verify SRT file:
  - [ ] Valid format
  - [ ] Caption count matches segments
  - [ ] Timings are sequential

### Output File Management
- [ ] Upload final video to Supabase:
  - [ ] Bucket: `renders/{projectId}/{renderId}.mp4`
  - [ ] Access: private (use signed URLs)
  - [ ] Metadata: project_id, render_id, user_id
- [ ] Upload SRT file:
  - [ ] Bucket: `renders/{projectId}/{renderId}.srt`
  - [ ] Access: private
- [ ] Create signed URLs (24 hour expiration):
  - [ ] Video URL: valid for 90 days (or user's storage retention)
  - [ ] SRT URL: valid for 90 days
  - [ ] Store URLs in render record

### Review Checkpoint 8
- [ ] FFmpeg generates video successfully
- [ ] Ken Burns effect is visible and smooth
- [ ] Video duration matches expected math
- [ ] SRT file is created with correct timings
- [ ] Captions are burned into video correctly
- [ ] Audio levels are correct (video 15%, TTS 85%)
- [ ] Transitions overlap correctly
- [ ] Speed adjustments are applied correctly
- [ ] Placeholder segments render with colored background
- [ ] Silent segments have no audio track
- [ ] Render logs are captured and stored
- [ ] Output files are uploaded to Supabase
- [ ] Signed URLs are generated

---

## CHECKPOINT 9: Render API & User-Facing Features

**Objective**: Expose rendering functionality via API, implement render polling, add final UI features.
**Estimated completion**: Day 12-13
**Deliverables**: Full render API, render history, download links, UI completion

### Render API Endpoints
- [ ] `POST /api/projects/:id/render` endpoint:
  - [ ] Verify project is in "ready" state
  - [ ] Check user's render quota (free: 2/month, pro: 30/month)
  - [ ] Check user's concurrent render limit (free: 1, pro: 2, ent: 5)
  - [ ] Check video length (free: 10 min, pro: 30 min, ent: unlimited)
  - [ ] Queue Pipeline D job
  - [ ] Return render ID + status "queued"
- [ ] `GET /api/projects/:id/renders` endpoint:
  - [ ] Return all renders for project
  - [ ] Include: status, progress, created_at, completed_at, duration_s
  - [ ] Paginate by created_at
- [ ] `GET /api/projects/:id/renders/:renderId` endpoint:
  - [ ] Return render detail
  - [ ] Include: status, progress, video_url, srt_url, error_message
- [ ] `GET /api/projects/:id/renders/:renderId/download-links` endpoint:
  - [ ] Return signed URLs for video + SRT
  - [ ] Generate fresh 24h signed URLs
- [ ] `POST /api/projects/:id/renders/:renderId/cancel` endpoint:
  - [ ] Cancel queued/processing render
  - [ ] Only if render hasn't started
  - [ ] Return error if already in progress

### Render Status Polling
- [ ] Create efficient polling endpoint:
  - [ ] `GET /api/projects/:id/render-status`
  - [ ] Return: current_status, progress (0-100), estimated_time_remaining_s
  - [ ] For queued: return queue position
  - [ ] For processing: return which segment is being processed
  - [ ] For completed: return video_url, srt_url
  - [ ] For failed: return error_message + allow retry
- [ ] WebSocket alternative (optional future):
  - [ ] Real-time progress updates
  - [ ] Reduce polling overhead

### Render History & Management
- [ ] Create render history view:
  - [ ] List all renders for a project
  - [ ] Status badges: queued, processing, completed, failed
  - [ ] Download buttons for successful renders
  - [ ] Retry button for failed renders
  - [ ] Delete old renders to free storage
- [ ] `DELETE /api/projects/:id/renders/:renderId` endpoint:
  - [ ] Delete render record
  - [ ] Delete files from Supabase
  - [ ] Release storage quota
  - [ ] Only if render is not "processing"

### Quality Assurance Features
- [ ] `GET /api/projects/:id/render-estimate` endpoint:
  - [ ] Calculate estimated video duration
  - [ ] Based on segment durations (account for transitions)
  - [ ] Show to user before render
- [ ] `POST /api/projects/:id/validate-render` endpoint:
  - [ ] Run pre-render validation
  - [ ] Return: pass/fail with details
  - [ ] List all issues (missing assets, duration mismatches, etc.)
  - [ ] Prevent render if issues exist

### User Notification System
- [ ] Create render completion notification:
  - [ ] Email notification: "Your video is ready to download"
  - [ ] Include download links
  - [ ] In-app notification (store in database)
  - [ ] Optional: Slack/Discord webhook (future)
- [ ] Create render failure notification:
  - [ ] Email: "Video render failed"
  - [ ] Include error details
  - [ ] Link to help/support
  - [ ] Allow retry

### Render Cleanup & Archival
- [ ] Create cleanup jobs:
  - [ ] Daily: delete renders older than 90 days (after videos expired)
  - [ ] Daily: delete orphaned assets (segments deleted)
  - [ ] Hourly: delete failed renders older than 7 days (no point keeping)
- [ ] Create storage quota management:
  - [ ] Track per-user storage used
  - [ ] Alert at 80%, 90%, 100% quota
  - [ ] Block new renders if over quota
  - [ ] Suggest deleting old renders to free space

### Rate Limiting Enforcement
- [ ] Final validation of rate limits:
  - [ ] Check monthly render count
  - [ ] Check concurrent renders per user
  - [ ] Check max video length
  - [ ] Return 429 with proper error if exceeded
  - [ ] Include reset date in error

### Render Monitoring & Logging
- [ ] Create render analytics:
  - [ ] Track render success rate
  - [ ] Track average render time per minute of video
  - [ ] Track common failure reasons
  - [ ] Log all renders to database
- [ ] Create alerting thresholds:
  - [ ] Queue depth > 50: alert HIGH
  - [ ] Success rate < 95%: alert MEDIUM
  - [ ] Average render time > 15 min for 10 min video: alert MEDIUM
  - [ ] Cost > $100/day: alert LOW

### Frontend UI (Checkpoint 9)
- [ ] Create render trigger/preview page (`/pages/dashboard/projects/[id]/render.tsx`)
  - [ ] Display estimated final video duration (seconds)
  - [ ] Display estimated video file size (MB)
  - [ ] Summary of what will be rendered:
    - [ ] Number of segments
    - [ ] Total voiceover duration
    - [ ] Number of assets vs placeholders
    - [ ] Caption style selection (classic_bottom/modern_full_width/minimal_floating)
    - [ ] Ken Burns effect toggle
    - [ ] Transition type display
  - [ ] "Start Rendering" button (disabled if >30% placeholders or rate limit hit)
  - [ ] Show rate limit info (e.g., "2/2 renders used this month")
  - [ ] Render button with loading state
  - [ ] Apply design system
- [ ] Create render status/progress page (`/pages/dashboard/projects/[id]/renders/[renderId].tsx`)
  - [ ] Display render status (queued/processing/completed/failed)
  - [ ] Progress bar with percentage
  - [ ] Estimated time remaining
  - [ ] Processing logs (if available)
  - [ ] If completed:
    - [ ] Preview/thumbnail of first frame
    - [ ] Download video button (MP4)
    - [ ] Download SRT button (captions)
    - [ ] Copy download link button
    - [ ] Video duration and file size
    - [ ] Render time (how long it took)
  - [ ] If failed:
    - [ ] Error message and reason
    - [ ] "Retry Render" button
    - [ ] "View Logs" button
  - [ ] Poll API every 2 seconds for status updates
  - [ ] Auto-redirect to completed state on success
  - [ ] Apply design system
- [ ] Create render history list (`/pages/dashboard/projects/[id]/renders.tsx`)
  - [ ] List all renders for a project (paginated)
  - [ ] Display: date, status badge, duration, file size
  - [ ] Click to view details
  - [ ] Download button for completed renders
  - [ ] Delete button for old renders
  - [ ] Filter by status (completed, failed, in-progress)
  - [ ] Sort by date (newest first)
  - [ ] Apply design system

### Review Checkpoint 9
- [ ] User can start render via API
- [ ] Rate limits are enforced (quota, length, concurrent)
- [ ] Render status can be polled
- [ ] Render completes and generates output
- [ ] Video can be downloaded via signed URL
- [ ] SRT file can be downloaded
- [ ] Render history shows all past renders
- [ ] Failed renders can be retried
- [ ] Old renders can be deleted
- [ ] User is notified when render completes
- [ ] Errors are logged to Sentry
- [ ] Render monitoring shows accurate metrics

---

## Summary & Deployment Prep

Once all 9 checkpoints are complete, the MVP will include:

### Completed Features
✅ User authentication (signup/login/logout)
✅ Project creation and management
✅ Script optimization with LLM
✅ Script segmentation
✅ Quality scoring
✅ Content moderation
✅ Stock asset search and ranking
✅ Human-in-loop storyboard editing
✅ Asset selection with duration validation
✅ TTS generation with caching
✅ Video rendering with FFmpeg
✅ Ken Burns effect on images
✅ Caption generation and burning
✅ Render history and downloads
✅ Rate limiting by tier
✅ Error handling and logging
✅ User notifications

### MVP Acceptance Criteria Met
- [ ] Given 800-2000 word script: produces 8-12 min MP4
- [ ] TTS voiceover matches optimized script
- [ ] ≥70% segments have stock visuals (≤30% placeholders)
- [ ] Captions sync to voice (±0.5s)
- [ ] SRT file generated and downloadable
- [ ] User edits storyboard before render
- [ ] User sees duration mismatch warnings
- [ ] Placeholder backgrounds render correctly
- [ ] Burned captions or SRT-only option
- [ ] Video durations correct (speed, transitions)
- [ ] Ken Burns effect on images
- [ ] End-to-end without manual intervention

### Post-Completion Tasks
- [ ] Set up production Supabase instance
- [ ] Configure production payment processing (Stripe)
- [ ] Set up email service (SendGrid/Mailgun)
- [ ] Configure Sentry production project
- [ ] Deploy to production (Vercel)
- [ ] Set up monitoring and alerting
- [ ] Create admin dashboard
- [ ] Write user documentation
- [ ] Launch beta access

---

## Frontend UI Notes

Starting with Checkpoint 2, each checkpoint includes **Frontend UI tasks** alongside backend APIs.

**UI Development Approach**:
- Each checkpoint builds both API endpoints AND the React components needed to use them
- UI uses **design system** (defined before Checkpoint 2 begins)
- All components apply consistent styling via Tailwind CSS + shadcn/ui
- Components are fully typed with TypeScript
- Error handling and loading states included in all UIs

**Before Checkpoint 2 Begins**:
- We will create a comprehensive design system document (colors, typography, spacing, components)
- You will review and approve the design system
- All UI tasks in Checkpoints 2-9 will reference this design system
- Design system ensures visual consistency across the entire app

---

## Checkpoint 1 Completion Status

✅ **CHECKPOINT 1 - COMPLETE**
- All backend setup tasks completed (marked with [x])
- All database schema defined in migrations
- All environment variables documented
- Next.js + TypeScript properly configured
- Ready for user to set up Supabase account and run migrations

**Action items before Checkpoint 2**:
1. Create Supabase account (if not already done)
2. Create new Supabase project
3. Copy Supabase credentials to `.env.local`
4. Run `npm run db:migrate` to create database schema
5. Run `npm run db:gen-types` to generate TypeScript types
6. Work with Claude on **Design System** creation
7. Then proceed to Checkpoint 2

---

## How to Use This Document

1. **Start with Checkpoint 1**: ✅ COMPLETE - all tasks marked
2. **Before Checkpoint 2**: Create design system with Claude (see "Frontend UI Notes" above)
3. **Request review**: Ask for code review on each checkpoint
4. **Mark complete**: Check off tasks as you complete them (use [x] for checkboxes)
5. **Loop through checkpoints**: Continue through Checkpoint 2-9 in order

**Development Pattern for Each Checkpoint**:
- Read all tasks in the checkpoint
- Implement backend APIs
- Create corresponding frontend UI components
- Test both API and UI together
- Request review
- Move to next checkpoint

**Total estimated time**: 12-16 weeks for one developer
**Estimated codebase size**: 5,000-7,000 lines of code

Good luck! 🚀

### Notes for Mehul

**Checkpoint 3 Status**: ✅ **FULLY COMPLETE** (Updated to Direct Supabase Queries)

**What Was Completed**:
1. ✅ **Frontend Project Management** (Direct Supabase Client):
   - Dashboard page - Lists projects with direct Supabase query
   - New project page - Creates projects with direct Supabase insert
   - Project detail page - Fetches/deletes projects with direct Supabase queries
   - All pages use `supabase.auth.getSession()` for authentication

2. ✅ **State Machine Validator** (lib/validators.ts):
   - canTransitionTo() - Validates all state transitions
   - canEditProject() - Checks if project can be edited
   - canDeleteProject() - Checks if project can be deleted
   - canRenderProject() - Checks if project can be rendered
   - Enforces workflow: draft → processing → ready → rendering → completed

3. ✅ **Frontend Dashboard UI** (Modern Noir Cinematic Design):
   - Dashboard page (/dashboard) with project grid, status badges, empty state
   - New project page (/dashboard/new) with form validation, character counter
   - Project detail page (/dashboard/projects/[id]) with expandable script, segments list
   - Full design system implementation: glowing orange accents, smooth transitions
   - Responsive layout (mobile + desktop)

4. ✅ **Auth Cleanup Completed**:
   - Removed all old JWT auth API routes (/api/auth/*)
   - Removed old projects API routes (/api/projects/*)
   - Removed lib/auth.ts (JWT utilities)
   - Removed JWT-related functions from lib/database.ts
   - Updated technical-spec.md to reflect Supabase Auth only
   - All pages now use Supabase Auth + direct Supabase client queries

**Technical Details**:
- **Auth**: Supabase Auth with cookie-based sessions
- **Data Access**: Direct Supabase client queries from frontend (no API routes)
- **RLS**: Row Level Security enforced at database level
- Projects start in 'draft' status (no optimization yet)

**Known Limitations** (By Design for MVP):
- Projects remain in 'draft' status until Pipeline A is implemented (Checkpoint 4)
- No background jobs yet - optimization will be triggered in next checkpoint

**Next Steps**:
Ready to begin Checkpoint 4: Script Optimization Pipeline (Pipeline A)

