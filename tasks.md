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
- [x] Storage buckets configured (in migrations)
- [x] Environment variables set up (.env.example completed)
- [x] Project builds without errors (Next.js + TypeScript configured)
- [x] Can connect to Supabase (client configured, ready for credentials)

---

## CHECKPOINT 2: Authentication & API Foundation

**Objective**: Implement user authentication and API response format.
**Estimated completion**: Day 2-3
**Deliverables**: Working auth system, standardized API responses, auth middleware

### Authentication System
- [ ] Set up Supabase Auth configuration
- [ ] Create `/lib/auth/` utilities:
  - [ ] JWT token generation and validation
  - [ ] Refresh token rotation logic
  - [ ] Token verification middleware
  - [ ] User context hooks
- [ ] Create API routes:
  - [ ] `POST /api/auth/signup` - user registration
  - [ ] `POST /api/auth/login` - user login
  - [ ] `POST /api/auth/logout` - user logout
  - [ ] `POST /api/auth/refresh` - refresh access token
  - [ ] `GET /api/auth/me` - get current user
- [ ] Set up secure HTTP-only cookies for tokens
- [ ] Implement CORS middleware with domain whitelist (env var)
- [ ] Add request logging middleware (Sentry)

### API Response Format & Error Handling
- [ ] Create response wrapper utilities:
  - [ ] `successResponse(data)` - standardized success
  - [ ] `errorResponse(code, message, details)` - standardized error
- [ ] Create error codes enum:
  - [ ] AUTH_REQUIRED
  - [ ] PERMISSION_DENIED
  - [ ] INVALID_INPUT
  - [ ] CONTENT_BLOCKED
  - [ ] PROJECT_NOT_FOUND
  - [ ] PROJECT_PROCESSING
  - [ ] RATE_LIMIT_EXCEEDED
  - [ ] STOCK_FETCH_FAILED
  - [ ] TTS_FAILED
  - [ ] RENDER_FAILED
  - [ ] INTERNAL_ERROR
- [ ] Create error handling middleware:
  - [ ] Catch all errors and format as standardized response
  - [ ] Log errors to Sentry with context
  - [ ] Return appropriate HTTP status codes
- [ ] Create rate limiting middleware:
  - [ ] Unauthenticated: 10 req/min
  - [ ] Free: 100 req/min
  - [ ] Pro: 1000 req/min
  - [ ] Return 429 + Retry-After header

### Authorization Middleware
- [ ] Create `authorizationMiddleware`:
  - [ ] Verify JWT token on protected routes
  - [ ] Extract user ID from token
  - [ ] Check user exists in database
  - [ ] Return 401 if invalid/expired
- [ ] Create `validateProjectOwnership`:
  - [ ] Verify user owns the project
  - [ ] Return 403 if not owner
  - [ ] Reusable across all project endpoints

### API Health & Status
- [ ] Create `GET /api/health` endpoint
  - [ ] Check Supabase connectivity
  - [ ] Check Redis connectivity
  - [ ] Check FFmpeg availability
  - [ ] Return system status

### Frontend UI (Checkpoint 2)
- [ ] Create login page (`/pages/auth/login.tsx`)
  - [ ] Email input field
  - [ ] Password input field with show/hide toggle
  - [ ] Sign in button with loading state
  - [ ] "Forgot password?" link
  - [ ] "Don't have an account? Sign up" link
  - [ ] Form validation (email format, password length)
  - [ ] Error message display
  - [ ] Apply design system (colors, typography, spacing)
- [ ] Create signup page (`/pages/auth/signup.tsx`)
  - [ ] Email input field
  - [ ] Password input field with strength indicator
  - [ ] Confirm password field
  - [ ] Create account button
  - [ ] "Already have an account? Log in" link
  - [ ] Terms of service checkbox with link
  - [ ] Form validation (email, password strength)
  - [ ] Error message display
  - [ ] Apply design system
- [ ] Create layout wrapper component (`/components/Layout/AuthLayout.tsx`)
  - [ ] Header with Stage9 logo
  - [ ] Centered form container
  - [ ] Footer with links
  - [ ] Responsive design (mobile + desktop)

