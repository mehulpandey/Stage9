# Technical Specifications (MVP)

## Document Information
- **Goal**: Provide concrete technical behaviors, APIs, data model sketch, processing pipelines and minimal infrastructure to implement the functional requirements.

---

## 1. Technical Implementation

### 1.1 Architecture Overview

#### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

#### Backend
- **Framework**: Next.js API routes
- **Runtime**: Node.js
- **Workers**: Separate workers for heavy tasks (rendering / TTS / stock fetch)

#### Database, Auth & Storage
- **Platform**: Supabase
  - Postgres (database)
  - Storage (file storage)
  - Auth (authentication)

#### Job Queue
- **System**: Redis + BullMQ
- **Purpose**: Job queue orchestration for LLM calls, stock fetch, and render jobs

#### Rendering Workers
- **Container**: Docker running FFmpeg + helper scripts
- **Initial Setup**: Single worker VM
- **Future**: Scale as needed

#### LLM & TTS
- **LLM**: OpenAI gpt-4o-mini
  - Segmentation
  - Rewriting
  - Metadata generation
  - Quality validation
- **TTS Primary**: ElevenLabs
- **TTS Backup**: OpenAI TTS (alternative/fallback)
- **Strategy**: Per-segment generation and caching

**TTS Implementation Details**:
- **Per-Segment Approach**: Each segment generates TTS independently
  - Enables caching by segment text hash (cache key: `hash(text + voicePresetId)`)
  - Allows future multi-voice support (different voices per segment)
  - Resilient: Single segment TTS failure doesn't block entire render
  - Parallelizable: Up to 5 concurrent TTS calls to ElevenLabs

- **Caching Strategy**:
  - Cache key: `hash(optimized_text + voicePresetId)` (same text + different voice = different audio)
  - Cache duration: 30 days
  - Check cache before calling API; reuse if available
  - Store in Supabase `tts-audio/` bucket with path: `{projectId}/{segmentId}/{hash}.mp3`

- **Timing & Duration**:
  - Use actual TTS audio duration (not LLM estimate) for timeline composition
  - Measure audio file duration after generation
  - Log if difference > 20% from LLM estimate (debugging signal)

- **Silent Segments** (optional):
  - Mark segment as "silent" if user wants visuals-only (no narration)
  - Skip TTS generation, set duration = 0 or user-specified value
  - Handle in FFmpeg: render video without audio for that segment

**Voice Presets Configuration**:
```json
{
  "PROFESSIONAL_NARRATOR": {
    "name": "Professional Narrator",
    "description": "Deep, clear, authoritative tone. Good for educational/explainer content.",
    "elevenlabsVoiceId": "TBD_during_implementation",
    "provider": "elevenlabs",
    "stability": 0.5,
    "similarityBoost": 0.75
  },
  "ENERGETIC_HOST": {
    "name": "Energetic Host",
    "description": "Upbeat, conversational, engaging. Good for entertainment/listicle content.",
    "elevenlabsVoiceId": "TBD_during_implementation",
    "provider": "elevenlabs",
    "stability": 0.4,
    "similarityBoost": 0.8
  },
  "CALM_EDUCATOR": {
    "name": "Calm Educator",
    "description": "Warm, measured, thoughtful pace. Good for documentary/narrative content.",
    "elevenlabsVoiceId": "TBD_during_implementation",
    "provider": "elevenlabs",
    "stability": 0.6,
    "similarityBoost": 0.7
  }
}
```

**Fallback OpenAI TTS Mapping** (if ElevenLabs unavailable):
- PROFESSIONAL_NARRATOR → "onyx"
- ENERGETIC_HOST → "nova"
- CALM_EDUCATOR → "shimmer"

**Implementation Notes**:
- During development, test ElevenLabs voices and lock in specific voice IDs
- Store as configuration constant, allowing easy updates without code changes
- Support future voice expansion (cloned voices post-MVP)

#### Stock APIs
- **Providers**: Pexels and Pixabay (REST APIs)
- **Caching**: Store assets in Supabase storage

#### Monitoring & Logging
- **Error Tracking**: Sentry
- **Logs**: Vercel built-in logging (MVP), migrate to Better Stack or Axiom later

#### Payments
- **Provider**: Stripe

---

### 1.2 Authentication & Security

**Strategy: JWT Bearer Tokens + Refresh Tokens (Supabase Auth)**

**Token Flow**:
1. **Login** (`POST /api/auth/login`)
   - User provides email/password or OAuth provider credentials
   - Server validates and returns:
     - `access_token` (expires in 1 hour, includes user ID and role)
     - `refresh_token` (expires in 7 days, used to obtain new access tokens)
   - Tokens stored in secure HTTP-only cookies (prevents XSS attacks)

