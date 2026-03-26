import bcrypt from 'bcrypt';
import { getDb, closeDb } from './connection.js';
import { setupDatabase } from './setup.js';
import { logger } from '../utils/logger.js';

async function seed(): Promise<void> {
  setupDatabase();
  const db = getDb();

  // Check if demo user already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@example.com');
  if (existing) {
    logger.info('Seed data already exists, skipping');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (email, username, display_name, password_hash, tier)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertPortfolio = db.prepare(`
    INSERT INTO portfolios (user_id, name, description, is_default)
    VALUES (?, ?, ?, ?)
  `);

  const insertModule = db.prepare(`
    INSERT INTO learning_modules (slug, title, category, description, difficulty, sort_order, content)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    // Create demo user
    const userResult = insertUser.run(
      'demo@example.com',
      'demo_trader',
      'Demo Trader',
      passwordHash,
      'free'
    );
    const userId = userResult.lastInsertRowid as number;

    // Create default portfolio
    insertPortfolio.run(userId, 'My Portfolio', 'Default trading portfolio', 1);

    // Seed learning modules
    const modules = getLearningModules();
    for (const mod of modules) {
      insertModule.run(
        mod.slug,
        mod.title,
        mod.category,
        mod.description,
        mod.difficulty,
        mod.sortOrder,
        JSON.stringify(mod.content)
      );
    }
  });

  seedAll();
  logger.info('Database seeded successfully');
}

function getLearningModules() {
  return [
    {
      slug: 'what-are-options',
      title: 'What Are Options?',
      category: 'fundamentals',
      description: 'Learn the basics of options contracts, how they work, and why traders use them.',
      difficulty: 'beginner',
      sortOrder: 1,
      content: {
        sections: [
          {
            type: 'text',
            title: 'Introduction to Options',
            body: 'An option is a financial contract that gives the buyer the right, but not the obligation, to buy or sell an underlying asset at a specified price (the strike price) on or before a specified date (the expiration date). The seller (or writer) of the option is obligated to fulfill the contract if the buyer exercises their right.\n\nThere are two basic types of options:\n\n**Call Options** give the holder the right to BUY the underlying asset at the strike price. Traders buy calls when they expect the price to go up.\n\n**Put Options** give the holder the right to SELL the underlying asset at the strike price. Traders buy puts when they expect the price to go down.\n\nThe price paid for an option is called the **premium**. This is the maximum amount a buyer can lose. Each standard equity option contract represents 100 shares of the underlying stock.'
          },
          {
            type: 'text',
            title: 'Key Terminology',
            body: '**Strike Price**: The price at which the option holder can buy (call) or sell (put) the underlying asset.\n\n**Expiration Date**: The last date on which the option can be exercised. After this date, the option becomes worthless.\n\n**Premium**: The price of the option contract. It is determined by factors including the underlying price, strike price, time to expiration, volatility, and interest rates.\n\n**In-the-Money (ITM)**: A call option is ITM when the stock price is above the strike price. A put option is ITM when the stock price is below the strike price.\n\n**Out-of-the-Money (OTM)**: A call is OTM when the stock price is below the strike. A put is OTM when the stock price is above the strike.\n\n**At-the-Money (ATM)**: When the stock price equals or is very close to the strike price.\n\n**Intrinsic Value**: The amount an option is in-the-money. For a call: max(0, stock price - strike). For a put: max(0, strike - stock price).\n\n**Time Value (Extrinsic Value)**: The portion of the premium above intrinsic value, representing the probability that the option could become more profitable before expiration.'
          },
          {
            type: 'quiz',
            title: 'Test Your Knowledge',
            quiz: [
              {
                question: 'What does a call option give the buyer the right to do?',
                options: [
                  'Sell the underlying asset at the strike price',
                  'Buy the underlying asset at the strike price',
                  'Borrow the underlying asset at the strike price',
                  'Short the underlying asset at the strike price'
                ],
                correctIndex: 1,
                explanation: 'A call option gives the buyer the right to BUY the underlying asset at the strike price. A put option gives the right to sell.'
              },
              {
                question: 'A call option with a strike price of $50 when the stock is trading at $55 is:',
                options: [
                  'Out-of-the-money',
                  'At-the-money',
                  'In-the-money with $5 intrinsic value',
                  'In-the-money with $50 intrinsic value'
                ],
                correctIndex: 2,
                explanation: 'The call is in-the-money because the stock price ($55) is above the strike price ($50). The intrinsic value is $55 - $50 = $5.'
              },
              {
                question: 'How many shares does one standard equity option contract represent?',
                options: ['10 shares', '50 shares', '100 shares', '1,000 shares'],
                correctIndex: 2,
                explanation: 'One standard equity option contract represents 100 shares of the underlying stock. So if an option premium is $2.00, the total cost is $200 (100 x $2.00).'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'understanding-delta',
      title: 'Understanding Delta',
      category: 'greeks',
      description: 'Delta measures how much an option price changes when the underlying stock moves $1.',
      difficulty: 'beginner',
      sortOrder: 2,
      content: {
        sections: [
          {
            type: 'text',
            title: 'What is Delta?',
            body: 'Delta is the most widely used of the option Greeks. It measures the rate of change in an option\'s price for a $1 change in the price of the underlying asset.\n\n**Call options** have delta values between 0 and +1.0. A delta of 0.50 means the option price will increase by approximately $0.50 for every $1 increase in the stock price.\n\n**Put options** have delta values between -1.0 and 0. A delta of -0.50 means the option price will increase by approximately $0.50 for every $1 decrease in the stock price.\n\nDelta is dynamic and changes as the stock price moves. Deep in-the-money options have deltas approaching 1.0 (or -1.0 for puts), meaning they move nearly dollar-for-dollar with the stock. Far out-of-the-money options have deltas near 0, meaning they are relatively insensitive to small stock price changes.'
          },
          {
            type: 'text',
            title: 'Delta as a Probability Proxy',
            body: 'Traders often use delta as a rough estimate of the probability that an option will expire in-the-money. For example, an option with a delta of 0.30 has roughly a 30% chance of finishing in-the-money at expiration.\n\nThis interpretation is not mathematically exact but provides a useful practical approximation. At-the-money options typically have a delta around 0.50, reflecting an approximately 50/50 chance of finishing in-the-money.\n\n**Position Delta**: For a portfolio of options, the total delta is the sum of the individual deltas multiplied by the number of contracts and the contract multiplier (usually 100). This tells you how much your entire position will gain or lose for a $1 move in the underlying.\n\nFor example, if you hold 5 call contracts with a delta of 0.40, your position delta is: 5 x 100 x 0.40 = 200. This means your position behaves like owning 200 shares of the stock.'
          },
          {
            type: 'quiz',
            title: 'Delta Quiz',
            quiz: [
              {
                question: 'A call option has a delta of 0.65. If the stock rises by $2, approximately how much will the option price increase?',
                options: ['$0.65', '$1.30', '$2.00', '$6.50'],
                correctIndex: 1,
                explanation: 'Delta tells us the change per $1 move. For a $2 move: 0.65 x $2 = $1.30. Note that this is an approximation since delta itself changes as the stock moves (this second-order effect is measured by gamma).'
              },
              {
                question: 'Which option would have a delta closest to -1.0?',
                options: [
                  'A deep out-of-the-money put',
                  'An at-the-money put',
                  'A deep in-the-money put',
                  'A deep in-the-money call'
                ],
                correctIndex: 2,
                explanation: 'Deep in-the-money put options have deltas approaching -1.0. They move almost dollar-for-dollar (inversely) with the stock price. Deep ITM calls approach +1.0.'
              },
              {
                question: 'If a trader says their position has a delta of 500, what does that mean?',
                options: [
                  'They own 500 options contracts',
                  'Their position behaves like owning 500 shares of stock',
                  'They will make $500 if the stock goes up',
                  'Their options are 500% in the money'
                ],
                correctIndex: 1,
                explanation: 'A position delta of 500 means the portfolio behaves approximately like a position of 500 shares. For every $1 the stock moves, the position gains or loses about $500.'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'understanding-gamma',
      title: 'Understanding Gamma',
      category: 'greeks',
      description: 'Gamma measures the rate of change of delta, showing how sensitive delta is to price movements.',
      difficulty: 'intermediate',
      sortOrder: 3,
      content: {
        sections: [
          {
            type: 'text',
            title: 'What is Gamma?',
            body: 'Gamma measures the rate of change of delta for a $1 change in the underlying asset price. While delta tells you how much an option price moves, gamma tells you how much delta itself will change.\n\nGamma is highest for at-the-money options and decreases for options that are further in-the-money or out-of-the-money. It is always positive for long option positions (both calls and puts).\n\nFor example, if a call option has a delta of 0.40 and a gamma of 0.05, and the stock rises by $1:\n- The option price increases by approximately $0.40 (the current delta)\n- The new delta becomes approximately 0.45 (0.40 + 0.05)\n\nThis means the next $1 move will have a larger impact on the option price. Gamma is what makes options a non-linear instrument.'
          },
          {
            type: 'text',
            title: 'Gamma and Time',
            body: 'Gamma increases significantly as an option approaches expiration, especially for at-the-money options. This phenomenon is sometimes called the "gamma effect" or "gamma risk."\n\nNear expiration, ATM options can have very high gamma, meaning their delta can swing wildly with small price movements. This is why the last few days before expiration are often the most volatile for options positions.\n\n**For option buyers (long gamma)**: High gamma is beneficial because it means delta moves in your favor. If the stock goes up, your call delta increases (you gain more per additional dollar). If the stock goes down, your call delta decreases (you lose less per additional dollar).\n\n**For option sellers (short gamma)**: High gamma is risky because delta moves against you. Selling options near expiration carries significant gamma risk, as a small adverse move in the stock can cause large, rapid losses.\n\nA common strategy consideration: buying options gives you positive gamma (convexity), while selling options gives you negative gamma (concavity). This is the fundamental risk/reward tradeoff between option buyers and sellers.'
          },
          {
            type: 'quiz',
            title: 'Gamma Quiz',
            quiz: [
              {
                question: 'An option has a delta of 0.50 and gamma of 0.08. After a $1 increase in the stock, what is the approximate new delta?',
                options: ['0.42', '0.50', '0.58', '0.66'],
                correctIndex: 2,
                explanation: 'New delta = current delta + gamma = 0.50 + 0.08 = 0.58. Gamma tells us how much delta changes per $1 move in the underlying.'
              },
              {
                question: 'When is gamma typically at its highest?',
                options: [
                  'For deep in-the-money options with lots of time',
                  'For at-the-money options near expiration',
                  'For out-of-the-money options with lots of time',
                  'For deep in-the-money options near expiration'
                ],
                correctIndex: 1,
                explanation: 'Gamma is highest for at-the-money options near expiration. This is when delta is most sensitive to price changes, as the option is on the knife-edge between expiring worthless and finishing in-the-money.'
              },
              {
                question: 'A trader who is "short gamma" has:',
                options: [
                  'Bought options and benefits from large moves',
                  'Sold options and is at risk from large moves',
                  'A delta-neutral position with no risk',
                  'Only long call positions'
                ],
                correctIndex: 1,
                explanation: 'Short gamma means the trader has sold options. This position suffers from large moves in either direction because delta moves against the position. Conversely, long gamma (buying options) benefits from large moves.'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'theta-time-decay',
      title: 'Theta & Time Decay',
      category: 'greeks',
      description: 'Theta quantifies how much value an option loses each day as it approaches expiration.',
      difficulty: 'intermediate',
      sortOrder: 4,
      content: {
        sections: [
          {
            type: 'text',
            title: 'What is Theta?',
            body: 'Theta measures the rate at which an option loses value as time passes, with all other factors held constant. It is expressed as the dollar amount an option will lose per day.\n\nTheta is almost always negative for long option positions because options lose time value as expiration approaches. For example, if an option has a theta of -0.05, it loses approximately $5 per contract per day (since each contract represents 100 shares).\n\n**Time decay is not linear.** Options lose time value at an accelerating rate as expiration approaches. An option with 60 days until expiration might lose $0.02 per day, but with only 5 days left, it might lose $0.10 per day. The rate of decay roughly follows a square root function relative to time.\n\nThis acceleration is why many professional option sellers prefer to sell options with 30-45 days to expiration, capturing the steepest portion of the time decay curve.'
          },
          {
            type: 'text',
            title: 'Theta in Practice',
            body: '**For option buyers**: Theta works against you. Every day that passes without a favorable move in the underlying costs you money. This is why timing is critical for option buyers. You need the stock to move enough, fast enough, to overcome the constant erosion of time value.\n\n**For option sellers**: Theta works in your favor. You collect premium upfront and profit as time value decays. Many income strategies (like covered calls and iron condors) are designed to capitalize on theta decay.\n\n**Theta and moneyness**: At-the-money options have the highest theta because they have the most time value to lose. Deep ITM and far OTM options have lower theta.\n\n**Weekend and holiday theta**: Although markets are closed on weekends, theta decay still occurs. Options pricing models account for calendar days, so options effectively lose value over weekends. Some traders look to sell options before weekends to capture this decay.\n\n**The theta-gamma tradeoff**: There is a fundamental relationship between theta and gamma. Long gamma positions (beneficial convexity) come with negative theta (time decay cost). Short gamma positions (risky convexity) come with positive theta (time decay income). You cannot have one without the other.'
          },
          {
            type: 'quiz',
            title: 'Theta Quiz',
            quiz: [
              {
                question: 'An option has a theta of -0.08. How much value does one contract lose per day approximately?',
                options: ['$0.08', '$0.80', '$8.00', '$80.00'],
                correctIndex: 2,
                explanation: 'Theta of -0.08 means the option loses $0.08 per share per day. Since one contract = 100 shares: $0.08 x 100 = $8.00 per day per contract.'
              },
              {
                question: 'When does time decay accelerate the most?',
                options: [
                  'Immediately after buying the option',
                  'During the first half of the option\'s life',
                  'As the option approaches expiration',
                  'Time decay is constant throughout'
                ],
                correctIndex: 2,
                explanation: 'Time decay accelerates as expiration approaches. The rate of decay follows approximately a square root function, with the steepest decline occurring in the final 30 days.'
              },
              {
                question: 'Which strategy benefits most from theta decay?',
                options: [
                  'Buying long-dated call options',
                  'Selling covered calls',
                  'Buying protective puts',
                  'Buying straddles before earnings'
                ],
                correctIndex: 1,
                explanation: 'Selling covered calls benefits from theta decay because you collect premium when selling the call. Each day that passes erodes the value of the option you sold, which is profitable for the seller.'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'vega-volatility',
      title: 'Vega & Volatility',
      category: 'greeks',
      description: 'Vega measures an option\'s sensitivity to changes in implied volatility.',
      difficulty: 'intermediate',
      sortOrder: 5,
      content: {
        sections: [
          {
            type: 'text',
            title: 'What is Vega?',
            body: 'Vega measures how much an option\'s price changes for a 1 percentage point change in implied volatility (IV). Unlike delta, gamma, and theta which relate to the underlying price or time, vega relates to the market\'s expectation of future volatility.\n\nFor example, if an option has a vega of 0.15 and implied volatility increases from 25% to 26% (a 1 point increase), the option price will increase by approximately $0.15 per share ($15 per contract).\n\n**Both calls and puts have positive vega.** Higher volatility increases the probability of the option finishing further in-the-money, making all options more valuable.\n\n**Vega is highest for at-the-money options** and for options with more time until expiration. Long-dated ATM options are most sensitive to volatility changes. A LEAP option (with over a year to expiration) will have significantly higher vega than a weekly option.'
          },
          {
            type: 'text',
            title: 'Implied Volatility in Practice',
            body: '**Implied Volatility (IV)** represents the market\'s forecast of the underlying stock\'s volatility over the life of the option. It is "implied" because it is derived from the option\'s market price using an options pricing model (like Black-Scholes).\n\n**IV Crush**: After major events like earnings announcements, IV often drops sharply as uncertainty resolves. This sudden decline in IV can cause options to lose significant value even if the stock moves in the expected direction. For example, you might buy a call before earnings, the stock goes up 3%, but your option loses money because IV dropped by 15 points.\n\n**Volatility Skew**: IV is not uniform across all strikes. Typically, out-of-the-money puts have higher IV than ATM or OTM calls. This is called the "volatility skew" and reflects the market\'s greater fear of downside moves.\n\n**Trading Volatility**: Rather than betting on direction, some traders focus on whether IV will rise or fall:\n- **Long vega** (buying options): Profits when IV increases\n- **Short vega** (selling options): Profits when IV decreases\n\nStrategies like straddles and strangles are often used to take positions on volatility itself, independent of market direction.'
          },
          {
            type: 'quiz',
            title: 'Vega Quiz',
            quiz: [
              {
                question: 'An option has a vega of 0.20. If implied volatility increases from 30% to 33%, how much does the option price change per share?',
                options: ['$0.20', '$0.40', '$0.60', '$6.00'],
                correctIndex: 2,
                explanation: 'Vega measures change per 1 point of IV. IV increased 3 points (30% to 33%), so: 0.20 x 3 = $0.60 per share increase in the option price.'
              },
              {
                question: 'What is "IV crush"?',
                options: [
                  'When implied volatility gradually decreases over months',
                  'A sharp drop in implied volatility after a major event like earnings',
                  'When all options in a chain have the same IV',
                  'When historical volatility exceeds implied volatility'
                ],
                correctIndex: 1,
                explanation: 'IV crush refers to the sharp decline in implied volatility after a major anticipated event (like an earnings report). The uncertainty premium built into options evaporates once the event occurs.'
              },
              {
                question: 'Which option position would benefit most from an increase in implied volatility?',
                options: [
                  'A short iron condor',
                  'A covered call',
                  'A long straddle',
                  'A short naked put'
                ],
                correctIndex: 2,
                explanation: 'A long straddle (buying both a call and a put at the same strike) has positive vega. Both legs benefit from an increase in implied volatility, making the combined position strongly long vega.'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'covered-call-strategy',
      title: 'Covered Call Strategy',
      category: 'strategies',
      description: 'Learn how to generate income by selling call options against stock you own.',
      difficulty: 'beginner',
      sortOrder: 6,
      content: {
        sections: [
          {
            type: 'text',
            title: 'How Covered Calls Work',
            body: 'A covered call is one of the most popular and beginner-friendly options strategies. It involves two components:\n\n1. **Own 100 shares** of the underlying stock (this is the "cover")\n2. **Sell 1 call option** against those shares\n\nWhen you sell the call, you collect premium immediately. In exchange, you agree to sell your shares at the strike price if the option is exercised.\n\n**Example**: You own 100 shares of XYZ at $50. You sell a $55 call expiring in 30 days for $1.50.\n- You collect $150 in premium (100 x $1.50)\n- If XYZ stays below $55, the call expires worthless, and you keep the premium plus your shares\n- If XYZ rises above $55, your shares are called away at $55. Your profit is ($55 - $50) + $1.50 = $6.50 per share\n- If XYZ drops, the $1.50 premium provides a small cushion against losses\n\n**Maximum profit**: (Strike - Purchase Price + Premium) x 100\n**Maximum loss**: (Purchase Price - Premium) x 100 (if stock goes to zero)\n**Breakeven**: Purchase Price - Premium received'
          },
          {
            type: 'text',
            title: 'When to Use Covered Calls',
            body: '**Ideal market conditions**: Neutral to slightly bullish. You want the stock to stay flat or rise modestly but not soar past your strike price.\n\n**Strike selection**: \n- Selling at-the-money calls provides more premium but higher chance of assignment\n- Selling out-of-the-money calls preserves more upside potential but generates less income\n- Many traders sell calls at a strike 5-10% above the current price for a balance\n\n**Expiration selection**: 30-45 days out is a popular choice. This timeframe captures the steepest theta decay while giving the stock enough time to behave predictably.\n\n**When NOT to use covered calls**:\n- If you expect a large upside move (your gains will be capped)\n- In strongly bearish markets (the small premium won\'t offset large stock losses)\n- Before major catalysts like earnings (assignment risk + opportunity cost)\n\n**Rolling**: If the stock approaches your strike near expiration, you can "roll" the position by buying back the current call and selling a new one at a higher strike and/or later expiration.'
          },
          {
            type: 'quiz',
            title: 'Covered Call Quiz',
            quiz: [
              {
                question: 'You own 100 shares at $40 and sell a $45 call for $2. What is your maximum profit?',
                options: ['$200', '$500', '$700', 'Unlimited'],
                correctIndex: 2,
                explanation: 'Maximum profit = (Strike - Stock Price + Premium) x 100 = ($45 - $40 + $2) x 100 = $700. Your upside is capped at the strike price, but you keep the premium.'
              },
              {
                question: 'What is the breakeven price for a covered call if you bought stock at $50 and sold a call for $3?',
                options: ['$47', '$50', '$53', '$56'],
                correctIndex: 0,
                explanation: 'Breakeven = Stock Purchase Price - Premium Received = $50 - $3 = $47. The premium collected lowers your effective cost basis.'
              },
              {
                question: 'Which market outlook best suits a covered call strategy?',
                options: [
                  'Very bullish - expecting a big rally',
                  'Neutral to slightly bullish',
                  'Very bearish - expecting a crash',
                  'Expecting high volatility in either direction'
                ],
                correctIndex: 1,
                explanation: 'Covered calls work best when you are neutral to slightly bullish. You want the stock to stay below the strike (so the call expires worthless and you keep the premium) or rise modestly.'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'bull-call-spread',
      title: 'Bull Call Spread',
      category: 'strategies',
      description: 'A defined-risk bullish strategy using two call options at different strikes.',
      difficulty: 'intermediate',
      sortOrder: 7,
      content: {
        sections: [
          {
            type: 'text',
            title: 'How Bull Call Spreads Work',
            body: 'A bull call spread (also called a debit call spread) is created by:\n\n1. **Buying a call** at a lower strike price\n2. **Selling a call** at a higher strike price\nBoth options have the same expiration date.\n\nThe sold call partially offsets the cost of the bought call, reducing the net premium (debit) paid. This makes the trade cheaper than buying a call outright, but it caps your potential profit.\n\n**Example**: Stock XYZ is at $100.\n- Buy the $100 call for $5.00\n- Sell the $105 call for $2.50\n- Net debit: $2.50 per share ($250 per spread)\n\n**Maximum profit**: (Difference in strikes - Net debit) x 100 = ($5 - $2.50) x 100 = $250\n**Maximum loss**: Net debit x 100 = $2.50 x 100 = $250\n**Breakeven**: Lower strike + Net debit = $100 + $2.50 = $102.50\n\nThis gives you a defined risk/reward of 1:1, which is better than it sounds because the probability of at least a partial profit is typically higher than 50%.'
          },
          {
            type: 'text',
            title: 'Strategy Considerations',
            body: '**When to use**: You are moderately bullish and want to reduce the cost of a long call position. You have a price target in mind (the upper strike).\n\n**Strike selection**:\n- Wide spreads (e.g., $100/$110) offer higher max profit but cost more and have lower probability\n- Narrow spreads (e.g., $100/$102) cost less and have higher probability but offer smaller max profit\n- Many traders set the long strike near ATM and the short strike near their price target\n\n**Expiration selection**: 30-60 days is common. Too short and theta decay hurts your long leg faster. Too long and you pay more for time value.\n\n**Advantages over a naked long call**:\n- Lower cost (reduced premium)\n- Lower breakeven point\n- Less sensitivity to time decay and IV changes\n\n**Disadvantages**:\n- Capped profit potential\n- Still lose the entire debit if the stock doesn\'t move up\n\n**Managing the trade**: Consider closing the spread when you\'ve captured 50-75% of max profit rather than holding to expiration. This locks in gains and removes the risk of the stock reversing.'
          },
          {
            type: 'quiz',
            title: 'Bull Call Spread Quiz',
            quiz: [
              {
                question: 'You create a bull call spread: buy the $80 call for $6, sell the $90 call for $2. What is the max profit?',
                options: ['$400', '$600', '$800', '$1,000'],
                correctIndex: 0,
                explanation: 'Max profit = (Width of spread - Net debit) x 100 = ($10 - $4) x 100 = $600... wait, let me recalculate. Net debit = $6 - $2 = $4. Max profit = ($90 - $80 - $4) x 100 = $600. Actually: Max profit = ($10 - $4) x 100 = $600.'
              },
              {
                question: 'What is the main advantage of a bull call spread over buying a call outright?',
                options: [
                  'Unlimited profit potential',
                  'No risk of loss',
                  'Lower cost and reduced breakeven',
                  'Higher delta exposure'
                ],
                correctIndex: 2,
                explanation: 'The sold call reduces the net premium paid, which lowers both the cost and the breakeven point. The tradeoff is that profit is capped at the short strike.'
              },
              {
                question: 'At expiration, a bull call spread with strikes $50/$55 and a net debit of $2 will be at max profit when the stock is at:',
                options: ['$50', '$52', '$55 or above', '$57'],
                correctIndex: 2,
                explanation: 'Max profit occurs when the stock is at or above the upper strike ($55) at expiration. Both options are exercised/assigned, and you capture the full width of the spread minus the debit paid.'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'iron-condor-strategy',
      title: 'Iron Condor',
      category: 'strategies',
      description: 'A neutral strategy that profits from low volatility and time decay within a defined range.',
      difficulty: 'advanced',
      sortOrder: 8,
      content: {
        sections: [
          {
            type: 'text',
            title: 'How Iron Condors Work',
            body: 'An iron condor is a four-legged options strategy that profits when the underlying stock stays within a defined price range. It combines a bull put spread and a bear call spread:\n\n1. **Sell an OTM put** (lower middle strike)\n2. **Buy a further OTM put** (lowest strike - protection)\n3. **Sell an OTM call** (upper middle strike)\n4. **Buy a further OTM call** (highest strike - protection)\n\nAll four options have the same expiration.\n\n**Example**: Stock XYZ is at $100.\n- Buy $90 put for $0.50\n- Sell $95 put for $1.50\n- Sell $105 call for $1.50\n- Buy $110 call for $0.50\n- Net credit: ($1.50 - $0.50) + ($1.50 - $0.50) = $2.00 per share ($200 per iron condor)\n\n**Maximum profit**: Net credit received = $200 (when stock stays between $95-$105)\n**Maximum loss**: Width of wider spread - Net credit = ($5 - $2) x 100 = $300\n**Breakeven points**: $95 - $2 = $93 (lower) and $105 + $2 = $107 (upper)\n\nThe "profit zone" is the range between the breakeven points where the trade makes money.'
          },
          {
            type: 'text',
            title: 'Managing Iron Condors',
            body: '**Ideal conditions**: Low to moderate implied volatility environment, range-bound market, no major catalysts expected.\n\n**Strike selection**: \n- Wider wings = more premium but more risk\n- Many traders sell the short strikes at 1 standard deviation (roughly 16 delta) for approximately 68% probability of profit\n- The long strikes (wings) are typically $2.50-$5 beyond the short strikes\n\n**Expiration**: 30-45 days is the sweet spot. This balances premium collection with manageable gamma risk.\n\n**Adjustment techniques**:\n- If the stock moves toward one side, you can roll the untested side closer to collect more premium\n- Close the entire trade at 50% of max profit to reduce risk of a reversal\n- If one side is breached, consider closing that side for a loss while leaving the other side to expire worthless\n\n**Key risks**:\n- A large, sudden move in either direction\n- An increase in implied volatility (hurts both sides)\n- Earnings or other binary events within the trade window\n\n**Greeks profile**: Iron condors are positive theta (benefit from time decay), negative gamma (hurt by large moves), and negative vega (hurt by IV increases). This is the classic "sell premium" profile.'
          },
          {
            type: 'quiz',
            title: 'Iron Condor Quiz',
            quiz: [
              {
                question: 'An iron condor profits most when:',
                options: [
                  'The stock makes a large move in either direction',
                  'Implied volatility increases sharply',
                  'The stock stays within the range of the short strikes',
                  'The stock trends strongly upward'
                ],
                correctIndex: 2,
                explanation: 'Iron condors reach maximum profit when the stock stays between the two short strikes at expiration. All four options expire worthless and you keep the entire credit received.'
              },
              {
                question: 'You sell an iron condor for a net credit of $3.00 with $5-wide wings. What is the maximum loss?',
                options: ['$200', '$300', '$500', '$800'],
                correctIndex: 0,
                explanation: 'Maximum loss = (Width of spread - Net credit) x 100 = ($5 - $3) x 100 = $200 per iron condor. The wings limit your risk to the width of the spread minus the credit received.'
              },
              {
                question: 'Which Greek is most beneficial for an iron condor position?',
                options: ['Positive delta', 'Positive gamma', 'Positive theta', 'Positive vega'],
                correctIndex: 2,
                explanation: 'Iron condors are positive theta strategies. They benefit from the passage of time because you sold premium that decays each day. Theta is working in your favor, eroding the value of the options you sold.'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'risk-management-basics',
      title: 'Risk Management Basics',
      category: 'risk',
      description: 'Essential principles for managing risk when trading options.',
      difficulty: 'beginner',
      sortOrder: 9,
      content: {
        sections: [
          {
            type: 'text',
            title: 'Why Risk Management Matters',
            body: 'Options trading offers significant leverage, which amplifies both gains and losses. Without proper risk management, a few bad trades can wipe out an entire account. Professional traders consistently cite risk management as the single most important factor in long-term trading success.\n\n**The cardinal rules of options risk management:**\n\n1. **Never risk more than you can afford to lose.** Options can expire worthless, meaning you can lose 100% of your investment. Only trade with capital you can afford to lose entirely.\n\n2. **Define your risk before entering a trade.** Know your maximum possible loss before you click "buy." Use defined-risk strategies (spreads) rather than unlimited-risk positions when possible.\n\n3. **Use stop losses or adjustment plans.** Have a predetermined exit point. Many traders set a rule like: "Close the position if it loses 50% of its value" or "Close if the underlying crosses this price level."\n\n4. **Diversify across underlyings, strategies, and timeframes.** Don\'t put all your capital in one trade, one stock, or one expiration date.\n\n5. **Keep position sizes small.** Even the best trade setup can go wrong. If you size correctly, no single loss will significantly damage your account.'
          },
          {
            type: 'text',
            title: 'Practical Risk Management Techniques',
            body: '**The 1-2% Rule**: Never risk more than 1-2% of your total account on a single trade. If your account is $50,000, your maximum loss on any trade should be $500-$1,000. This ensures you can survive a long losing streak without catastrophic drawdown.\n\n**Portfolio-level risk**: Keep your total portfolio risk under control. A common guideline is to have no more than 5-10% of your account at risk at any given time across all positions.\n\n**Correlation risk**: Avoid having too many positions in correlated assets. If you have bullish trades on AAPL, MSFT, GOOGL, and QQQ, you effectively have one large bet on tech stocks. A sector-wide downturn would hit all positions simultaneously.\n\n**Gamma risk management**: Be cautious with short options near expiration. The gamma exposure increases dramatically, and a small adverse move can cause outsized losses. Many traders close short options positions 5-7 days before expiration.\n\n**Liquidity matters**: Trade options with tight bid-ask spreads and reasonable volume. Illiquid options can be difficult to exit at fair prices, especially during volatile markets.\n\n**Keep a trading journal**: Document every trade including your reasoning, entry/exit prices, profit/loss, and lessons learned. Review it regularly to identify patterns in your wins and losses. This is one of the most effective ways to improve over time.'
          },
          {
            type: 'quiz',
            title: 'Risk Management Quiz',
            quiz: [
              {
                question: 'Following the 1-2% rule with a $100,000 account, what is the maximum you should risk on a single trade?',
                options: ['$500', '$1,000-$2,000', '$5,000-$10,000', '$20,000'],
                correctIndex: 1,
                explanation: 'The 1-2% rule says to risk no more than 1-2% of your total account per trade. For a $100,000 account: 1% = $1,000, 2% = $2,000. So the maximum risk should be $1,000-$2,000.'
              },
              {
                question: 'Which practice helps most with long-term trading improvement?',
                options: [
                  'Increasing position sizes after a winning streak',
                  'Keeping a detailed trading journal',
                  'Always holding options to expiration',
                  'Concentrating in one sector for expertise'
                ],
                correctIndex: 1,
                explanation: 'A trading journal helps you identify patterns in your decision-making, learn from mistakes, and refine your strategy over time. It is consistently cited by professional traders as essential for improvement.'
              },
              {
                question: 'Why is correlation risk important to manage?',
                options: [
                  'Correlated positions are always unprofitable',
                  'Multiple positions in correlated assets behave like one large bet',
                  'Correlation guarantees losses',
                  'It only matters for stock positions, not options'
                ],
                correctIndex: 1,
                explanation: 'Positions in correlated assets (like multiple tech stocks) tend to move together. What appears to be diversified across five positions may actually be one concentrated bet on a single sector or theme.'
              }
            ]
          }
        ]
      }
    },
    {
      slug: 'position-sizing',
      title: 'Position Sizing',
      category: 'risk',
      description: 'Learn how to determine the right size for each trade based on your risk tolerance.',
      difficulty: 'intermediate',
      sortOrder: 10,
      content: {
        sections: [
          {
            type: 'text',
            title: 'The Importance of Position Sizing',
            body: 'Position sizing is arguably the most impactful factor in trading success, yet it is often overlooked by beginners who focus on finding the "perfect" entry. The right position size ensures you can survive drawdowns, avoid emotional decision-making, and compound returns over time.\n\n**Fixed Dollar Amount**: Allocate the same dollar amount to each trade. For example, never put more than $2,000 into any single options trade. Simple and easy to implement.\n\n**Percentage of Account**: Risk a fixed percentage (typically 1-5%) of your account per trade. As your account grows, your position sizes grow proportionally. As it shrinks, positions automatically reduce, protecting against ruin.\n\n**Kelly Criterion**: A mathematical formula that calculates the optimal bet size based on your edge (win rate and payoff ratio). Kelly suggests: f* = (bp - q) / b, where b = odds received, p = probability of winning, q = probability of losing. Most traders use "half Kelly" (half the suggested amount) for a more conservative approach.\n\n**Volatility-based sizing**: Adjust position size based on the underlying\'s volatility. In a highly volatile stock, use smaller positions. In calmer markets, you can size up slightly. ATR (Average True Range) is commonly used to normalize position sizes across different instruments.'
          },
          {
            type: 'text',
            title: 'Position Sizing for Options',
            body: '**Options-specific considerations**:\n\nSince options provide leverage, the notional exposure can be much larger than the capital deployed. A $500 option position might control $10,000 worth of stock. Always think about both the premium at risk AND the notional exposure.\n\n**For defined-risk strategies** (spreads, iron condors):\n- Risk per trade = maximum loss of the spread\n- Number of contracts = (Account risk budget) / (Max loss per spread)\n- Example: $50,000 account, 2% risk = $1,000 budget. If an iron condor has $300 max loss, you can trade 3 contracts.\n\n**For undefined-risk strategies** (naked puts, short strangles):\n- Use margin requirements as a guide, but also set a stop-loss level\n- Many brokers require substantial margin for naked options\n- Conservative rule: treat the margin requirement as your position size limit\n\n**Scaling in and out**:\n- Instead of putting on the full position at once, scale in over 2-3 entries\n- Take partial profits (e.g., close half at 50% profit, hold the rest)\n- This reduces timing risk and allows you to average into better prices\n\n**Portfolio heat**: The total risk across all open positions. Keep portfolio heat under 10-15% of account value. If you have five positions each risking 2%, your portfolio heat is 10%.'
          },
          {
            type: 'quiz',
            title: 'Position Sizing Quiz',
            quiz: [
              {
                question: 'Your account is $25,000. You want to risk 2% per trade on iron condors with $500 max loss each. How many contracts can you trade?',
                options: ['1 contract', '2 contracts', '5 contracts', '10 contracts'],
                correctIndex: 0,
                explanation: 'Risk budget = 2% x $25,000 = $500. Each iron condor risks $500 max. $500 / $500 = 1 contract. You can only trade 1 contract to stay within your risk limit.'
              },
              {
                question: 'Why do most practitioners use "half Kelly" instead of the full Kelly Criterion?',
                options: [
                  'Full Kelly is illegal for retail traders',
                  'Half Kelly provides a more conservative approach to account for uncertainty',
                  'Full Kelly only works for stocks, not options',
                  'Half Kelly doubles your returns'
                ],
                correctIndex: 1,
                explanation: 'The Kelly Criterion assumes perfect knowledge of your edge and probabilities. In reality, these are estimates. Half Kelly significantly reduces the risk of ruin while only modestly reducing long-term returns, providing a buffer against estimation errors.'
              },
              {
                question: 'What is "portfolio heat"?',
                options: [
                  'The performance of your best-performing positions',
                  'The total risk across all open positions',
                  'The implied volatility of your portfolio',
                  'The number of trades you make per day'
                ],
                correctIndex: 1,
                explanation: 'Portfolio heat is the total amount of capital at risk across all open positions. For example, five positions each risking 2% of account value equals 10% portfolio heat. Keeping this under 10-15% helps prevent catastrophic drawdowns.'
              }
            ]
          }
        ]
      }
    }
  ];
}

// Run directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js')
);

if (isMain) {
  seed()
    .then(() => {
      closeDb();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      closeDb();
      process.exit(1);
    });
}
