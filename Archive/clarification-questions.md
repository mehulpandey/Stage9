# Specification Clarification Questions & Suggested Answers

## Document Purpose
This document tracks all clarification questions identified during spec review, along with suggested answers for MVP-focused decisions. Use this to guide spec updates and implementation.

---

## HIGH PRIORITY MVP QUESTIONS

### 1. Voice Preset Definitions

**Question**: What are the 1-3 voice preset options? How should they be named/described?

**Current Spec Reference**: Functional spec mentions "1–3 choices" but doesn't define them.

**Suggested Answer**:
Define 3 voice presets:
1. **Professional Narrator** - Deep, clear, authoritative tone. Good for educational/explainer content. (Male voice by default)
2. **Energetic Host** - Upbeat, conversational, engaging. Good for entertainment/listicle content. (Female voice by default)
3. **Calm Educator** - Warm, measured, thoughtful pace. Good for documentary/narrative content. (Neutral gender option)

**Rationale**:
- 3 is a good starting number (more choice without overwhelming)
- Each matches one of the editing style presets (Clean Explainer, Energetic Listicle, Calm Documentary)
- These can be tested with real users in beta

**Implementation Notes**:
- Store as enum: `PROFESSIONAL_NARRATOR`, `ENERGETIC_HOST`, `CALM_EDUCATOR`
- Map to actual ElevenLabs voice IDs during TTS call
- Allow future expansion to more voices without breaking existing projects

---

### 2. FFmpeg Configuration Details

**Question**: What are the exact FFmpeg settings for output quality, codec, and motion effects?

**Current Spec Reference**: Technical spec mentions `-crf 23`, `preset medium`, but doesn't justify choices.

**Suggested Answer**:

**Codec & Output**:
```bash
-c:v libx264              # H.264 for broad compatibility
-crf 23                   # Quality level (22-23 is good balance, not too slow)
-preset fast              # Faster encoding (MVP priority: speed > compression)
-r 30                     # 30fps (smooth, not extreme)
-s 1920x1080              # 1920x1080 resolution
-c:a aac -b:a 128k       # AAC audio at 128kbps (good for voice)
```

**Rationale for Choices**:
- `preset fast` instead of `medium`: MVP needs quick renders (< 15 min for 10-min video). Fast is 3-4x faster with minimal quality loss for H.264.
- `crf 23`: Tests show this gives good quality at ~50-100MB per 10-minute video (acceptable)
- `30fps`: Balances smooth motion with file size. Not extreme like 60fps.
- `128kbps audio`: Sufficient for speech/voiceover, not excessive

**Motion Effects (Ken Burns)**:
```
Zoom amount: 1.05x (5% zoom over segment duration)
Pan direction: Random (left-right or up-down)
Apply to: All segments by default
```

**Rationale**: Subtle enough to look professional, not distracting. Ken Burns adds visual interest to static stock footage.

**Transition Settings**:
- Type: `crossfade`
- Duration: `0.5s`
- Apply between all adjacent segments

**Audio Mixing**:
```
Video clip audio: 15% (lower to background)
TTS voiceover: 85% (primary)
Mixing mode: overlay (both audible)
```

**Rationale**: TTS should be dominant but video audio (if any) provides continuity.

**Background Music** (Optional):
- Default: OFF (can enable per-project)
- If enabled: Use royalty-free music from Pexels/Pixabay
- Volume: -12dB (very quiet, underneath TTS and video audio)
- Strategy: Select uplifting instrumental matching segment energy level

**Implementation Notes**:
- Store these as config constants (not hardcoded)
- Allow future "quality tiers" (fast/standard/high) for different presets
- Don't add these as user controls for MVP (keep simple)

---

### 3. Asset Ranking Algorithm

**Question**: What's the exact formula for ranking and selecting stock assets?

**Current Spec Reference**: Technical spec mentions "keyword match + duration match + orientation + quality score" but no weights.

**Suggested Answer**:

**Ranking Formula** (out of 100):
```
SCORE = (K × 0.40) + (D × 0.30) + (O × 0.20) + (Q × 0.10)

Where:
K = Keyword match score (0-100)
D = Duration match score (0-100)
O = Orientation match score (0-100)
Q = Quality/popularity score (0-100)
```

**Detailed Calculation**:

1. **Keyword Match (40% weight)**
   - Perfect match to search query: 100
   - Partial match (2+ keywords): 70-90
   - Single keyword match: 40-60
   - No direct match but conceptually relevant: 20-40
   - Method: Compare segment search query to asset metadata (title, tags, description)

2. **Duration Match (30% weight)**
   - Ideal: Asset duration ± 20% of segment duration
   - If segment is 10 seconds, ideal clip is 8-12 seconds
   - Scoring: 100 for exact match, linear decay on either side
   - Formula: `100 × (1 - ABS(asset_duration - segment_duration) / segment_duration)`
   - Cap: If difference > 50%, score is 0

3. **Orientation Match (20% weight)**
   - **Hard Minimum Threshold**: Asset aspect ratio must be within 20% of 16:9 (1.78)
     - Acceptable range: 1.42 to 2.14 (roughly 14:10 to 2.1:1)
     - Below this: Asset is rejected entirely (score = 0, not considered)
   - 16:9 aspect ratio (1.78): 100
   - Within 10% of 16:9: 90
   - 10-20% difference from 16:9: 60-70
   - Method: Extract aspect ratio from asset metadata, calculate `ABS((aspectRatio - 1.78) / 1.78) * 100` to determine difference percentage