2. **API Requests**
   - Include `Authorization: Bearer {access_token}` header
   - Server validates JWT signature + expiration on every request
   - Middleware extracts user ID from token

3. **Token Refresh** (`POST /api/auth/refresh`)
   - When access_token expires, client calls refresh endpoint
   - Uses refresh_token to obtain new access_token
   - Frontend handles transparently (automatic retry on 401)
   - Refresh_token also rotated on each refresh (security best practice)

4. **Logout** (`POST /api/auth/logout`)
   - Revokes refresh_token server-side (stored in blacklist/database)
   - Clears cookies client-side
   - User must log in again to get new tokens

**OAuth Integration** (Google, GitHub, optional):
- Supabase Auth handles entire OAuth flow
- Returns same JWT tokens on successful authentication
- No custom OAuth code needed for MVP

**Protected vs Public Endpoints**:

**Protected** (require valid access_token):
- All `/api/projects/*` endpoints
- All `/api/user/*` endpoints
- `/api/auth/logout`
- `/api/auth/refresh`

**Public** (no auth required):
- `GET /api/health` (status check)
- `POST /api/auth/signup`
- `POST /api/auth/login`

**Implementation Notes**:
- Use Next.js middleware for auth verification on protected routes
- Log suspicious patterns: multiple failed logins, tokens from different IPs
- Monitor via Sentry: token validation errors, refresh failures
- CORS: Only allow requests from trusted frontend domain(s)
- HTTPS only: Reject non-HTTPS requests to ensure tokens encrypted in transit

---

### 1.3 Core API Endpoints

#### POST /api/projects
**Purpose**: Create project, submit script + settings

**Request Body**:
```json
{
  "title": "Project name",
  "script": "User script text",
  "settings": {
    "pacing": "medium",
    "voicePreset": "preset1",
    "stylePreset": "clean_explainer",
    "burnCaptions": false
  }
}
```

**Returns**: 
```json
{
  "projectId": "uuid",
  "jobId": "job_uuid"
}
```

#### GET /api/projects/:id
**Purpose**: Retrieve project metadata + status

**Returns**:
```json
{
  "id": "uuid",
  "title": "Project name",
  "status": "draft|processing|ready|rendering|completed",
  "originalScript": "...",
  "optimizedScript": "...",
  "createdAt": "timestamp"
}
```

#### GET /api/projects/:id/plan
**Purpose**: Returns current editing plan JSON

**Returns**:
```json
{
  "segments": [
    {
      "id": "uuid",
      "index": 0,
      "text": "Original text",
      "optimizedText": "Polished text",
      "estDuration": 5.2,
      "energy": 75,
      "suggestions": [
        {"assetId": "uuid", "thumbnail": "url", "provider": "pexels"},
        {"assetId": "uuid", "thumbnail": "url", "provider": "pixabay"},
        {"assetId": "uuid", "thumbnail": "url", "provider": "pexels"}
      ],
      "selectedAssetId": "uuid"
    }
  ]
}
```

#### POST /api/projects/:id/plan/regenerate-segment
**Purpose**: Regenerate suggestions for a single segment

**Request Body**:
```json
{
  "segmentId": "uuid"
}
```

**Returns**: Updated segment with new suggestions

#### POST /api/projects/:id/plan/update
**Purpose**: Update plan after user edits

**Request Body**:
```json
{
  "segments": [
    {
      "id": "uuid",
      "optimizedText": "User edited text",
      "selectedAssetId": "uuid"
    }
  ],
  "settings": {
    "burnCaptions": true
  }
}
```

#### POST /api/projects/:id/render
**Purpose**: Start final render job

**Returns**:
```json
{
  "renderId": "uuid",
  "jobId": "job_uuid",
  "status": "queued"
}
```

#### GET /api/projects/:id/render-status
**Purpose**: Poll render status

**Returns**:
```json
{
  "status": "queued|processing|completed|failed",
  "progress": 45,
  "estimatedTimeRemaining": 120
}
```

#### GET /api/projects/:id/download
**Purpose**: Signed download links when ready

**Returns**:
```json
{
  "videoUrl": "signed_url",
  "srtUrl": "signed_url",
  "expiresAt": "timestamp"
}
```

---

### 1.3.1 API Response Format & Error Handling

**Standard Success Response**:
```json
{
  "success": true,
  "data": {
    // Response data specific to endpoint
  }
}
```

