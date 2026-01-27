# Portfolio Intelligence Dashboard - Project Handoff Summary

## Product Goals
- **Local-first portfolio tracker** for cryptocurrency and traditional assets with real-time valuations
- **Dual snapshot system**: Live dashboard refreshes without creating history; snapshots saved every 48 hours for trend analysis
- **Multi-currency support**: AUD/USD display toggle, ETH-denominated NFTs, manual FX/ETH price override

## Data Model & Architecture
- **Next.js 15 App Router** + TypeScript + Prisma ORM with SQLite
- **Three data sources**: EVM wallets, Solana wallets, manual assets (13 types: BANK, CASH, CRYPTO, STABLECOIN, NFT, EQUITIES, REAL_ESTATE, CAR, GIFTCARD, SUPERANNUATION, COLLECTIBLE, AIRDROP, PRIVATE_INVESTMENT, MISC)
- **Liquidity tiers**: IMMEDIATE (cash, stablecoins), FAST (crypto), SLOW (NFTs, real estate, locked assets)
- **Currency handling**: Manual assets track original currency (AUD/USD/ETH); values stored in `valueAud` field but represent entered currency

## Current Features
- **Dashboard**: Real-time portfolio value with historical comparison, asset allocation pie chart (left) + vertical list (right), all holdings table with wallet labels
- **Asset Allocation**: Separate categories for Crypto, Stablecoins, NFTs, Equities, AUD Cash, USD Cash, Other
- **Manual price inputs**: FX rate and ETH price override fields (left of refresh button)
- **History**: Net worth graph (500 snapshots, Y-axis in millions, contrasting background), snapshot management
- **Settings**: Wallet management, manual assets CRUD, liquidity haircuts, price overrides

## UI Decisions
- **All Holdings first**: Positioned above Asset Allocation for quick access
- **Wallet identifiers**: ETH/SOL holdings show wallet label or truncated address below source type
- **Currency display logic**: Values display in originally entered currency, with auto-calculated conversion
- **Clickable portfolio value**: Toggle between AUD/USD by clicking amount or currency label
- **Hidden zero-value assets**: AIRDROP and PRIVATE_INVESTMENT excluded from All Holdings

## Known Issues & Critical Bug
- ⚠️ **CRITICAL**: React useEffect not executing on page load - API calls to `/api/calculate`, `/api/manual-assets`, `/api/wallets` never trigger
- **Symptom**: Page loads with infinite loading spinner, no data appears
- **Investigation done**: Build passes, server runs correctly on port 3000, APIs work when called directly
- **Root cause**: Unknown - likely browser cache or React Strict Mode issue
- **Workaround needed**: Hard refresh (Cmd+Shift+R), clear cache, or use incognito mode

## Recent Changes (Last Session)
- Added CRYPTO and STABLECOIN manual asset types with proper liquidity tiers
- Redesigned Asset Allocation widget (pie chart left, list right)
- Increased History graph snapshot limit from 50 to 500
- Added wallet name labels to All Holdings table for on-chain assets
- Fixed useEffect cleanup with `isActive` flag to prevent memory leaks
- Created helper functions (`loadManualAssetsHelper`, `loadWalletsHelper`) for refresh handler

## Next Tasks
1. **Fix critical loading bug** - Debug why useEffect doesn't execute (check React DevTools, add console logs, test in production build)
2. Test all new features (CRYPTO/STABLECOIN types, Asset Allocation layout, wallet labels)
3. Verify manual FX/ETH price inputs actually update prices throughout dashboard
4. Test snapshot creation respects 48-hour rate limit
5. Performance optimization if Solana RPC calls cause delays

## File Locations
- Main dashboard: `src/app/page.tsx` (651 lines)
- History: `src/app/history/page.tsx`
- Types: `src/types/index.ts`
- API routes: `src/app/api/{calculate,refresh,manual-assets,wallets,snapshots}/route.ts`
- Manual asset dialog: `src/components/ManualAssetDialog.tsx`

## Technical Details

### Asset Type → Liquidity Tier Mapping
```typescript
IMMEDIATE: BANK, CASH, STABLECOIN
FAST: CRYPTO
SLOW: NFT, EQUITIES, REAL_ESTATE, CAR, GIFTCARD, SUPERANNUATION, COLLECTIBLE, MISC
```

### API Endpoints
- `GET /api/calculate` - Live data without creating snapshot (used by dashboard)
- `POST /api/refresh` - Creates snapshot if >48h since last (used by History)
- `GET /api/manual-assets` - List all manual assets
- `GET /api/wallets` - List all wallets with allowlists
- `GET /api/snapshots?limit=N` - Historical snapshots

### Currency Display Logic (All Holdings Table)
```typescript
if (manualAsset && currency === 'USD') {
  // valueAud field contains USD value
  displayValueUsd = holding.valueAud
  displayValueAud = holding.valueAud * fxRate
} else if (manualAsset && currency === 'AUD') {
  // valueAud field contains AUD value
  displayValueAud = holding.valueAud
  displayValueUsd = holding.valueAud / fxRate
} else {
  // On-chain crypto: valueAud is in AUD
  displayValueAud = holding.valueAud
  displayValueUsd = holding.valueAud / fxRate
}
```

## Development Commands
- `npm run dev` - Start dev server (port 3000)
- `npm run build` - Production build
- `npx prisma studio` - Database GUI
- `npx prisma db push` - Update database schema

## Last Session Summary
Date: 2026-01-08

**Completed:**
- ✅ Added CRYPTO and STABLECOIN asset types
- ✅ Updated Asset Allocation widget layout
- ✅ Added wallet labels to All Holdings
- ✅ Increased history graph to 500 snapshots
- ✅ Formatted Y-axis in millions
- ✅ Added contrasting background to graph

**Blocked:**
- ❌ App not loading in browser (useEffect not executing)
- ❌ Needs immediate debugging before further development

**Server Status:**
- Running on http://localhost:3000
- Build passes with no TypeScript errors
- All API endpoints functional when tested directly
