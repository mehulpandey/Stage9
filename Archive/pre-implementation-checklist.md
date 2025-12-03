# Pre-Implementation Checklist: Final Specification Gaps

**Purpose**: Address 23 remaining specification gaps before implementation begins.
**Status**: READY FOR BULK APPROVAL
**Date**: 2025-11-23

---

## SECTION 1: BLOCKING ISSUES (Must Resolve Before Any Coding)

These 11 issues will cause implementation friction or user-facing bugs if left unresolved.

### B1. Complete API Downtime Handling

**Issue**: No specification for behavior when Pexels/Pixabay APIs are completely down (not just returning no results).

**Impact**: If both stock sources unavailable, Pipeline B fails repeatedly. Acceptance criteria requires "≥70% visuals" but has no fallback.

**Proposed Answer**:
- Define maximum retry window: **5 minutes total** (retry every 10s, then give up)
- When all retries exhausted: **Auto-fallback to colored placeholders for ALL failed segments**
- **Notify user immediately**: "Stock sources temporarily unavailable. Using placeholder backgrounds. Render will proceed."
- **Offer choice**: "Render now with placeholders OR wait and retry in 5 minutes"
- **Implementation**: Add `max_retry_time: 300s` to stock fetch config

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B2. TTS Complete Failure Path

**Issue**: Both ElevenLabs AND OpenAI TTS fail. No maximum wait time or fallback defined.

**Impact**: Render pipeline blocks indefinitely waiting for TTS. Users have no resolution path.

**Proposed Answer**:
- Define maximum retry: **3 attempts, 10 seconds each = 30 seconds max wait**
- **If both fail**:
  - **Approach**: Block render with error "TTS services unavailable. Please try again in 5 minutes."
  - **Alternative**: Render with silent segments (visuals only, no audio) - notify user of limitation
- **Recommendation**: Use first approach (block) to avoid low-quality audio experience
- **Implementation**: Add `tts_max_wait_seconds: 30` + `tts_retry_count: 3` to config

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B3. Segment Text Editing - TTS Invalidation Trigger

**Issue**: When user edits segment text in storyboard, unclear if this invalidates cached TTS or requires re-generation.

**Impact**: Affects when TTS is generated (during edit vs during render) and user experience (duration updates).

**Proposed Answer**:
- **MVP approach**: TTS generation happens **ONLY at render time** (Pipeline D), NOT during storyboard editing
- **In storyboard**: Show **estimated duration** (from original LLM estimate), actual duration calculated at render
- **Add disclaimer**: "Duration is estimated. Actual timing calculated when rendering."
- **Rationale**: Keeps MVP simple, avoids re-TTS during editing, saves API calls
- **Post-MVP**: Allow editing TTS duration directly in storyboard

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B4. Project Status State Machine

**Issue**: Project states defined (draft|processing|ready|rendering|completed) but state transitions unclear.

**Impact**: Can user edit storyboard while rendering? Can they start second render? State is ambiguous.

**Proposed Answer**:
```
State Transitions:
Draft → Processing (during optimization) → Ready (awaiting render)
Ready → Rendering (during FFmpeg) → Completed

State Rules:
- Can edit storyboard in "Ready"? YES
- Can start render in "Ready"? YES
- Can render again after "Completed"? YES (restart render)
- Can edit settings while "Rendering"? NO (409 PROJECT_PROCESSING error)
- Can start second render while "Rendering"? NO (409 PROJECT_PROCESSING error)
```

**Implementation**: Add state machine validation to API + database constraints

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B5. Asset Selection Validation Before Render

**Issue**: If user selects asset, then asset disappears from Supabase before render, no specification for handling.

**Impact**: Asset download in Pipeline D fails silently or crashes render job.

**Proposed Answer**:
- **Pre-render validation (Pipeline D)** must check:
  - All selected assets still exist in Supabase storage
  - All assets are still downloadable (not corrupted)
  - Asset file size > 0 bytes