**Standard Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional: Additional context for frontend handling
    }
  }
}
```

**HTTP Status Codes & Error Codes**:

| HTTP Status | Error Code | Message | Scenario | Frontend Action |
|-------------|-----------|---------|----------|-----------------|
| 200 | N/A | Success | Normal successful response | Proceed with data |
| 400 | INVALID_INPUT | "Script must be 300-5000 words" | Input validation failed | Show warning, user edits |
| 400 | CONTENT_BLOCKED | "Script contains prohibited content" | Content moderation blocked script | Show policy link, offer support |
| 401 | AUTH_REQUIRED | "Please log in to continue" | Missing or invalid auth token | Redirect to login |
| 403 | PERMISSION_DENIED | "You don't have access to this resource" | User lacks permission for resource | Show 403 error page |
| 404 | PROJECT_NOT_FOUND | "Project no longer exists" | Resource doesn't exist in database | Show 404 page, offer go-home link |
| 409 | PROJECT_PROCESSING | "Project is already processing. Please wait." | State conflict (e.g., already rendering) | Show loading state, disable render button |
| 429 | RATE_LIMIT_EXCEEDED | "You've used 2/2 renders this month. Upgrade to Pro for 30/month." | Rate limit enforced | Show upgrade CTA with usage details |
| 500 | STOCK_FETCH_FAILED | "Couldn't find stock footage. Try regenerating." | Stock API failed (after retries) | Show retry button |
| 500 | TTS_FAILED | "Voice generation failed. Please try again." | ElevenLabs API failed (after retries) | Show retry button |
| 500 | RENDER_FAILED | "Video rendering failed. View logs or contact support." | FFmpeg rendering failed | Show error details + support link |
| 500 | INTERNAL_ERROR | "Something went wrong. Our team has been notified." | Unexpected server error | Show support link, log to Sentry |

**Example Error Responses**:

Rate limit exceeded (with usage details):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've used your 2 renders this month. Upgrade to Pro for 30 renders/month.",
    "details": {
      "limit": 2,
      "used": 2,
      "planType": "free",
      "resetDate": "2024-12-01T00:00:00Z"
    }
  }
}
```

