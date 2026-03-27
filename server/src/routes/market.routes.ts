import { Router } from 'express';
import * as marketService from '../services/market.service.js';
import { notFound } from '../utils/errors.js';
import type { ApiResponse, Quote, OptionsChain } from '@optionsranker/shared';

const router = Router();

router.get('/quote/:symbol', async (req, res, next) => {
  try {
    const symbol = String(req.params.symbol);
    const quote = await marketService.getQuote(symbol);
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

router.get('/chain/:symbol', async (req, res, next) => {
  try {
    const symbol = String(req.params.symbol);
    const chain = await marketService.getOptionsChain(symbol);
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

router.get('/search', async (req, res, next) => {
  try {
    const query = (req.query.q as string) || '';
    const results = await marketService.searchSymbols(query);

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
