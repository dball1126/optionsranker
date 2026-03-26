# Database Schema

OptionsRanker uses SQLite via `better-sqlite3` with WAL mode enabled for concurrent reads.

## Tables

### users

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| email | TEXT | UNIQUE NOT NULL |
| username | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| display_name | TEXT | |
| tier | TEXT | DEFAULT 'free', CHECK IN ('free', 'pro') |
| created_at | TEXT | DEFAULT datetime('now') |
| updated_at | TEXT | DEFAULT datetime('now') |

### portfolios

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FK → users(id) CASCADE |
| name | TEXT | NOT NULL |
| description | TEXT | |
| is_default | INTEGER | DEFAULT 0 |
| created_at | TEXT | DEFAULT datetime('now') |
| updated_at | TEXT | DEFAULT datetime('now') |

### trades

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| portfolio_id | INTEGER | NOT NULL, FK → portfolios(id) CASCADE |
| user_id | INTEGER | NOT NULL, FK → users(id) CASCADE |
| symbol | TEXT | NOT NULL |
| option_type | TEXT | CHECK IN ('call', 'put', 'stock') |
| direction | TEXT | NOT NULL, CHECK IN ('buy', 'sell') |
| quantity | INTEGER | NOT NULL |
| strike_price | REAL | |
| expiration_date | TEXT | |
| entry_price | REAL | NOT NULL |
| exit_price | REAL | |
| status | TEXT | DEFAULT 'open', CHECK IN ('open', 'closed', 'expired') |
| strategy_tag | TEXT | |
| notes | TEXT | |
| opened_at | TEXT | DEFAULT datetime('now') |
| closed_at | TEXT | |

### watchlists

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FK → users(id) CASCADE |
| name | TEXT | NOT NULL |
| created_at | TEXT | DEFAULT datetime('now') |

### watchlist_items

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| watchlist_id | INTEGER | NOT NULL, FK → watchlists(id) CASCADE |
| symbol | TEXT | NOT NULL |
| added_at | TEXT | DEFAULT datetime('now') |
| notes | TEXT | |
| | | UNIQUE(watchlist_id, symbol) |

### learning_modules

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| slug | TEXT | UNIQUE NOT NULL |
| title | TEXT | NOT NULL |
| category | TEXT | NOT NULL, CHECK IN ('greeks', 'strategies', 'risk', 'fundamentals') |
| description | TEXT | |
| content_json | TEXT | NOT NULL (JSON) |
| difficulty | TEXT | DEFAULT 'beginner', CHECK IN ('beginner', 'intermediate', 'advanced') |
| sort_order | INTEGER | DEFAULT 0 |

### learning_progress

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FK → users(id) CASCADE |
| module_id | INTEGER | NOT NULL, FK → learning_modules(id) |
| status | TEXT | DEFAULT 'not_started', CHECK IN ('not_started', 'in_progress', 'completed') |
| quiz_score | REAL | |
| completed_at | TEXT | |
| updated_at | TEXT | DEFAULT datetime('now') |
| | | UNIQUE(user_id, module_id) |

### refresh_tokens

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FK → users(id) CASCADE |
| token_hash | TEXT | UNIQUE NOT NULL |
| expires_at | TEXT | NOT NULL |
| created_at | TEXT | DEFAULT datetime('now') |

## Entity Relationships

```
users 1──* portfolios
users 1──* trades
users 1──* watchlists
users 1──* learning_progress
users 1──* refresh_tokens
portfolios 1──* trades
watchlists 1──* watchlist_items
learning_modules 1──* learning_progress
```

## Indexes

- `idx_users_email` ON users(email)
- `idx_portfolios_user` ON portfolios(user_id)
- `idx_trades_portfolio` ON trades(portfolio_id)
- `idx_trades_user` ON trades(user_id)
- `idx_trades_symbol` ON trades(symbol)
- `idx_trades_status` ON trades(status)
- `idx_watchlists_user` ON watchlists(user_id)
- `idx_watchlist_items_list` ON watchlist_items(watchlist_id)
- `idx_learning_progress_user` ON learning_progress(user_id)
- `idx_refresh_tokens_user` ON refresh_tokens(user_id)