- **If missing**: Fail with error "Asset no longer available. Please regenerate from storyboard."
- **Implement retry**: Attempt to re-download from original source (Pexels/Pixabay API)
- **If retry fails**: Treat as missing asset (show error, block render)

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B6. Rate Limit Reset Timing for Free Users

**Issue**: Spec says "reset monthly on subscription date" but free users have no subscription. When do they reset?

**Impact**: Unclear when free users can render again; affects user experience and support questions.

**Proposed Answer**:
- **Free tier**: Reset on **calendar month (1st of each month UTC)**
- **Pro/Enterprise**: Reset on **subscription anniversary date**
- **Implementation**: Store `renders_reset_date` in users table
- **API response**: Include reset date in rate limit error: `"resetDate": "2024-12-01T00:00:00Z"`
- **Example**: Free user reaches 2/2 renders on Nov 15 → can render again Dec 1

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B7. Content Moderation Scope

**Issue**: OpenAI Moderation API runs on full script, but users can edit segment text in storyboard without re-moderation.

**Impact**: Users could optimize script (passes moderation), then edit segments to add prohibited content.

**Proposed Answer**:
- **MVP approach**: Moderation happens **ONCE at script optimization** (Pipeline A only)
- **Storyboard edits**: Do NOT re-run moderation (MVP simplification)
- **Add disclaimer**: "Edited content is not re-moderated. User responsible for compliance."
- **Post-MVP**: Add moderation check on final render (check all final segment text before video generation)
- **Rationale**: Simpler MVP, moderation still covers primary input, users accept responsibility

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B8. Concurrent Render Limit Enforcement

**Issue**: Rate limits mention "Max concurrent renders: 1/2/5" but enforcement mechanism not defined.

**Impact**: If user starts multiple renders, unclear if they run in parallel or queue. Business model impact.

**Proposed Answer**:
- **Concurrent render limit is per-user**, not global
- **Free users**: Max 1 concurrent render (others reject with 409)
- **Pro users**: Max 2 concurrent renders (3rd queues)
- **Enterprise**: Max 5 concurrent renders (others queue)
- **Enforcement**: Check active renders for user at API level (line 249 endpoint check)
- **Queue behavior**: Don't queue if limit reached, return error: "You have X renders in progress. Max concurrent: Y. Wait for one to complete."
- **Implementation**: Add `active_renders_count` check in `/api/projects/{id}/render` endpoint

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B9. SRT Caption Text Source

**Issue**: Unclear if captions are auto-transcribed from TTS audio or if they equal segment text.

**Impact**: If auto-transcribed, that's additional cost/complexity. If equals text, captions might not match spoken words.

**Proposed Answer**:
- **MVP approach**: Captions = segment text (the `optimized_text` field)
- **No transcription** from audio (saves cost, complexity, latency)
- **Limitation**: Captions might not match exact spoken words (ElevenLabs may add pauses, change emphasis)
- **Note this in docs**: "Captions are generated from your script text. Minor differences from voiceover are normal."
- **Post-MVP**: Add accurate transcription using Whisper API for higher accuracy
- **Rationale**: Simple, fast, acceptable quality for MVP

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B10. Data Retention & Cleanup Policy

**Issue**: No specification for how long rendered videos, TTS audio, project data stored. Storage costs could accumulate.

**Impact**: Supabase storage charges grow unbounded; need cleanup strategy.

**Proposed Answer**:
```
Retention Policy:
- Projects: Keep indefinitely (core user data)
- Rendered videos: Keep 90 days after creation, then delete
- TTS audio: Keep 30 days (cache expiration), then delete
- Stock assets: Keep 90 days (cache expiration), then delete
- Render logs: Archive after 7 days (Sentry retains separately)
- SRT files: Keep same duration as rendered video (90 days)
```

