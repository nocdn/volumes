import React, { useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Drawer } from "vaul"

// --- Types ---
export type BookmarkType = {
  id: number
  title: string
  url: string
  tags: string[] | string
  favicon: string
  createdAt: string // expects format like "DD/MM/YYYY, HH:MM:SS"
}

export type BookmarkProps = {
  bookmark: BookmarkType
  onDeleteBookmark: (id: number) => void
  onEditBookmark: (
    id: number,
    title: string,
    url: string,
    tags: string[]
  ) => void
  onAddTag: (bookmarkId: number, tag: string) => void
  onRemoveTag: (bookmarkId: number, tag: string) => void
  index: number // used for staggered animation delay
}

// --- Utils ---
function getFormattedDate(dateStr: string) {
  const [datePart, timePart] = dateStr.split(", ")
  if (!datePart || !timePart) {
    // Fallback if format is unexpected
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
    })
  }
  const [day, month, year] = datePart.split("/")
  const [hours, minutes, seconds] = timePart.split(":")
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  )
  return date.toLocaleString("en-US", { month: "short", day: "numeric" })
}

function displayUrlOnHover(url: string) {
  const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, "")
  try {
    const urlObject = new URL(url)
    if (urlObject.pathname === "/" && !cleanUrl.endsWith("/")) {
      return `${cleanUrl}/`
    }
  } catch {
    // ignore invalid URL, return cleaned string as-is
  }
  return cleanUrl
}

function parseTagsToArray(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .map((t) => String(t))
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags)
      if (Array.isArray(parsed)) {
        return parsed
          .map((t) => String(t))
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      }
    } catch {}
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }
  return []
}