### Review Checkpoint 2
- [ ] User can sign up successfully
- [ ] User can log in with email/password
- [ ] Auth tokens are created and validated
- [ ] Protected endpoints reject unauthenticated requests
- [ ] Rate limiting is enforced
- [ ] Error responses are standardized
- [ ] CORS is configured correctly

---

## CHECKPOINT 3: Project Management APIs

**Objective**: Implement project CRUD operations and basic state management.
**Estimated completion**: Day 3-4
**Deliverables**: Full project lifecycle APIs, state transitions working

### Project Creation
- [ ] `POST /api/projects` endpoint:
  - [ ] Validate request body (title, script, voice_preset, editing_style)
  - [ ] Validate script length (300-5000 words)
  - [ ] Check user's rate limits (free: 2/month, pro: 30/month)
  - [ ] Check user's storage quota
  - [ ] Deduct from monthly renders count
  - [ ] Queue Pipeline A job (optimization)
  - [ ] Return project ID + status
- [ ] Input validation:
  - [ ] Script word count validation
  - [ ] Voice preset validation (against enum)
  - [ ] Editing style preset validation (against enum)

### Project Retrieval
- [ ] `GET /api/projects/:id` endpoint:
  - [ ] Verify user owns project
  - [ ] Return project with current status
  - [ ] Return segments if status >= ready
  - [ ] Return render history
- [ ] `GET /api/projects` endpoint (list):
  - [ ] Paginate user's projects
  - [ ] Sort by created_at desc
  - [ ] Return basic info (title, status, created_at)

### Project Updates
- [ ] `PATCH /api/projects/:id` endpoint:
  - [ ] Verify user owns project
  - [ ] Only allow edits in "ready" state (prevent mid-processing edits)
  - [ ] Allow title update only
- [ ] `DELETE /api/projects/:id` endpoint:
  - [ ] Verify user owns project
  - [ ] Only allow if status != "rendering"
  - [ ] Clean up associated assets from storage
  - [ ] Delete all segments + renders

### Project Status Transitions
- [ ] Implement state machine validator:
  - [ ] Draft → Processing (on optimization start)
  - [ ] Processing → Ready (on optimization complete)
  - [ ] Ready → Rendering (on render start)
  - [ ] Rendering → Completed (on render success)
  - [ ] Any state → Failed (on error)
- [ ] Create helper: `canTransitionTo(currentState, newState)`
- [ ] Validate no state transitions mid-operation

### Frontend UI (Checkpoint 3)
- [ ] Create dashboard page (`/pages/dashboard/index.tsx`)
  - [ ] Display user's projects in grid/list view
  - [ ] Show project title, status, creation date
  - [ ] "New Project" button
  - [ ] Edit/delete buttons for each project
  - [ ] Filter by status (draft, processing, completed)
  - [ ] Sort options (newest, oldest, alphabetical)
  - [ ] Empty state with "Create first project" CTA
  - [ ] Apply design system
- [ ] Create project creation modal/page (`/pages/dashboard/new-project.tsx`)
  - [ ] Project title input
  - [ ] Script textarea with word counter (300-5000 words)
  - [ ] Voice preset dropdown (professional_narrator, energetic_host, calm_educator)
  - [ ] Editing style preset dropdown (with preview)
  - [ ] Create Project button
  - [ ] Form validation
  - [ ] Error message display
  - [ ] Loading state during submission
  - [ ] Success redirect to project details
  - [ ] Apply design system
- [ ] Create project details page (`/pages/dashboard/projects/[id].tsx`)
  - [ ] Project title and metadata
  - [ ] Current status badge (draft, processing, ready, rendering, completed)
  - [ ] View script section (expandable)
  - [ ] Voice preset display
  - [ ] Render history list
  - [ ] Edit/delete project buttons
  - [ ] Apply design system

### Review Checkpoint 3
- [ ] User can create a new project with valid script
- [ ] Project creation is rejected with invalid input
- [ ] Rate limits are enforced (free: 2 renders/month)
- [ ] User can fetch their projects
- [ ] User cannot access other users' projects (403)
- [ ] Project status transitions work correctly
- [ ] User cannot edit project while it's processing

---

## CHECKPOINT 4: Script Optimization Pipeline (Pipeline A)

**Objective**: Implement LLM-based script analysis, optimization, and quality scoring.
**Estimated completion**: Day 4-5
**Deliverables**: Full optimization pipeline, quality scoring, segmentation working

