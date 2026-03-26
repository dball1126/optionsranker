# API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use the refresh endpoint to get a new one.

---

## Auth Endpoints

### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "trader1",
  "password": "securepassword",
  "displayName": "Trader One"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "trader1",
      "displayName": "Trader One",
      "tier": "free",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG..."
    }
  }
}
```

### POST /auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### POST /auth/refresh

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

### POST /auth/logout

**Protected.** Invalidates the refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

---

## Market Endpoints (Public)

### GET /market/quote/:symbol

Get a stock quote.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 178.52,
    "change": 2.34,
    "changePercent": 1.33,
    "volume": 58234100,
    "high": 179.80,
    "low": 176.20,
    "open": 176.50,
    "previousClose": 176.18,
    "timestamp": "2026-01-01T16:00:00.000Z"
  }
}
```

### GET /market/chain/:symbol

Get an options chain with 3 monthly expirations.

**Query params:**
- `expiration` (optional) - Filter to specific expiration date

**Response:**
```json
{
  "success": true,
  "data": {
    "underlying": "AAPL",
    "underlyingPrice": 178.52,
    "expirations": ["2026-02-21", "2026-03-21", "2026-04-17"],
    "chain": {
      "2026-02-21": {
        "calls": [
          {
            "symbol": "AAPL260221C00170000",
            "underlying": "AAPL",
            "type": "call",
            "strike": 170,
            "expiration": "2026-02-21",
            "bid": 9.50,
            "ask": 9.80,
            "last": 9.65,
            "volume": 1234,
            "openInterest": 5678,
            "impliedVolatility": 0.28,
            "greeks": { "delta": 0.72, "gamma": 0.03, "theta": -0.05, "vega": 0.18, "rho": 0.04 }
          }
        ],
        "puts": [...]
      }
    }
  }
}
```

### GET /market/search?q=

Search for stock symbols. Returns up to 10 matches.

---

## Strategy Endpoints

### POST /strategies/analyze

Analyze an options strategy.

**Request:**
```json
{
  "underlying": "AAPL",
  "underlyingPrice": 178.52,
  "legs": [
    { "type": "call", "direction": "buy", "quantity": 1, "strike": 180, "premium": 3.50 },
    { "type": "call", "direction": "sell", "quantity": 1, "strike": 190, "premium": 1.20 }
  ],
  "volatility": 0.28,
  "riskFreeRate": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "legs": [...],
    "greeks": { "delta": 0.35, "gamma": 0.02, "theta": -0.03, "vega": 0.10 },
    "maxProfit": 770,
    "maxLoss": -230,
    "breakeven": [182.30],
    "pnlData": [{ "price": 160, "pnl": -230 }, ...],
    "probabilityOfProfit": 0.42
  }
}
```

### GET /strategies/templates

Returns all pre-built strategy templates.

---

## Portfolio Endpoints (Protected)

### GET /portfolios
### POST /portfolios
### GET /portfolios/:id
### PUT /portfolios/:id
### DELETE /portfolios/:id

Standard CRUD operations for portfolios.

---

## Trade Endpoints (Protected)

### GET /trades?portfolio_id=&status=&symbol=

List trades with optional filters.

### POST /trades

Open a new trade.

**Request:**
```json
{
  "portfolioId": 1,
  "symbol": "AAPL",
  "optionType": "call",
  "direction": "buy",
  "quantity": 5,
  "strikePrice": 180,
  "expirationDate": "2026-03-21",
  "entryPrice": 3.50,
  "strategyTag": "bull_call_spread",
  "notes": "Expecting earnings beat"
}
```

### PUT /trades/:id/close

Close an open trade.

**Request:**
```json
{
  "exitPrice": 5.20
}
```

### DELETE /trades/:id

---

## Watchlist Endpoints (Protected)

### GET /watchlists
### POST /watchlists
### DELETE /watchlists/:id
### POST /watchlists/:id/items
### DELETE /watchlists/:id/items/:symbol

---

## Learning Endpoints

### GET /learning/modules (Public)

List all learning modules grouped by category.

### GET /learning/modules/:slug (Public)

Get a specific module with full content.

### GET /learning/progress (Protected)

Get user's learning progress across all modules.

### PUT /learning/progress/:moduleId (Protected)

Update progress for a module.

**Request:**
```json
{
  "status": "completed",
  "quizScore": 85
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": {}
}
```

Common status codes:
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden
- `404` - Not found
- `500` - Internal server error