// --- Component ---
export default function Bookmark({
  bookmark,
  onDeleteBookmark,
  onEditBookmark,
  onAddTag,
  onRemoveTag,
  index,
}: BookmarkProps) {
  // Derived values
  const formattedDate = useMemo(
    () => getFormattedDate(bookmark.createdAt),
    [bookmark.createdAt]
  )
  const formattedUrl = useMemo(() => {
    try {
      return new URL(bookmark.url).hostname.replace(/^www\./, "") + "/"
    } catch {
      return bookmark.url
    }
  }, [bookmark.url])

  // State
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUrlHovered, setIsUrlHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isMobileDrag, setIsMobileDrag] = useState(false)
  const [dragOpacity, setDragOpacity] = useState(1)
  const [isOverMaxDragDistance, setIsOverMaxDragDistance] = useState(false)

  // Tuning constants for drag-to-fade behavior
  const MAX_DRAG_FADE_DISTANCE_PX = 140
  const MIN_OPACITY_WHILE_DRAG = 0.35

  // Handlers
  const handleMouseEnter = () => {
    setIsExpanded(true)
  }
  const handleMouseLeave = () => {
    setIsExpanded(false)
  }

  const [newTitle, setNewTitle] = useState(bookmark.title)
  const [newUrl, setNewUrl] = useState(bookmark.url)
  const [newTagsString, setNewTagsString] = useState(
    parseTagsToArray(bookmark.tags).join(",")
  )
  const titleInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const tagsInputRef = useRef<HTMLInputElement>(null)

  const [editingStage, setEditingStage] = useState<
    "title" | "url" | "tags" | "none"
  >("none")

  useEffect(() => {
    // console.log("bookmark.title", newTitle)
    // console.log("bookmark.url", newUrl)
  }, [newTitle, newUrl])

  useEffect(() => {
    if (editingStage === "tags") {
      if (!newTagsString || newTagsString.trim().length === 0) {
        const parsed = parseTagsToArray(bookmark.tags)
        if (parsed.length > 0) {
          setNewTagsString(parsed.join(","))
        }
      }
    }
  }, [editingStage])

  useEffect(() => {
    const detectIsMobile = () => {
      if (typeof window === "undefined") return false
      const hasCoarsePointer =
        window.matchMedia?.("(pointer: coarse)").matches ?? false
      const hasTouchPoints =
        typeof navigator !== "undefined" &&
        ("maxTouchPoints" in navigator
          ? (navigator as Navigator).maxTouchPoints > 0
          : false)
      const isSmallViewport = window.innerWidth <= 768
      return (hasCoarsePointer || hasTouchPoints) && isSmallViewport
    }

    const update = () => setIsMobileDrag(detectIsMobile())
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return (
    <motion.div
      role="button"
      drag={isMobileDrag ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.25}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 80, bounceDamping: 10 }}
      onDrag={(_, info) => {
        const distance = Math.min(
          Math.abs(info.offset.x ?? 0),
          MAX_DRAG_FADE_DISTANCE_PX
        )
        const progress = distance / MAX_DRAG_FADE_DISTANCE_PX
        const nextOpacity = 1 - progress * (1 - MIN_OPACITY_WHILE_DRAG)
        setIsOverMaxDragDistance(progress >= 1)
        setDragOpacity(nextOpacity)
      }}
      onDragEnd={() => {
        if (isOverMaxDragDistance) {
          onDeleteBookmark(bookmark.id)
        } else {
          setDragOpacity(1)
          setIsOverMaxDragDistance(false)
        }
      }}
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={"select-text motion-opacity-in-0 motion-translate-y-in-[10%]"}
      style={{
        fontFamily: "Lars",
        opacity: dragOpacity,
        backgroundColor: isOverMaxDragDistance ? "#FFF0F0" : "transparent",
        color: isOverMaxDragDistance ? "#c11a3f" : "inherit",
        boxShadow: isOverMaxDragDistance ? "0 0 0 6px #FFF0F0" : "none",
        transition:
          "background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {!isEditing ? (
        <motion.div
          layout
          transition={{
            duration: 0.2,
            ease: [0.175, 0.885, 0.32, 1],
          }}
          key={0}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2 hover:bg-gray-100 hover:shadow-[0_0_0_8px_#F3F4F6] rounded-xs"
          title={parseTagsToArray(bookmark.tags).join(", ")}
        >
          <img
            src={bookmark.favicon}
            alt={bookmark.title}
            className="h-4 w-4 cursor-pointer -translate-y-[0.85px] rounded-[1px]"
            onClick={() => {
              setNewTitle(bookmark.title)
              setNewUrl(bookmark.url)
              setNewTagsString(parseTagsToArray(bookmark.tags).join(","))
              setIsEditing(true)
              setEditingStage("title")
            }}
          />

          <a
            href={bookmark.url}
            className="truncate text-[14.5px] font-lars hover:text-[#c11a3f]"
          >
            {bookmark.title}
          </a>

          <div
            role="button"
            tabIndex={0}
            className="font-lars min-w-0 flex-1 text-sm text-gray-400"
            onMouseEnter={() => setIsUrlHovered(true)}
            onMouseLeave={() => setIsUrlHovered(false)}
          >
            <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
              {isUrlHovered ? displayUrlOnHover(bookmark.url) : formattedUrl}
            </span>
          </div>

          <X
            size={16}
            className="ml-auto cursor-pointer text-red-500 transition-opacity duration-200 hover:text-red-800 hidden md:block"
            strokeWidth={2.25}
            style={{
              opacity: isExpanded ? 1 : 0,
              pointerEvents: isExpanded ? "auto" : "none",
            }}
            onClick={() => onDeleteBookmark(bookmark.id)}
          />

          <p className="font-sf-pro-text flex-shrink-0 whitespace-nowrap text-[13.5px] text-gray-400">
            {formattedDate}
          </p>
        </motion.div>
      ) : (
        <motion.div
          layout
          key={0}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2"
          title={parseTagsToArray(bookmark.tags).join(", ")}
        >
          <img
            src={bookmark.favicon}
            alt={bookmark.title}
            className="h-4 w-4 cursor-pointer -translate-y-[0.85px] rounded-[1px]"
            onClick={() => {
              setIsEditing(false)
              setEditingStage("none")
            }}
          />

          <AnimatePresence mode="popLayout">
            {editingStage === "title" && (
              <motion.input
                key="title"
                exit={{ opacity: 0, y: -12, scale: 0.8, filter: "blur(2px)" }}
                transition={{
                  duration: 0.2,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                type="text"
                className="truncate text-[14.5px] font-lars focus:outline-none mr-auto origin-left w-full"
                ref={titleInputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingStage("url")
                  } else if (e.key === "Escape") {
                    setIsEditing(false)
                    setEditingStage("none")
                  }
                }}
                onFocus={(e) => e.target.select()}
                autoFocus
              />
            )}
            {editingStage === "url" && (
              <motion.input
                key="url"
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, scale: 0.8, filter: "blur(2px)" }}
                transition={{
                  duration: 0.2,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                type="text"
                className="truncate text-[14.5px] font-lars focus:outline-none mr-auto origin-left w-full"
                ref={urlInputRef}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingStage("tags")
                  } else if (e.key === "Escape") {
                    setIsEditing(false)
                    setEditingStage("none")
                  }
                }}
                onFocus={(e) => e.target.select()}
                autoFocus
              />
            )}
            {editingStage === "tags" && (
              <motion.input
                key="tags"
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.8, filter: "blur(2px)" }}
                transition={{
                  duration: 0.2,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                type="text"
                placeholder="tags, separated, by commas"
                className="truncate text-[14.5px] font-lars focus:outline-none mr-auto origin-left w-full"
                ref={tagsInputRef}
                value={newTagsString}
                onChange={(e) => setNewTagsString(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const parsedTags = newTagsString
                      .split(",")
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0)
                    onEditBookmark(bookmark.id, newTitle, newUrl, parsedTags)
                    setIsEditing(false)
                    setEditingStage("none")
                  } else if (e.key === "Escape") {
                    setIsEditing(false)
                    setEditingStage("none")
                  }
                }}
                onFocus={(e) => e.target.select()}
                autoFocus
              />
            )}
          </AnimatePresence>

          <p className="font-sf-pro-text flex-shrink-0 whitespace-nowrap text-[13.5px] text-gray-400">
            {formattedDate}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