### LLM Integration Setup
- [ ] Configure OpenAI client (gpt-4o-mini)
- [ ] Create `/lib/llm/` utilities:
  - [ ] `callLLM(prompt, maxTokens, temperature)` - wrapper
  - [ ] Retry logic (3 retries, exponential backoff)
  - [ ] Cost tracking per user
- [ ] Set temperature=0.3 for consistency
- [ ] Implement prompt caching for repeated prompts

### Content Moderation
- [ ] Integrate OpenAI Moderation API:
  - [ ] `moderateContent(text)` function
  - [ ] Check for: hate, sexual, violence, self-harm
  - [ ] Return block/allow decision
- [ ] `POST /api/projects/:id/validate-script` endpoint:
  - [ ] Run moderation on script
  - [ ] Return safety check results
  - [ ] Block project if content flagged

### Script Length Validation
- [ ] Create script length check:
  - [ ] If < 300 words: warn user, offer expand/proceed options
  - [ ] If > 5000 words: warn user, offer trim/proceed options
  - [ ] Store decision in project
- [ ] Create `/api/projects/:id/check-length` endpoint

### Script Segmentation (LLM)
- [ ] Create segmentation prompt (technical-spec reference)
- [ ] Implement `segmentScript(optimizedScript)` function:
  - [ ] Call LLM to break script into 5-10 segments
  - [ ] Return: segment text + suggested search queries
  - [ ] Validate segments total match original
- [ ] Parse LLM response into structured data
- [ ] Store segments in database

### Script Optimization (LLM)
- [ ] Create optimization prompt (technical-spec reference)
- [ ] Implement `optimizeScript(originalScript, settings)` function:
  - [ ] Call LLM to rewrite/polish script
  - [ ] Preserve user meaning, improve hooks/pacing
  - [ ] Return optimized script
- [ ] Create `/api/projects/:id/preview-optimization` endpoint:
  - [ ] Return side-by-side comparison (original vs optimized)
  - [ ] Don't save yet, just preview

### Quality Scoring (LLM)
- [ ] Create quality scoring prompt (technical-spec reference)
- [ ] Implement `scoreQuality(script)` function:
  - [ ] Score on 3 dimensions: Clarity (40%), Pacing (35%), Hook (25%)
  - [ ] Return: clarity_score, pacing_score, hook_score, overall_score, suggestions
  - [ ] Formula: overall = (clarity × 0.4) + (pacing × 0.35) + (hook × 0.25)
- [ ] Implement scoring thresholds:
  - [ ] ≥ 75 (Green): proceed
  - [ ] 60-74 (Yellow): warn with tips
  - [ ] < 60 (Red): require confirmation + offer auto-optimize
- [ ] Create `/api/projects/:id/quality-score` endpoint
- [ ] Return score + feedback

### Pipeline A Worker (BullMQ)
- [ ] Create BullMQ job handler for pipeline A:
  - [ ] 1. Validate script length
  - [ ] 2. Check moderation
  - [ ] 3. Optimize script (LLM)
  - [ ] 4. Segment script (LLM)
  - [ ] 5. Score quality (LLM)
  - [ ] 6. Save all to database
  - [ ] 7. Update project status to "ready"
  - [ ] 8. Handle errors, log to Sentry
- [ ] Add retry logic: 3 attempts, exponential backoff
- [ ] Track job progress
- [ ] Log costs (OpenAI tokens used)

### Auto-Optimize (Retry Logic)
- [ ] Implement `autoOptimizeScript(projectId)`:
  - [ ] Get quality score feedback
  - [ ] Rerun optimization with targeted instructions
  - [ ] Limit to 3 retries
  - [ ] After 3 failures: show "Consider manual editing"
- [ ] Create `POST /api/projects/:id/auto-optimize` endpoint
- [ ] Reuse same pipeline, track attempt count

### Review Checkpoint 4
- [ ] Content moderation works (blocks flagged content)
- [ ] Script segmentation produces correct segments
- [ ] Script optimization improves quality without changing meaning
- [ ] Quality scoring accurately identifies weak scripts
- [ ] Pipeline A job completes successfully
- [ ] Project transitions to "ready" state
- [ ] Auto-optimize reduces low scores
- [ ] Errors are logged to Sentry

---

## CHECKPOINT 5: Segment & Storyboard APIs