Input validation error:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Script must be 300-5000 words",
    "details": {
      "field": "script",
      "wordCount": 150,
      "minimum": 300,
      "maximum": 5000
    }
  }
}
```

Project already processing:
```json
{
  "success": false,
  "error": {
    "code": "PROJECT_PROCESSING",
    "message": "Project is already processing. Please wait.",
    "details": {
      "projectId": "proj_uuid",
      "currentJob": "render",
      "estimatedCompletion": "2024-11-23T12:30:00Z"
    }
  }
}
```

**Implementation Notes**:
- All API endpoints return consistent JSON format (success + error cases)
- Error codes are machine-readable (frontend uses code to handle specifically)
- Messages are user-friendly and actionable
- Details object provides context for UI (e.g., showing retry buttons, usage info, or links)
- All server errors logged to Sentry with full context: user ID, project ID, endpoint, request params, stack trace
- Client-side error handling: Check `response.success` flag first, then parse error code for specific UI actions
- CORS headers: Allow only trusted frontend domain(s)
- HTTPS required: Reject non-HTTPS API requests

---

### 1.4 Data Model (Key Tables)

#### users
**Description**: User accounts (via Supabase Auth)

**Columns**:
- `id` - UUID, primary key
- `email` - User email
- `created_at` - Timestamp
- `plan_type` - Text (free/pro/enterprise)
- `settings` - JSON, user preferences

#### projects
**Description**: User projects

**Columns**:
- `id` - UUID, primary key
- `user_id` - UUID, foreign key to users
- `title` - Text, project name
- `original_script` - Text, user input
- `optimized_script` - Text, AI-optimized version
- `settings` - JSON (pacing, voice preset, style preset, burn captions)
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `status` - Text (draft/processing/ready/rendering/completed/failed)

#### segments
**Description**: Script segments with optimization data

**Columns**:
- `id` - UUID, primary key
- `project_id` - UUID, foreign key to projects
- `index` - Integer, segment order
- `text` - Text, original segment text
- `optimized_text` - Text, polished version
- `est_duration` - Float, estimated seconds
- `energy` - Integer, energy score (0-100)
- `search_queries` - JSON array, stock search queries
- `suggestions_json` - JSON, stock clip suggestions with metadata
- `selected_asset_id` - UUID, foreign key to assets (nullable)
- `tts_audio_url` - Text, cached TTS audio URL (nullable)

#### assets
**Description**: Stock media assets

**Columns**:
- `id` - UUID, primary key
- `project_id` - UUID, foreign key to projects
- `segment_id` - UUID, foreign key to segments (nullable)
- `source_url` - Text, original URL from provider
- `local_path` - Text, Supabase storage path
- `thumbnail_path` - Text, thumbnail storage path
- `provider` - Text (pexels/pixabay)
- `license_info` - JSON, licensing details
- `metadata` - JSON (duration, resolution, orientation, keywords)
- `created_at` - Timestamp

#### renders
**Description**: Render job tracking

**Columns**:
- `id` - UUID, primary key
- `project_id` - UUID, foreign key to projects
- `job_id` - Text, BullMQ job identifier
- `status` - Text (queued/processing/completed/failed)
- `output_video_url` - Text, Supabase storage URL (nullable)
- `output_srt_url` - Text, SRT file storage URL (nullable)
- `burn_captions` - Boolean, whether captions burned into video
- `progress` - Integer, percentage (0-100)
- `error_message` - Text (nullable)
- `created_at` - Timestamp
- `started_at` - Timestamp (nullable)
- `completed_at` - Timestamp (nullable)
- `duration_s` - Integer, render duration in seconds (nullable)
- `logs` - Text, worker logs (nullable)

---

### 1.5 Processing Pipelines & Worker Responsibilities

#### Pipeline A: Script Optimization & Plan Generation
**Type**: Fast job (BullMQ)

**Process**:
1. Receive `original_script` and settings
2. Validate length & safety (OpenAI moderation API)
3. If length issues:
   - Too short: Return warning with auto-expand option
   - Too long: Return warning with trim/long-pacing options
4. Call LLM segmentation prompt (gpt-4o-mini) → return segment list (JSON)
5. For each segment:
   - Call LLM rewrite/polish prompt → `optimized_text`
   - Call LLM visual-query prompt → 3 search queries
6. Call LLM validation prompt → quality score
7. Store `optimized_script`, `segments`, and search queries in DB
8. Return diff to user for approval
9. Once approved: Trigger Pipeline B (stock fetch)

**LLM Configuration**:
- Model: gpt-4o-mini
- Temperature: 0.3 (low for consistency)
- Cache responses where possible

#### Pipeline B: Stock Candidate Fetch
**Type**: Async worker (BullMQ)

**Process**:
1. For each segment with approved search queries:
   - For each of 3 queries:
     - Call Pexels API → get top 5 results
     - Call Pixabay API → get top 5 results
   - Download low-res proxies (thumbnails)
   - Store in Supabase storage
   - Store metadata in `assets` table
2. Rank candidates per segment using weighted formula:
   - **Formula**: `SCORE = (K × 0.40) + (D × 0.30) + (O × 0.20) + (Q × 0.10)`
     - K = Keyword match (0-100)
     - D = Duration match (0-100)
     - O = Orientation match (0-100)
     - Q = Quality/popularity (0-100)

   - **Keyword Match (40%)**: Compare search query to asset metadata (title, tags, description)
     - Perfect match: 100 | Partial (2+ keywords): 70-90 | Single keyword: 40-60 | Conceptually relevant: 20-40

   - **Duration Match (30%)**: Ideal range is segment duration ± 20%
     - Formula: `100 × (1 - ABS(assetDuration - segmentDuration) / segmentDuration)`
     - If difference > 50%: score = 0

   - **Orientation Match (20%)**: Asset aspect ratio must be within 20% of 16:9 (1.78:1)
     - **Hard Minimum Threshold**: Acceptable range is 1.42:1 to 2.14:1 (±20% from 16:9)
     - Outside this range: Asset rejected entirely (score = 0, not considered)
     - Within acceptable range: Score based on closeness to 16:9
       - Exact 16:9: 100 | Within 10%: 90 | 10-20% difference: 60-70

   - **Quality Score (10%)**: Based on provider popularity (views/likes if available)
     - Fallback: All assets scored 50-100 range

3. Select top 3 candidates per segment, avoiding duplicates
4. Prefer videos over static images (slight scoring boost)
5. Update `segments.suggestions_json` with ranked candidates
6. On API failure:
   - Retry with 1-2 fallback queries (generated by LLM)
   - If still fails: Mark segment status as "needs_manual_selection"
   - Set placeholder asset

**Error Handling**:
- Retry failed API calls 3 times with exponential backoff
- Log all failures to Sentry

#### Pipeline C: Human-in-Loop Edits
**Type**: Interactive, synchronous API calls

**Process**:
1. Frontend pulls plan JSON via `GET /api/projects/:id/plan`
2. Display segment list with:
   - Segment text (editable)
   - 3 candidate thumbnails with preview
   - Selected asset indicator
3. User actions trigger API calls:
   - Edit text → `POST /api/projects/:id/plan/update`
   - Select different asset → `POST /api/projects/:id/plan/update`
   - Regenerate segment → `POST /api/projects/:id/plan/regenerate-segment`
     - Triggers new LLM call for queries
     - Triggers Pipeline B for that segment only
4. Update DB immediately, return updated plan

#### Pipeline D: Final Render
**Type**: Heavy job (BullMQ), Docker worker

**Process**:
1. Create render record, set status to "queued"
2. Worker picks up job:
   - Set status to "processing"
   - Download all selected assets (or use cached)
3. For each segment:
   - Check if TTS already cached in `segments.tts_audio_url`
   - If not cached: Call ElevenLabs TTS API for `optimized_text`
   - Cache mp3 in Supabase storage, update `segments.tts_audio_url`
   - Generate subtitle timings based on TTS duration
4. Generate complete SRT file:
   - Combine all segment subtitles with accurate timestamps
   - Upload to Supabase storage
5. Use FFmpeg to assemble timeline:
   - Input: video clips + TTS audio files
   - Apply transitions (crossfade 0.5s between clips)
   - Apply motion templates (Ken Burns effect: 1.05x zoom, random pan direction)
   - If `burn_captions` = true: Overlay SRT as text filter
   - Audio mixing: Video clip audio at 15%, TTS voiceover at 85%

**FFmpeg Configuration** (prioritizes speed over compression for MVP):
```bash
-c:v libx264              # H.264 codec (broad compatibility)
-preset fast              # Fast encoding (3-4x faster than medium, minimal quality loss)
-crf 23                   # Quality level (good balance: ~50-100MB per 10-min video)
-r 30                     # 30fps (smooth, not extreme)
-s 1920x1080              # 1920x1080 resolution
-c:a aac -b:a 128k       # AAC audio at 128kbps (sufficient for voice)
```

6. FFmpeg command structure:
```bash
ffmpeg -f concat -safe 0 -i concat_videos.txt \
  -i tts_audio.mp3 \
  -filter_complex "[0:a]volume=0.15[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=first[a]" \
  -vf "subtitles=output.srt:force_style='FontName=OpenSans,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000'" \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  -r 30 -s 1920x1080 \
  output.mp4
