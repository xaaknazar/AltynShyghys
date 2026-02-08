# CLAUDE.md - Altyn Shyghys Production Dashboard

## Project Overview

**Altyn Shyghys** is a full-stack industrial production monitoring and analytics dashboard for an oil plant (маслозавод). It provides real-time production tracking, quality analysis, shift management, and project management (Rafdez module). The UI is in **Russian/Kazakh**.

## Tech Stack

- **Framework**: Next.js 14.0.4 (App Router)
- **Language**: TypeScript 5.3.3 (strict mode)
- **Frontend**: React 18.2.0, TailwindCSS 3.4.0, Recharts 2.10.3
- **Database**: MongoDB 6.3.0 (via native driver, not Mongoose)
- **Date handling**: date-fns 3.0.6
- **CSV parsing**: PapaParse 5.5.3
- **Output**: Standalone mode (`output: 'standalone'` in next.config.js)
- **Deployment target**: Vercel

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run Next.js ESLint (only linting available)
```

No test framework is configured. No Prettier or custom ESLint config exists.

## Project Structure

```
/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (lang="ru")
│   ├── page.tsx                # Main dashboard (real-time KPIs)
│   ├── globals.css             # Global styles
│   ├── components/             # Shared React components (14 files)
│   │   ├── KPIMetricCard.tsx
│   │   ├── ForecastBlock.tsx
│   │   ├── DailyStatsCard.tsx
│   │   ├── DayDetailModal.tsx
│   │   ├── ShiftChart.tsx
│   │   ├── CurrentDayChart.tsx
│   │   ├── ComparisonCard.tsx
│   │   ├── ProductionChart.tsx
│   │   ├── LineChart.tsx
│   │   ├── SpeedIndicator.tsx
│   │   ├── StatusBar.tsx
│   │   ├── ShiftEventForm.tsx
│   │   ├── LoadingState.tsx
│   │   └── ErrorState.tsx
│   ├── analysis/               # Analytics pages with sidebar layout
│   │   ├── layout.tsx          # Sidebar navigation
│   │   ├── overview/           # General production overview
│   │   ├── quality/            # Quality analysis
│   │   ├── production/         # Production trends with charts
│   │   ├── quality-charts/     # Detailed quality visualization
│   │   ├── comparison/         # Consolidated analysis (Свод)
│   │   └── shipping/           # Shipping/outbound data
│   ├── otk/                    # Quality control (ОТК) data entry
│   ├── rafdez/                 # Gantt chart for project management
│   ├── shift-master/           # Shift event logging
│   ├── debug/                  # Debug utilities
│   └── api/                    # API routes (~20 endpoints)
│       ├── production/         # Production data (latest, current, monthly, range)
│       ├── quality-analysis/   # Lab analysis queries
│       ├── shift-logs/         # Shift event logs
│       ├── shipping/           # Outbound shipping
│       ├── silo-levels/        # Storage tank levels
│       ├── rafdez/tasks/       # Project task CRUD
│       ├── analysis/sheets/    # Google Sheets data import
│       └── debug/              # Debug endpoints
├── lib/                        # Shared utilities
│   ├── mongodb.ts              # MongoDB connection with pooling
│   ├── utils.ts                # Production day calcs, timezone logic, PPR days
│   ├── quality-types.ts        # 20+ lab analysis types with tolerances
│   └── analytics.ts            # Analytics calculations
├── types/
│   └── production.ts           # Core TypeScript interfaces and constants
├── public/                     # Static assets (logo.jpg)
├── rafdez-app/                 # Separate deployable Rafdez sub-project
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

## Environment Variables

Required in `.env.local`:

```
MONGODB_URI=<mongodb connection string>
MONGODB_DB=SchedulerSyncPro        # defaults to 'SchedulerSyncPro'
```

## Key Domain Concepts

