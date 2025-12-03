# Functional Specifications (MVP)

## Document Information
- **Goal**: Given a user-provided script, produce a polished long-form faceless YouTube video (16:9) with AI voiceover, stock-sourced visuals, captions, basic transitions and a human-editable storyboard prior to final render.

---

## 1. Core Functionality

### 1.1 Primary User Flow

#### 1.1.1 Project Creation

**User Actions:**
- User signs in (email/OAuth) and creates a new project
- User pastes a script (any text format accepted, processed as plaintext)
  - Min length: 300 words
  - Max length: ~5,000 words

**User Settings:**
- Desired approximate video length target or pacing slider (short/medium/long)
- Voice preset (3 choices):
  - **Professional Narrator** - Deep, clear, authoritative tone. Good for educational/explainer content.
  - **Energetic Host** - Upbeat, conversational, engaging. Good for entertainment/listicle content.
  - **Calm Educator** - Warm, measured, thoughtful pace. Good for documentary/narrative content.
- Editing style preset:
  - Clean Explainer
  - Energetic Listicle
  - Calm Documentary
- Optional toggle: "Allow AI media fallback" (default: OFF)

#### 1.1.2 Script Analysis & Hybrid Optimization

**System Processing:**
- Performs input validation and content-safety checks
- Performs hybrid optimization:
  - (a) Structural segmentation into beats
  - (b) Per-beat rewriting/polishing to improve hooks and pacing while preserving user meaning
- Output: `optimized_script` + `segments`

**User Review:**
- Display side-by-side diff
- User can:
  - Accept optimized script
  - Edit the optimized script
  - Revert to original

#### 1.1.3 Generate Editing Plan (Storyboard)

From the approved optimized script, create a structured JSON editing plan with segments containing:
- Narration text
- Estimated duration
- Energy score
- Suggested stock search queries
- Caption text
- Transition hints
- B-roll density

#### 1.1.4 Human-in-the-Loop Editing UI

**Storyboard Display:**
- Show segment list with inline preview placeholders
- Display thumbnail and 3 suggested stock clip alternatives per segment

**User Actions:**
- Edit segment text/timing
- Select alternate stock clip among suggestions (3 choices per segment)
  - Duration mismatch handling:
    - **±5% or less**: Select without warning (imperceptible speed adjustment)
    - **±5-20%**: Show warning badge "⚠️ Will be sped up 1.25x" but allow selection
    - **>20%**: Disable selection (user must pick different asset or adjust voiceover)
- Regenerate suggestions for a segment (new stock choices)
- For segments with no suitable stock: Accept colored placeholder background or try different search
- Change caption style (choose from 3 prebuilt caption styles)
- Toggle caption format: SRT file only OR burned-in captions + SRT
- Change global preset (switch to another style; re-generate plan)
- Validate edits and update the plan

#### 1.1.5 Render Pipeline

**Process:**
1. User clicks "Render Final Video"
2. System performs:
   - Generates TTS voiceover per segment (selected preset, cached)
   - Downloads chosen stock clips (or uses cached results)
   - Composes timeline per editing plan (transitions, subtitles)
   - Generates SRT subtitle file
   - Optionally burns captions into video if user selected
   - Renders 16:9 MP4 final video (1080p default)
3. Notify user when render completed
4. Provide download links (video + SRT file)

#### 1.1.6 Project Management

**Features:**
- Save project history:
  - Original script
  - Optimized script
  - Final plan
  - Assets
  - Rendered video links
  - SRT files
- Allow user to re-render after plan edits without redoing optimization unless requested

---

### 1.2 Input Validation & Bad Input Handling

**Script Format:**
- Accept any text format (plaintext, Markdown, rich text paste)
- Process all as plaintext (strip/ignore formatting)

**Script Length Validation:**

