'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AppSettings, WalletWithAllowlist, ManualAssetItem } from '@/types'
import { Loader2, Trash2, Plus, Edit } from 'lucide-react'
import { ManualAssetDialog } from '@/components/ManualAssetDialog'

export default function DataPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [wallets, setWallets] = useState<WalletWithAllowlist[]>([])
  const [manualAssets, setManualAssets] = useState<ManualAssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<ManualAssetItem | null>(null)
  const [importing, setImporting] = useState(false)
  const [importData, setImportData] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [settingsRes, walletsRes, assetsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/wallets'),
        fetch('/api/manual-assets'),
      ])

      setSettings(await settingsRes.json())
      const walletsData = await walletsRes.json()
      setWallets(Array.isArray(walletsData) ? walletsData : [])
      const assetsData = await assetsRes.json()
      setManualAssets(Array.isArray(assetsData) ? assetsData : [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    if (!settings) return

    try {
      setSaving(true)
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      alert('Data saved successfully')
    } catch (error) {
      alert('Failed to save data')
    } finally {
      setSaving(false)
    }
  }

  async function addWallet(chainType: 'EVM' | 'SOL' | 'HYPE') {
    const address = prompt(`Enter ${chainType} wallet address:`)
    if (!address) return

    const label = prompt('Enter label (optional):')

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainType, address, label }),
      })

      const wallet = await res.json()
      setWallets([...wallets, wallet])
    } catch (error) {
      alert('Failed to add wallet')
    }
  }

  async function deleteWallet(id: string) {
    if (!confirm('Delete this wallet?')) return

    try {
      await fetch(`/api/wallets/${id}`, { method: 'DELETE' })
      setWallets(wallets.filter(w => w.id !== id))
    } catch (error) {
      alert('Failed to delete wallet')
    }
  }

  async function addTokenToWallet(walletId: string, chainType: string) {
    if (chainType === 'EVM') {
      const contractAddress = prompt('Enter ERC-20 contract address:')
      if (!contractAddress) return

      const symbol = prompt('Enter symbol (optional):')
      const decimals = prompt('Enter decimals (optional):')

      try {
        await fetch(`/api/wallets/${walletId}/allowlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'EVM',
            contractAddress,
            symbol: symbol || undefined,
            decimals: decimals ? parseInt(decimals) : undefined,
          }),
        })

        await loadData()
      } catch (error) {
        alert('Failed to add token')
      }
    } else if (chainType === 'SOL') {
      const mintAddress = prompt('Enter SPL mint address:')
      if (!mintAddress) return

      const symbol = prompt('Enter symbol (optional):')

      try {
        await fetch(`/api/wallets/${walletId}/allowlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'SOL',
            mintAddress,
            symbol: symbol || undefined,
          }),
        })

        await loadData()
      } catch (error) {
        alert('Failed to add token')
      }
    }
  }

  async function removeTokenFromWallet(walletId: string, tokenId: string, type: string) {
    if (!confirm('Remove this token from allowlist?')) return

    try {
      await fetch(`/api/wallets/${walletId}/allowlist?tokenId=${tokenId}&type=${type}`, {
        method: 'DELETE',
      })

      await loadData()
    } catch (error) {
      alert('Failed to remove token')
    }
  }

  function openAddAssetDialog() {
    setEditingAsset(null)
    setAssetDialogOpen(true)
  }

  function openEditAssetDialog(asset: ManualAssetItem) {
    setEditingAsset(asset)
    setAssetDialogOpen(true)
  }

  async function handleAssetSaved() {
    await loadData()
  }

  async function deleteManualAsset(id: string) {
    if (!confirm('Delete this manual asset?')) return

    try {
      await fetch(`/api/manual-assets/${id}`, { method: 'DELETE' })
      setManualAssets(manualAssets.filter(a => a.id !== id))
    } catch (error) {
      alert('Failed to delete manual asset')
    }
  }

  async function handleImportSnapshots() {
    if (!importData.trim()) {
      alert('Please enter data to import')
      return
    }

    setImporting(true)
    try {
      const lines = importData.trim().split('\n')
      const snapshots = []

      for (const line of lines) {
        const [date, total, fx] = line.split(',').map(s => s.trim())
        if (date && total) {
          snapshots.push({
            date,
            totalAud: parseFloat(total),
            fxUsdAud: fx ? parseFloat(fx) : 1.50
          })
        }
      }

      const res = await fetch('/api/snapshots/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshots })
      })

      const result = await res.json()

      if (res.ok) {
        alert(`Successfully imported ${result.imported} snapshots`)
        setImportData('')
      } else {
        alert(result.error || 'Failed to import snapshots')
      }
    } catch (error) {
      alert('Failed to import snapshots')
    } finally {
      setImporting(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">Data</h1>
        <Button onClick={saveSettings} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Data
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="manual">Manual Assets</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Financial Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fxUsdAud">USD to AUD FX Rate</Label>
                <Input
                  id="fxUsdAud"
                  className=""
                  type="number"
                  step="0.01"
                  value={settings.fxUsdAud}
                  onChange={(e) => setSettings({ ...settings, fxUsdAud: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="monthlyBurn">Monthly Burn (AUD)</Label>
                <Input
                  id="monthlyBurn"
                  className=""
                  type="number"
                  value={settings.monthlyBurnAud}
                  onChange={(e) => setSettings({ ...settings, monthlyBurnAud: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="haircutImmediate">IMMEDIATE Haircut (%)</Label>
                <Input
                  id="haircutImmediate"
                  className=""
                  type="number"
                  step="0.01"
                  value={settings.haircutImmediate * 100}
                  onChange={(e) => setSettings({ ...settings, haircutImmediate: parseFloat(e.target.value) / 100 })}
                />
              </div>

              <div>
                <Label htmlFor="haircutFast">FAST Haircut (%)</Label>
                <Input
                  id="haircutFast"
                  className=""
                  type="number"
                  step="0.01"
                  value={settings.haircutFast * 100}
                  onChange={(e) => setSettings({ ...settings, haircutFast: parseFloat(e.target.value) / 100 })}
                />
              </div>

              <div>
                <Label htmlFor="haircutSlow">SLOW Haircut (%)</Label>
                <Input
                  id="haircutSlow"
                  className=""
                  type="number"
                  step="0.01"
                  value={settings.haircutSlow * 100}
                  onChange={(e) => setSettings({ ...settings, haircutSlow: parseFloat(e.target.value) / 100 })}
                />
              </div>

              <div>
                <Label htmlFor="solMinValue">Solana Min Value Threshold (AUD)</Label>
                <Input
                  id="solMinValue"
                  className=""
                  type="number"
                  value={settings.solMinValueAud}
                  onChange={(e) => setSettings({ ...settings, solMinValueAud: parseFloat(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Token Lists</CardTitle>
              <CardDescription>Configure liquidity tiers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stablecoins">Stablecoins (IMMEDIATE tier, comma-separated)</Label>
                <Input
                  id="stablecoins"
                  className=""
                  value={settings.stablecoins.join(', ')}
                  onChange={(e) => setSettings({
                    ...settings,
                    stablecoins: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>

              <div>
                <Label htmlFor="majors">Major Tokens (FAST tier, comma-separated)</Label>
                <Input
                  id="majors"
                  className=""
                  value={settings.majorTokens.join(', ')}
                  onChange={(e) => setSettings({
                    ...settings,
                    majorTokens: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets" className="space-y-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>EVM Wallets</CardTitle>
              <CardDescription>Ethereum mainnet wallets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wallets.filter(w => w.chainType === 'EVM').map(wallet => (
                  <div key={wallet.id} className="border rounded p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{wallet.label || 'Unlabeled'}</div>
                        <div className="text-sm text-muted-foreground font-mono">{wallet.address}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteWallet(wallet.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Allowlist ({wallet.evmAllowlist.length})</span>
                        <Button size="sm" variant="outline" onClick={() => addTokenToWallet(wallet.id, 'EVM')}>
                          <Plus className="h-4 w-4 mr-1" /> Add Token
                        </Button>
                      </div>
                      {wallet.evmAllowlist.map(token => (
                        <div key={token.id} className="flex justify-between items-center text-sm bg-muted p-2 rounded">
                          <span className="font-mono text-xs">{token.contractAddress}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTokenFromWallet(wallet.id, token.id, 'EVM')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button onClick={() => addWallet('EVM')}>
                  <Plus className="mr-2 h-4 w-4" /> Add EVM Wallet
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Solana Wallets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wallets.filter(w => w.chainType === 'SOL').map(wallet => (
                  <div key={wallet.id} className="border rounded p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{wallet.label || 'Unlabeled'}</div>
                        <div className="text-sm text-muted-foreground font-mono">{wallet.address}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteWallet(wallet.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Allowlist ({wallet.solAllowlist.length})</span>
                        <Button size="sm" variant="outline" onClick={() => addTokenToWallet(wallet.id, 'SOL')}>
                          <Plus className="h-4 w-4 mr-1" /> Add Token
                        </Button>
                      </div>
                      {wallet.solAllowlist.map(token => (
                        <div key={token.id} className="flex justify-between items-center text-sm bg-muted p-2 rounded">
                          <span className="font-mono text-xs">{token.mintAddress}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTokenFromWallet(wallet.id, token.id, 'SOL')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button onClick={() => addWallet('SOL')}>
                  <Plus className="mr-2 h-4 w-4" /> Add Solana Wallet
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Hyperliquid Wallets</CardTitle>
              <CardDescription>Hyperliquid L1 addresses (EVM format)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wallets.filter(w => w.chainType === 'HYPE').map(wallet => (
                  <div key={wallet.id} className="border rounded p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{wallet.label || 'Unlabeled'}</div>
                        <div className="text-sm text-muted-foreground font-mono">{wallet.address}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteWallet(wallet.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button onClick={() => addWallet('HYPE')}>
                  <Plus className="mr-2 h-4 w-4" /> Add Hyperliquid Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Manual Assets</CardTitle>
              <CardDescription>Banks and collectibles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualAssets.map(asset => (
                      <TableRow key={asset.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell>{asset.type}</TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell className="text-right">
                          {asset.currency === 'ETH'
                            ? `${asset.valueAud.toFixed(8)} ETH`
                            : asset.currency === 'USD'
                            ? `$${asset.valueAud.toFixed(2)} USD`
                            : `$${asset.valueAud.toFixed(0)} AUD`
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {asset.quantity !== null ? asset.quantity.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditAssetDialog(asset)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteManualAsset(asset.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Button onClick={openAddAssetDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Add Manual Asset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Import Historical Net Worth Data</CardTitle>
              <CardDescription>
                Import historical snapshots in CSV format: date, totalAud, fxUsdAud (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="importData">Historical Data</Label>
                <textarea
                  id="importData"
                  className=" flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
                  placeholder={"2024-01-01, 50000, 1.50\n2024-01-15, 52000, 1.52\n2024-02-01, 54000, 1.51"}
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Format: date (YYYY-MM-DD), total AUD value, FX rate (optional, defaults to 1.50)
                </p>
              </div>

              <Button
                onClick={handleImportSnapshots}
                disabled={importing || !importData.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {importing ? 'Importing...' : 'Import Snapshots'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ManualAssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        asset={editingAsset}
        onSave={handleAssetSaved}
      />
    </div>
  )
}
