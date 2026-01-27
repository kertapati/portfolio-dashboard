/**
 * Simple in-memory cache for expensive calculations
 * Cache is invalidated when snapshot ID changes
 */

interface CacheEntry<T> {
  snapshotId: string
  data: T
  timestamp: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  get<T>(key: string, currentSnapshotId: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if snapshot changed (invalidate cache)
    if (entry.snapshotId !== currentSnapshotId) {
      this.cache.delete(key)
      return null
    }

    // Check if TTL expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(key: string, snapshotId: string, data: T): void {
    this.cache.set(key, {
      snapshotId,
      data,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new SimpleCache()

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000)
}
