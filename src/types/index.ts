export type ChainType = 'EVM' | 'SOL' | 'HYPE'
export type LiquidityTier = 'IMMEDIATE' | 'FAST' | 'SLOW'
export type ManualAssetType = 'BANK' | 'COLLECTIBLE' | 'REAL_ESTATE' | 'EQUITIES' | 'NFT' | 'MISC' | 'AIRDROP' | 'PRIVATE_INVESTMENT' | 'CASH' | 'CAR' | 'GIFTCARD' | 'SUPERANNUATION' | 'CRYPTO' | 'STABLECOIN'
export type HoldingSource = 'EVM' | 'SOL' | 'HYPE' | 'BANK' | 'COLLECTIBLE' | 'REAL_ESTATE' | 'EQUITIES' | 'NFT' | 'MISC' | 'AIRDROP' | 'PRIVATE_INVESTMENT' | 'CASH' | 'CAR' | 'GIFTCARD' | 'SUPERANNUATION' | 'CRYPTO' | 'STABLECOIN'

export interface AppSettings {
  fxUsdAud: number
  ethPriceUsd?: number
  monthlyBurnAud: number
  haircutImmediate: number
  haircutFast: number
  haircutSlow: number
  stablecoins: string[]
  majorTokens: string[]
  evmRpcUrls: string[]
  solanaRpcUrls: string[]
  solMinValueAud: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  fxUsdAud: 1.50,
  monthlyBurnAud: 5000,
  haircutImmediate: 0,
  haircutFast: 0.10,
  haircutSlow: 0.40,
  stablecoins: ['USDC', 'USDT', 'DAI'],
  majorTokens: ['ETH', 'SOL', 'BTC', 'WBTC', 'WETH'],
  evmRpcUrls: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com'
  ],
  solanaRpcUrls: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.rpc.extrnode.com'
  ],
  solMinValueAud: 20
}

export interface WalletWithAllowlist {
  id: string
  chainType: ChainType
  address: string
  label: string | null
  createdAt: Date
  evmAllowlist: EvmTokenAllowlistItem[]
  solAllowlist: SolTokenAllowlistItem[]
}

export interface EvmTokenAllowlistItem {
  id: string
  walletId: string
  contractAddress: string
  symbol: string | null
  decimals: number | null
  coingeckoId: string | null
}

export interface SolTokenAllowlistItem {
  id: string
  walletId: string | null
  mintAddress: string
  symbol: string | null
  coingeckoId: string | null
}

export interface ManualAssetItem {
  id: string
  type: ManualAssetType
  name: string
  valueAud: number
  currency: string
  quantity: number | null
  notes: string | null
  updatedAt: Date
  // Private Investment specific fields
  investmentDate: Date | null
  investmentAmount: number | null
  investmentValuation: number | null
  tradfiSystem: boolean
  exposureType: string | null
}

export interface PriceCacheItem {
  assetKey: string
  symbol: string
  coingeckoId: string | null
  priceUsd: number
  fetchedAt: Date
}

export interface SnapshotWithHoldings {
  id: string
  createdAt: Date
  fxUsdAud: number
  totalAud: number
  cashAud: number
  cryptoAud: number
  collectiblesAud: number
  evmTotalAud: number
  solTotalAud: number
  manualTotalAud: number
  holdings: SnapshotHoldingItem[]
}

export interface SnapshotHoldingItem {
  id: string
  snapshotId: string
  assetKey: string
  source: HoldingSource
  walletId: string | null
  symbol: string
  quantity: number
  priceUsd: number | null
  valueAud: number
  liquidityTier: LiquidityTier
  exposureType: string
}

export interface RefreshResult {
  snapshot: SnapshotWithHoldings
  errors: WalletError[]
}

export interface WalletError {
  walletId: string
  address: string
  chainType: ChainType
  error: string
}

export interface LiquidityBucket {
  tier: LiquidityTier
  assetsAud: number
  afterHaircut: number
  runwayMonths: number
}

export interface StressScenario {
  name: string
  netWorth: number
  immediateLiquidity: number
  runway: number
}

export interface TopExposure {
  assetKey: string
  symbol: string
  valueAud: number
  percentOfPortfolio: number
}

export interface ChainBreakdown {
  chain: string
  valueAud: number
  percentOfPortfolio: number
}

export interface CustodyBreakdown {
  walletId: string | null
  label: string
  valueAud: number
  percentOfPortfolio: number
}

export interface UnpricedAsset {
  assetKey: string
  symbol: string
  quantity: number
  source: HoldingSource
}
