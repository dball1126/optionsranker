from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


LIQUIDITY_SPREAD_LIMIT = 0.10
LONG_PROFIT_CAP_PCT = 0.20


@dataclass(frozen=True)
class RequiredColumns:
    underlying_price: str = "underlying_price"
    option_type: str = "option_type"
    strike_price: str = "strike_price"
    bid: str = "bid"
    ask: str = "ask"
    delta: str = "delta"
    implied_volatility: str = "implied_volatility"
    days_to_expiration: str = "days_to_expiration"
    ticker: str = "ticker"


def _validate_columns(df: pd.DataFrame, columns: RequiredColumns) -> None:
    required = {
        columns.underlying_price,
        columns.option_type,
        columns.strike_price,
        columns.bid,
        columns.ask,
        columns.delta,
        columns.implied_volatility,
        columns.days_to_expiration,
    }
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")


def _liquidity_filter(df: pd.DataFrame, columns: RequiredColumns) -> pd.DataFrame:
    spread_ratio = (df[columns.ask] - df[columns.bid]) / df[columns.ask]
    return df[
        (df[columns.bid] > 0)
        & (df[columns.ask] > 0)
        & (spread_ratio <= LIQUIDITY_SPREAD_LIMIT)
    ].copy()


def _long_candidates(df: pd.DataFrame, columns: RequiredColumns, option_type: str) -> list[dict]:
    subset = df[df[columns.option_type].str.lower() == option_type].copy()
    candidates: list[dict] = []

    for _, row in subset.iterrows():
        debit = float(row[columns.ask]) * 100.0
        if debit <= 0:
            continue

        pop = min(max(abs(float(row[columns.delta])), 0.0), 1.0)
        underlying_price = float(row[columns.underlying_price])
        max_profit = underlying_price * LONG_PROFIT_CAP_PCT * 100.0
        max_loss = debit
        ev = (pop * max_profit) - ((1.0 - pop) * max_loss)
        if ev <= 0:
            continue

        dte = max(int(row[columns.days_to_expiration]), 1)
        eroc = ev / debit
        aeroc = eroc * (365.0 / dte)
        strike = float(row[columns.strike_price])

        candidates.append(
            {
                "Ticker": row.get(columns.ticker, "UNKNOWN"),
                "Strategy Type": "Long Call" if option_type == "call" else "Long Put",
                "Strikes": f"{strike:.2f}",
                "DTE": dte,
                "Debit Paid": round(debit, 2),
                "POP": round(pop, 4),
                "EV": round(ev, 2),
                "EROC": round(eroc, 4),
                "AEROC": round(aeroc, 4),
            }
        )

    return candidates


def _vertical_spread_candidates(df: pd.DataFrame, columns: RequiredColumns, option_type: str) -> list[dict]:
    subset = (
        df[df[columns.option_type].str.lower() == option_type]
        .sort_values(by=[columns.days_to_expiration, columns.strike_price])
        .copy()
    )
    candidates: list[dict] = []

    group_keys = [columns.days_to_expiration]
    if columns.ticker in subset.columns:
        group_keys.insert(0, columns.ticker)

    for _, group in subset.groupby(group_keys):
        rows = list(group.to_dict("records"))
        for i, left in enumerate(rows):
            for right in rows[i + 1:]:
                if int(left[columns.days_to_expiration]) != int(right[columns.days_to_expiration]):
                    continue

                if option_type == "call":
                    long_leg, short_leg = left, right
                    strategy_name = "Bull Call Spread"
                else:
                    short_leg, long_leg = left, right
                    strategy_name = "Bear Put Spread"

                long_strike = float(long_leg[columns.strike_price])
                short_strike = float(short_leg[columns.strike_price])
                width = abs(short_strike - long_strike) * 100.0
                debit = (float(long_leg[columns.ask]) - float(short_leg[columns.bid])) * 100.0
                if debit <= 0 or width <= debit:
                    continue

                long_delta = abs(float(long_leg[columns.delta]))
                short_delta = abs(float(short_leg[columns.delta]))
                pop = min(max(long_delta - short_delta, 0.0), 1.0)
                max_profit = width - debit
                max_loss = debit
                ev = (pop * max_profit) - ((1.0 - pop) * max_loss)
                if ev <= 0:
                    continue

                dte = max(int(long_leg[columns.days_to_expiration]), 1)
                eroc = ev / debit
                aeroc = eroc * (365.0 / dte)

                candidates.append(
                    {
                        "Ticker": long_leg.get(columns.ticker, "UNKNOWN"),
                        "Strategy Type": strategy_name,
                        "Strikes": f"{long_strike:.2f}/{short_strike:.2f}",
                        "DTE": dte,
                        "Debit Paid": round(debit, 2),
                        "POP": round(pop, 4),
                        "EV": round(ev, 2),
                        "EROC": round(eroc, 4),
                        "AEROC": round(aeroc, 4),
                    }
                )

    return candidates


def rank_aeroc_strategies(
    option_chain: pd.DataFrame,
    top_n: int = 10,
    columns: RequiredColumns = RequiredColumns(),
) -> pd.DataFrame:
    _validate_columns(option_chain, columns)
    filtered = _liquidity_filter(option_chain, columns)

    if filtered.empty:
        return pd.DataFrame(columns=["Ticker", "Strategy Type", "Strikes", "DTE", "Debit Paid", "POP", "EV", "EROC", "AEROC"])

    candidates: list[dict] = []
    candidates.extend(_long_candidates(filtered, columns, "call"))
    candidates.extend(_long_candidates(filtered, columns, "put"))
    candidates.extend(_vertical_spread_candidates(filtered, columns, "call"))
    candidates.extend(_vertical_spread_candidates(filtered, columns, "put"))

    ranked = pd.DataFrame(candidates)
    if ranked.empty:
        return ranked

    ranked = ranked.sort_values("AEROC", ascending=False).head(top_n).reset_index(drop=True)
    return ranked


if __name__ == "__main__":
    sample = pd.DataFrame(
        [
            {
                "ticker": "AAPL",
                "underlying_price": 210.0,
                "option_type": "Call",
                "strike_price": 210.0,
                "bid": 6.1,
                "ask": 6.4,
                "delta": 0.52,
                "implied_volatility": 0.28,
                "days_to_expiration": 30,
            },
            {
                "ticker": "AAPL",
                "underlying_price": 210.0,
                "option_type": "Call",
                "strike_price": 215.0,
                "bid": 4.0,
                "ask": 4.3,
                "delta": 0.38,
                "implied_volatility": 0.27,
                "days_to_expiration": 30,
            },
            {
                "ticker": "AAPL",
                "underlying_price": 210.0,
                "option_type": "Put",
                "strike_price": 210.0,
                "bid": 5.9,
                "ask": 6.2,
                "delta": -0.48,
                "implied_volatility": 0.29,
                "days_to_expiration": 30,
            },
            {
                "ticker": "AAPL",
                "underlying_price": 210.0,
                "option_type": "Put",
                "strike_price": 205.0,
                "bid": 3.7,
                "ask": 4.0,
                "delta": -0.31,
                "implied_volatility": 0.28,
                "days_to_expiration": 30,
            },
        ]
    )
    print(rank_aeroc_strategies(sample))