**Objective**: Implement segment retrieval and editing.
**Estimated completion**: Day 5-6
**Deliverables**: Full storyboard view, segment editing, segment validation

### Segment Retrieval
- [ ] `GET /api/projects/:id/segments` endpoint:
  - [ ] Return all segments for project
  - [ ] Include: text, duration, asset suggestions, status
  - [ ] Only in "ready" or "rendering" state
- [ ] `GET /api/projects/:id/segments/:segmentId` endpoint:
  - [ ] Return single segment with detail

### Segment Editing
- [ ] `PATCH /api/projects/:id/segments/:segmentId` endpoint:
  - [ ] Allow editing: text, duration (advanced)
  - [ ] Only in "ready" state (not while rendering)
  - [ ] Validate new text is not empty
  - [ ] Note: Don't regenerate TTS here (happens at render time)
  - [ ] Update segment in database
  - [ ] Keep estimated_duration unchanged (user sees estimate)
- [ ] `POST /api/projects/:id/segments/:segmentId/select-asset` endpoint:
  - [ ] Allow selecting asset from suggestions
  - [ ] Validate asset exists and belongs to segment
  - [ ] Store selection in database
  - [ ] Check duration mismatch (±5/±20/block logic)
  - [ ] Return warning if ±5-20% mismatch

### Asset Selection Validation
- [ ] Create asset duration validation:
  - [ ] Calculate: `mismatch_percent = ABS(asset_duration - segment_duration) / segment_duration * 100`
  - [ ] If ≤ 5%: accept silently
  - [ ] If 5-20%: warn but allow
  - [ ] If > 20%: disable/return error
- [ ] Return speed factor calculation: `speed_factor = segment_duration / asset_duration`

### Segment Placeholder Handling
- [ ] `POST /api/projects/:id/segments/:segmentId/set-placeholder` endpoint:
  - [ ] Set asset_status = "placeholder"
  - [ ] Allow optional color customization
  - [ ] Store placeholder_color in database
- [ ] `POST /api/projects/:id/segments/:segmentId/regenerate-assets` endpoint:
  - [ ] Trigger Pipeline B again for this segment
  - [ ] Queue new stock fetch job
  - [ ] Update suggestions

### Silent Segments
- [ ] `PATCH /api/projects/:id/segments/:segmentId/silence` endpoint:
  - [ ] Set is_silent = true
  - [ ] User specifies duration (seconds)
  - [ ] Skip TTS generation for this segment
  - [ ] Store silent_duration

### Storyboard Summary
- [ ] Create `/api/projects/:id/storyboard-summary` endpoint:
  - [ ] Return: total segments, placeholders count, visual completion %
  - [ ] Return: estimated total duration
  - [ ] Check if >30% placeholders (warning threshold)
- [ ] Return computed values:
  - [ ] `placeholder_count` - number of segments with no asset
  - [ ] `placeholder_percentage` - percentage of total
  - [ ] `estimated_total_duration` - sum of all segment durations

### Frontend UI (Checkpoint 5)
- [ ] Create storyboard editor page (`/pages/dashboard/projects/[id]/storyboard.tsx`)
  - [ ] Display all segments in vertical scrollable list
  - [ ] For each segment:
    - [ ] Segment number badge
    - [ ] Segment duration display
    - [ ] Text preview (editable textarea)
    - [ ] Asset selection carousel (top 3 suggestions)
    - [ ] Asset thumbnail images with hover previews
    - [ ] Duration mismatch indicator/warning badge
    - [ ] Placeholder option (set colored background)
    - [ ] Silent segment toggle
    - [ ] Delete segment button
    - [ ] Edit button to expand/collapse segment details
  - [ ] Bottom summary bar:
    - [ ] Total duration countdown
    - [ ] Visual completion % (green if ≥70%)
    - [ ] Placeholder count / warning if >30%
    - [ ] "Ready to Render" button (disabled if >30% placeholders)
  - [ ] Asset carousel component (`/components/AssetCarousel.tsx`)
    - [ ] Display 3 asset options side-by-side
    - [ ] Next/Previous buttons
    - [ ] Thumbnail with title/duration info
    - [ ] Select button
    - [ ] Regenerate assets button
  - [ ] Segment editor modal (`/components/SegmentEditor.tsx`)
    - [ ] Full segment text editing
    - [ ] Advanced options (placeholder color picker)
    - [ ] Silent duration input
    - [ ] Save/Cancel buttons
  - [ ] Apply design system throughout