4. **Quality Score (10% weight)**
   - Based on provider's popularity/view count (if available)
   - Higher views/likes = higher score
   - Fallback: All assets 50-100 range (don't heavily penalize unknown assets)

**Selection Logic**:
1. Fetch top 5 results from each of 3 search queries
2. Rank all ~15 candidates by formula above
3. Select top 3 non-duplicate results
4. Prefer videos over static images (slight boost to video scores)
5. Avoid repeating same asset in multiple segments (track asset IDs used)

**Edge Cases**:
- If fewer than 3 candidates pass minimum threshold (score > 30): Fetch from fallback query
- If still < 3: Mark segment as "needs_manual_selection", show placeholder + upload option

**Implementation Notes**:
- Store scores in database for debugging/analytics
- Allow future tuning of weights based on user feedback
- Don't expose formula to users (keep simple in UI)

---

### 4. API Authentication Strategy

**Question**: How do we authenticate API requests? (Bearer tokens, sessions, API keys?)

**Current Spec Reference**: APIs don't specify authentication mechanism.

**Suggested Answer**:

**Strategy: JWT Bearer Tokens + Refresh Tokens**

**Flow**:
1. **Login** (`POST /api/auth/login`)
   - User provides email/password or OAuth credentials
   - Server returns: `access_token` (expires in 1 hour) + `refresh_token` (expires in 7 days)
   - Tokens stored in secure HTTP-only cookies

2. **API Requests**
   - Include `Authorization: Bearer {access_token}` header
   - Server validates JWT signature + expiration

3. **Token Refresh** (`POST /api/auth/refresh`)
   - When access_token expires, use refresh_token to get new access_token
   - Done automatically by frontend (transparent to user)

4. **Logout** (`POST /api/auth/logout`)
   - Invalidate refresh_token server-side
   - Clear cookies client-side

**Why This Approach**:
- Short-lived access tokens limit damage if token is leaked
- Refresh tokens allow long-term sessions without exposing access token
- HTTP-only cookies prevent XSS attacks
- Works well with Supabase Auth (native support)

**OAuth Integration** (Google, GitHub):
- Supabase handles OAuth flow
- Returns same JWT tokens on successful authentication
- No need to build separate OAuth logic

**Endpoints Requiring Auth**:
- All `/api/projects/*` endpoints
- All `/api/user/*` endpoints
- `/api/auth/logout`, `/api/auth/refresh`

**Public Endpoints** (no auth required):
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/signup`

**Implementation Notes**:
- Implement auth middleware for protected routes
- Log suspicious auth failures (too many failed logins = rate limit user)
- Monitor token usage in Sentry

---

### 5. Rate Limiting Enforcement Mechanism

**Question**: How do we enforce rate limits? Where? What happens when exceeded?

**Current Spec Reference**: Mentions limits (5 renders/month free, 50 segments/month) but no enforcement mechanism.

**Suggested Answer**:

**Rate Limit Tiers** (Approved):

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Renders/month | 2 | 30 | Unlimited |
| Optimization requests/month | Unlimited | Unlimited | Unlimited |
| Stock segment searches/month | Unlimited | Unlimited | Unlimited |
| Max video length | 10 min | 30 min | Unlimited |
| Max concurrent renders | 1 | 2 | 5 |

**Rationale for limits**:
- Free: 2 renders/month (~1 every 2 weeks) encourages upgrade after testing
- Free max 10 min: Reduces quality control burden during MVP, focuses on shorter-form content
- Pro: 30 renders/month suitable for serious content creators (1 per day or flexible scheduling)
- Pro max 30 min: Increases limits as we gain confidence in video quality at scale
- Enterprise: Full unlimited access for agencies/high-volume users

**Enforcement Strategy**:

1. **Database Tracking**
   - Add `users` table columns: `renders_used_this_month`, `optimizations_used_this_month`, etc.
   - Add `renders` table column: `created_at` (to calculate monthly usage)
   - Reset counters monthly on subscription date

2. **API-Level Checking**
   - Before processing any request, check user's limits
   - If exceeded: Return `429 Too Many Requests` with message: `"You've used your 5 renders this month. Upgrade to Pro for unlimited renders."`
   - Include retry-after header with time until monthly reset

3. **Job Queueing** (not hard blocking)
   - Renders queue jobs regardless, but free tier jobs are lower priority
   - Pro tier jobs get priority in BullMQ queue
   - If queue too deep (> 100 jobs): Reject new jobs temporarily with clear message

4. **What Happens When Limit Exceeded**:
   - User sees popup: "Limit reached. Upgrade to Pro to continue."
   - Button to upgrade or check next reset date
   - Can still view/edit projects, just can't create new renders

**Implementation Notes**:
- Store limits in database (not hardcoded) for easy changes
- Monitor which tiers are running out (analytics)
- Add admin dashboard to override limits if needed
- Don't silently fail - always show clear message

---

### 6. LLM Quality Score Threshold

**Question**: What quality score triggers a warning? What's the user flow when it's low?

**Current Spec Reference**: "If score below threshold" but no actual threshold value.

**Suggested Answer**:

**Quality Scoring**:
Each optimized script gets a quality score (0-100) calculated as:
```
OVERALL = (Clarity × 0.4) + (Pacing × 0.35) + (Hook × 0.25)

Where each component is 0-100
```

**Threshold & Actions**:

| Score | Action |
|-------|--------|
| ≥ 75 | Green checkmark, proceed normally |
| 60-74 | Yellow warning, show suggestion but allow proceed |
| < 60 | Red warning, require explicit user confirmation to proceed |

**User Flow for Low Quality (< 60)**:

1. Optimization completes, user sees quality breakdown:
   ```
   ⚠️ Script Quality Score: 55/100

   Clarity: 48/100 - Try using shorter sentences
   Pacing: 62/100 - Good flow overall
   Hook: 58/100 - Consider opening with a question

   Suggestions:
   - "Your opening could grab attention better"
   - "Some sentences are dense - break them into shorter chunks"
   ```

2. User has 3 options:
   - **"Proceed Anyway"** (checkbox to confirm) - continues with current script
   - **"Auto-Optimize"** (button) - triggers another LLM pass with specific suggestions
   - **"Manual Edit"** - go back and manually edit the script, re-optimize

3. If user clicks "Proceed Anyway", we log this event (analytics: user overrode quality warning)

**60-75 Range Behavior**:
- Show suggestions as tips but don't block
- "You might improve this..." format (less pushy)
- Still let user proceed immediately

**Implementation Notes**:
- Don't reject poor-quality scripts (frustrates users)
- These scores are suggestions, not hard blocks
- Track which users ignore quality warnings (might indicate different workflow)
- Could later implement "smart retry" that auto-optimizes if score < 60

---

### 7. TTS Approach: Per-Segment vs Full-Script

**Question**: Should we generate TTS per segment or for the entire optimized script at once?

**Current Spec Reference**: Technical spec assumes per-segment in Pipeline D, but not explicitly stated.

**Suggested Answer**:

**Decision: Per-Segment TTS**

**Why**:
1. **Cacheability**: If user edits one segment's text, only that segment needs new TTS (not entire video)
2. **Flexibility**: User can potentially swap voiceovers per segment later (Post-MVP feature: multi-voice support)
3. **Resilience**: If one TTS call fails, we retry just that segment (not the whole script)
4. **Parallelization**: Can call ElevenLabs API for multiple segments in parallel

**Implementation**:
1. After user approves optimized script → create render job
2. Render job processes each segment sequentially (or in batches of 5):
   - Check if TTS already cached by segment text hash
   - If cached: Use cached audio
   - If not: Call ElevenLabs for that segment's `optimized_text`
   - Store mp3 in Supabase + update `segments.tts_audio_url`
   - Move to next segment

**Timing Considerations**:
1. After TTS generation, measure actual audio duration
2. Compare to estimated duration from LLM segmentation
3. If big mismatch (> 20%): Log warning for debugging
4. Use **actual TTS duration** for timeline composition (most accurate)

**Code Pattern**:
```typescript
// For each segment
const ttsHash = hashText(segment.optimized_text);
let audioPath = await cache.get(ttsHash);

if (!audioPath) {
  const mp3Buffer = await elevenlabs.textToSpeech({
    text: segment.optimized_text,
    voiceId: voicePreset.voiceId,
    stability: 0.5
  });

  audioPath = await storage.upload(`tts-audio/${ttsHash}.mp3`, mp3Buffer);
  cache.set(ttsHash, audioPath, 30 * 24 * 60 * 60); // 30-day TTL

  // Store in DB
  await db.segments.update(segment.id, { tts_audio_url: audioPath });
}

actualDuration = await getAudioDuration(audioPath);
```

**Edge Case: Silent Segments**:
- Normally, all segments get TTS
- But if user wants a segment with just visuals (no narration): Mark segment as "silent"
- Don't generate TTS, duration = 0 (or user-specified duration)
- Handle in FFmpeg: Just show visuals without audio track

**Implementation Notes**:
- ElevenLabs has rate limits; parallel TTS calls at ~5 concurrent max
- Cache key should be `hash(text + voicePresetId)` (same text, different voice = different audio)

---

### 8. Caption Styling Options

**Question**: What are the 3 caption style options users can choose from?

**Current Spec Reference**: Mentions "choose from 3 prebuilt caption styles" but doesn't define them.

**Suggested Answer**:

**3 Caption Style Presets**:

**1. Classic Bottom** (Default)
- Position: Bottom center of video
- Font: Open Sans (clear, modern)
- Size: 24pt
- Color: White with black outline (readable on any background)
- Background: Semi-transparent black box (optional, behind text)
- Max width: 90% of video width
- Line height: 1.2 (readable spacing)
- Animation: None (static)
- Best for: Professional, educational content

**2. Modern Full-Width**
- Position: Bottom 1/4 of video (spans full width)
- Font: Montserrat Bold (engaging)
- Size: 28pt
- Color: White with colored outline (matches theme)
- Background: Gradient bar at bottom (optional)
- Max width: 95% of video width (nearly full)
- Line height: 1.4
- Animation: Fade in/out with audio (optional)
- Best for: Energetic, entertainment content

**3. Minimal Floating**
- Position: Flexible (center of video, slightly offset)
- Font: Arial (simple, clean)
- Size: 20pt
- Color: White with subtle shadow
- Background: None (no box)
- Max width: 80% of video width
- Line height: 1.3
- Animation: None
- Best for: Documentary, calm content

**Implementation**:

Store as JSON config:
```json
{
  "caption_styles": {
    "CLASSIC_BOTTOM": {
      "position": "bottom",
      "font": "OpenSans",
      "fontSize": 24,
      "color": "#FFFFFF",
      "outlineColor": "#000000",
      "backgroundColor": "rgba(0,0,0,0.3)",
      "x": "center",
      "y": "bottom-50px"
    },
    "MODERN_FULL_WIDTH": { ... },
    "MINIMAL_FLOATING": { ... }
  }
}
```

FFmpeg Subtitle Filter:
```bash
-vf "subtitles=output.srt:force_style='FontName=OpenSans,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2'"
```

**SRT File Generation**:
- SRT file is always generated (not embedded in video)
- Same captions in all styles (only display format differs)
- Users can download SRT separately and use in other tools

**Handling Long Captions**:
- Auto-wrap text to fit max width
- If wrapped into 3+ lines: Reduce font size slightly (maintain readability)
- Option: User can manually edit caption text during storyboard editing

**Implementation Notes**:
- Store selected style in `projects.settings` JSON
- Store actual caption text in `segments.caption_text` (separate from narration)
- Don't over-engineer - these 3 styles should satisfy 80% of users
- Can add more styles post-MVP based on user feedback

---

### 9. API Response Error Format

**Question**: What does a standardized error response look like?

**Current Spec Reference**: APIs show success responses but no error format.

**Suggested Answer**:

**Standard Error Response Format**:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional: Additional context
      "field": "email",
      "reason": "already_in_use"
    }
  }
}
```

**HTTP Status Codes**:
- `200 OK` - Success
- `400 Bad Request` - Validation error (bad input)
- `401 Unauthorized` - Missing/invalid auth token
- `403 Forbidden` - User doesn't have permission
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - State conflict (e.g., project already processing)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Common Error Codes** (for frontend to handle):

| Code | HTTP | Message | Action |
|------|------|---------|--------|
| INVALID_INPUT | 400 | "Script must be 300-5000 words" | Show warning, user edits |
| CONTENT_BLOCKED | 400 | "Script contains prohibited content" | Show policy link |
| AUTH_REQUIRED | 401 | "Please log in to continue" | Redirect to login |
| RATE_LIMIT_EXCEEDED | 429 | "You've used 5/5 renders this month" | Show upgrade CTA |
| PROJECT_NOT_FOUND | 404 | "Project no longer exists" | Show 404 page |
| PROJECT_PROCESSING | 409 | "Project is already processing. Please wait." | Show loading state |
| STOCK_FETCH_FAILED | 500 | "Couldn't find stock footage. Try regenerating." | Show retry button |
| TTS_FAILED | 500 | "Voice generation failed. Please try again." | Show retry button |
| RENDER_FAILED | 500 | "Video rendering failed. View logs or contact support." | Show error + logs |
| INTERNAL_ERROR | 500 | "Something went wrong. Our team has been notified." | Show support link |

**Example Error Response**:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've used your 5 renders this month. Upgrade to Pro for unlimited renders.",
    "details": {
      "limit": 5,
      "used": 5,
      "resetDate": "2024-12-01T00:00:00Z"
    }
  }
}
```

**Success Response Format**:

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

**Implementation Notes**:
- All error responses include error code (for frontend to handle specifically)
- Messages are user-friendly (not technical)
- Log full error to Sentry with context (user ID, project ID, stack trace)
- Keep response payloads small (no huge error details)

---

## MEDIUM PRIORITY MVP QUESTIONS

### Audio Mixing Ratios

**Question**: What's the exact mix ratio between video audio and TTS voiceover?

**Suggested Answer**:
- Video clip audio: -15dB (15% volume)
- TTS voiceover: 0dB (100% volume, baseline)
- Combined: TTS should be clearly primary but not completely drowning out video

FFmpeg command:
```bash
# Mix two audio sources
ffmpeg -i video_with_audio.mp4 -i tts_voiceover.mp3 \
  -filter_complex "[0:a]volume=0.15[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=first[a]" \
  -map "[a]" output.mp3
