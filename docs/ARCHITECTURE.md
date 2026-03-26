# Architecture

## System Overview

OptionsRanker is a monorepo application with three packages:

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│  ┌───────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │  Zustand   │  │  React   │  │    Recharts     │  │
│  │  Stores    │──│  Router  │──│    Charts        │  │
│  └─────┬─────┘  └──────────┘  └─────────────────┘  │
│        │                                             │
│  ┌─────┴─────┐                                      │
│  │ API Client │ ◄── JWT in Authorization header      │
│  └─────┬─────┘                                      │
└────────┼────────────────────────────────────────────┘
         │  HTTP (Vite proxy in dev)
         ▼
┌────────────────────────────────────────────────────┐
│                Express API Server                   │
│  ┌──────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  Routes   │──│ Middleware │──│   Services    │  │
│  │          │  │ (auth,val) │  │               │  │
│  └──────────┘  └────────────┘  └───────┬───────┘  │
│                                         │          │
│  ┌──────────────────────────────────────┴──────┐   │
│  │              Query Layer                     │   │
│  │         (Prepared Statements)                │   │
│  └──────────────────┬──────────────────────────┘   │
└─────────────────────┼──────────────────────────────┘
                      │
              ┌───────┴───────┐
              │    SQLite     │
              │   (WAL mode)  │
              └───────────────┘

┌─────────────────────────────────────────────────────┐
│              @optionsranker/shared                   │
│  Types │ Zod Schemas │ Strategy Constants            │
│  (imported by both client and server)                │
└─────────────────────────────────────────────────────┘
```

## Package Architecture

### shared/
Contains TypeScript types, Zod validation schemas, and constants. Both client and server import from this package, ensuring type safety across the full stack. Zod schemas are used for request validation on the server and form validation on the client.

### client/
Vite-powered React SPA. Key patterns:
- **Zustand stores** manage global state (auth, market data, portfolio, strategy builder)
- **API client** wraps fetch with JWT token management
- **Black-Scholes engine** runs client-side for instant P&L and Greeks feedback
- **Recharts** renders P&L diagrams, Greeks charts, and portfolio performance
- **Tailwind CSS** with a dark financial theme

### server/
Express API with layered architecture:
- **Routes** → define endpoints, apply middleware
- **Middleware** → auth (JWT), validation (Zod), error handling
- **Services** → business logic, calculations
- **Queries** → prepared SQLite statements
- **Utils** → Black-Scholes engine, error classes, logger

## Authentication Flow

```
Register/Login → Server returns { accessToken, refreshToken }
                                         │
Client stores tokens in localStorage     │
                                         ▼
API requests include: Authorization: Bearer <accessToken>
                                         │
                         ┌───────────────┤
                         ▼               ▼
                   Token valid      Token expired (401)
                   → proceed        → Client calls /auth/refresh
                                         │
                                         ▼
                                   New accessToken + rotated refreshToken
```

- Access tokens: 15-minute expiry, signed with JWT_SECRET
- Refresh tokens: 7-day expiry, stored as bcrypt hash in database, rotated on each use

## Data Flow

### Market Data
The market service provides a mock data layer with deterministic pricing based on symbol hashing. This allows consistent data within a session while simulating realistic market behavior. The service implements a `MarketDataProvider` interface for easy replacement with real APIs.

### Strategy Analysis
1. User selects strategy template or builds custom legs
2. Client-side Black-Scholes provides instant P&L preview
3. On "Analyze", server validates inputs and runs full analysis
4. Server returns: aggregate Greeks, P&L curve, breakevens, probability of profit

### Learning System
Module content is stored as JSON in SQLite. Each module contains sections of type `text`, `interactive`, or `quiz`. Progress is tracked per-user per-module with quiz scores.

## Key Design Decisions

1. **SQLite over PostgreSQL** - Zero-config setup, single-file database, sufficient for single-server deployment
2. **better-sqlite3 over Prisma** - Synchronous API, better performance, no code generation
3. **Zustand over Redux** - Minimal boilerplate, TypeScript-first, proven in workspace
4. **Dual Black-Scholes** - Client-side for instant UX, server-side for validated calculations
5. **npm workspaces** - Simple monorepo without Turborepo/Lerna complexity
6. **Mock market data** - Avoids API key requirements; swap-ready via service interface