```

**Rationale**:
- `preset fast`: MVP prioritizes render speed (<15 min for 10-min video)
- `crf 23`: Tests show good quality without excessive file size
- `30fps`: Balances smoothness with file size
- `128kbps audio`: Sufficient for speech, not excessive
- Audio filter shows explicit mixing: video 15%, TTS 85%

---

#### Video Duration Mismatch Handling & Speed Adjustment

**During Storyboard Editor** (user sees warnings):
1. **Within ±5% of segment duration**: Accept silently
   - Example: 12s video for 15s segment = 1.25x playback speed (imperceptible)
   - No warning shown

2. **Within ±5-20% of segment duration**: Show warning badge
   - Display: "⚠️ Video duration 12s (need 15s) - will be sped up 1.25x"
   - Allow selection but flag prominently
   - User can choose different asset or accept adjustment

3. **Greater than ±20% mismatch**: Disable selection entirely
   - Cannot select 30s video for 10s segment (>20% difference)
   - User must pick different asset or adjust segment voiceover

**During Render** (FFmpeg applies adjustments):
- For any selected asset with duration mismatch (within ±20%):
  - Calculate speed factor: `speed_factor = segment_tts_duration / asset_duration`
  - Example: 15s segment, 12s asset → speed_factor = 1.25
  - Apply FFmpeg filter: `-filter:v "setpts=PTS/1.25"`
  - Log to `renders.logs`: "Segment 1: Applied 1.25x speed adjustment"
  - Record in segment metadata: `speed_adjusted: true, speed_factor: 1.25`

**Static Images** (no speed adjustment):
- Images display for full segment duration (no speed filtering)
- Apply Ken Burns effect instead (see below)

**Ken Burns Motion Effect** (for both images and videos):
- Applies to: Static images + optionally to videos as style enhancement
- **Zoom**: 1.05x (5% increase over segment duration)
- **Pan**: Random direction (up, down, left, right)
- **Duration**: Full segment duration
- **Animation**: Linear keyframe interpolation
- **FFmpeg implementation**:
  ```bash
  -filter:v "scale=1920:1080, zoompan=z='min(zoom+0.0015,1.05)':d=15*30:s=1920x1080:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)"
  ```
  (Parameters adjust based on segment_duration and pan_direction)
- **Result**: Professional "living photo" effect - makes static images feel dynamic

**Timeline Composition Math**:
- **Per-segment duration**: Use actual TTS audio duration (not LLM estimate)
- **Transitions**: 0.5s crossfade between clips (overlapped, not added)
- **Total video duration**: `SUM(all segment durations) - (number_of_transitions × 0.5s)`
- **Example**:
  ```
  Segment 1 TTS: 15s (video adjusted to 15s)
  Transition: -0.5s (overlapped)
  Segment 2 TTS: 18s (video adjusted to 18s)
  Transition: -0.5s (overlapped)
  Segment 3 TTS: 12s (video adjusted to 12s)
  Total: 15 + 18 + 12 - (2 × 0.5) = 44s
  ```

**Caption Synchronization**:
- SRT timestamps calculated from cumulative segment durations
- Account for transition overlaps in timing
- Example timing map:
  ```
  Segment 1: 00:00:00 → 00:00:15
  Transition overlap: 00:00:14.5 → 00:00:15.0 (0.5s shared)
  Segment 2: 00:00:15 → 00:00:33
  Transition overlap: 00:00:32.5 → 00:00:33.0 (0.5s shared)
  Segment 3: 00:00:33 → 00:00:45
  ```

---

#### Placeholder Asset Handling

**When Stock Fetch Fails** (Pipeline B):
1. Retry with LLM-generated fallback search queries (1-2 attempts)
2. If all retries fail:
   - Set `segments.asset_status = "needs_selection"`
   - Create placeholder asset: Solid color background (configurable)
   - Log to `segments.asset_notes`: "No suitable stock found for query: [query_text]"

**In Storyboard Editor** (Pipeline C):
- Display segment with colored placeholder background
- Show visual indicator: "🔴 No stock asset found"
- Present user options:
  - **"Try different search"**: Edit segment search queries, trigger Pipeline B again
  - **"Keep placeholder"**: Accept colored background for this segment
  - **"Upload custom"** (post-MVP, currently disabled): Upload user's own asset

**Placeholder Color Assignment**:
- Default: Theme color (based on editing style preset)
  - Clean Explainer: Light gray (#F0F0F0)
  - Energetic Listicle: Vibrant brand color (#FF6B6B)
  - Calm Documentary: Muted blue (#5B8DBE)
- User can customize per-segment or globally in editing UI

**Before Render Validation** (Pipeline D start):
1. Count total segments with placeholders
2. Calculate placeholder percentage: `(placeholder_count / total_segments) × 100`
3. **If >30% placeholders**:
   - Block render with error: "Too many missing assets (X/Y segments). Please find stock or adjust script."
   - Display list of problematic segments
   - Provide regenerate/edit options
4. **If ≤30% placeholders**:
   - Allow render to proceed (meets acceptance criteria of "≥70% with visuals")
   - Show warning: "X segments will use placeholder background"

**During Render**:
- Placeholder segments: Generate solid color video frame
- FFmpeg: `-filter:v "color=c=0xF0F0F0:s=1920x1080:d={segment_duration}"`
- Output: Colored background + TTS audio + captions (no blank/black frames)

**Post-Render Verification**:
- Verify all placeholder segments rendered correctly
- Log placeholder usage: "Segment 3 rendered with placeholder background"
- Alert team if placeholder count >25% (quality metric)

---

7. Upload final MP4 to Supabase storage
8. Update render record:
   - Status: "completed"
   - `output_video_url`: signed URL
   - `output_srt_url`: signed URL
   - `completed_at`: timestamp
9. Notify user (email + in-app notification)

**Progress Updates**:
- Update render progress every 10 seconds
- Estimate time remaining based on segments processed

---

### 1.6 LLM Prompts

**Configuration for all prompts**:
- Model: gpt-4o-mini
- Temperature: 0.3
- Max tokens: Varies by prompt
- Cache responses when possible

#### Segmentation Prompt
**System Message**:
```
You are a video script analyzer. Break scripts into segments for video production.
Each segment should be 15-30 seconds of spoken content.
Identify the energy level and intent of each segment.
```

**User Message Template**:
```
Analyze this script and break it into segments:

