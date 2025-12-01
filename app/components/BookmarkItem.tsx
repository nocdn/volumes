"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Maximize, TextCursorInput } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import EditableMenuItem from "./EditableMenuItem";

interface BookmarkItemProps {
  bookmark: {
    _id: string;
    url: string;
    title: string;
    favicon: string;
    tags: string[];
    comment?: string;
  };
  isDimmed?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
}

export default function BookmarkItem({
  bookmark,
  isDimmed = false,
  onMenuOpenChange,
}: BookmarkItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onMenuOpenChange?.(open);
    },
    [onMenuOpenChange]
  );
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);

  const updateBookmark = useMutation(api.bookmarks.updateBookmark);

  // Clear optimistic state once server data matches
  useEffect(() => {
    if (optimisticTitle !== null && bookmark.title === optimisticTitle) {
      setOptimisticTitle(null);
    }
  }, [bookmark.title, optimisticTitle]);

  useEffect(() => {
    if (optimisticUrl !== null && bookmark.url === optimisticUrl) {
      setOptimisticUrl(null);
    }
  }, [bookmark.url, optimisticUrl]);

  const menuItems = [
    { id: "title", label: "Title", icon: TextCursorInput },
    { id: "url", label: "Edit URL", icon: Maximize },
  ] as const;

  // Reset selection when popover opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + menuItems.length) % menuItems.length
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, menuItems.length]);

  const handleSaveTitle = useCallback(
    async (newTitle: string) => {
      setOptimisticTitle(newTitle);
      try {
        await updateBookmark({
          id: bookmark._id as Id<"bookmarks">,
          title: newTitle,
        });
      } catch (error) {
        console.error("Failed to update title:", error);
        setOptimisticTitle(null);
      }
    },
    [bookmark._id, updateBookmark]
  );

  const handleSaveUrl = useCallback(
    async (newUrl: string) => {
      // Ensure URL has protocol
      const fullUrl =
        newUrl.startsWith("http://") || newUrl.startsWith("https://")
          ? newUrl
          : `https://${newUrl}`;
      setOptimisticUrl(fullUrl);
      try {
        await updateBookmark({
          id: bookmark._id as Id<"bookmarks">,
          url: fullUrl,
        });
      } catch (error) {
        console.error("Failed to update URL:", error);
        setOptimisticUrl(null);
      }
    },
    [bookmark._id, updateBookmark]
  );

  const displayTitle = optimisticTitle ?? bookmark.title;
  const displayUrl = optimisticUrl ?? bookmark.url;

  return (
    <div
      className={`flex items-center gap-2 transition-all duration-150 ${
        isDimmed ? "opacity-[0.65]" : ""
      }`}
    >
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button className="shrink-0 cursor-pointer hover:opacity-70 transition-opacity">
            <img
              src={bookmark.favicon}
              alt={displayTitle}
              width={16}
              height={16}
              className="focus:outline-none"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[200px] p-[7px] py-[8px] bg-[#323235] rounded-[34px] [corner-shape:squircle] shadow-[0_12px_33px_0_rgba(0,0,0,0.06),0_3.618px_9.949px_0_rgba(0,0,0,0.04)] outline-1 outline-black/10 text-white font-[420]"
        >
          <div className="flex flex-col *:flex *:items-center *:gap-2.5 *:px-3 *:py-[5px] font-rounded *:cursor-pointer text-[14px]">
            <EditableMenuItem
              icon={TextCursorInput}
              label="Title"
              value={displayTitle}
              isSelected={selectedIndex === 0}
              onSave={handleSaveTitle}
              onHover={() => setSelectedIndex(0)}
              onClose={() => handleOpenChange(false)}
            />
            <EditableMenuItem
              icon={Maximize}
              label="Edit URL"
              value={displayUrl}
              isSelected={selectedIndex === 1}
              onSave={handleSaveUrl}
              onHover={() => setSelectedIndex(1)}
              onClose={() => handleOpenChange(false)}
            />
          </div>
        </PopoverContent>
      </Popover>
      <a href={displayUrl} target="_blank" rel="noopener noreferrer">
        {displayTitle}
      </a>
    </div>
  );
}
