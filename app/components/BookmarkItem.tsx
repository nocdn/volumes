"use client";

import { useState, useEffect, useCallback, memo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Maximize, TextCursorInput, Tag } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import EditableMenuItem from "./EditableMenuItem";
import { AnimatePresence, motion } from "motion/react";

interface BookmarkItemProps {
  bookmark: {
    _id: string;
    _creationTime: number;
    url: string;
    title: string;
    favicon: string;
    tags: string[];
    comment?: string;
  };
  index?: number;
  isDimmed?: boolean;
  onMenuOpenChange?: (id: string, isOpen: boolean) => void;
  onDelete?: (id: string) => void;
}

function formatCreationDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();

  if (year === now.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${year}`;
}

// Module-level constants to avoid recreation
const GENERIC_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%239ca3af'/%3E%3C/svg%3E";

function getGoogleFavicon(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  } catch {
    return "https://www.google.com/s2/favicons?domain=example.com&sz=128";
  }
}

const BookmarkItem = memo(
  function BookmarkItem({
    bookmark,
    index = 0,
    isDimmed = false,
    onMenuOpenChange,
    onDelete,
  }: BookmarkItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isHoveringDate, setIsHoveringDate] = useState(false);
    const [faviconErrorCount, setFaviconErrorCount] = useState(0);

    const faviconSrc =
      faviconErrorCount === 0
        ? bookmark.favicon
        : faviconErrorCount === 1
          ? getGoogleFavicon(bookmark.url)
          : GENERIC_FALLBACK;

    const handleDelete = useCallback(() => {
      onDelete?.(bookmark._id);
    }, [onDelete, bookmark._id]);

    const handleOpenChange = useCallback(
      (open: boolean) => {
        setIsOpen(open);
        onMenuOpenChange?.(bookmark._id, open);
      },
      [onMenuOpenChange, bookmark._id]
    );
    const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
    const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);
    const [optimisticTags, setOptimisticTags] = useState<string[] | null>(null);

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

    useEffect(() => {
      if (
        optimisticTags !== null &&
        JSON.stringify(bookmark.tags) === JSON.stringify(optimisticTags)
      ) {
        setOptimisticTags(null);
      }
    }, [bookmark.tags, optimisticTags]);

    const menuItems = [
      { id: "title", label: "Title", icon: TextCursorInput },
      { id: "url", label: "Edit URL", icon: Maximize },
      { id: "tags", label: "Edit Tags", icon: Tag },
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

    const handleSaveTags = useCallback(
      async (tagsString: string) => {
        const newTags = tagsString
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => tag.length > 0);
        setOptimisticTags(newTags);
        try {
          await updateBookmark({
            id: bookmark._id as Id<"bookmarks">,
            tags: newTags,
          });
        } catch (error) {
          console.error("Failed to update tags:", error);
          setOptimisticTags(null);
        }
      },
      [bookmark._id, updateBookmark]
    );

    const displayTitle = optimisticTitle ?? bookmark.title;
    const displayUrl = optimisticUrl ?? bookmark.url;
    const displayTags = optimisticTags ?? bookmark.tags;

    return (
      <motion.div
        initial={{ opacity: 0, filter: "blur(1px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.15, delay: index * 0.02 }}
        className={`flex items-center gap-2 ${isDimmed ? "opacity-[0.65]" : ""}`}
      >
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button className="shrink-0 cursor-pointer hover:opacity-70 transition-opacity focus:outline-none">
              <img
                src={faviconSrc}
                width={16}
                height={16}
                className="focus:outline-none"
                onError={() => setFaviconErrorCount((c) => Math.min(c + 1, 2))}
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
              <EditableMenuItem
                icon={Tag}
                label="Edit Tags"
                value={displayTags.map((t) => t.toLowerCase()).join(", ")}
                isSelected={selectedIndex === 2}
                onSave={handleSaveTags}
                onHover={() => setSelectedIndex(2)}
                onClose={() => handleOpenChange(false)}
                iconSize={13.75}
                iconClassName="translate-x-0.25"
              />
            </div>
          </PopoverContent>
        </Popover>
        <a href={displayUrl} target="_blank" rel="noopener noreferrer">
          {displayTitle}
        </a>
        <span
          className="ml-auto text-sm tabular-nums relative"
          onMouseEnter={() => setIsHoveringDate(true)}
          onMouseLeave={() => setIsHoveringDate(false)}
        >
          {/* Invisible spacer to maintain width */}
          <span className="invisible">
            {formatCreationDate(bookmark._creationTime)}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            {isHoveringDate ? (
              <motion.span
                key="delete"
                initial={{ opacity: 0, filter: "blur(1px)", y: -3 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, filter: "blur(1px)", y: 3 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center text-[#ED5257] cursor-pointer font-rounded font-medium"
                onClick={handleDelete}
              >
                Delete
              </motion.span>
            ) : (
              <motion.span
                key="date"
                initial={{ opacity: 0, filter: "blur(1px)", y: 3 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, filter: "blur(1px)", y: -3 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center text-gray-400"
              >
                {formatCreationDate(bookmark._creationTime)}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if these specific props changed
    return (
      prevProps.bookmark._id === nextProps.bookmark._id &&
      prevProps.bookmark.title === nextProps.bookmark.title &&
      prevProps.bookmark.url === nextProps.bookmark.url &&
      prevProps.bookmark.favicon === nextProps.bookmark.favicon &&
      prevProps.isDimmed === nextProps.isDimmed &&
      prevProps.index === nextProps.index
    );
  }
);

export default BookmarkItem;