### Review Checkpoint 5
- [ ] User can view all segments in storyboard
- [ ] User can edit segment text
- [ ] User can select from asset suggestions
- [ ] Duration mismatch warnings shown correctly
- [ ] Silent segments can be created
- [ ] Placeholder assets can be set
- [ ] Storyboard summary shows correct stats
- [ ] User cannot edit while project is rendering (409 error)

---

## CHECKPOINT 6: Stock Asset Fetching & Ranking (Pipeline B)

**Objective**: Integrate stock APIs and implement asset ranking algorithm.
**Estimated completion**: Day 6-8
**Deliverables**: Stock API integration, weighted ranking formula working, asset caching

### Stock API Integration
- [ ] Set up Pexels API client:
  - [ ] `searchPexels(query, minDuration)` function
  - [ ] Handle rate limits (200/hour)
  - [ ] Parse response: duration, aspect ratio, videos
- [ ] Set up Pixabay API client:
  - [ ] `searchPixabay(query, minDuration)` function
  - [ ] Handle rate limits (100/min)
  - [ ] Parse response: duration, aspect ratio, videos
- [ ] Create `/lib/stock/` utilities:
  - [ ] Fetch from both APIs
  - [ ] Deduplicate results
  - [ ] Download low-res thumbnails

### Asset Ranking Algorithm
- [ ] Implement weighted scoring:
  - [ ] `SCORE = (K × 0.40) + (D × 0.30) + (O × 0.20) + (Q × 0.10)`
  - [ ] K = Keyword match (0-100)
  - [ ] D = Duration match (0-100)
  - [ ] O = Orientation match (0-100)
  - [ ] Q = Quality/popularity (0-100)
- [ ] Implement keyword matching:
  - [ ] Perfect match: 100
  - [ ] Partial (2+ keywords): 70-90
  - [ ] Single keyword: 40-60
  - [ ] Conceptually relevant: 20-40
- [ ] Implement duration matching:
  - [ ] Formula: `100 × (1 - ABS(asset_duration - segment_duration) / segment_duration)`
  - [ ] Cap at 0 if difference > 50%
- [ ] Implement orientation matching:
  - [ ] Hard threshold: aspect ratio within ±20% of 16:9 (1.42-2.14 range)
  - [ ] Reject entirely if outside range
  - [ ] Within range: 16:9 exact = 100, within 10% = 90, 10-20% = 60-70
