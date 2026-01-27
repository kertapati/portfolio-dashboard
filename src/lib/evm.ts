import { ethers } from 'ethers'
import { WalletWithAllowlist } from '@/types'

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

export interface EvmHolding {
  symbol: string
  quantity: number
  assetKey: string
  contractAddress?: string
}

export async function fetchEvmWalletBalances(
  wallet: WalletWithAllowlist,
  rpcUrls: string[]
): Promise<EvmHolding[]> {
  const provider = await getWorkingProvider(rpcUrls)
  if (!provider) {
    throw new Error('All EVM RPC endpoints failed')
  }

  const holdings: EvmHolding[] = []

  try {
    const ethBalance = await provider.getBalance(wallet.address)
    const ethAmount = parseFloat(ethers.formatEther(ethBalance))

    if (ethAmount > 0) {
      holdings.push({
        symbol: 'ETH',
        quantity: ethAmount,
        assetKey: 'crypto:ETH',
      })
    }
  } catch (error) {
    console.error(`Failed to fetch ETH balance for ${wallet.address}:`, error)
  }

  for (const token of wallet.evmAllowlist) {
    try {
      const contract = new ethers.Contract(token.contractAddress, ERC20_ABI, provider)

      let decimals = token.decimals
      let symbol = token.symbol

      if (!decimals || !symbol) {
        try {
          const [fetchedDecimals, fetchedSymbol] = await Promise.all([
            contract.decimals(),
            contract.symbol(),
          ])
          decimals = fetchedDecimals
          symbol = fetchedSymbol
        } catch (error) {
          console.error(`Failed to fetch token metadata for ${token.contractAddress}:`, error)
          continue
        }
      }

      if (!decimals) {
        console.error(`No decimals available for ${token.contractAddress}`)
        continue
      }

      const balance = await contract.balanceOf(wallet.address)
      const amount = parseFloat(ethers.formatUnits(balance, decimals))

      if (amount > 0) {
        holdings.push({
          symbol: symbol || 'UNKNOWN',
          quantity: amount,
          assetKey: `erc20:1:${token.contractAddress.toLowerCase()}`,
          contractAddress: token.contractAddress.toLowerCase(),
        })
      }
    } catch (error) {
      console.error(`Failed to fetch balance for ${token.contractAddress}:`, error)
    }
  }

  return holdings
}

async function getWorkingProvider(rpcUrls: string[]): Promise<ethers.JsonRpcProvider | null> {
  for (const url of rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(url)
      await provider.getBlockNumber()
      return provider
    } catch (error) {
      console.error(`RPC endpoint ${url} failed:`, error)
    }
  }
  return null
}
