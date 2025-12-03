# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## General Instructions

- Follow the tasks list in tasks.md. This plan has a list of todo items that you can check off as you complete them, split by logical checkpoints. We will implement this checkpoint by checkpoint. When an item has been completed, mark it complete with a [x]. 
- If there are any new tasks not in tasks.md, come up with a plan with a list of todo items and check in with me. Once I verify the plan, add it with logical checkpoints to tasks.md.
- Before implementation, first think through the problem and read the codebase for relevant files. Then, begin working on the todo items, marking them as complete as you go.
- Use the frontend design skill whenever doing any UX/UI work.
- Every step of the way, give me a high level explanation of what changes you made.
- Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
- When a spec changes, update it in the logical place in "functional-spec.md" and/or "technical-spec.md"
- After a checkpoint is completed, add any important info to tasks.md in a new section at the end of that checkpoint, such as if any action is needed from my end (setting up accounts, API keys, etc), if anything is partially completed (with placeholder values, etc), or anything else that needs my attention. If there is nothing worth noting, mention there are no notes. Name this section "Notes for Mehul".
- Any important information (approvals, decisions, action items for me) should be documented directly in the specs or in tasks.md's "Notes for Mehul" sections. No extra intermediate documents.
- DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY
- MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY

---

## Project Overview

**Stage9** is an AI-powered video generation platform that converts a user-provided script into an engaging long-form faceless YouTube video (16:9) with AI voiceover, automatically matched stock-sourced visuals, captions, basic transitions, and professional video rendering.

**Tech Stack**: Next.js 14, TypeScript, Supabase (PostgreSQL), FFmpeg, OpenAI, ElevenLabs, BullMQ (job queue), Redis

**Development Status**: Checkpoint 1 complete (infrastructure). Building Checkpoints 2-9 in parallel with backend APIs and frontend components.

---

## Directory Structure

```
Stage9/
├── app/                          # Main Next.js application
│   ├── types/index.ts           # Centralized TypeScript definitions
│   ├── lib/
│   │   ├── auth.ts              # JWT token creation/validation, session management
│   │   ├── database.ts          # Supabase client + query helpers (50+ functions)
│   │   ├── validators.ts        # Input validation (email, duration, placeholders, etc)
│   │   └── api-utils.ts         # Standardized API response formatting, error handling
│   ├── middleware.ts            # Rate limiting, auth check, request logging
│   ├── supabase/migrations/     # PostgreSQL migrations (RLS policies, indexes)
│   ├── api/                     # API route handlers (built checkpoint by checkpoint)
│   ├── pages/                   # React pages (built checkpoint by checkpoint)
│   ├── components/              # React components (built checkpoint by checkpoint)
│   ├── workers/                 # Background job workers (4 processing pipelines)
│   ├── styles/                  # Global Tailwind styles
│   ├── public/                  # Static assets
│   ├── package.json             # Dependencies + npm scripts
│   ├── tsconfig.json            # TypeScript strict mode + path aliases
│   ├── next.config.js           # Image optimization, API limits, FFmpeg webpack
│   └── README.md                # Developer setup + architecture docs
│
├── supabase/                    # Supabase config (migrations, policies)
├── functional-spec.md           # User-facing MVP requirements
├── technical-spec.md            # Implementation details (650+ lines)
├── tasks.md                     # 89 tasks organized into 9 checkpoints
├── CHECKPOINT_1_COMPLETE.md     # Checkpoint 1 review + deliverables
├── clarification-questions.md   # 45 approved specification decisions
└── IMPLEMENTATION-READY.md      # Sign-off document
```

---

## Architecture & Core Concepts

### Four Processing Pipelines

The application implements four sequential backend pipelines (A-D):

1. **Pipeline A (Script Optimization)**: OpenAI segments and optimizes script
2. **Pipeline B (Asset Fetching)**: Fetches stock footage from Pexels/Pixabay with weighted ranking
3. **Pipeline C (TTS Generation)**: ElevenLabs generates voiceover per segment
4. **Pipeline D (Video Rendering)**: FFmpeg composes final video with Ken Burns, transitions, captions

Each pipeline is triggered by a state machine: `draft → processing → ready → rendering → completed`

### Critical Business Logic

**Duration Mismatch Handling** (per technical-spec.md):
- ±5% or less: Silent adjustment (imperceptible speed change via FFmpeg setpts filter)
- ±5-20%: Warn user with 1.25x indicator, allow selection
- >20%: Block selection (prevent jarring speed adjustments)
- Validation in `lib/validators.ts:validateDurationMismatch()`

**Placeholder Asset Handling**:
- When stock fetch fails, use colored background placeholder
- Threshold: ≤30% of segments can be placeholders (enforces MVP acceptance criteria)
- Validation in `lib/validators.ts:validatePlaceholderThreshold()`

**Rate Limiting Tiers**:
- Free: 2 renders/month, 10 min max per video, 1 concurrent render
- Pro: 30 renders/month, 30 min max per video, 2 concurrent renders
- Enterprise: Unlimited
- Enforced in `middleware.ts` + `lib/database.ts`

