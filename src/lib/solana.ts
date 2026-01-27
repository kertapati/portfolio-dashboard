import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js'
import { WalletWithAllowlist, AppSettings } from '@/types'

export interface SolanaHolding {
  symbol: string
  quantity: number
  assetKey: string
  mintAddress?: string
}

/**
 * Validates if a string is a valid Solana public key
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    const pubkey = new PublicKey(address)
    // Additional check: Solana addresses are base58 encoded and 32-44 characters
    return PublicKey.isOnCurve(pubkey.toBytes())
  } catch {
    return false
  }
}

export async function fetchSolanaWalletBalances(
  wallet: WalletWithAllowlist,
  rpcUrls: string[],
  settings: AppSettings,
  tokenPrices: Map<string, number | null>
): Promise<SolanaHolding[]> {
  // Validate that this is actually a Solana address
  if (!isValidSolanaAddress(wallet.address)) {
    console.log(`Skipping non-Solana address: ${wallet.address}`)
    return []
  }

  const connection = await getWorkingConnection(rpcUrls)
  if (!connection) {
    throw new Error('All Solana RPC endpoints failed')
  }

  const holdings: SolanaHolding[] = []

  try {
    const pubkey = new PublicKey(wallet.address)
    const solBalance = await connection.getBalance(pubkey)
    const solAmount = solBalance / 1e9

    if (solAmount > 0) {
      holdings.push({
        symbol: 'SOL',
        quantity: solAmount,
        assetKey: 'crypto:SOL',
      })
    }
  } catch (error) {
    console.error(`Failed to fetch SOL balance for ${wallet.address}:`, error)
  }

  try {
    const pubkey = new PublicKey(wallet.address)
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCdYfFb6Fs6j579bkRN')
    })

    const allowlistMints = new Set(
      wallet.solAllowlist.map(t => t.mintAddress.toLowerCase())
    )

    for (const { account } of tokenAccounts.value) {
      const parsedInfo = (account.data as ParsedAccountData).parsed.info
      const mintAddress = parsedInfo.mint as string
      const amount = parseFloat(parsedInfo.tokenAmount.uiAmount)

      if (amount === 0) continue

      const mintLower = mintAddress.toLowerCase()
      const inAllowlist = allowlistMints.has(mintLower)

      const allowlistEntry = wallet.solAllowlist.find(
        t => t.mintAddress.toLowerCase() === mintLower
      )
      const symbol = allowlistEntry?.symbol || mintAddress.slice(0, 8)

      // Include all tokens regardless of value (removed minimum value filter)
      if (inAllowlist || tokenPrices.has(symbol)) {
        holdings.push({
          symbol,
          quantity: amount,
          assetKey: `spl:${mintLower}`,
          mintAddress: mintLower,
        })
      }
    }
  } catch (error) {
    console.error(`Failed to fetch SPL tokens for ${wallet.address}:`, error)
  }

  return holdings
}

async function getWorkingConnection(rpcUrls: string[]): Promise<Connection | null> {
  for (const url of rpcUrls) {
    try {
      const connection = new Connection(url, 'confirmed')
      await connection.getVersion()
      return connection
    } catch (error) {
      console.error(`Solana RPC endpoint ${url} failed:`, error)
    }
  }
  return null
}
