"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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

// Fuzzy match: checks if all characters in query appear in order within target
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
    }
  }
  return qi === q.length;
}

// Check if bookmark matches the search query
function bookmarkMatchesQuery(
  bookmark: { title: string; url: string; tags: string[]; comment?: string },
  query: string
): boolean {
  if (!query) return true;

  // Check title
  if (fuzzyMatch(query, bookmark.title)) return true;

  // Check URL
  if (fuzzyMatch(query, bookmark.url)) return true;

  // Check tags
  if (bookmark.tags.some((tag) => fuzzyMatch(query, tag))) return true;

  // Check comment
  if (bookmark.comment && fuzzyMatch(query, bookmark.comment)) return true;

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

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

  // Reset selection when filtered bookmarks change
  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= filteredBookmarks.length) {
      setSelectedIndex(
        filteredBookmarks.length > 0 ? filteredBookmarks.length - 1 : null
      );
    }
  }, [filteredBookmarks.length, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if a menu is open or no bookmarks
      if (activeMenuId || filteredBookmarks.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIsKeyboardNav(true);
        setSelectedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, filteredBookmarks.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIsKeyboardNav(true);
        setSelectedIndex((prev) =>
          prev === null ? filteredBookmarks.length - 1 : Math.max(prev - 1, 0)
        );
      } else if (e.key === "Enter" && selectedIndex !== null) {
        e.preventDefault();
        const bookmark = filteredBookmarks[selectedIndex];
        if (bookmark) {
          window.open(bookmark.url, "_blank");
        }
      } else if (e.key === "c" && e.metaKey && selectedIndex !== null) {
        e.preventDefault();
        const bookmark = filteredBookmarks[selectedIndex];
        if (bookmark) {
          navigator.clipboard.writeText(bookmark.url);
        }
      }
    },
    [activeMenuId, filteredBookmarks, selectedIndex, deleteBookmark]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
            isSelected={selectedIndex === index}
            onMenuOpenChange={(isOpen) =>
              setActiveMenuId(isOpen ? bookmark._id : null)
            }
            onMouseEnter={() => {
              if (!isKeyboardNav) {
                setSelectedIndex(index);
              }
            }}
            onMouseMove={() => {
              if (isKeyboardNav) {
                setIsKeyboardNav(false);
                setSelectedIndex(index);
              }
            }}
            onDelete={() => {
              setDeletedIds((prev) => new Set(prev).add(bookmark._id));
              deleteBookmark({ id: bookmark._id as Id<"bookmarks"> });
            }}
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
