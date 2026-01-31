'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'
import { SectionHeader } from './section-header'

interface JournalEntry {
  id: string
  assetName: string
  createdAt: string
}

export function InvestmentJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadEntries = useCallback(async () => {
    try {
      const response = await fetch('/api/journal-entries')
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (error) {
      console.error('Failed to load journal entries:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedValue = inputValue.trim()
    if (!trimmedValue || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetName: trimmedValue })
      })

      if (response.ok) {
        const newEntry = await response.json()
        setEntries(prev => [newEntry, ...prev])
        setInputValue('')
      } else {
        const errorData = await response.json()
        console.error('Failed to add entry:', errorData.error)
      }
    } catch (error) {
      console.error('Failed to add journal entry:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/journal-entries/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setEntries(prev => prev.filter(entry => entry.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete journal entry:', error)
    }
  }

  return (
    <div className="premium-card p-5">
      <SectionHeader
        title="Investment Journal & Trade Ideas"
        description="Track assets you're researching or considering"
      />

      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enter asset name (e.g., Solana, S&P 500 ETF)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="h-8 text-sm rounded-lg"
            disabled={isSubmitting}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="h-8 px-3"
          disabled={!inputValue.trim() || isSubmitting}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </form>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No entries yet. Add an asset to start tracking your ideas.</p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between group py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                  <span className="text-sm truncate">{entry.assetName}</span>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                  aria-label={`Delete ${entry.assetName}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
