# Portfolio Intelligence Dashboard

Local-first web app for tracking crypto and traditional assets with zero recurring costs.

## Features

- Track EVM (Ethereum) and Solana wallets
- Manual entry for banks and collectibles
- Automatic price fetching from CoinGecko (free tier)
- Liquidity tier classification (IMMEDIATE/FAST/SLOW)
- Runway calculations with configurable haircuts
- Stress scenario modeling
- Portfolio briefs with week-over-week analysis
- Historical snapshots with charts
- $0/month operating cost

## Hard Constraints

- No paid APIs
- No cloud hosting (runs locally)
- No background jobs (refresh on-demand only)
- No authentication (single user, local machine)
- SQLite database stored locally

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- Prisma ORM + SQLite
- ethers.js (EVM)
- @solana/web3.js (Solana)
- Recharts (visualization)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Initialize database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

3. Start development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## First-Time Usage

1. Go to **Settings** and configure:
   - USD to AUD FX rate
   - Monthly burn rate
   - Liquidity tier haircuts
   - Token lists (stablecoins, major tokens)

2. Add wallets:
   - EVM wallets with ERC-20 token allowlists
   - Solana wallets with SPL token allowlists

3. Add manual assets (optional):
   - Bank accounts
   - Collectibles

4. Go to **Dashboard** and click **Refresh Holdings**

## Data Sources

### EVM (Ethereum Mainnet)
- Native ETH balance
- ERC-20 tokens (allowlist-only, no auto-discovery)
- Default RPC: LlamaRPC, Ankr, PublicNode

### Solana
- Native SOL balance
- All SPL tokens filtered by:
  - Mint in allowlist OR
  - Estimated value >= threshold (default $20 AUD)
- Default RPC: Solana Foundation, ExtrNode

### Pricing
- CoinGecko free API
- 24-hour cache per token
- Rate limit handling (60s retry on 429)
- Manual coingeckoId overrides in Settings

## Liquidity Tiers

| Tier | Default Haircut | Assets |
|------|----------------|---------|
| IMMEDIATE | 0% | Bank cash, stablecoins (USDC, USDT, DAI) |
| FAST | 10% | Major tokens (ETH, SOL, BTC, WETH, WBTC) |
| SLOW | 40% | Everything else |

Configure tier assignments in Settings.

## Pages

### Dashboard
- Net worth (AUD)
- Asset class breakdown (Cash/Crypto/Collectibles)
- Top 10 exposures
- Chain breakdown (EVM/Solana/Manual)
- Unpriced assets list
- Refresh Holdings button

### Liquidity
- Liquidity buckets with haircuts applied
- Runway calculations (months)
- Stress scenarios:
  - Crypto -30%
  - Crypto -50%
  - Largest holding -60%
  - Liquidity freeze (SLOW → 70% haircut)

### History
- Net worth chart (last 50 snapshots)
- Snapshot list with delete actions

### Briefs
- Rule-based portfolio analysis
- Compares latest snapshot vs 7 days prior
- Top movers
- Concentration warnings
- Runway changes
- Risk flags

### Settings
- General: FX rate, burn rate, haircuts
- Wallets: Add/remove EVM and Solana wallets, manage allowlists
- Manual Assets: Banks and collectibles CRUD

## Database Location

`./prisma/portfolio.db`

Backup this file to preserve your data.

## Troubleshooting

### RPC Endpoints Failing
- Check your internet connection
- Try manual RPC URLs in Settings
- Default endpoints may have rate limits

### Tokens Not Showing
- EVM: Add contract address to wallet's allowlist
- Solana: Either add mint to allowlist OR ensure value meets threshold

### Prices Missing
- Check CoinGecko rate limits
- Add manual coingeckoId mapping in Settings
- Use stale prices if available (shows warning)

### Build Errors
```bash
rm -rf node_modules .next
npm install
npx prisma generate
npm run dev
```

## Limitations (V1)

- EVM: Ethereum mainnet only (no L2s, no other EVM chains)
- No DeFi position parsing (LP tokens, staking, lending)
- No NFT valuations
- No automatic FX rate updates
- No background refresh (manual button click only)
- No multi-user support

## Future Enhancements (Not in V1)

- Multi-chain EVM support
- DeFi protocol integrations
- NFT floor price tracking
- Automated FX rate updates
- Export to CSV/Excel
- Custom alerts
- Mobile-responsive improvements

## License

MIT
# Deployment 2026-01-28 12:21:23
