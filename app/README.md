# Stage9 - AI Video Generation Platform

> Convert scripts into engaging long-form videos with AI-powered editing, stock footage integration, and voiceover generation.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- FFmpeg installed locally
- Redis instance (for job queue)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys and configuration
```

4. Initialize database schema:
```bash
npm run db:migrate
```

5. Generate TypeScript types from Supabase:
```bash
npm run db:gen-types
```

6. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
app/
├── api/                    # API routes
│   ├── auth/              # Authentication endpoints
│   ├── projects/          # Project management
│   ├── segments/          # Segment editing
│   ├── assets/            # Asset fetching and ranking
│   ├── renders/           # Video rendering
│   └── webhooks/          # Third-party webhooks
├── middleware/            # Next.js middleware (auth, rate limiting)
├── lib/                   # Shared utilities
│   ├── database.ts        # Supabase client
│   ├── auth.ts            # Auth helpers
│   ├── validators.ts      # Input validation
│   ├── llm/               # LLM integration (OpenAI)
│   ├── tts/               # Text-to-speech (ElevenLabs)
│   ├── assets/            # Asset fetching (Pexels, Pixabay)
│   └── ffmpeg/            # Video rendering
├── pages/                 # Page components (for pages router)
│   ├── _app.tsx           # App wrapper
│   ├── index.tsx          # Home page
│   ├── auth/              # Auth pages
│   ├── projects/          # Project pages
│   └── dashboard/         # User dashboard
├── components/            # React components
│   ├── Layout/            # Layout components
│   ├── Forms/             # Form components
│   ├── Editor/            # Storyboard editor
│   └── common/            # Reusable components
├── styles/                # Global styles
├── types/                 # TypeScript type definitions
├── workers/               # Background job workers
│   ├── optimization.ts    # Pipeline A
│   ├── assets.ts          # Pipeline B
│   ├── tts.ts             # Pipeline C
│   └── render.ts          # Pipeline D
├── supabase/              # Supabase migrations and functions
│   └── migrations/        # Database migration scripts
├── public/                # Static assets
├── next.config.js         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Project dependencies
└── README.md              # This file
```

## Key Features (MVP)

- **Script to Video**: Upload scripts and convert them to polished videos
- **AI Optimization**: Script enhancement and segmentation using OpenAI
- **Stock Footage Integration**: Automatic asset matching from Pexels and Pixabay
- **AI Voiceover**: Text-to-speech with multiple voice presets via ElevenLabs
- **Storyboard Editing**: Human-in-the-loop editor for segment customization
- **Video Rendering**: FFmpeg-based rendering with Ken Burns effect, transitions, and captions
- **Rate Limiting**: Tiered pricing with render limits (Free: 2/month, Pro: 30/month)

## Development

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run db:migrate # Run database migrations
npm run db:gen-types # Generate Supabase types
```

### Database Schema

The application uses PostgreSQL via Supabase with the following main tables:
- `users` - User accounts and subscription info
- `projects` - Video projects
- `segments` - Video segments within projects
- `assets` - Stock footage and image assets
- `renders` - Render jobs and outputs
- `tts_cache` - Cached voiceover audio
- `job_logs` - Background job execution logs

See `supabase/migrations/` for full schema definition.

### API Endpoints

All endpoints require authentication (JWT token) except for `/api/auth/*` endpoints.

**Authentication**:
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

**Projects**:
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

**Segments**:
- `GET /api/projects/[id]/segments` - List project segments
- `PUT /api/projects/[id]/segments/[segmentId]` - Update segment

**Assets**:
- `GET /api/projects/[id]/assets/search` - Search stock footage
- `GET /api/projects/[id]/assets/[assetId]` - Get asset details
- `POST /api/projects/[id]/assets/[assetId]/select` - Select asset for segment

**Renders**:
- `POST /api/projects/[id]/render` - Start render job
- `GET /api/projects/[id]/renders` - List render history
- `GET /api/projects/[id]/renders/[renderId]` - Get render status
- `GET /api/projects/[id]/renders/[renderId]/download` - Download video

For full API specification, see `technical-spec.md`.

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {"field": "email", "reason": "Invalid email format"}
  }
}
```

## Testing

```bash
npm run test                    # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Generate coverage report
npm run test:e2e               # Run end-to-end tests
```

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Environment

Ensure all required environment variables are set before deployment. Use a `.env.production.local` file with production API keys.

## Rate Limiting

The application implements per-user rate limiting based on subscription tier:

- **Free**: 2 renders/month, 10 min max per video, 1 concurrent render
- **Pro**: 30 renders/month, 30 min max per video, 2 concurrent renders
- **Enterprise**: Unlimited

Rate limits are enforced at the API middleware level and checked before render jobs are queued.

## Monitoring

- Error tracking via Sentry
- Queue monitoring via BullMQ dashboard
- Performance metrics logged to database
- Video rendering logs in `/tmp/renders/`

## Contributing

Development follows the specification in:
- `functional-spec.md` - User-facing requirements
- `technical-spec.md` - Implementation details
- `tasks.md` - Implementation task list organized by checkpoint

## License

Proprietary - Stage9