{script}

Return JSON array with this structure:
[
  {
    "text": "segment text",
    "energy": 0-100,
    "intent": "hook|explain|transition|conclude",
    "est_duration_hint": seconds
  }
]
```

#### Rewrite Prompt
**System Message**:
```
You are a script editor optimizing text for spoken video narration.
Make text conversational, punchy, and engaging while preserving meaning.
Shorten long sentences. Add verbal hooks. Maintain the author's voice.
```

**User Message Template**:
```
Rewrite this segment for video narration:

Original: {segment_text}

Requirements:
- Keep under {target_duration} seconds when spoken
- Maintain original meaning
- Make it more engaging and conversational
- Energy level: {energy_score}/100

Return only the rewritten text.
```

#### Visual-Query Prompt
**System Message**:
```
You are a video editor generating stock footage search queries.
Create specific, visual search terms that will find relevant B-roll footage.
```

**User Message Template**:
```
Generate 3 stock footage search queries for this narration:

"{segment_text}"

Requirements:
- 3-6 words per query
- Visual and specific (not abstract concepts)
- Suitable for Pexels/Pixabay search
- Prefer video clips over static images

Also provide 1 fallback descriptive phrase.

Return JSON:
{
  "queries": ["query1", "query2", "query3"],
  "fallback": "descriptive phrase"
}
```

#### Validation Prompt
**System Message**:
```
You are a script quality analyzer for video production.
Score scripts on clarity, pacing, and hook effectiveness.
```

**User Message Template**:
```
Analyze this optimized script and provide quality scores:

