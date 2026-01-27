'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ManualAssetItem } from '@/types'

interface ManualAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: ManualAssetItem | null
  onSave: () => void
}

export function ManualAssetDialog({ open, onOpenChange, asset, onSave }: ManualAssetDialogProps) {
  const [type, setType] = useState('BANK')
  const [name, setName] = useState('')
  const [valueAud, setValueAud] = useState('')
  const [currency, setCurrency] = useState('AUD')
  const [useQuantity, setUseQuantity] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [investmentDate, setInvestmentDate] = useState('')
  const [investmentAmount, setInvestmentAmount] = useState('')
  const [investmentValuation, setInvestmentValuation] = useState('')
  const [tradfiSystem, setTradfiSystem] = useState(false)
  const [exposureType, setExposureType] = useState('')

  useEffect(() => {
    if (asset) {
      setType(asset.type)
      setName(asset.name)
      setValueAud(asset.valueAud.toString())
      setCurrency(asset.currency || 'AUD')
      setUseQuantity(asset.quantity !== null)
      setQuantity(asset.quantity?.toString() || '')
      setNotes(asset.notes || '')
      setInvestmentDate(asset.investmentDate ? new Date(asset.investmentDate).toISOString().split('T')[0] : '')
      setInvestmentAmount(asset.investmentAmount?.toString() || '')
      setInvestmentValuation(asset.investmentValuation?.toString() || '')
      setTradfiSystem(asset.tradfiSystem || false)
      setExposureType(asset.exposureType || '')
    } else {
      setType('BANK')
      setName('')
      setValueAud('')
      setCurrency('AUD')
      setUseQuantity(false)
      setQuantity('')
      setNotes('')
      setInvestmentDate('')
      setInvestmentAmount('')
      setInvestmentValuation('')
      setTradfiSystem(false)
      setExposureType('')
    }
  }, [asset, open])

  async function handleSave() {
    if (!name) return
    if (type !== 'AIRDROP' && type !== 'PRIVATE_INVESTMENT' && !valueAud) return

    setSaving(true)
    try {
      const url = asset ? `/api/manual-assets/${asset.id}` : '/api/manual-assets'
      const method = asset ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          valueAud: type === 'AIRDROP' || type === 'PRIVATE_INVESTMENT' ? 0 : parseFloat(valueAud),
          currency,
          quantity: useQuantity && quantity ? parseFloat(quantity) : null,
          notes: notes || null,
          investmentDate: investmentDate || null,
          investmentAmount: investmentAmount ? parseFloat(investmentAmount) : null,
          investmentValuation: investmentValuation ? parseFloat(investmentValuation) : null,
          tradfiSystem,
          exposureType: exposureType || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to save manual asset')
        return
      }

      onSave()
      onOpenChange(false)
    } catch (error) {
      alert('Failed to save manual asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit' : 'Add'} Manual Asset</DialogTitle>
          <DialogDescription>
            {asset ? 'Update' : 'Create'} a bank account or collectible
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input-3d flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="CRYPTO">Crypto</option>
              <option value="STABLECOIN">Stablecoin</option>
              <option value="REAL_ESTATE">Real Estate</option>
              <option value="EQUITIES">Equities</option>
              <option value="NFT">NFT</option>
              <option value="COLLECTIBLE">Collectible</option>
              <option value="CAR">Car</option>
              <option value="GIFTCARD">Gift Card</option>
              <option value="SUPERANNUATION">Superannuation</option>
              <option value="MISC">Miscellaneous</option>
              <option value="AIRDROP">Airdrop</option>
              <option value="PRIVATE_INVESTMENT">Private Investment</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              className="input-3d"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Savings Account"
            />
          </div>

          {type === 'AIRDROP' ? (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                className="input-3d"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details about expected airdrop"
              />
            </div>
          ) : type === 'PRIVATE_INVESTMENT' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="input-3d flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="AUD">AUD</option>
                    <option value="USD">USD</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investmentAmount">Amount Invested</Label>
                  <Input
                    id="investmentAmount"
                    className="input-3d"
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investmentDate">Investment Date</Label>
                  <Input
                    id="investmentDate"
                    className="input-3d"
                    type="date"
                    value={investmentDate}
                    onChange={(e) => setInvestmentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investmentValuation">Valuation at Investment</Label>
                  <Input
                    id="investmentValuation"
                    className="input-3d"
                    type="number"
                    value={investmentValuation}
                    onChange={(e) => setInvestmentValuation(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  className="input-3d"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    className="input-3d"
                    type="number"
                    value={valueAud}
                    onChange={(e) => setValueAud(e.target.value)}
                    placeholder="0"
                  />
                  {currency === 'ETH' && (
                    <p className="text-xs text-muted-foreground">
                      Enter ETH amount (e.g., 75 for 75 ETH). Will be converted to AUD automatically.
                    </p>
                  )}
                  {currency === 'USD' && (
                    <p className="text-xs text-muted-foreground">
                      Enter USD amount. Will be converted to AUD using FX rate.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="input-3d flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="AUD">AUD</option>
                    <option value="USD">USD</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useQuantity"
                    checked={useQuantity}
                    onChange={(e) => setUseQuantity(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="useQuantity" className="cursor-pointer">Track quantity</Label>
                </div>
                {useQuantity && (
                  <Input
                    id="quantity"
                    className="input-3d"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Quantity"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  className="input-3d"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tradfiSystem"
                checked={tradfiSystem}
                onChange={(e) => setTradfiSystem(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="tradfiSystem" className="cursor-pointer">Tradfi system</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Mark if this asset is in the traditional finance system
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exposureType">Asset Exposure Type (Optional)</Label>
            <select
              id="exposureType"
              value={exposureType}
              onChange={(e) => setExposureType(e.target.value)}
              className="input-3d flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Auto-detect (based on asset type)</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="JLP">JLP</option>
              <option value="CRYPTO">Crypto (Other)</option>
              <option value="STABLECOIN">Stablecoin</option>
              <option value="CASH">Cash</option>
              <option value="EQUITY">Equity</option>
              <option value="REAL_ESTATE">Real Estate</option>
              <option value="NFT">NFT</option>
              <option value="COLLECTIBLE">Collectible</option>
              <option value="CAR">Car</option>
              <option value="OTHERS">Others</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Override the automatic exposure type classification
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="button-3d" onClick={handleSave} disabled={saving || !name || (type !== 'AIRDROP' && type !== 'PRIVATE_INVESTMENT' && !valueAud)}>
            {saving ? 'Saving...' : asset ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