**Ken Burns Effect** (for static images):
- 1.05x zoom + random pan direction (FFmpeg zoompan filter)
- Applied to static images to prevent "frozen" appearance
- Implemented in video rendering pipeline (Checkpoint 8)

### Data Isolation & Security

**Row-Level Security (RLS)**: Every database table has Postgres RLS policies
- Users can only access their own projects, segments, renders, assets
- Enforced at database layer (not just API layer)
- Policies defined in `supabase/migrations/0001_initial_schema.sql`

**Authorization Pattern**: All API endpoints validate `project.user_id == currentUser.id`
- Extract userId from JWT via `middleware.ts`
- Database queries filtered by userId
- Example in `lib/database.ts:getProjectById(projectId, userId)`

### API Response Format

All responses follow standardized structure (defined in `lib/api-utils.ts`):

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: "ERROR_CODE", message: "...", details?: {...} } }
```

Use `asyncHandler()` wrapper to automatically catch errors and format responses.

---

## Development Workflow

### Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build           # Production build
npm run start           # Run production server
npm run lint            # ESLint check

# Database
npm run db:migrate      # Run Supabase migrations
npm run db:gen-types    # Generate TypeScript types from schema
```

### Building a New Checkpoint

Each checkpoint includes both backend + frontend:

1. **API Routes** (in `app/api/`)
   - Create route handler using `asyncHandler()` wrapper
   - Extract userId via `getUserId(request)`
   - Use database helpers from `lib/database.ts`
   - Return via `success()` or `error()` from `lib/api-utils.ts`
   - Example pattern:
     ```typescript
     import { asyncHandler, success, error, getUserId } from '@/lib/api-utils';

     export const POST = asyncHandler(async (request) => {
       const userId = getUserId(request);
       if (!userId) return error('UNAUTHORIZED', '...', 401);

       const body = await parseJsonBody(request);
       // Validate input
       const errors = validateRequest(body, { title: validateProjectTitle, ... });
       if (errors.length) return error('VALIDATION_ERROR', '...', 400, { errors });

       // Use database helpers
       const project = await createProject(userId, body.title, ...);
       return success(project, 201);
     });
     ```

2. **Validation** (add to `lib/validators.ts` if needed)
   - Create validator function: `validate[Field](value) → ValidationError | null`
   - Use in request handling via `validateRequest()` helper

3. **React Components** (in `app/components/` or `app/pages/`)
   - Use Tailwind + shadcn/ui components for consistency
   - Follow design system (defined during checkpoint planning)
   - Call API endpoints with proper error handling

### Type Safety

- All API responses use types from `app/types/index.ts`
- Database queries return strongly-typed results
- Generate types from Supabase schema: `npm run db:gen-types`
- Never use `any` - use `unknown` and type-guard instead

---

## Environment Configuration

All 62 environment variables documented in `app/.env.example`:

**Critical for Development**:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase access
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase operations
- `JWT_SECRET` - Must be ≥32 characters for token signing

**External APIs** (add keys when integrating):
- `OPENAI_API_KEY` - Script optimization
- `ELEVENLABS_API_KEY` - TTS generation
- `PEXELS_API_KEY` + `PIXABAY_API_KEY` - Stock footage
- `STRIPE_API_KEY` - Payments (future)

**Local Development**:
- Copy `.env.example` → `.env.local`
- Use placeholder values initially (will work for API structure testing)
- Supabase provides test API keys for local development

---

## Key Libraries & Integration Points

### Supabase (Database + Auth)
- **Client**: `createSupabaseServerClient()` and `createSupabaseClientClient()` in `lib/database.ts`
- **Queries**: 50+ pre-built helpers (getUserById, createProject, updateSegment, etc.)
- **RLS**: Database enforces permissions (Postgres policies)
- **Auth**: Leverage Supabase Auth for signup/login, JWT for API tokens

### OpenAI (Script Optimization & Quality Scoring)
- **Integration Point**: Checkpoint 4 (Pipeline A)
- **Usage**: Segment script, optimize segments, score quality
- **Prompts**: Defined in technical-spec.md lines 480-550

### ElevenLabs (Text-to-Speech)
- **Integration Point**: Checkpoint 7 (Pipeline C prep)
- **Voice Presets**: professional_narrator, energetic_host, calm_educator
- **Caching**: Per-segment TTS cached in `tts_cache` table (30-day expiration)
- **Fallback**: OpenAI TTS if ElevenLabs fails

### FFmpeg (Video Rendering)
- **Library**: fluent-ffmpeg npm package
- **Integration Point**: Checkpoint 8 (Pipeline D)
- **Config**: Path in environment (`FFMPEG_PATH`, `FFPROBE_PATH`)
- **Features**: H.264 encoding, Ken Burns effect, transitions, SRT captions
- **FFmpeg Commands**: Technical spec lines 363-383

