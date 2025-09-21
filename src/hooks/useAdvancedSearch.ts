import { useState, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'

export interface SearchableItem {
  id: string | number
  [key: string]: any
}

export interface SearchConfig<T> {
  items: T[]
  searchKeys: string[]
  options?: Fuse.IFuseOptions<T>
  threshold?: number
  includeScore?: boolean
  includeMatches?: boolean
}

export interface SearchResult<T> {
  item: T
  score?: number
  matches?: readonly Fuse.FuseResultMatch[]
}

export interface AdvancedSearchHook<T> {
  query: string
  setQuery: (query: string) => void
  results: SearchResult<T>[]
  isSearching: boolean
  totalResults: number
  searchHistory: string[]
  clearSearch: () => void
  clearHistory: () => void
}

export function useAdvancedSearch<T extends SearchableItem>(
  config: SearchConfig<T>
): AdvancedSearchHook<T> {
  const {
    items,
    searchKeys,
    options = {},
    threshold = 0.4,
    includeScore = true,
    includeMatches = true
  } = config

  const [query, setQuery] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Configure Fuse.js with optimized options
  const fuseOptions: Fuse.IFuseOptions<T> = useMemo(() => ({
    keys: searchKeys,
    threshold,
    includeScore,
    includeMatches,
    ignoreLocation: true,
    useExtendedSearch: true,
    minMatchCharLength: 2,
    shouldSort: true,
    ...options
  }), [searchKeys, threshold, includeScore, includeMatches, options])

  // Create Fuse instance
  const fuse = useMemo(() => {
    return new Fuse(items, fuseOptions)
  }, [items, fuseOptions])

  // Perform search
  const results = useMemo(() => {
    if (!query.trim()) {
      return items.map(item => ({ item }))
    }

    const fuseResults = fuse.search(query)
    return fuseResults.map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches
    }))
  }, [query, fuse, items])

  const isSearching = query.trim().length > 0
  const totalResults = results.length

  const setQueryWithHistory = useCallback((newQuery: string) => {
    setQuery(newQuery)

    // Add to search history if it's a meaningful query and not already in history
    if (newQuery.trim().length >= 2 && !searchHistory.includes(newQuery.trim())) {
      setSearchHistory(prev => [newQuery.trim(), ...prev.slice(0, 9)]) // Keep last 10 searches
    }
  }, [searchHistory])

  const clearSearch = useCallback(() => {
    setQuery('')
  }, [])

  const clearHistory = useCallback(() => {
    setSearchHistory([])
  }, [])

  return {
    query,
    setQuery: setQueryWithHistory,
    results,
    isSearching,
    totalResults,
    searchHistory,
    clearSearch,
    clearHistory
  }
}

// Specialized hook for command palette search
export interface CommandItem {
  id: string
  label: string
  description?: string
  category?: string
  keywords?: string[]
  action?: () => void
}

export function useCommandSearch(commands: CommandItem[]) {
  return useAdvancedSearch({
    items: commands,
    searchKeys: [
      'label',
      'description',
      'category',
      'keywords'
    ],
    options: {
      threshold: 0.3,
      keys: [
        { name: 'label', weight: 0.7 },
        { name: 'description', weight: 0.2 },
        { name: 'keywords', weight: 0.1 }
      ]
    }
  })
}

// Hook for highlighting search matches
export function useSearchHighlight() {
  const highlightText = useCallback((text: string, matches?: readonly Fuse.FuseResultMatch[]) => {
    if (!matches || matches.length === 0) {
      return text
    }

    // Find all matches for this text field
    const textMatches = matches.filter(match =>
      typeof match.value === 'string' && match.value === text
    )

    if (textMatches.length === 0) {
      return text
    }

    // Create highlighted version
    let highlightedText = text
    const ranges: Array<[number, number]> = []

    textMatches.forEach(match => {
      if (match.indices) {
        match.indices.forEach(([start, end]) => {
          ranges.push([start, end])
        })
      }
    })

    // Sort ranges by start position (descending) to avoid index shifting
    ranges.sort((a, b) => b[0] - a[0])

    // Apply highlights
    ranges.forEach(([start, end]) => {
      const before = highlightedText.slice(0, start)
      const highlighted = highlightedText.slice(start, end + 1)
      const after = highlightedText.slice(end + 1)

      highlightedText = `${before}<mark class="bg-primary/20 text-primary px-1 rounded">${highlighted}</mark>${after}`
    })

    return highlightedText
  }, [])

  return { highlightText }
}

// Utility function for search query suggestions
export function generateSearchSuggestions(
  items: SearchableItem[],
  searchKeys: string[]
): string[] {
  const suggestions = new Set<string>()

  items.forEach(item => {
    searchKeys.forEach(key => {
      const value = item[key]
      if (typeof value === 'string' && value.length > 2) {
        // Add words from the value
        const words = value.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.length >= 3) {
            suggestions.add(word)
          }
        })
      }
    })
  })

  return Array.from(suggestions).slice(0, 20) // Return top 20 suggestions
}