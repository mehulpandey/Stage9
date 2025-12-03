# Product Backlog (Post-MVP)

## Document Information
- **Purpose**: Future enhancements and features planned for implementation after MVP launch
- **Priority**: Listed in order of implementation priority (highest first)

---

## 1. Planned Features

### 1.1 Reference-Video Style Mimicry
**Priority**: TOP OF BACKLOG (Next major feature after MVP)

**Description**:
Analyze a reference YouTube video and generate a style preset that mimics its editing characteristics.

**Implementation Approach**:
- Lightweight fingerprint extraction:
  - Motion profile analysis (pacing, camera movement)
  - Cut frequency detection (average shot length)
  - Caption density measurement (words per minute, position, style)
  - Energy curve mapping (intensity over time)
- Bias preset generation based on fingerprint
- Apply extracted preset to user's project

**Important Constraints**:
- Do NOT attempt full pixel-level replication in initial implementation
- Focus on macro-level editing patterns only
- Extract analyzable metrics, not visual aesthetics

**User Flow**:
1. User provides YouTube URL of reference video
2. System analyzes video (async job)
3. System generates custom preset based on analysis
4. User can apply preset to their project
5. User can save preset for reuse

**Acceptance Criteria**:
- [ ] Can analyze reference video and extract motion profile
- [ ] Can detect average cut frequency
- [ ] Can measure caption density and timing
- [ ] Generated preset produces similar pacing when applied
- [ ] Analysis completes in < 5 minutes for 10-minute reference video

---

### 1.2 Auto-Generate Shorts from Long Videos
**Priority**: High

**Description**:
Automatically clip and repurpose finished long-form videos into short-form content (YouTube Shorts, TikTok, Instagram Reels).

**Features**:
- Intelligent segment selection (highest energy moments, hooks, key points)
- Automatic reframing from 16:9 to 9:16 (vertical)
- Smart cropping with face/subject tracking
- Caption repositioning for vertical format
- Generate multiple short options per long video

**User Flow**:
1. User selects finished long-form video
2. User sets target: "Generate 3 shorts (30-60s each)"
3. System analyzes energy peaks and key moments
4. System generates short clips with vertical format
5. User reviews and approves shorts
6. User downloads or publishes directly

**Technical Requirements**:
- Face detection and tracking for smart crop
- Energy/interest scoring algorithm
- Vertical video rendering (9:16 aspect ratio)
- Separate render pipeline for shorts

**Acceptance Criteria**:
- [ ] Can identify 3-5 high-energy segments from long video
- [ ] Correctly reframes to 9:16 with subject in frame
- [ ] Generates shorts in < 2 minutes per 60s clip
- [ ] Captions readable and properly positioned in vertical format

---

### 1.3 AI-Generated Visuals
**Priority**: High

**Description**:
Add AI image/video generation as fallback when stock footage unavailable, or as premium option for unique visuals.

**Implementation**:
- Integration options:
  - Runway Gen-3 (AI video generation)
  - Stable Diffusion (AI image generation)
  - Midjourney API (if available)
- Use as fallback when stock fetch fails completely
- Premium feature: User can request AI visuals instead of stock

**User Flow**:
1. System attempts stock fetch
2. If fails: Automatically generate AI visual based on segment text
3. OR: User toggles "Use AI visuals" for premium look
4. System generates image/short video clip
5. Adds to suggestions alongside stock options

**Cost Considerations**:
- AI generation is expensive - limit to paid tiers
- Free tier: Only as fallback (not primary option)
- Pro tier: X AI generations per month included

**Acceptance Criteria**:
- [ ] Can generate relevant AI image from segment text
- [ ] AI visuals integrated seamlessly with stock options
- [ ] Generation time < 30 seconds per visual
- [ ] Quality check: Filters out low-quality/nonsensical outputs

---

### 1.4 Voice Cloning & Multi-Voice Support
**Priority**: Medium-High

**Description**:
Allow users to clone their own voice or use multiple different voices within a single video.

**Features**:

**Voice Cloning**:
- User uploads 2-3 minutes of clean audio sample
- System creates custom voice model (via ElevenLabs Voice Lab)
- User can use their cloned voice for all videos
- Storage: Save voice model ID per user

**Multi-Voice Support**:
- Assign different voices to different segments
- Use cases: Dialogue, interviews, narrator + character voices
- UI: Dropdown per segment to select voice

**User Flow (Voice Cloning)**:
1. User navigates to Settings → Voice
2. Uploads audio sample (2-3 min MP3)
3. System processes and creates voice model
4. User names voice ("My Voice", "Professional Narrator", etc.)
5. Voice appears in voice preset dropdown

