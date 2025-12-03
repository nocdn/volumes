"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import Search from "./components/Search";
import BookmarkItem from "./components/BookmarkItem";

interface PendingBookmark {
  id: string;
  url: string;
  favicon: string;
}

interface CachedBookmark {
  _id: string;
  _creationTime: number;
  url: string;
  title: string;
  favicon: string;
  tags: string[];
  comment?: string;
}

const BOOKMARKS_CACHE_KEY = "bookmarks_cache";

// Simple includes match - much faster than fuzzy matching
function bookmarkMatchesQuery(
  bookmark: { title: string; url: string; tags: string[]; comment?: string },
  query: string
): boolean {
  if (!query) return true;

  const q = query.toLowerCase();
  const title = bookmark.title.toLowerCase();
  const url = bookmark.url.toLowerCase();

  // Check title and URL first (most common matches)
  if (title.includes(q) || url.includes(q)) return true;

  // Check tags
  if (bookmark.tags.some((tag) => tag.toLowerCase().includes(q))) return true;

  // Check comment
  if (bookmark.comment && bookmark.comment.toLowerCase().includes(q))
    return true;

  return false;
}

export default function Home() {
  const serverBookmarks = useQuery(api.bookmarks.list);
  const deleteBookmark = useMutation(api.bookmarks.deleteBookmark);
  const [cachedBookmarks, setCachedBookmarks] = useState<CachedBookmark[]>([]);
  const [hasCacheLoaded, setHasCacheLoaded] = useState(false);
  const [pendingBookmarks, setPendingBookmarks] = useState<PendingBookmark[]>(
    []
  );
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Load cached bookmarks on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(BOOKMARKS_CACHE_KEY);
      if (cached) {
        setCachedBookmarks(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to load cached bookmarks:", e);
    }
    setHasCacheLoaded(true);
  }, []);

  // Save bookmarks to cache when server data arrives
  useEffect(() => {
    if (serverBookmarks) {
      try {
        localStorage.setItem(
          BOOKMARKS_CACHE_KEY,
          JSON.stringify(serverBookmarks)
        );
        setCachedBookmarks(serverBookmarks as CachedBookmark[]);
      } catch (e) {
        console.error("Failed to cache bookmarks:", e);
      }
    }
  }, [serverBookmarks]);

  // Use server bookmarks if available, otherwise use cached
  const bookmarks = serverBookmarks ?? (hasCacheLoaded ? cachedBookmarks : []);
  const isRefreshing = hasCacheLoaded && !serverBookmarks;

  const filteredBookmarks = useMemo(() => {
    if (!bookmarks || bookmarks.length === 0) return [];
    const filtered = bookmarks.filter(
      (bookmark: any) =>
        !deletedIds.has(bookmark._id) &&
        bookmarkMatchesQuery(bookmark, searchQuery)
    );
    return filtered;
  }, [bookmarks, searchQuery, deletedIds]);

  // Stable callback for delete
  const handleBookmarkDelete = useCallback(
    (id: string) => {
      setDeletedIds((prev) => new Set(prev).add(id));
      deleteBookmark({ id: id as Id<"bookmarks"> });
    },
    [deleteBookmark]
  );

  // Stable callback for menu open change
  const handleMenuOpenChange = useCallback((id: string, isOpen: boolean) => {
    setActiveMenuId(isOpen ? id : null);
  }, []);

  function addPendingBookmark(bookmark: PendingBookmark) {
    setPendingBookmarks((prev) => [bookmark, ...prev]);
  }

  function removePendingBookmark(id: string) {
    setPendingBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <main className="flex flex-col items-center w-screen pt-48 gap-8 pb-24">
      <Search
        onPendingBookmark={addPendingBookmark}
        onBookmarkSaved={removePendingBookmark}
        existingUrls={bookmarks?.map((b: any) => b.url) ?? []}
        onSearchChange={setSearchQuery}
        isRefreshing={isRefreshing}
      />
      <div className="flex flex-col gap-4 w-[50%] px-1">
        {pendingBookmarks.map((pending) => (
          <div
            key={pending.id}
            className={`flex items-center gap-2 transition-opacity duration-150 ${
              activeMenuId ? "opacity-85" : ""
            }`}
          >
            <img
              src={pending.favicon}
              alt="Loading..."
              width={16}
              height={16}
              className="opacity-50"
            />
            <p className="text-gray-300">Fetching Title...</p>
          </div>
        ))}
        {filteredBookmarks.map((bookmark: any, index: number) => (
          <BookmarkItem
            key={bookmark._id}
            bookmark={bookmark}
            index={index}
            isDimmed={activeMenuId !== null && activeMenuId !== bookmark._id}
            onMenuOpenChange={handleMenuOpenChange}
            onDelete={handleBookmarkDelete}
          />
        ))}
      </div>
      <div
        className="bottom-scroll-mask pointer-events-none"
        aria-hidden="true"
      />
    </main>
  );
}