### BullMQ + Redis (Job Queue)
- **Purpose**: Background processing for long-running operations
- **Integration Point**: Checkpoints 4, 6, 7, 8 (each pipeline is a worker)
- **Setup**: Not required for MVP with small load; use in-memory queue initially
- **Scaling**: Add Redis endpoint when load increases

### Tailwind CSS + shadcn/ui (UI Components)
- **Design System**: Defined during checkpoint planning (colors, typography, spacing)
- **Components**: Pre-built via shadcn/ui (buttons, forms, modals, etc.)
- **Customization**: Tailwind config in `tailwind.config.js` (create as needed)
- **Consistency**: Import components from `@/components/ui/[component]`

---

## Rate Limiting & Performance

**Middleware Rate Limiting** (`middleware.ts`):
- Unauthenticated requests: 10/minute (by IP)
- Free tier: 100/minute (by user ID)
- Pro tier: 1000/minute (by user ID)
- Enforced before route handlers execute

**Database Optimization**:
- Indexes on: user_id, project_id, status, created_at, expires_at, provider
- RLS policies evaluated at query time (add `user_id` filters first)
- Use pagination helpers for large result sets: `getPaginationParams()` + `buildPaginatedResponse()`

**Asset Caching**:
- Stock footage cached globally (90-day expiration) with provider ID uniqueness
- TTS cached per-project (30-day expiration) with text hash + voice preset uniqueness
- Cleanup jobs run periodically (90d videos, 30d TTS, 7d logs)

---

## Checkpoint Structure

Each checkpoint includes:
- Backend API endpoints (in `app/api/`)
- Database migrations (if needed)
- New validator functions (if needed)
- React components/pages (in `app/pages/` or `app/components/`)
- Design system specs (for consistency)

**Full Task List**: See `tasks.md` for 89 tasks across 9 checkpoints with acceptance criteria.

---

## Testing & Validation

**Input Validation**:
- All user input validated before processing
- Use `validateRequest()` helper with schema object
- Catch validation errors early, return 400 with details

**Authorization**:
- Verify user owns resource: `verifyOwnership(resourceUserId, currentUserId)`
- Check database RLS policies work correctly
- Test with different user IDs

**Duration & Asset Logic**:
- Test duration mismatch validator with edge cases (4.9%, 5%, 5.1%, 20%, 20.1%)
- Test placeholder threshold with various asset/placeholder counts
- Verify FFmpeg filters work (Ken Burns, transitions)

---

## Important Notes

### Security Considerations
- Never log sensitive data (API keys, tokens, user passwords)
- Always use HTTPS in production (enforce in middleware)
- Validate file uploads: size, MIME type, virus scan
- Rate limit by both IP and user ID
- Database RLS is first line of defense, API auth is second

### State Machine
Projects follow strict state transitions:
- `draft` → `processing` (when user submits script)
- `processing` → `ready` (after optimization pipeline completes)
- `ready` → `rendering` (when user clicks render)
- `rendering` → `completed` (when FFmpeg finishes)
- Any state → `failed` (if error occurs)

Prevent invalid transitions by checking current status before state change.

### Error Handling
- Use `asyncHandler()` wrapper for automatic error catching
- Return specific error codes (not generic "error")
- Include `details` object for validation errors (field name + reason)
- Log errors with request ID for debugging

### Future Scaling
- Replace in-memory rate limiting with Redis
- Replace in-memory job queue with BullMQ + Redis workers
- Add Sentry for error tracking (already in dependencies)
- Use Supabase edge functions for webhook processing
- Cache API responses with CDN (for asset thumbnails, etc.)

---

## Specification References

When building features, reference:
- **Functional Requirements**: `functional-spec.md` (user-facing MVP features)
- **Technical Details**: `technical-spec.md` (implementation details, formulas, FFmpeg commands)
- **Approval Decisions**: `clarification-questions.md` (45 approved decisions on ambiguities)
- **Implementation Tasks**: `tasks.md` (detailed task breakdown for each checkpoint)
- **Current Status**: `CHECKPOINT_1_COMPLETE.md` (most recent checkpoint review)

---

## Design System & UI

**When Building UI Components**:
1. Start with design system specifications (colors, typography, spacing)
2. Use shadcn/ui pre-built components for consistency
3. Apply Tailwind classes for customization
4. Test on desktop and mobile
5. Ensure accessibility (keyboard nav, ARIA labels, color contrast)

**Component Organization**:
- Reusable components in `app/components/`
- Page-specific components in `app/pages/[page]/`
- Use TypeScript for component props
- Export types alongside components

---

## Questions or Issues?

Refer to the specification documents first:
- MVP requirements: `functional-spec.md`
- Technical decisions: `technical-spec.md`
- Approval tracking: `clarification-questions.md`

If adding a new feature or making an architectural decision:
1. Check if it's already approved in `clarification-questions.md`
2. If not, document the decision and note any tradeoffs
3. Update `tasks.md` with new tasks if scope changes