**User Flow (Multi-Voice)**:
1. In storyboard editor, each segment has voice selector
2. User assigns Voice A to segments 1-5
3. User assigns Voice B to segments 6-10
4. System generates TTS with appropriate voices per segment

**Acceptance Criteria**:
- [ ] Can clone voice from 2-3 minute sample
- [ ] Cloned voice sounds natural and recognizable
- [ ] Can assign different voices to different segments
- [ ] TTS generation respects per-segment voice assignments

---

### 1.5 Template Marketplace & Preset Editor
**Priority**: Medium

**Description**:
Allow users to browse, purchase, and create custom editing style presets.

**Features**:

**Template Marketplace**:
- Browse curated editing presets (styles, transitions, caption styles)
- Free and paid templates
- Preview template before applying
- One-click apply to project
- Categories: Educational, Entertainment, Documentary, Listicle, etc.

**Preset Editor**:
- User can customize existing presets
- Adjustable parameters:
  - Transition types and duration
  - Caption style (font, size, position, animation)
  - Motion templates (zoom amount, pan speed)
  - Energy curve (pacing adjustments)
  - B-roll density (how often visuals change)
- Save custom presets privately or publish to marketplace

**User Flow (Marketplace)**:
1. User clicks "Browse Templates"
2. Filters by category, price, popularity
3. Previews template (sample video)
4. Applies to current project or saves to library

**User Flow (Editor)**:
1. User starts with existing preset
2. Clicks "Customize Preset"
3. Adjusts sliders and options in editor UI
4. Previews changes in real-time
5. Saves as new custom preset
6. Optional: Publish to marketplace (revenue share)

**Acceptance Criteria**:
- [ ] Marketplace displays ≥20 curated templates at launch
- [ ] User can apply template and see changes immediately
- [ ] Preset editor allows full customization of all parameters
- [ ] Custom presets saved and reusable across projects
- [ ] Published templates reviewable by team before going live

---

### 1.6 User-Uploaded Assets
**Priority**: Medium

**Description**:
Allow users to upload their own video/image assets for use in segments, alongside stock footage suggestions.

**Features**:
- Upload custom video/image files for any segment
- Support for MP4, MOV, WebM (video) and JPG, PNG (images)
- File size limit: 500MB
- Auto-extract thumbnail from uploaded videos
- Auto-convert to H.264 MP4 if needed (background job)
- Ability to reuse same uploaded asset across multiple segments
- Malware scanning on upload (optional: ClamAV integration)

**User Flow**:
1. In storyboard editor, each segment shows 3 stock suggestions + "Upload your own" button
2. User clicks "Upload your own" → file picker opens
3. User selects video/image file → upload to Supabase storage
4. System extracts thumbnail, validates duration (min 2s for video), and processes
5. Asset appears as option alongside stock suggestions for that segment
6. User can select uploaded asset or switch back to stock clips

**Technical Requirements**:
- File upload endpoint with validation (MIME type, size, duration)
- Async conversion job for non-H.264 video formats
- Thumbnail extraction from video first frame
- Storage in Supabase: `user-uploads/{projectId}/{segmentId}/{filename}`
- Metadata stored in `assets` table with `source_type: "user_uploaded"`
- Error handling for failed conversions

**Acceptance Criteria**:
- [ ] Can upload MP4/MOV/WebM files up to 500MB
- [ ] Video validation rejects files < 2 seconds duration
- [ ] Auto-conversion to H.264 works for non-standard formats
- [ ] Thumbnail extraction works reliably
- [ ] Uploaded assets display correctly in storyboard editor
- [ ] Can render videos using uploaded assets
- [ ] Supports malware scanning (optional but recommended)

---

### 1.7 Background Music & Audio Tracks
**Priority**: Medium

**Description**:
Add optional background music or custom audio tracks to videos, mixing with TTS voiceover.

**Features**:
- Music source options:
  - Stock music library (Epidemic Sound API, Artlist, or similar)
  - User-uploaded audio files
- Audio mixing:
  - Background music volume: -12dB (under voiceover)
  - TTS voiceover: Primary track (85% volume)
  - Video clip audio: Secondary (15% volume)
- Music looping: Auto-loop to match video duration
- Per-segment control: Assign different music to different segments or global background

**User Flow**:
1. In storyboard editor, toggle "Add background music"
2. Browse music library OR upload custom audio file
3. Select track and adjust volume slider
4. Preview with mix of voiceover + music
5. Apply to all segments or specific segments
6. Render includes mixed audio