- **Implementation**: Cron job runs daily, deletes expired files from Supabase
- **User notification**: "Your video will be available for download for 90 days. Download now to keep indefinitely."
- **Post-MVP**: Allow users to extend retention (premium feature)

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### B11. User Data Isolation Authorization

**Issue**: API endpoints like `GET /api/projects/:id` don't explicitly validate user owns project.

**Impact**: User A could access User B's project by guessing project ID (critical security issue).

**Proposed Answer**:
- **All project endpoints** must include ownership check:
  ```typescript
  const project = await db.projects.findById(projectId);
  if (!project || project.user_id !== currentUser.id) {
    return 403 PERMISSION_DENIED;
  }
  ```
- **All segment endpoints**: Validate via project (fetch project → check user)
- **All asset endpoints**: Validate via project
- **All render endpoints**: Validate via project
- **Implementation**: Create `authorizationMiddleware` function reused across all endpoints
- **Testing**: Add security tests verifying User B cannot access User A's data

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

## SECTION 2: SIGNIFICANT AMBIGUITIES (Implementation Risk)

These 5 issues don't block MVP but create implementation friction if unresolved.

### A1. Rate Limit Error Message Accuracy

**Issue**: Free tier is 2 renders/month but error message says "5 renders" (copy-paste from old spec).

**Impact**: Confuses users about their actual limit; damages credibility.

**Proposed Answer**:
- **Dynamic error message**:
  ```json
  "message": "You've used 2/2 renders this month. Upgrade to Pro for 30 renders/month.",
  "details": {
    "used": 2,
    "limit": 2,
    "planType": "free",
    "resetDate": "2024-12-01T00:00:00Z"
  }
  ```
- **Template**: `"You've used {used}/{limit} renders this month. Upgrade to {upgrade_plan} for {upgrade_limit} renders/month."`
- **Implementation**: Use database values, not hardcoded strings

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### A2. Placeholder Color Selection UI

**Issue**: Spec says user can customize placeholder colors "per-segment or globally" but no UI/API defined.

**Impact**: Vague implementation; unclear user control surface.

**Proposed Answer**:
- **In storyboard UI**: Add color picker for each placeholder segment
- **UI placement**: Next to segment thumbnail, "Color" label + color box (click to open picker)
- **Global setting**: Style preset auto-selects default color from theme
- **User flow**:
  1. Segment with placeholder shows colored square
  2. User clicks color square → color picker opens
  3. User chooses from palette (5-10 colors) OR enters hex code
  4. Color applies to that segment only
- **Post-MVP**: Custom hex color input, save custom palette
- **Implementation**: Add `placeholder_color` field to segments table (nullable, defaults to preset color)

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### A3. Ken Burns Effect MVP Decision

**Issue**: Acceptance criteria lists Ken Burns effect but no clarity on whether it's required for MVP or can be deferred.

**Impact**: Affects implementation scope and timeline.