```

---

### User Upload File Handling

**Status**: DEFERRED TO BACKLOG (Post-MVP Feature)

**Rationale**: User uploads add complexity to MVP. MVP focuses on stock-only visuals. User uploads can be added as a medium-priority post-MVP feature with full support for custom video/image uploads.

**Details**: See backlog.md → Section 1.6 "User-Uploaded Assets" for full feature specification including:
- Upload flow and UI
- Supported formats (MP4, MOV, WebM, JPG, PNG)
- File size limits and validation
- Async conversion and thumbnail extraction
- Storage and reuse across segments

---

## CRITICAL MVP QUESTIONS (POST-APPROVAL-1)

### 11. Video Duration Mismatch Handling

**Question**: What happens when a stock video's duration doesn't match the segment's TTS voiceover duration? (e.g., segment voiceover is 15 seconds, but stock video is only 12 seconds)

**Current Spec Reference**: Asset ranking formula prefers videos within ±20% of segment duration (technical-spec.md line 545), but render pipeline doesn't specify what happens when there's a mismatch.

**Suggested Answer**:

**Strategy: Speed Adjustment with Human Fallback**

**During Asset Selection (Storyboard Editor)**:
1. Assets within ±5% of segment duration: Accept as-is (imperceptible speed adjustment OK)
   - 12s video for 15s segment = 1.25x speed (5% slower, acceptable)
   - 18s video for 15s segment = 0.83x speed (5% faster, acceptable)

2. Assets within ±20% of segment duration: Show warning badge to user
   - "⚠️ Video duration 12s (need 15s) - will be sped up 1.25x"
   - Allow selection but flag for attention

3. Assets >20% mismatch: Disable selection
   - Cannot select 30s video for 10s segment
   - User must pick different asset or adjust voiceover

**During Render (FFmpeg)**:
- Apply video speed filter if selected asset is within ±20%
- FFmpeg command adds: `-filter:v "setpts=PTS/({speed_factor})"`
  - Example: 12s clip for 15s segment → `setpts=PTS/1.25`
- Log speed adjustments to `renders.logs` (for debugging/analytics)
- If speed adjustment > ±5%: Record as "speed_adjusted: true" in segment metadata

**Static Images**:
- Display for full segment duration (use segment duration)
- No speed adjustment needed

**User Voiceover Adjustments (Future)**:
- Post-MVP: Allow users to trim/extend TTS duration directly in storyboard
- For MVP: Lock voiceover duration to prevent mismatches after asset selection

**Acceptance Criteria**:
- [ ] Assets within ±5%: Select without warning
- [ ] Assets within ±5-20%: Show warning but allow selection
- [ ] Assets >20%: Disable selection
- [ ] Render applies speed filter for selected assets
- [ ] Speed adjustments logged for analytics
- [ ] Speed adjustments <5% (imperceptible to viewers)

---

### 12. Placeholder Asset Handling

**Question**: What happens to segments that have no acceptable stock assets available? (Note: user uploads deferred to backlog, so MVP can't let users provide their own)

**Current Spec Reference**: Functional-spec line 168-169 mentions "needs_manual_selection" but doesn't define behavior. Acceptance criteria requires "≥70% of segments have visuals" implying 30% can be missing.

**Suggested Answer**:

**Strategy: Placeholder + Alert, Block Render if Too Many**

**When Asset Fetch Fails** (Pipeline B - Stock Fetch):
1. Retry with LLM-generated fallback queries (1-2 attempts)
2. If all retries fail:
   - Mark segment status: `asset_status = "needs_selection"`
   - Set placeholder asset: solid color background (user-selected color or theme color)
   - Log to `segments.asset_notes`: "No suitable stock found for [search_query]"

**In Storyboard Editor** (Pipeline C - Human-in-Loop):
1. Display segment with placeholder (colored background)
2. Show visual indicator: "🔴 No stock asset"
3. Show options:
   - "Try different search" → User can edit search queries, regenerate (triggers Pipeline B)
   - "Keep placeholder" → Accept and proceed
   - Future: "Upload custom" → (backlog feature)

**Before Render** (Pipeline D - Validation):
1. Count segments with placeholders
2. If >30% of segments are placeholders:
   - Block render with error: "Too many missing assets (X/Y segments). Please find stock or edit script structure."
   - Display list of problematic segments
   - Allow user to:
     - Regenerate for specific segments
     - Adjust script to reduce segment count
     - Proceed anyway (if <30% threshold reached)
3. If ≤30% placeholders:
   - Allow render (meets acceptance criteria)
   - Show warning: "X segments will use placeholder background"

**Render Behavior**:
- Placeholder segments: Solid color background + TTS audio + captions
- Color: User-configurable in editing UI (default: theme-based color)
- Output still renders successfully (no blank/black frames)

**Acceptance Criteria**:
- [ ] Failed assets create placeholder (no error crash)
- [ ] Storyboard shows visual indicator for missing assets
- [ ] User can regenerate suggestions for missing segments
- [ ] Render blocked if >30% placeholders
- [ ] Render succeeds with ≤30% placeholders
- [ ] Placeholder segments display color background

---

### 13. Static Image Duration Specification

**Question**: When stock fetch returns a JPG/PNG image instead of video, how long should the image display for a segment?

**Current Spec Reference**: Functional-spec line 164 says fetch "clips/images", and technical-spec line 559 prefers videos over images, but doesn't specify image display duration.

**Suggested Answer**:

**Strategy: Match Segment Duration**

**For Static Images**:
- Display duration = segment TTS duration (same as video segments)
- Rationale: Maintain consistent visual pacing with voiceover
- If segment is 15s voiceover → image displays for 15s

**In Asset Ranking** (technical-spec Pipeline B):
- Score static images slightly lower than videos (already done: "Prefer videos over static images")
- But still eligible for selection if video options poor

**During Render** (technical-spec Pipeline D):
- Convert image to video using FFmpeg:
  ```bash
  ffmpeg -loop 1 -i image.jpg -c:v libx264 -t {segment_duration} \
    -pix_fmt yuv420p -r 30 output.mp4
  ```
- Apply Ken Burns effect (if enabled in editing style):
  - Subtle zoom (1.05x) over segment duration
  - Random pan direction
  - Makes static image feel less "frozen"
- Audio: TTS voiceover + video background audio (if any)

**Ken Burns Motion Details**:
- Zoom: 1.05x (5% increase, subtle)
- Duration: Full segment duration
- Pan: Random direction (up, down, left, right)
- Keyframe animation: Linear interpolation
- Result: Professional "living photo" effect

**User Control** (Storyboard Editor):
- Toggle Ken Burns effect per segment or globally
- Future: Customize zoom amount + pan direction

**Acceptance Criteria**:
- [ ] Static images display for full segment duration
- [ ] Ken Burns effect applied (5% zoom + random pan)
- [ ] Images render without visual artifacts
- [ ] No audio is lost on image segments

---

### 14. Timeline Transition & Composition Logic

**Question**: How are individual segment durations composed into a final timeline? How do transitions (0.5s crossfade) interact with segment durations?

**Current Spec Reference**: Technical-spec line 605 mentions "Apply transitions (crossfade 0.5s between clips)" but doesn't specify overlap logic or duration impact.

**Suggested Answer**:

**Strategy: Overlapped Transitions (Standard Video Practice)**

**Segment Duration Math**:
- Each segment video duration = TTS voiceover duration (or adjusted if speed filter applied)
- Crossfade between segments: 0.5s overlapped (not added)
- Total video duration = SUM(all segment durations) - (number_of_transitions × 0.5s)

**Example Timeline**:
```
Segment 1: 15s voiceover + video
├─ 0.5s crossfade (overlapped)
Segment 2: 18s voiceover + video
├─ 0.5s crossfade (overlapped)
Segment 3: 12s voiceover + video