**Technical Requirements**:
- Integration with stock music API (licensing + rate limits)
- FFmpeg audio mixing with multiple tracks
- Simple FFmpeg filter: `-filter_complex "loop=file=music.mp3:s={duration}" [music];...amix=inputs=3:duration=first[a]"`
- Handle licensing/attribution in metadata

**Cost Considerations**:
- Stock music APIs are per-stream or subscription-based
- Free tier: No background music OR very limited library
- Pro tier: Includes X music tracks per month
- Music licensing compliance required

**Acceptance Criteria**:
- [ ] Can select music from stock library
- [ ] Can upload custom audio files
- [ ] Audio mixing produces correct volume balance
- [ ] Music loops to match video duration
- [ ] Preview shows mixed audio before render
- [ ] Render completes with background music included
- [ ] Licensing/attribution handled correctly

---

### 1.8 Scheduling & Direct YouTube Publishing
**Priority**: Medium

**Description**:
Allow users to schedule and publish videos directly to YouTube from the platform.

**Features**:
- YouTube OAuth integration
- Direct upload to YouTube after render
- Set title, description, tags, thumbnail
- Schedule publish time
- Select privacy settings (public/unlisted/private)
- Post to multiple channels (for agencies)

**User Flow**:
1. After render completes, user clicks "Publish to YouTube"
2. Connects YouTube account (OAuth)
3. Fills in metadata:
   - Title
   - Description
   - Tags
   - Category
   - Thumbnail (auto-generated or upload custom)
4. Selects privacy level
5. Optional: Schedule publish time
6. Clicks "Publish" or "Schedule"
7. System uploads video and sets metadata
8. User receives confirmation + YouTube video link

**Technical Requirements**:
- YouTube Data API v3 integration
- OAuth 2.0 flow for account connection
- Video upload endpoint (resumable uploads for large files)
- Scheduling system (cron jobs or scheduled tasks)
- Handle YouTube quotas and rate limits

**Acceptance Criteria**:
- [ ] User can connect YouTube account via OAuth
- [ ] Video uploads successfully with all metadata
- [ ] Scheduled videos publish at correct time
- [ ] Handles upload errors gracefully with retry
- [ ] Supports multiple connected channels per user

---

### 1.8 Collaborative Multi-User Editing
**Priority**: Medium-Low

**Description**:
Allow multiple users to work on the same project simultaneously or with role-based access.

**Features**:
- Project sharing (invite collaborators by email)
- Role-based permissions:
  - Owner: Full control
  - Editor: Can edit script and storyboard
  - Viewer: Can view only