{optimized_script}

Score 0-100 on:
- Clarity: Is it easy to understand?
- Pacing: Good rhythm and flow?
- Hook: Does it grab attention?

Return JSON:
{
  "clarity": score,
  "pacing": score,
  "hook": score,
  "overall": average_score,
  "suggestions": ["suggestion1", "suggestion2"]
}
```

**Quality Score Thresholds & User Actions**:

| Score | Action | User Flow |
|-------|--------|-----------|
| ≥ 75 | ✅ Green - Proceed | Show checkmark, continue to storyboard immediately |
| 60-74 | ⚠️ Yellow - Warning | Show suggestions as tips ("You might improve..."), allow proceed without confirmation |
| < 60 | 🔴 Red - Block | Show detailed breakdown + suggestions, require checkbox confirmation to proceed, offer "Auto-Optimize" button |

**User Flow for Low Quality (< 60)**:
1. Display breakdown: Clarity score, Pacing score, Hook score, Overall score
2. Show LLM suggestions in red warning box
3. Present 3 options:
   - "Proceed Anyway" (requires checkbox confirmation)
   - "Auto-Optimize" (triggers additional LLM pass with specific suggestions)
   - "Manual Edit" (goes back to script editor)
4. Log user action if "Proceed Anyway" selected (analytics: quality override tracking)

**Implementation Notes**:
- Overall score = (Clarity × 0.4) + (Pacing × 0.35) + (Hook × 0.25)
- Don't permanently block low-quality scripts (user frustration)
- Track quality overrides for analytics (may indicate different user workflows)
- Future enhancement: Smart retry that auto-optimizes if score < 60

---

### 1.7 Asset Handling & Licensing

**Stock Sources**:
- Pexels API (free, commercial use allowed)
- Pixabay API (free, commercial use allowed)

**API Integration**:
- Store API keys in environment variables
- Rate limiting: Respect provider limits (Pexels: 200/hour, Pixabay: 100/min)
- Error handling: Retry with exponential backoff

**Storage Strategy**:
- Download low-res proxies (thumbnails) immediately for UI
- Download full-res assets only when selected for render
- Store in Supabase storage buckets:
  - `stock-proxies/` - thumbnails
  - `stock-assets/` - full resolution
  - `tts-audio/` - cached TTS segments
  - `renders/` - final videos
  - `srt-files/` - subtitle files

**Metadata Storage**:
- Store in `assets` table:
  - Provider name
  - License type
  - Original URL
  - Keywords/tags
  - Duration (for video clips)
  - Resolution
  - Orientation

**Cache Strategy**:
- Cache all assets by content hash to avoid re-downloading
- Cache TTS audio per segment text hash
- Set cache expiration: 90 days for assets, 30 days for TTS

---

### 1.8 Performance, Cost Controls & Safety

#### Performance Optimizations
- Use low-res preview rendering (480p) to show progress during full render
- Cache TTS per segment to avoid regenerating
- Cache stock assets to avoid re-downloading
- Use CDN (Supabase Storage) for asset delivery
- Implement lazy loading for segment thumbnails in UI

#### Cost Controls

**LLM Usage**:
- Use gpt-4o-mini for all operations (cost-effective)
- Cache LLM responses aggressively
- Batch operations where possible

**TTS Usage**:
- Cache every segment's TTS audio by text hash
- Reuse cached audio when segment text unchanged
- Monitor ElevenLabs character usage per user
- Rate limit: Free tier = 10K chars/month, Pro = 100K chars/month

**Rendering Rate Limits** (by tier):

| Limit | Free | Pro | Enterprise |
|-------|------|-----|------------|
| Renders/month | 2 | 30 | Unlimited |
| Max video length | 10 min | 30 min | Unlimited |
| Max concurrent renders | 1 | 2 | 5 |

**Enforcement**:
- Check limits at API-level before queueing render jobs
- Return 429 Too Many Requests if limit exceeded
- Queue system prioritizes Pro/Enterprise jobs over Free
- Track usage in database, reset monthly on subscription date

**Stock API**:
- Respect rate limits (implement rate limiter middleware)
- Cache all fetched assets
- Optimize: Stock searches are unlimited (cheap operation)

#### Safety & Content Moderation

**Input Validation**:
- Run OpenAI Moderation API on all scripts
- Block categories: hate, sexual, violence, self-harm
- Return clear error messages

**Prohibited Content**:
- Hate speech
- Sexual content
- Violence/gore
- Illegal activities
- Misinformation (if flagged by moderation API)

**User Reporting**:
- Allow users to report inappropriate generated content
- Manual review queue for flagged content
- Automatic account suspension after 3 violations

---

### 1.8 Error Handling & Retries

#### General Principles
- All worker jobs must be idempotent
- All external API calls wrapped in try-catch with retries
- Store all errors in database and Sentry

#### Specific Error Scenarios

**Stock Fetch Failures**:
1. Retry same query 3 times (exponential backoff: 1s, 2s, 4s)
2. If fails: Try fallback query automatically
3. If still fails: Mark segment as "needs_manual_selection"
4. Show user: "Could not find stock footage. Please upload your own or regenerate."

**TTS Failures**:
1. Retry 3 times (exponential backoff)
2. If ElevenLabs fails: Fallback to OpenAI TTS automatically
3. If both fail: Show error, allow user to retry or proceed without TTS
4. Log to Sentry with context

**Render Failures**:
1. Capture FFmpeg stderr output
2. Parse common errors (missing codec, file not found, etc.)
3. Surface human-readable message:
   - "Video rendering failed due to missing asset"
   - "Audio processing error - please try again"
4. Provide action buttons:
   - "Retry Render"
   - "Contact Support"
   - "View Logs" (for debugging)
5. Automatically retry once after 30 seconds
6. If second failure: Mark as failed, notify user

**LLM Failures**:
1. Retry 3 times with exponential backoff
2. If fails: Return error to user with option to:
   - "Try again"
   - "Skip optimization and use original script"
3. Log full request/response to debug

**Database Failures**:
1. Use Supabase connection pooling
2. Retry queries 3 times
3. If fails: Return 500 error with retry suggestion
4. Alert team via Sentry

---

### 1.10 Deployment & Infrastructure

#### Initial Setup (MVP)

**Frontend + API**:
- Deploy to Vercel (Next.js)
- Environment: Production
- Auto-deploy from `main` branch
- Preview deployments for PRs

**Database**:
- Supabase (managed Postgres)
- Connection pooling enabled
- Automatic backups (daily)

**Redis Queue**:
- Redis Cloud (free tier initially)
- Or: Railway Redis
- Connection string in env vars

**Worker VM**:
- Single Digital Ocean droplet (8GB RAM, 4 vCPU)
- Docker installed
- Worker container running BullMQ worker
- FFmpeg installed in container
- Auto-restart on failure (systemd)

**Storage**:
- Supabase Storage buckets (configured above)
- CDN enabled
- Signed URL expiration: 1 hour

#### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis
REDIS_URL=

# APIs
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
PEXELS_API_KEY=
PIXABAY_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Monitoring
SENTRY_DSN=

# Worker
WORKER_CONCURRENCY=2
```

