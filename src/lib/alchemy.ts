interface AlchemyTokenBalance {
  contractAddress: string
  tokenBalance: string
  error?: string
}

interface AlchemyTokenMetadata {
  decimals: number
  logo?: string
  name: string
  symbol: string
}

interface AlchemyTokenBalancesResponse {
  address: string
  tokenBalances: AlchemyTokenBalance[]
}

interface AlchemyTokenMetadataResponse {
  decimals: number
  logo?: string
  name: string
  symbol: string
}

export interface EvmToken {
  contractAddress: string
  balance: string
  decimals: number
  symbol: string
  name: string
}

export async function fetchAlchemyTokenBalances(
  address: string,
  apiKey: string,
  network: string = 'eth-mainnet'
): Promise<EvmToken[]> {
  try {
    const alchemyUrl = `https://${network}.g.alchemy.com/v2/${apiKey}`

    // Fetch all token balances
    const balancesResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
    })

    if (!balancesResponse.ok) {
      throw new Error(`Alchemy API error: ${balancesResponse.status}`)
    }

    const balancesData = await balancesResponse.json()
    const tokenBalances: AlchemyTokenBalance[] = balancesData.result?.tokenBalances || []

    // Filter out zero balances and errored tokens
    const nonZeroBalances = tokenBalances.filter(
      (token) => !token.error && token.tokenBalance !== '0x0' && parseInt(token.tokenBalance, 16) > 0
    )

    if (nonZeroBalances.length === 0) {
      return []
    }

    // Fetch metadata for all non-zero tokens
    const tokens: EvmToken[] = []
    for (const tokenBalance of nonZeroBalances) {
      try {
        const metadataResponse = await fetch(alchemyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenMetadata',
            params: [tokenBalance.contractAddress],
          }),
        })

        if (!metadataResponse.ok) {
          console.warn(`Failed to fetch metadata for ${tokenBalance.contractAddress}`)
          continue
        }

        const metadataData = await metadataResponse.json()
        const metadata: AlchemyTokenMetadataResponse = metadataData.result

        if (!metadata.symbol || !metadata.decimals) {
          console.warn(`Invalid metadata for ${tokenBalance.contractAddress}`)
          continue
        }

        tokens.push({
          contractAddress: tokenBalance.contractAddress.toLowerCase(),
          balance: tokenBalance.tokenBalance,
          decimals: metadata.decimals,
          symbol: metadata.symbol,
          name: metadata.name,
        })
      } catch (error) {
        console.warn(`Failed to fetch metadata for ${tokenBalance.contractAddress}:`, error)
      }
    }

    return tokens
  } catch (error) {
    console.error('Failed to fetch Alchemy token balances:', error)
    throw error
  }
}

export async function fetchAlchemyEthBalance(
  address: string,
  apiKey: string,
  network: string = 'eth-mainnet'
): Promise<string> {
  try {
    const alchemyUrl = `https://${network}.g.alchemy.com/v2/${apiKey}`

    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    })

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`)
    }

    const data = await response.json()
    return data.result || '0x0'
  } catch (error) {
    console.error('Failed to fetch ETH balance:', error)
    throw error
  }
}