- Real-time collaboration (see who's editing what)
- Comment system (leave feedback on segments)
- Version history (restore previous versions)
- Activity log (who changed what, when)

**User Flow**:
1. Project owner clicks "Share Project"
2. Enters collaborator email(s) and selects role
3. Collaborator receives invitation email
4. Collaborator accepts and gains access
5. Both users can edit simultaneously
6. Changes sync in real-time
7. Users can leave comments on segments
8. Owner can see full activity log

**Technical Requirements**:
- WebSocket connection for real-time sync
- Operational transforms or CRDTs for conflict resolution
- Database schema updates (project_collaborators table)
- Permissions middleware for API endpoints
- Notification system for comments and changes

**Acceptance Criteria**:
- [ ] Can invite collaborators with specific roles
- [ ] Permissions enforced correctly (editors can't delete projects)
- [ ] Real-time updates visible to all collaborators
- [ ] Comment threads work on segments
- [ ] Version history shows last 30 versions
- [ ] No data loss during simultaneous edits

---

### 1.9 Advanced Rendering Options
**Priority**: Low

**Description**:
Professional-grade rendering features for advanced users.

**Features**:

**Color Grading Templates**:
- Pre-built LUTs (Look-Up Tables) for color grading
- Styles: Cinematic, Warm, Cool, Black & White, Vintage, etc.
- Apply to entire video or per segment
- Custom LUT upload

**Advanced Motion Graphics**:
- Animated text overlays
- Lower thirds
- Progress bars and charts
- Animated transitions (wipes, slides, zooms)
- Particle effects
- Logo animations

**Advanced Timeline Control**:
- Precise timing controls (frame-by-frame)
- Keyframe editor for custom animations
- Audio envelope editor (manual volume control)
- Multi-track audio (background music + SFX + TTS)

**Export Options**:
- Multiple resolutions (720p, 1080p, 4K)
- Multiple codecs (H.264, H.265/HEVC, ProRes)
- Bitrate control
- Frame rate options (24fps, 30fps, 60fps)

**User Flow**:
1. User toggles "Advanced Mode" in settings
2. Additional controls appear in storyboard editor
3. User applies color grading template
4. User adds animated lower thirds to segments
5. User fine-tunes timing with keyframe editor
6. User selects export settings (4K, H.265)
7. Renders with advanced options

**Acceptance Criteria**:
- [ ] Can apply color grading LUTs to video
- [ ] Animated text overlays render correctly
- [ ] Keyframe editor allows precise animation control
- [ ] Can export in multiple formats and resolutions
- [ ] Advanced features don't slow down basic workflow

---

### 1.10 Analytics & A/B Testing
**Priority**: Low

**Description**:
Track video performance and test different versions to optimize engagement.

**Features**:

**Analytics Dashboard**:
- Track video performance metrics:
  - Views, watch time, engagement rate
  - Audience retention curve
  - Click-through rate (if published via platform)
  - Comments and likes (if YouTube integrated)
- Compare performance across videos
- Identify best-performing segments

**A/B Testing**:
- Create multiple versions of same video
- Vary elements:
  - Different hooks (first 10 seconds)
  - Different captions styles
  - Different voiceovers
  - Different thumbnails
- Split traffic and measure performance
- Identify winning version

**Insights & Recommendations**:
- AI-powered insights: "Your videos perform best with energetic hooks"
- Suggest improvements based on data
- Benchmark against similar content

**User Flow (Analytics)**:
1. User navigates to Analytics tab
2. Selects video to analyze
3. Views retention curve and engagement metrics
4. Identifies drop-off points
5. Notes insights for future videos

**User Flow (A/B Testing)**:
1. User creates video
2. Clicks "Create A/B Test"
3. Generates 2-3 variants (different hooks)
4. Publishes all variants
5. System tracks performance over 7 days
6. Declares winner and shows results
7. User learns what works best

**Technical Requirements**:
- YouTube Analytics API integration
- Data warehouse for storing metrics
- Statistical significance calculator
- Dashboard UI (charts, graphs)

**Acceptance Criteria**:
- [ ] Analytics dashboard displays key metrics accurately
- [ ] Retention curve shows drop-off points clearly
- [ ] A/B test runs for minimum 100 views per variant
- [ ] Statistical significance calculated correctly
- [ ] Insights are actionable and specific

---

## 2. Implementation Priority Matrix

### Immediate Next (After MVP Launch)
1. Reference-video style mimicry
2. Auto-generate shorts from long videos

### High Priority (Q2-Q3)
3. AI-generated visuals
4. Voice cloning & multi-voice support

### Medium Priority (Q3-Q4)
5. Template marketplace & preset editor
6. User-uploaded assets
7. Background music & audio tracks
8. Scheduling & direct YouTube publishing

### Future / As Needed (Q4+)
9. Collaborative multi-user editing
10. Advanced rendering options
11. Analytics & A/B testing

---

## 3. Resource Estimates

### Reference-Video Style Mimicry
- **Effort**: 3-4 weeks
- **Team**: 1 backend engineer, 1 ML engineer
- **Complexity**: Medium-High

### Auto-Generate Shorts
- **Effort**: 2-3 weeks
- **Team**: 1 backend engineer, 1 video engineer
- **Complexity**: Medium

### AI-Generated Visuals
- **Effort**: 2 weeks
- **Team**: 1 backend engineer
- **Complexity**: Low-Medium (API integration)

### Voice Cloning & Multi-Voice
- **Effort**: 1-2 weeks
- **Team**: 1 backend engineer
- **Complexity**: Low (API integration)

### Template Marketplace
- **Effort**: 4-6 weeks
- **Team**: 1 backend engineer, 1 frontend engineer, 1 designer
- **Complexity**: Medium-High

### User-Uploaded Assets
- **Effort**: 2 weeks
- **Team**: 1 backend engineer, 1 frontend engineer
- **Complexity**: Medium

### Background Music & Audio Tracks
- **Effort**: 2-3 weeks
- **Team**: 1 backend engineer, 1 frontend engineer
- **Complexity**: Medium (API integration + audio mixing)

### YouTube Publishing
- **Effort**: 2 weeks
- **Team**: 1 backend engineer
- **Complexity**: Medium

### Collaborative Editing
- **Effort**: 6-8 weeks
- **Team**: 2 backend engineers, 1 frontend engineer
- **Complexity**: High

### Advanced Rendering
- **Effort**: 4-6 weeks
- **Team**: 1 video engineer, 1 frontend engineer
- **Complexity**: High

### Analytics & A/B Testing
- **Effort**: 4-5 weeks
- **Team**: 1 backend engineer, 1 frontend engineer, 1 data engineer
- **Complexity**: Medium-High