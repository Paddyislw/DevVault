'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import { BookmarkGrid } from './BookmarkGrid'
import { AddBookmarkModal } from './AddBookmarkModal'
import { PageHeader } from '@/components/shared/page-header'
import { Plus, Search } from 'lucide-react'

export function BookmarksPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | undefined>()
  const [search, setSearch] = useState('')

  const { data: bookmarks = [], isLoading } = api.bookmarks.list.useQuery({
    search: search || undefined,
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Bookmarks"
        subtitle={`${bookmarks.length} saved link${bookmarks.length !== 1 ? 's' : ''}`}
      >
        {/* Search */}
        <div className="flex items-center gap-2 bg-surface-0 border border-border-default rounded px-2.5 py-1.5">
          <Search size={13} strokeWidth={1.5} className="text-text-tertiary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none w-48"
          />
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} strokeWidth={1.5} />
          Save Link
        </button>
      </PageHeader>

      <BookmarkGrid
        bookmarks={bookmarks}
        isLoading={isLoading}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <AddBookmarkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}