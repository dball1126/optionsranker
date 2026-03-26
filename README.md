# OptionsRanker - Options Ranking & Learning Platform

A comprehensive platform for options trading education, strategy analysis, and portfolio tracking. Built with React, Node.js/Express, and SQLite.

## Features

- **Options Education** - Interactive lessons covering Greeks, strategies, risk management, and fundamentals with quizzes and progress tracking
- **Strategy Builder** - Visual strategy analyzer with P&L diagrams, Greeks calculations, and breakeven analysis for 10+ pre-built strategies
- **Market Data** - Real-time stock quotes and options chain viewer with search
- **Portfolio Tracker** - Track trades, monitor open positions, and review trade history
- **Watchlists** - Save and monitor your favorite symbols
- **Authentication** - Secure JWT-based auth with refresh token rotation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS |
| State | Zustand |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Node.js, Express 5, TypeScript |
| Database | SQLite via better-sqlite3 |
| Auth | bcrypt + JWT |
| Validation | Zod (shared client/server) |

## Project Structure

```
optionsranker/
├── shared/          # Shared types, validation schemas, constants
│   └── src/
│       ├── types/       # TypeScript interfaces
│       ├── validation/  # Zod schemas
│       └── constants/   # Strategy templates
├── client/          # React SPA
│   └── src/
│       ├── api/         # API client layer
│       ├── stores/      # Zustand state management
│       ├── components/  # UI, layout, feature components
│       ├── pages/       # Route-level pages
│       └── lib/         # Utilities, Black-Scholes engine
├── server/          # Express API
│   └── src/
│       ├── config/      # Environment config
│       ├── db/          # Schema, migrations, queries
│       ├── middleware/   # Auth, validation, error handling
│       ├── routes/      # API route definitions
│       ├── services/    # Business logic
│       └── utils/       # Black-Scholes, logger, errors
└── docs/            # Documentation
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Install all dependencies (root, shared, client, server)
npm install

# Set up environment variables
cp .env.example .env

# Initialize the database with schema
npm run db:setup

# Seed with demo data and learning modules
npm run db:seed
```

### Development

```bash
# Run both client and server in development mode
npm run dev

# Or run them separately:
npm run dev:client   # Vite dev server on http://localhost:5173
npm run dev:server   # Express API on http://localhost:3001
```

### Production Build

```bash
npm run build
npm start
```

### Demo Account

After seeding, you can log in with:
- Email: `demo@example.com`
- Password: `password123`

## API Overview

All API endpoints are under `/api`. See [docs/API.md](docs/API.md) for full documentation.

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login |
| `GET /api/market/quote/:symbol` | Get stock quote |
| `GET /api/market/chain/:symbol` | Get options chain |
| `GET /api/market/search` | Search symbols |
| `POST /api/strategies/analyze` | Analyze option strategy |
| `GET /api/learning/modules` | List education modules |
| `GET /api/portfolios` | List portfolios (auth) |
| `POST /api/trades` | Create trade (auth) |

## Key Concepts

### Black-Scholes Engine

The platform includes a full Black-Scholes-Merton implementation for calculating option prices and Greeks (Delta, Gamma, Theta, Vega, Rho). This runs both client-side for instant feedback and server-side for validated calculations.

### Strategy Templates

10 pre-built strategies with visual P&L analysis:
- Long Call, Long Put
- Covered Call, Protective Put
- Bull Call Spread, Bear Put Spread
- Iron Condor, Iron Butterfly
- Straddle, Strangle

### Learning System

Structured modules covering:
- **Fundamentals** - What are options, how they work
- **Greeks** - Delta, Gamma, Theta, Vega explanations with interactive visualizations
- **Strategies** - How and when to use each strategy
- **Risk Management** - Position sizing, risk metrics

## License

MIT