**Proposed Answer**:
- **Ken Burns effect is REQUIRED for MVP** (it's in acceptance criteria)
- **Implementation approach**: Start with simple version (1.05x zoom, random pan direction)
- **If time-constrained**: Can simplify to zoom-only (no pan) - still acceptable
- **Quality bar**: Effect should be visible in test renders (1.05x zoom over 15s is noticeable)
- **Post-MVP**: Add user control (zoom amount slider, pan direction picker)

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### A4. Worker Deployment & Failure Recovery

**Issue**: Spec mentions systemd + auto-restart but no procedure for mid-render worker crashes.

**Impact**: If worker crashes during FFmpeg render, job is lost. No recovery path.

**Proposed Answer**:
- **Systemd config**: `Restart=always, RestartSec=10` (restart after 10s if it crashes)
- **BullMQ job retry**: Failed render jobs auto-retry 3 times with exponential backoff (30s, 60s, 120s)
- **Worker heartbeat**: Every 30 seconds, worker checks in. Alert if missed for 5 min
- **Mid-render crash**: Job marked as failed, queued for retry automatically
- **User experience**: User sees "Rendering (attempt 1/3)" → if fails → retries automatically
- **Implementation**: Configure BullMQ retry strategy + worker heartbeat pings

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### A5. Database Query Optimization

**Issue**: Data model defined but no indexing strategy or query optimization guidance.

**Impact**: N+1 queries or missing indexes could cause performance issues.

**Proposed Answer**:
```
Critical Indexes:
- projects (user_id, created_at) - list user's projects
- segments (project_id) - fetch segments for project
- renders (project_id, created_at) - list renders for project
- assets (project_id) - fetch assets for project
- segments (project_id, asset_status) - find placeholder segments

Query Patterns to Optimize:
- Load full project with all segments + assets (use single JOIN, not N+1)
- Fetch render status + progress (use indexed columns only)
- List user's recent projects (use index on user_id + created_at)
```

- **Implementation**: Create indexes in Supabase migrations before MVP launch
- **Testing**: Use EXPLAIN ANALYZE to verify query plans

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

## SECTION 3: MISSING SPECIFICATIONS (Implementation Details)

These 7 items are implementation details that should be defined now.

### D1. Storage Quota Management

**Issue**: No per-user or per-project storage limits defined.

**Impact**: Users could accumulate unlimited storage (asset downloads, TTS audio, renders).

**Proposed Answer**:
```
Storage Limits:
- Free tier: 1 GB total storage (projects + assets + renders combined)
- Pro tier: 100 GB total storage
- Enterprise: Unlimited

Enforcement:
- Check quota at upload time
- Return 413 if quota exceeded: "You've used 950 MB / 1 GB. Delete old renders to continue."
- Alert user at 80%, 90%, 100%

Cleanup Guidance:
- Tell users to delete old renders (helps free up space)
- Show storage usage dashboard
```

- **Implementation**: Add `storage_used_bytes` to users table, update on every upload

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### D2. Cache Invalidation Strategy

**Issue**: When project's optimized_script changes, old segment TTS entries become orphaned.

**Impact**: Cache accumulation could become storage issue over time.

**Proposed Answer**:
- **When project re-optimized**: Mark all segment TTS as stale
- **Cleanup job**: Delete TTS audio for orphaned segments
- **Retention**: Keep TTS for 30 days even if segment deleted, then cleanup job removes it
- **Implementation**: Add `is_stale: boolean` flag to TTS files, cleanup job deletes stale + expired files

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### D3. Request-Level Rate Limiting (DDoS Protection)

**Issue**: Render rate limits defined but no HTTP request rate limiting (DDoS protection).

**Impact**: Endpoint could be hammered by bots without limit.

**Proposed Answer**:
```
Request Rate Limits (per IP or per user):
- Unauthenticated: 10 requests/minute
- Authenticated free: 100 requests/minute
- Authenticated Pro: 1000 requests/minute

Implementation:
- Use Redis-based rate limiter (express-rate-limit middleware)
- Return 429 Too Many Requests if exceeded
- Include Retry-After header: "Retry-After: 60"
```

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### D4. CORS & Domain Whitelist

**Issue**: CORS config mentioned but actual allowed domains not specified.

**Impact**: If CORS too permissive, API abused from unauthorized origins.

**Proposed Answer**:
```
Allowed CORS Origins (during implementation):
- Production: https://www.stage9.ai (TBD - app name not finalized)
- Staging: https://staging.stage9.ai (TBD - app name not finalized)
- Development: http://localhost:3000 (dev only)

Implementation:
- Store as environment variable:
  ALLOWED_ORIGINS=https://www.stage9.ai,https://staging.stage9.ai
- Parse and set CORS header in API middleware
- Reject requests from other origins with 403

Note: Domain will be finalized before MVP launch. Use environment variables to keep flexible.
```

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### D5. Monitoring & Alerting Thresholds

**Issue**: Metrics to track defined but alert thresholds not specified.

**Impact**: Don't know when to escalate issues; reactive rather than proactive.

**Proposed Answer**:
```
Alert Thresholds (sent to Slack/Sentry):
- Queue depth > 50 jobs: Alert severity HIGH
- Render success rate < 95%: Alert severity MEDIUM
- API error rate > 5%: Alert severity MEDIUM
- TTS API cost > $100/day: Alert severity LOW (cost control)
- LLM API cost > $200/day: Alert severity LOW (cost control)
- Sentry error count > 100/hour: Alert severity HIGH
- Stock API failures > 20%: Alert severity MEDIUM
```

**Implementation**: Add alerting rules to Sentry/monitoring platform

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### D6. Backup & Restore Procedure

**Issue**: Backup strategy mentioned but no restore procedure or RTO/RPO targets.

**Impact**: If database corrupted, don't know how to recover or what data lost.

**Proposed Answer**:
```
Recovery Targets:
- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 1 day (acceptable data loss)

Backup Procedure:
- Supabase auto-backups daily (retain 30 days)
- Test restore monthly to verify backups work

Restore Procedure (if needed):
1. Stop all API servers
2. Restore database from backup (via Supabase console)
3. Verify database integrity
4. Restart API servers
5. Notify users of downtime
```

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

### D7. Support Channel Definition

**Issue**: Errors mention "contact support" but no support URL or channel defined.

**Impact**: Users see error but don't know how to get help.

**Proposed Answer**:
```
Support Channels:
- Email: support@stage9.ai (TBD - app name not finalized)
- Help page: https://stage9.ai/support (TBD - app name not finalized)
- Status page: https://status.stage9.ai (monitor uptime, TBD)

Implementation:
- Add SUPPORT_URL environment variable
- Include in all error responses:
  "support_url": "https://stage9.ai/support"
- Add support link to error boundary UI

Note: Domain will be finalized before MVP launch. Use environment variables to keep flexible.
```

**Approval**: ☐ APPROVED / ☐ MODIFY (please specify changes)

---

## FINAL APPROVAL FORM

**Review Status**: Ready for user approval

**Instructions**: For each section, indicate:
- ☑️ **APPROVED** - Accept proposed answer as-is
- ⚠️ **APPROVED WITH MODIFICATIONS** - Accept approach but modify specific details (specify below)
- ❌ **REJECTED** - Decline proposed answer; needs different approach (specify below)

---

### SECTION 1 APPROVALS (Blocking Issues)

- [ ] **B1. Complete API Downtime**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B2. TTS Complete Failure**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B3. Segment Text Editing TTS**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B4. Project Status State Machine**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B5. Asset Selection Validation**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B6. Rate Limit Reset Timing**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B7. Content Moderation Scope**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B8. Concurrent Render Limit**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B9. SRT Caption Text Source**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B10. Data Retention Policy**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **B11. User Data Isolation**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________

### SECTION 2 APPROVALS (Ambiguities)

- [ ] **A1. Rate Limit Error Message**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **A2. Placeholder Color Selection**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **A3. Ken Burns Effect MVP**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **A4. Worker Failure Recovery**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **A5. Database Query Optimization**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________

### SECTION 3 APPROVALS (Missing Specs)

- [ ] **D1. Storage Quota**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **D2. Cache Invalidation**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **D3. Request Rate Limiting**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **D4. CORS Whitelist**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **D5. Monitoring Thresholds**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **D6. Backup/Restore**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________
- [ ] **D7. Support Channel**: APPROVED / MODIFY / REJECT
  - If modifying: _________________________________

---

## SUMMARY

**Total gaps to resolve**: 23
- **Blocking issues**: 11
- **Ambiguities**: 5
- **Missing specs**: 7

**Once approved**, I will:
1. Update clarification-questions.md with all approvals + decisions
2. Update functional-spec.md and technical-spec.md with implemented changes
3. Generate final "Implementation Ready" checklist
4. You can begin coding with complete clarity on all decisions