### Production Day Boundaries
Production days run from **8:00 AM to 8:00 AM** (Kazakhstan time, UTC+5). This is not calendar-day aligned. All date calculations in `lib/utils.ts` account for this.

### Shift Structure
- **Day shift**: 08:00 - 20:00
- **Night shift**: 20:00 - 08:00

### Production Targets
Defined in `types/production.ts` and `lib/utils.ts`:
- **Hourly**: 50 tonnes
- **Shift**: 600 tonnes
- **Daily**: 1,200 tonnes

### PPR Days (Planned Preventive Maintenance)
Maintenance days are hardcoded in `lib/utils.ts` in the `PPR_DAYS` array as `'YYYY-MM-DD'` strings. These days are excluded from production target calculations.

### Timezone
All server-side calculations use UTC+5 offset (`TIMEZONE_OFFSET = 5` in `lib/utils.ts`). Be careful with date math — always account for Kazakhstan timezone when working with production data boundaries.

## Architecture Patterns

### Data Fetching
- **Client-side only**: All pages use `'use client'` with `fetch()` calls to internal API routes
- **No caching**: API requests use `cache: 'no-store'`; route handlers use `force-dynamic` and `revalidate = 0`
- **Polling**: The main dashboard polls every 5 minutes via `setInterval`

### State Management
- React hooks only (`useState`, `useEffect`) — no external state libraries
- Each page/component manages its own state independently

### API Routes
- RESTful endpoints in `app/api/` using Next.js Route Handlers
- Direct MongoDB queries within route handlers (no ORM)
- Query parameters for filtering (e.g., `?start_date=`, `?shift_type=`)
- All routes return `{ success: boolean, data?: T, error?: string }`

### MongoDB Connection
`lib/mongodb.ts` provides `connectToDatabase()` which uses module-level caching for the MongoClient and Db instances. Connection pool is capped at 10 with `secondaryPreferred` read preference.

### Key MongoDB Collections
- `Rvo_Production_Job` — raw production metrics
- `Rvo_Production_Job_shift_report` — aggregated shift summaries
- `Quality_Analysis` — lab test results

## Code Conventions

### Language
- All UI text, comments, and commit messages are in **Russian**
- Variable names and code identifiers are in **English**

### TypeScript
- Strict mode enabled
- Path alias: `@/*` maps to project root (e.g., `@/lib/utils`, `@/types/production`)
- Interfaces preferred over type aliases for object shapes
- Export constants (like `PRODUCTION_TARGETS`) alongside type definitions

### Components
- Client components use `'use client'` directive at the top
- Components live in `app/components/` (flat structure, no nested folders)
- TailwindCSS for all styling — no CSS modules or styled-components
- Corporate color palette available via `corporate-*` Tailwind classes (e.g., `corporate-primary-500`, `corporate-success-500`)

### Commit Messages
- Written in **Russian**
- Descriptive, explaining what was changed (e.g., "Добавлена поддержка ППР дней на главной странице")
- No conventional commit prefixes (feat:, fix:, etc.)

## Sub-project: rafdez-app

The `rafdez-app/` directory contains a separate Next.js application for the Rafdez construction project management module. It can be deployed independently to `rafdez.vercel.app` and shares the same MongoDB backend. It has its own `package.json` and config files.

## Common Pitfalls

1. **Timezone arithmetic**: Always use the `TIMEZONE_OFFSET` constant and the helper functions in `lib/utils.ts` when calculating production day boundaries. Never assume calendar-day alignment.
2. **PPR days**: When adding new maintenance days, update the `PPR_DAYS` array in `lib/utils.ts`.
3. **No test suite**: There are no automated tests. Verify changes by running `npm run build` to catch type errors and build issues.
4. **`page.backup.tsx`**: A backup of a previous version of the main page exists at `app/page.backup.tsx` — do not delete or modify it unless explicitly asked.
5. **MongoDB collections**: Collection names contain mixed casing (e.g., `Rvo_Production_Job`). Use exact names when querying.