**Too short** (< 300 words):
- Display warning: "Script is short (XXX words). This will produce approximately X minutes of video."
- Offer options:
  - "Expand manually" (allow user to add more content)
  - "Auto-expand with AI" (LLM adds relevant content)
  - "Proceed anyway" (continue with short script)

**Too long** (> 5,000 words):
- Display warning: "Script is long (XXX words). This will produce approximately XX minutes of video."
- Offer options:
  - "Trim to recommended length" (AI-assisted trimming)
  - "Use 'Long' pacing" (produces longer video, warn about render time)
  - "Proceed anyway" (continue with long script)

**Quality Check:**
- LLM-based quality scoring on three dimensions:
  - **Clarity** (40%): Is the script easy to understand?
  - **Pacing** (35%): Good rhythm and flow?
  - **Hook** (25%): Does it grab attention?

**Quality Score Thresholds**:
- **≥ 75 (Green)**: Proceed immediately with checkmark indicator
- **60-74 (Yellow)**: Show suggestions as tips, allow proceed without confirmation
- **< 60 (Red)**: Show detailed breakdown, require checkbox confirmation, offer "Auto-Optimize" or "Manual Edit" options

**User Actions for Low Quality**:
- "Proceed Anyway" - continues with current script (logged for analytics)
- "Auto-Optimize" - triggers another optimization pass with specific suggestions
- "Manual Edit" - returns to script editor for user changes

**Safety Check:**
- Block/flag disallowed content (hate, sexual, illegal)
- Return actionable error message

---

### 1.3 Human-in-Loop Requirements

**Mandatory User Control:**
- User must be able to inspect and change the editing plan before any final render
- Regenerating a single segment must be possible and should not trigger full TTS or full render until user requests final render
- UI must show 3 alternative stock suggestions per segment and let user swap instantly

---

### 1.4 Stock-Only Visuals (MVP)

**Visual Source:**
- Visuals for each segment are selected from stock providers:
  - Pexels
  - Pixabay

**System Process:**
- Generate 3 search queries per segment
- Fetch top 5 candidate clips/images per query
- Present 3 ranked candidates to the user per segment
- On fetch failure:
  - Automatically retry with 1-2 fallback queries
  - If still fails: Mark segment as "needs manual selection"
  - Show placeholder and allow user to upload their own asset or regenerate

**AI-Generated Visuals:**
- Not used by default (backlog item)
- Optionally, user can enable AI fallback in settings (for later implementation)
- Default path uses stock only

---

### 1.5 Export Formats & Outputs

**Final Export Specifications:**
- Format: MP4
- Resolution: 1920x1080
- Video codec: H.264 (libx264)
- Audio codec: AAC

**Captions:**
- Always generate SRT subtitle file
- Optionally burn captions into video (user toggle)
- User downloads both video and SRT file

**Delivery:**
- Signed time-limited download URLs for video and SRT

**Storage (Supabase):**
- Project ID
- User ID
- Scripts (original and optimized)
- Plan JSON
- Render status
- Render URL
- SRT file URL

---

### 1.6 Acceptance Criteria (MVP)

**Test Scenario:**
Given a 800–2,000 word script, the system produces an 8–12 minute downloadable MP4 that:

- [ ] Includes TTS voiceover matching the optimized script
- [ ] Shows user-selected stock visuals across ≥70% of segments (remaining ≤30% can use placeholders)
- [ ] Captions are synchronized to voice (within ±0.5s)
- [ ] SRT file is generated and downloadable
- [ ] User was able to edit storyboard and swap stock clips before render
- [ ] User can see duration mismatch warnings (±5-20%) and disabled selections (>20%)
- [ ] Placeholder colored backgrounds render for segments with no suitable stock (if ≤30% threshold)
- [ ] User was able to choose between burned-in captions or SRT-only
- [ ] Video renders with correct durations (speed adjustments applied, transitions overlapped)
- [ ] Ken Burns effect applied to static images (subtle 1.05x zoom + pan motion)
- [ ] End-to-end flow executes without manual developer intervention