#### Scaling Strategy

**Phase 1 (MVP)**: Single worker VM
**Phase 2** (100+ users): 
- Scale to 3 worker VMs
- Add load balancer for workers
- Use Redis cluster

**Phase 3** (1000+ users):
- Move to Kubernetes for workers
- Auto-scaling based on queue depth
- Separate rendering farm

#### Monitoring & Alerts

**Metrics to Track**:
- Queue depth (alert if > 50)
- Render success rate (alert if < 95%)
- API error rate (alert if > 5%)
- Average render time
- TTS API usage/cost
- LLM API usage/cost

**Alerting**:
- Sentry for errors
- Vercel analytics for frontend
- Custom dashboards (Grafana or Vercel Analytics)

**Health Checks**:
- `/api/health` endpoint
- Worker heartbeat every 30s
- Alert if worker offline > 5 min

#### Backup & Disaster Recovery

**Database Backups**:
- Supabase automatic daily backups
- Retention: 30 days
- Test restore monthly

**Asset Backups**:
- Supabase Storage includes redundancy
- Critical renders: backup to S3 (optional for later)

**Recovery Plan**:
- Database: Restore from Supabase backup (< 1 hour)
- Workers: Redeploy from Docker image (< 15 min)
- Redis: Rebuild queue from database state

---

## 2. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Next.js + Supabase + Vercel
- [ ] Implement authentication
- [ ] Create database schema
- [ ] Basic project creation UI

### Phase 2: Script Processing (Week 2-3)
- [ ] LLM segmentation pipeline
- [ ] LLM rewriting pipeline
- [ ] Script diff UI
- [ ] Quality validation

### Phase 3: Stock Integration (Week 3-4)
- [ ] Pexels/Pixabay API integration
- [ ] Stock fetch worker (BullMQ)
- [ ] Asset caching system
- [ ] Storyboard UI with thumbnails

### Phase 4: TTS & Rendering (Week 4-6)
- [ ] ElevenLabs integration
- [ ] FFmpeg render pipeline
- [ ] SRT generation
- [ ] Worker deployment

### Phase 5: Polish & Launch (Week 6-8)
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] Payment integration (Stripe)
- [ ] Beta testing & fixes