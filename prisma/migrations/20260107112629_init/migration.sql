-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainType" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EvmTokenAllowlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "symbol" TEXT,
    "decimals" INTEGER,
    "coingeckoId" TEXT,
    CONSTRAINT "EvmTokenAllowlist_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SolTokenAllowlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT,
    "mintAddress" TEXT NOT NULL,
    "symbol" TEXT,
    "coingeckoId" TEXT,
    CONSTRAINT "SolTokenAllowlist_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManualAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valueAud" REAL NOT NULL,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "assetKey" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "coingeckoId" TEXT,
    "priceUsd" REAL NOT NULL,
    "fetchedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fxUsdAud" REAL NOT NULL,
    "totalAud" REAL NOT NULL,
    "cashAud" REAL NOT NULL,
    "cryptoAud" REAL NOT NULL,
    "collectiblesAud" REAL NOT NULL,
    "evmTotalAud" REAL NOT NULL,
    "solTotalAud" REAL NOT NULL,
    "manualTotalAud" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "SnapshotHolding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "walletId" TEXT,
    "symbol" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "priceUsd" REAL,
    "valueAud" REAL NOT NULL,
    "liquidityTier" TEXT NOT NULL,
    CONSTRAINT "SnapshotHolding_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EvmTokenAllowlist_walletId_contractAddress_key" ON "EvmTokenAllowlist"("walletId", "contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "SolTokenAllowlist_walletId_mintAddress_key" ON "SolTokenAllowlist"("walletId", "mintAddress");

-- CreateIndex
CREATE INDEX "SnapshotHolding_snapshotId_idx" ON "SnapshotHolding"("snapshotId");
