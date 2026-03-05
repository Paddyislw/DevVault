'use client'
import type { RouterOutputs } from '@/lib/trpc'
import { BookmarkCard } from './BookmarkCard'

type Bookmark = RouterOutputs['bookmarks']['list'][number]

const CATEGORIES = ['DESIGN', 'CODE', 'TUTORIALS', 'TOOLS', 'APIS_DOCS', 'CUSTOM'] as const
const CATEGORY_LABELS: Record<string, string> = {
  DESIGN: 'Design',
  CODE: 'Code',
  TUTORIALS: 'Tutorials',
  TOOLS: 'Tools',
  APIS_DOCS: 'APIs & Docs',
  CUSTOM: 'Custom',
}

interface Props {
  bookmarks: Bookmark[]
  isLoading: boolean
  activeCategory: string | undefined
  onCategoryChange: (c: string | undefined) => void
}

export function BookmarkGrid({ bookmarks, isLoading, activeCategory, onCategoryChange }: Props) {
  // Count per category from fetched data
  const counts = bookmarks.reduce((acc, b) => {
    return { ...acc, [b.category]: (acc[b.category] ?? 0) + 1 }
  }, {} as Record<string, number>)

  const filtered = activeCategory
    ? bookmarks.filter(b => b.category === activeCategory)
    : bookmarks

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Category sidebar */}
      <div className="w-44 flex-shrink-0 border-r border-border-default py-3 flex flex-col gap-0.5 px-2">
        <button
          onClick={() => onCategoryChange(undefined)}
          className={`w-full text-left px-3 py-2 rounded text-[12px] transition-colors ${
            !activeCategory
              ? 'bg-surface-3 text-text-primary font-medium'
              : 'text-text-secondary hover:bg-surface-2'
          }`}
        >
          All
          <span className="float-right text-text-ghost">{bookmarks.length}</span>
        </button>
        {CATEGORIES.map(cat => (
          counts[cat] ? (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat === activeCategory ? undefined : cat)}
              className={`w-full text-left px-3 py-2 rounded text-[12px] transition-colors ${
                activeCategory === cat
                  ? 'bg-surface-3 text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-surface-2'
              }`}
            >
              {CATEGORY_LABELS[cat]}
              <span className="float-right text-text-ghost">{counts[cat]}</span>
            </button>
          ) : null
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-md bg-surface-2"
                style={{ opacity: 1 - i * 0.1 }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <p className="text-[13px] text-text-secondary">
              {activeCategory ? `No ${CATEGORY_LABELS[activeCategory]} bookmarks.` : 'No bookmarks yet.'}
            </p>
            <p className="text-[12px] text-text-ghost">Paste a URL to save it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filtered.map(bookmark => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}