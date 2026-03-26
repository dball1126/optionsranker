import { Router } from 'express';
import * as marketService from '../services/market.service.js';
import { notFound } from '../utils/errors.js';
import type { ApiResponse, Quote, OptionsChain } from '@optionsranker/shared';

const router = Router();

router.get('/quote/:symbol', (req, res, next) => {
  try {
    const symbol = String(req.params.symbol);
    const quote = marketService.getQuote(symbol);
    if (!quote) throw notFound(`Quote not found for symbol: ${symbol}`);

    const response: ApiResponse<Quote> = {
      success: true,
      data: quote,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/chain/:symbol', (req, res, next) => {
  try {
    const symbol = String(req.params.symbol);
    const chain = marketService.getOptionsChain(symbol);
    if (!chain) throw notFound(`Options chain not found for symbol: ${symbol}`);

    const response: ApiResponse<OptionsChain> = {
      success: true,
      data: chain,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/search', (req, res, next) => {
  try {
    const query = (req.query.q as string) || '';
    const results = marketService.searchSymbols(query);

    const response: ApiResponse<Quote[]> = {
      success: true,
      data: results,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