Total video = 15 + 18 + 12 - (2 × 0.5s) = 44s
(Not 45s, because transitions overlap)
```

**FFmpeg Implementation**:
- Use concat demuxer for video clips (maintains timing)
- Apply crossfade filter with `-loglevel info` for transition timing
- Build timeline file (concat_videos.txt):
  ```
  file segment1_video.mp4
  duration 0.5
  file segment2_video.mp4
  duration 0.5
  file segment3_video.mp4
  ```
- FFmpeg filter: `-filter_complex "concat=n=3:v=1:a=1" `
- Crossfade applied per clip transition

**Audio Composition**:
- TTS audio (voiceover): Primary timeline
- Video background audio: Mixed at 15% volume
- Audio duration: Matches video duration (determined by TTS)
- No audio gaps/overlaps (audio follows video timeline)

**Caption Sync**:
- SRT timestamps: Based on video timeline (including transitions)
- Captions offset by segment start time (cumulative with transitions)
- Example:
  ```
  Segment 1 captions: 00:00:00 → 00:00:15
  Transition: 00:00:14.5 → 00:00:15.0 (0.5s overlap)
  Segment 2 captions: 00:00:15 → 00:00:33
  ```

**Implementation Notes**:
- Build concat_videos.txt dynamically with segment durations + transition times
- Store timeline metadata in `renders.timeline_json` for debugging
- Log total video duration before render
- Verify sum of audio tracks matches final video duration

**Acceptance Criteria**:
- [ ] Transitions are overlapped (not added to duration)
- [ ] Total duration = SUM(segments) - (N_transitions × 0.5s)
- [ ] Audio and video timelines match exactly
- [ ] SRT captions sync to video timeline (within ±0.5s)
- [ ] No audio gaps or artifacts at transitions

---

### 15. Unresolved Duration Mismatch Behavior at Render

**Question**: What is the exact render behavior if, after all user edits and selections, there's still a duration mismatch that couldn't be resolved?

**Current Spec Reference**: Specs assume all assets are valid, but edge cases aren't defined.

**Suggested Answer**:

**Strategy: Validate Before Render, Fail Safe**

**Pre-Render Validation** (Pipeline D - Start):
1. Load all segment assets + TTS audio
2. For each segment, check:
   - Does selected asset exist?
   - Is asset duration within acceptable range (±20%)?
   - Has speed adjustment been calculated?
   - Is TTS audio available?

3. Validation failures:
   - Missing asset → Error: "Asset not found. Re-select from storyboard"
   - Duration mismatch >±20% → Error: "Asset duration mismatch. Select different asset or adjust voiceover"
   - Missing TTS → Error: "Voiceover failed. Regenerate TTS"
   - Return 500 RENDER_FAILED error to user

**If All Validations Pass**:
- Proceed with render
- Apply speed adjustments as needed
- Use FFmpeg filters for any last-minute adjustments

**Post-Render Verification**:
- After FFmpeg completes: Verify output duration matches expected
- If output duration differs by >1s from expected:
  - Log warning: "Duration mismatch detected (expected: 44s, actual: 45s)"
  - Still deliver video (most edge cases acceptable)
  - Alert team via Sentry for investigation

**User-Facing Error Messages**:
- "⚠️ Video render failed. One or more assets could not be processed. Please check your selections and try again."
- Show specific segment(s) that caused error
- Provide actionable next steps: "Try regenerating assets for segments X, Y, Z"

**Acceptance Criteria**:
- [ ] Render validates all segments before starting
- [ ] Mismatches >±20% cause clear error (before wasting compute)
- [ ] Validation errors are specific and actionable
- [ ] Post-render verification catches unexpected duration drift

---

## OPTIONAL CLARIFICATIONS (CAN DECIDE DURING IMPLEMENTATION)

These are refinement questions that don't block MVP but are good to decide now:

### 16. Voice Presets vs Editing Style Presets Interaction

**Question**: Can users mix any voice preset with any editing style preset? (e.g., "Professional Narrator" voice with "Energetic Listicle" editing style)

**Context**: Specs define 3 voice presets and 3 editing style presets separately, but their relationship is unclear.

**Suggested Answer**:

**Allow Full Mix (Recommended)**:
- User can independently choose:
  - Voice preset: Professional Narrator, Energetic Host, or Calm Educator
  - Editing style preset: Clean Explainer, Energetic Listicle, or Calm Documentary
- Any combination is valid (3 × 3 = 9 possible combinations)
- Rationale: Users know their content best. "Professional Narrator" + "Energetic Listicle" might be exactly right for some use cases.

**Implementation Impact**:
- No special coupling in code (select independently)
- LLM prompts use voice preset for TTS character, editing style preset for visual pacing
- FFmpeg config same regardless of preset mix

**Acceptance**: ✅ Allow full mix without restriction

---

### 17. TTS Duration Mismatch in Storyboard

**Question**: If actual TTS duration differs >20% from LLM estimate, how does the storyboard handle this?

**Context**: Technical spec logs the mismatch but doesn't specify UI behavior.

**Suggested Answer**:

**Auto-Update Strategy**:
1. When TTS is generated during render prep (Pipeline D start), measure actual duration
2. If actual differs >20% from segment's estimated duration:
   - Update segment's `duration` field to actual TTS duration
   - Update segment in database
   - Recalculate total video duration (may change by up to ±20%)
3. Show user a notification: "Timing adjusted for segment X: was Xs, now Xs (based on actual voiceover)"
4. Allow user to:
   - Accept new timing (render with adjusted duration)
   - Regenerate TTS (try again)
   - Manually override duration (advanced option)

**Storyboard Display**:
- If user hasn't clicked "Render" yet: Storyboard shows **estimated** duration (from LLM)
- During render: Duration updates to **actual** (measured from TTS audio)
- Visual indicator on affected segments: "⚠️ Duration auto-adjusted"

**Acceptance**: ✅ Auto-update to actual TTS duration with user notification

---

### 18. Silent Segments Specification

**Question**: How long should a "silent segment" (visuals-only, no narration) be?

**Context**: Technical spec mentions silent segments but doesn't specify duration.

**Suggested Answer**:

**User-Specified Duration**:
1. Silent segment is created when user marks "No narration" for a segment
2. System skips TTS generation for that segment
3. UI prompts user: "Enter duration for this segment (no voiceover)" with input field
4. User specifies duration in seconds (e.g., 5s, 10s, 15s)
5. No TTS audio is generated or mixed for that segment

**During Render**:
- Segment duration = user-specified value (not tied to TTS)
- Stock video/image still fills the segment (speed-adjusted if needed)
- No audio track for that segment (silent video)
- Transitions work normally (crossfade to next segment with audio)

**Storyboard Display**:
- Silent segments marked with 🔇 icon
- Display user-specified duration clearly
- Option to change duration at any time before render

**Acceptance**: ✅ Silent segments = user-specified duration, no TTS generated

---

### 19. Asset Caching Strategy - Cache Key Definition

**Question**: What exactly is hashed for the cache key? Global cache or per-user?

**Context**: Technical spec mentions caching by "content hash" but not specifics.

**Suggested Answer**:

**Global Cache Strategy** (more efficient):

**For Stock Assets**:
- Cache key: `hash(provider + asset_id + resolution)`
  - Example: `hash("pexels_12345_1080p")`
- Rationale: Same stock asset used across all projects should be cached once
- Storage path: `assets/{hash}/video.mp4` (shared across all users)
- Metadata: Track which users used it for analytics

**For TTS Audio**:
- Cache key: `hash(text + voice_preset_id)`
  - Example: `hash("Hello world" + "PROFESSIONAL_NARRATOR")`
- Same TTS text with same voice = reuse audio
- Stored per project: `tts-audio/{projectId}/{hash}.mp3` (project isolation for security)

**Cache Expiration**:
- Assets: 90 days (stock videos rarely change)
- TTS: 30 days (LLM-optimized text may evolve)

**Implementation**:
- Use SHA-256 hash for deterministic, collision-resistant keys
- Redis cache layer + Supabase storage fallback
- Log cache hits for analytics (track reuse efficiency)

**Acceptance**: ✅ Global cache for assets, project-isolated for TTS, 90/30 day expiration

---

### 20. Background Music Loop Source & Duration

**Question**: Where does background music come from? How long does it loop?

**Context**: Technical spec mentions "optional: Add background music loop (OFF by default, -12dB)" but no source or behavior.

**Suggested Answer**:

**For MVP: Disable This Feature** (Recommended):
- Remove "Optional: Add background music loop" from MVP
- Setting is OFF and unavailable for users
- Rationale:
  - Adds complexity (music licensing, source management)
  - Not core to MVP value prop (voiceover + visuals is primary)
  - Can be added post-MVP with proper licensing

**Post-MVP (Backlog) Implementation** would be:
- Source: User uploads OR stock library (like Epidemic Sound API)
- Behavior: Loop infinitely to match video duration
- Volume: -12dB (background, under voiceover)
- Implementation: Simple FFmpeg filter `-filter_complex "loop=..."`

**For MVP**: Just remove this feature entirely from code. Not worth the complexity.

**Acceptance**: ✅ Remove background music loop from MVP. Defer to post-MVP backlog.

---

### 21. Editing Plan Regeneration Behavior

**Question**: When user changes editing style preset, what happens to:
1. User's asset selections?
2. Edited segment text?

**Suggested Answer**:

**Keep User's Choices (Recommended)**:

**When user clicks "Change global preset"** (switch style from "Clean Explainer" to "Energetic Listicle"):
1. **Asset selections**: KEEP user's selected assets
   - User chose stock clip A for segment 1 → remains selected
   - Rationale: User made deliberate choice; respect it
2. **Edited segment text**: KEEP all edits
   - User edited segment text → remains as edited
   - Rationale: Text edits are content decisions, not style-dependent
3. **What DOES change**:
   - Transition style (different crossfade animation per preset)
   - Caption style (different font/position per preset)
   - Motion templates (Ken Burns settings per preset)
   - Segment durations: STAY THE SAME (no re-optimization)

**UI Flow**:
- Show confirmation: "Switch to 'Energetic Listicle' style? Your selections and text edits will be preserved."
- Update visual layout immediately (transitions, captions, motion)
- No re-fetch of assets or re-TTS

**Acceptance**: ✅ Keep assets + edited text, only update visual style parameters

---

### 22. Quality Score Auto-Optimize Mechanism

**Question**: What exactly changes in the second optimization pass for low-quality scripts?

**Suggested Answer**:

**Targeted Re-Optimization**:

**When user clicks "Auto-Optimize"** on low-quality script (<60 score):
1. **Analyze the problem**: Get specific feedback from quality scoring
   - If Clarity < 60: "Rewrite for clarity - use simpler sentences"
   - If Pacing < 60: "Add more variation in sentence length"
   - If Hook < 60: "Improve opening - make it more attention-grabbing"

2. **Run LLM optimization again** with targeted instructions:
   ```
   Original script had low quality:
   - Clarity issues: [specific feedback]
   - Pacing issues: [specific feedback]
   - Hook issues: [specific feedback]

   Please rewrite the script focusing on these improvements:
   [Targeted prompts for each problem area]
   ```

3. **Result**: New optimized script with specific focus areas addressed

**Retry Limit**: Allow user to retry Auto-Optimize up to 3 times
- If still <60 after 3 attempts: Show message "Consider manual editing - AI optimization has limits"

**Re-Scoring**: After auto-optimization, show new quality score
- If improved to ≥60: Proceed automatically
- If still <60: Show new feedback, offer another retry or manual editing

**Acceptance**: ✅ Targeted re-optimization with 3 retry limit based on specific problem areas

---

## QUESTIONS TO DEFER (POST-MVP)

These questions don't block MVP but should be decided before those features ship:

1. **Voice Cloning** - How to integrate ElevenLabs Voice Lab API
2. **Multi-Voice Support** - How to assign different voices per segment
3. **YouTube Publishing** - OAuth flow, metadata mapping
4. **Collaborative Editing** - WebSocket/real-time sync strategy
5. **Analytics Integration** - Which data to track, dashboard design
6. **Advanced Rendering** - Color grading LUTs, motion graphics

---

## DECISION LOG

Track decisions as they're made:

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| TBD | Voice Presets | 3 options (Professional, Energetic, Calm) | Matches editing styles |
| TBD | FFmpeg Preset | `fast` | Speed priority for MVP |
| TBD | TTS Approach | Per-segment | Better caching & flexibility |
| TBD | Error Format | Standardized JSON with codes | Easier frontend handling |

---

## Decision Tracking

Track which questions have been resolved and approved:

| # | Question | Status | Decision |
|---|----------|--------|----------|
| 1 | Voice Preset Definitions | ✅ APPROVED | 3 presets: Professional Narrator, Energetic Host, Calm Educator |
| 2 | FFmpeg Configuration | ✅ APPROVED | preset fast, crf 23, 30fps, audio 15%/85% mix |
| 3 | Asset Ranking Algorithm | ✅ APPROVED | Formula with orientation hard threshold (±20% of 16:9) |
| 4 | API Authentication Strategy | ✅ APPROVED | JWT + refresh tokens, Supabase Auth |
| 5 | Rate Limiting Enforcement | ✅ APPROVED | Free: 2 renders/10min, Pro: 30 renders/30min, Ent: Unlimited |
| 6 | LLM Quality Score Threshold | ✅ APPROVED | ≥75: proceed, 60-74: warn, <60: require confirmation |
| 7 | TTS Approach (Per-Segment vs Full-Script) | ✅ APPROVED | Per-segment with caching by text hash, ~5 concurrent max |
| 8 | Caption Styling Options | ✅ APPROVED | 3 presets (Classic Bottom, Modern Full-Width, Minimal Floating), extensible design |
| 9 | API Response Error Format | ✅ APPROVED | Standardized JSON format with success flag, error codes, and details object |
| 10 | Audio Mixing Ratios | ✅ APPROVED | Video at 15%, TTS at 85% mix |
| 11 | Video Duration Mismatch Handling | ✅ APPROVED | Speed adjust ±5% silent, warn ±5-20%, block >20%. Apply FFmpeg setpts filter. Log adjustments. |
| 12 | Placeholder Asset Handling | ✅ APPROVED | Colored background placeholder when fetch fails. Block render if >30% placeholders, allow ≤30%. |
| 13 | Static Image Duration Specification | ✅ APPROVED | Display = TTS duration. Convert to video with FFmpeg -loop 1. Apply Ken Burns 1.05x zoom. |
| 14 | Timeline Transition & Composition Logic | ✅ APPROVED | Overlapped 0.5s crossfades. Total = SUM(segments) - (N_transitions × 0.5s). Caption sync accounts for transitions. |
| 15 | Unresolved Duration Mismatch at Render | ✅ APPROVED | Pre-render validation of all segments. Fail-safe with specific error messages. Post-render verification. |
| 16 | Voice Presets vs Editing Style Presets | ✅ APPROVED | Allow full mix (3 × 3 = 9 combinations). Select independently. No coupling in code. |
| 17 | TTS Duration Mismatch in Storyboard | ✅ APPROVED | Auto-update segment duration to actual TTS duration if >20% difference. Notify user. Allow accept/regenerate/override. |
| 18 | Silent Segments Specification | ✅ APPROVED | User-specified duration, no TTS generated. Skip TTS, use user's manual duration value. Mark with 🔇 icon. |
| 19 | Asset Caching Strategy | ✅ APPROVED | Global cache for assets (90d), project-isolated for TTS (30d). Use SHA-256 hash keys. |
| 20 | Background Music Loop Source | ✅ APPROVED | Remove from MVP entirely. Defer to post-MVP backlog with proper licensing. |
| 21 | Editing Plan Regeneration Behavior | ✅ APPROVED | Keep user's assets + text edits. Only update visual style (transitions, captions, motion). No re-optimization. |
| 22 | Quality Score Auto-Optimize Mechanism | ✅ APPROVED | Targeted re-optimization based on problem areas. 3 retry limit. Message if still <60 after retries. |
| B1 | Complete API Downtime Handling | ✅ APPROVED | Max 5 min retry window. Auto-fallback to placeholders. Notify user + offer choice to wait/render. |
| B2 | TTS Complete Failure Path | ✅ APPROVED | Max 30s wait (3×10s). If both fail: Block render with "TTS unavailable" error. |
| B3 | Segment Text Editing TTS Invalidation | ✅ APPROVED | TTS only at render time (Pipeline D). Show estimated duration in storyboard, actual at render. |
| B4 | Project Status State Machine | ✅ APPROVED | Draft→Processing→Ready→Rendering→Completed. Can edit/render in Ready. No edit during Rendering. |
| B5 | Asset Selection Validation Before Render | ✅ APPROVED | Pre-render validates all assets exist + downloadable. Retry from source if missing. Error if fails. |
| B6 | Rate Limit Reset Timing for Free Users | ✅ APPROVED | Free: Calendar month (1st UTC). Pro/Ent: Subscription anniversary. Include resetDate in error response. |
| B7 | Content Moderation Scope | ✅ APPROVED | Moderation once at optimization (Pipeline A). Storyboard edits not re-moderated (MVP simplification). |
| B8 | Concurrent Render Limit Enforcement | ✅ APPROVED | Per-user limit. Free:1, Pro:2, Ent:5. Enforce at API level. Check active_renders_count. |
| B9 | SRT Caption Text Source | ✅ APPROVED | Captions = segment text. No transcription. Acceptable MVP. Whisper transcription post-MVP. |
| B10 | Data Retention & Cleanup Policy | ✅ APPROVED | Projects: indefinite. Videos/TTS/Assets: 90/30/90 days. Logs: 7 days. Daily cron cleanup. |
| B11 | User Data Isolation Authorization | ✅ APPROVED | All endpoints validate project.user_id == currentUser.id. Create authorizationMiddleware reused across all. |
| A1 | Rate Limit Error Message Accuracy | ✅ APPROVED | Dynamic error message using db values. Template: "You've used {used}/{limit} renders..." |
| A2 | Placeholder Color Selection UI | ✅ APPROVED | Color picker per segment in storyboard. Preset auto-selects default from theme. Hex input post-MVP. |
| A3 | Ken Burns Effect MVP Decision | ✅ APPROVED | Ken Burns required for MVP (in acceptance criteria). Required: zoom 1.05x + random pan. |
| A4 | Worker Deployment & Failure Recovery | ✅ APPROVED | Systemd: Restart=always, RestartSec=10. BullMQ: 3 retries + exponential backoff. Heartbeat every 30s. |
| A5 | Database Query Optimization | ✅ APPROVED | Create indexes: projects(user_id,created_at), segments(project_id), renders(project_id,created_at), assets(project_id). |
| D1 | Storage Quota Management | ✅ APPROVED | Free:1GB, Pro:100GB, Ent:Unlimited. Enforce at upload. Alert at 80/90/100%. |
| D2 | Cache Invalidation Strategy | ✅ APPROVED | On re-optimization: Mark segments TTS as stale. Cleanup job deletes stale + expired files. |
| D3 | Request-Level Rate Limiting | ✅ APPROVED | Unauthenticated:10/min. Free:100/min. Pro:1000/min. Redis middleware. Return 429 + Retry-After. |
| D4 | CORS & Domain Whitelist | ✅ APPROVED | Use env var ALLOWED_ORIGINS. Domains TBD (app name not finalized). Dev:localhost:3000. Reject 403 other origins. |
| D5 | Monitoring & Alerting Thresholds | ✅ APPROVED | Queue>50:HIGH. RenderSuccessRate<95%:MED. APIErrors>5%:MED. Costs>$100/$200:LOW. |
| D6 | Backup & Restore Procedure | ✅ APPROVED | RTO<1h, RPO<1day. Supabase daily backups (30d retain). Test monthly. Document restore procedure. |
| D7 | Support Channel Definition | ✅ APPROVED | Use env vars for domains (TBD). Email/help/status URLs flexible. Include in error responses + UI. |

## ✅ APPROVAL SUMMARY

**All 23 gaps reviewed and approved**:
- Blocking Issues (B1-B11): 11 approved
- Ambiguities (A1-A5): 5 approved
- Missing Specs (D1-D7): 7 approved

**Total Questions Approved**: 22 (original) + 23 (gaps) = **45 total clarifications approved**

**Status**: ✅ READY FOR IMPLEMENTATION

All specification gaps resolved. Proceed with coding with complete clarity on all decisions.

## Next Steps

1. ✅ All clarifications approved
2. → Update functional-spec.md and technical-spec.md with gap details
3. → Generate final "Implementation Ready" checklist
4. → Begin implementation with full specification clarity
