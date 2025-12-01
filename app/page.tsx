"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import Search from "./components/Search";
import BookmarkItem from "./components/BookmarkItem";

interface PendingBookmark {
  id: string;
  url: string;
  favicon: string;
}

export default function Home() {
  const bookmarks = useQuery(api.bookmarks.list);
  const [pendingBookmarks, setPendingBookmarks] = useState<PendingBookmark[]>(
    []
  );
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  function addPendingBookmark(bookmark: PendingBookmark) {
    setPendingBookmarks((prev) => [bookmark, ...prev]);
  }

  function removePendingBookmark(id: string) {
    setPendingBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <main className="flex flex-col items-center w-screen pt-48 gap-8">
      <Search
        onPendingBookmark={addPendingBookmark}
        onBookmarkSaved={removePendingBookmark}
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
            <span className="text-gray-400 italic">Fetching Title...</span>
          </div>
        ))}
        {bookmarks?.map((bookmark: any) => (
          <BookmarkItem
            key={bookmark._id}
            bookmark={bookmark}
            isDimmed={activeMenuId !== null && activeMenuId !== bookmark._id}
            onMenuOpenChange={(isOpen) =>
              setActiveMenuId(isOpen ? bookmark._id : null)
            }
          />
        ))}
      </div>
    </main>
  );
}