- [ ] Implement quality scoring:
  - [ ] Use provider view count if available
  - [ ] Fallback: 50-100 range (don't penalize unknowns)
- [ ] Prefer videos over images (slight boost)
- [ ] Top 3 selection: rank by score, avoid duplicates

### Segment Search Queries
- [ ] Create search query generation (from segmentation):
  - [ ] Use LLM to generate 3 relevant queries per segment
  - [ ] Queries stored in segment metadata
- [ ] Allow user to edit queries in storyboard

### Pipeline B Worker (BullMQ)
- [ ] Create BullMQ job handler for pipeline B:
  - [ ] For each segment:
  - [ ] 1. Get 3 search queries
  - [ ] 2. Search Pexels (top 5 per query)
  - [ ] 3. Search Pixabay (top 5 per query)
  - [ ] 4. Rank all candidates using algorithm
  - [ ] 5. Select top 3, store in database
  - [ ] 6. Download thumbnails
  - [ ] 7. If all fail: set placeholder + fallback queries
  - [ ] 8. Cache results for reuse
- [ ] Retry logic: 3 attempts with fallback queries
- [ ] Handle failures gracefully (don't crash entire pipeline)
- [ ] Track API costs

### Asset Caching
- [ ] Implement global cache for stock assets:
  - [ ] Cache key: `hash(provider + asset_id + resolution)`
  - [ ] Check cache before downloading
  - [ ] Reuse across all projects
  - [ ] Expiration: 90 days
  - [ ] Storage: Supabase `assets` bucket
- [ ] Implement per-project TTS cache:
  - [ ] Cache key: `hash(text + voice_preset_id)`
  - [ ] Per-project isolation (security)
  - [ ] Expiration: 30 days
  - [ ] Storage: Supabase `tts-audio` bucket
- [ ] Create cache management utilities:
  - [ ] `getCached(key)` - retrieve from cache
  - [ ] `setCached(key, value, expiresAt)` - save to cache
  - [ ] `deleteCached(key)` - remove from cache
  - [ ] Cleanup job: delete expired entries

### Review Checkpoint 6
- [ ] Stock APIs return results for valid queries
- [ ] Ranking algorithm produces correct scores
- [ ] Top 3 assets are ranked properly
- [ ] Duration matching rejects >20% mismatches
- [ ] Orientation matching has hard threshold
- [ ] Asset thumbnails are cached
- [ ] Caching prevents re-downloads
- [ ] Pipeline B completes successfully
- [ ] User can regenerate segment assets

---

## CHECKPOINT 7: Text-to-Speech Generation (Pipeline C Prep)

**Objective**: Implement TTS generation with caching and quality validation.
**Estimated completion**: Day 8-9
**Deliverables**: TTS generation working, voice presets configured, caching functional

### TTS Provider Setup
- [ ] Configure ElevenLabs client:
  - [ ] Set API key from env
  - [ ] Create voice configuration (professional-narrator, energetic-host, calm-educator)
  - [ ] Map voice IDs to presets
  - [ ] Set stability/similarityBoost per voice
- [ ] Configure OpenAI TTS fallback:
  - [ ] Map presets to voices (onyx, nova, shimmer)
  - [ ] Use if ElevenLabs fails
- [ ] Create `/lib/tts/` utilities:
  - [ ] `generateTTS(text, voicePreset)` function
  - [ ] Check cache first
  - [ ] Call ElevenLabs, fallback to OpenAI
  - [ ] Measure audio duration
  - [ ] Store in cache
  - [ ] Return: audio file path, duration

### TTS Implementation Details
- [ ] Create voice preset configuration:
  - [ ] PROFESSIONAL_NARRATOR - deep, clear, authoritative
  - [ ] ENERGETIC_HOST - upbeat, conversational
  - [ ] CALM_EDUCATOR - warm, measured, thoughtful
- [ ] Implement per-segment generation:
  - [ ] Generate one TTS per segment text
  - [ ] Support up to 5 concurrent TTS calls
  - [ ] Handle timeout (max 30s wait)
- [ ] Log TTS costs (character count used)

### TTS Duration Validation
- [ ] After TTS generation:
  - [ ] Measure actual audio duration using ffprobe
  - [ ] Compare to segment's estimated_duration
  - [ ] If differs > 20%:
    - [ ] Log warning
    - [ ] Update segment's duration field
    - [ ] Show user notification (will happen at render)
  - [ ] If differs ≤ 20%: accept silently

### TTS Caching System
- [ ] Implement cache layer:
  - [ ] Cache key: `hash(optimized_text + voice_preset_id)`
  - [ ] Storage: Supabase `tts-audio/{projectId}/{hash}.mp3`
  - [ ] Metadata: created_at, expires_at (30 days)
- [ ] Cache lookup before generation:
  - [ ] Check if cache hit
  - [ ] Return cached audio if exists
  - [ ] Skip API call if found
- [ ] Cache cleanup:
  - [ ] Delete expired entries daily
  - [ ] Delete orphaned entries (segment deleted)

### Silent Segment Handling
- [ ] For silent segments:
  - [ ] Skip TTS generation entirely
  - [ ] Use user-specified duration
  - [ ] Mark is_silent = true
  - [ ] Will render without audio

### TTS Error Handling
- [ ] Retry logic: 3 attempts, 10s timeout per attempt
- [ ] If all fail:
  - [ ] Block render
  - [ ] Return error: "Voice generation failed"
  - [ ] Allow user to retry
- [ ] Log failures to Sentry with context

### Review Checkpoint 7
- [ ] ElevenLabs generates TTS successfully
- [ ] OpenAI fallback works if ElevenLabs fails
- [ ] Audio duration is measured correctly
- [ ] Duration mismatches are detected and logged
- [ ] TTS is cached and retrieved from cache
- [ ] Concurrent TTS calls work (up to 5)
- [ ] Silent segments skip TTS
- [ ] Timeouts are enforced
- [ ] Errors are handled gracefully

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
