"use client"
import Search from "@/components/Search"
import { useEffect, useMemo, useState } from "react"
import Bookmark from "@/components/Bookmark"
import { Drawer } from "vaul"
import { Squircle } from "@squircle-js/react"
import { X } from "lucide-react"
import { motion } from "motion/react"
import MingcuteTagFill from "@/components/icons/MingcuteTagFill"

export default function Home() {
  type SearchTag = { value: string; label: string; textColor: string }
  const toTag = (label: string): SearchTag => ({
    value: String(label).toLowerCase(),
    label: String(label),
    textColor: "#111827",
  })
  const [tags, setTags] = useState<SearchTag[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const handleSubmit = (tags: string[], url: string) => {
    setIsLoading(true)
    fetch("/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ url, tags }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error("API error:", res.statusText)
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setBookmarks((prev) => [data, ...prev])
        try {
          const newTags = Array.isArray(data.tags)
            ? data.tags
            : JSON.parse(data.tags ?? "[]")
          setTags((prev) => {
            const existing = new Set(prev.map((t) => t.value))
            const additions = (newTags as string[])
              .map((t) => t?.trim())
              .filter((t): t is string => Boolean(t && t.length > 0))
              .map(toTag)
              .filter((t) => !existing.has(t.value))
            const next = [...prev, ...additions]
            next.sort((a, b) => a.label.localeCompare(b.label))
            return next
          })
        } catch {}
        setResetTrigger((prev) => prev + 1)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Request failed:", err)
        setIsLoading(false)
      })
  }

  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterQuery, setFilterQuery] = useState("")
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [resetTrigger, setResetTrigger] = useState(0)
  const [newTags, setNewTags] = useState<string[]>([])
  const [newUrl, setNewUrl] = useState("")

  const parseTagsToArray = (tags: unknown): string[] => {
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

  const normalize = (value: unknown): string =>
    String(value ?? "").toLowerCase()

  const fieldIncludes = (fields: string[], token: string): boolean => {
    const t = token.toLowerCase()
    return fields.some((f) => f.includes(t))
  }

  const filteredBookmarks = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    const tokens = q.length > 0 ? q.split(/\s+/).filter(Boolean) : []
    const selectedTagsLower = new Set(
      filterTags.map((t) => t.toLowerCase().trim()).filter(Boolean)
    )

    return bookmarks.filter((b) => {
      const tagsArr = parseTagsToArray(b.tags)
      const tagSetLower = new Set(tagsArr.map((t) => t.toLowerCase()))

      for (const t of selectedTagsLower) {
        if (!tagSetLower.has(t)) return false
      }

      if (tokens.length === 0) return true

      const title = normalize(b.title)
      const url = normalize(b.url)
      const tagValues = tagsArr.map(normalize)

      return tokens.every((tok) =>
        fieldIncludes([title, url, ...tagValues], tok)
      )
    })
  }, [bookmarks, filterQuery, filterTags])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/bookmarks", { cache: "no-store" })
        const json = await res.json()

        if (!res.ok) {
          console.error("API error:", json?.error ?? res.statusText)
          return
        }

        setBookmarks(json)
        console.log("bookmarks", json)

        const uniqueTags = new Set<string>()
        for (const bookmark of json) {
          let bookmarkTags: string[] = []
          if (Array.isArray(bookmark.tags)) {
            bookmarkTags = bookmark.tags
          } else if (typeof bookmark.tags === "string") {
            try {
              bookmarkTags = JSON.parse(bookmark.tags)
            } catch {}
          }
          for (const tag of bookmarkTags) {
            if (typeof tag === "string" && tag.trim()) {
              uniqueTags.add(tag)
            }
          }
        }
        const sortedLabels = Array.from(uniqueTags).sort((a, b) =>
          a.localeCompare(b)
        )
        setTags(sortedLabels.map(toTag))
        console.log("tags", tags)
      } catch (err) {
        console.error("Request failed:", err)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  return (
    <Drawer.Root open={isDrawerOpen}>
      <div className="flex items-center justify-center mt-16 md:mt-36 w-full px-8 flex-col gap-2">
        <Search
          tags={tags}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          resetTrigger={resetTrigger}
          onFilterChange={(q, selected) => {
            setFilterQuery(q)
            setFilterTags(selected)
          }}
        />
        <div
          className="font-geist-mono mx-0.5 flex items-center justify-between border-b border-gray-200 py-3 text-[13px] text-[#6f6f6f] w-full md:w-[680px]"
          onMouseDown={() => setIsDrawerOpen(true)}
        >
          <p className="font-lars">Title</p>
          <p className="font-lars">Created at</p>
        </div>
        <div className="mx-0.5 flex flex-col gap-4 w-full md:w-2xl mt-2.5 mb-24">
          {filteredBookmarks.map((bookmark, index) => (
            <Bookmark
              key={bookmark.id}
              bookmark={bookmark}
              onDeleteBookmark={() => {
                fetch("/api/bookmarks", {
                  method: "DELETE",
                  body: JSON.stringify({ id: bookmark.id }),
                })
                  .then((res) => {
                    if (!res.ok) {
                      console.error("API error:", res.statusText)
                      return
                    }
                    setBookmarks((prev) =>
                      prev.filter((b) => b.id !== bookmark.id)
                    )
                  })
                  .catch((err) => {
                    console.error("Request failed:", err)
                  })
                  .finally(() => {
                    setIsLoading(false)
                  })
              }}
              onEditBookmark={(id, title, url, tags) => {
                const previousBookmark = bookmarks.find((b) => b.id === id)

                let computedFavicon = previousBookmark?.favicon
                try {
                  const hostname = new URL(url).hostname.replace(/^www\./, "")
                  computedFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`
                } catch {}

                setBookmarks((prev) =>
                  prev.map((b) =>
                    b.id === id
                      ? { ...b, title, url, tags, favicon: computedFavicon }
                      : b
                  )
                )

                const rollback = () => {
                  if (!previousBookmark) return
                  setBookmarks((prev) =>
                    prev.map((b) => (b.id === id ? previousBookmark : b))
                  )
                }

                fetch("/api/bookmarks", {
                  method: "PUT",
                  body: JSON.stringify({ id, title, url, tags }),
                })
                  .then((res) => {
                    if (!res.ok) {
                      console.error("API error:", res.statusText)
                      rollback()
                    }
                  })
                  .catch((err) => {
                    console.error("Request failed:", err)
                    rollback()
                  })
              }}
              onAddTag={() => {}}
              onRemoveTag={() => {}}
              index={index}
            />
          ))}
        </div>
      </div>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 bg-black/40"
          onClick={() => {
            setIsDrawerOpen(false)
          }}
        />
        <Drawer.Content className="h-fit fixed bottom-0 left-0 right-0 outline-none p-4">
          <Squircle
            cornerRadius={20}
            cornerSmoothing={1}
            className="p-4 bg-white rounded-2xl flex flex-col gap-2"
          >
            <div className="w-full flex items-center justify-between">
              <div
                className="flex items-center justify-center bg-[#F6F6F6] rounded-lg p-1"
                onMouseDown={() => setIsDrawerOpen(false)}
              >
                <X size={16} strokeWidth={2.65} color="#6f6f6f" />
              </div>
              <div
                className="font-lars font-medium text-[16px] bg-[#F6F6F6] rounded-full p-1 px-3 cursor-pointer"
                onMouseDown={() => {
                  setIsDrawerOpen(false)
                  handleSubmit(newTags, newUrl)
                  setNewUrl("")
                  setNewTags([])
                }}
              >
                Add
              </div>
            </div>
            <p className="font-lars font-medium ml-1">Link</p>
            <input
              type="text"
              className="w-full bg-[#F6F6F6] rounded-lg p-2 text-[16px] font-medium focus:outline-none"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <p className="font-lars font-medium ml-1">Tags</p>
            <div className="w-full flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = newTags.includes(tag.value)
                return (
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    key={tag.value}
                    className={`rounded-lg p-1 px-3 my-0.5 capitalize cursor-pointer flex items-center font-medium gap-2 ${
                      isSelected
                        ? "bg-[#DFF5FB] outline-none text-[#05AADF]"
                        : "bg-[#F6F6F6]"
                    }`}
                    onClick={() =>
                      setNewTags((prev) =>
                        prev.includes(tag.value)
                          ? prev.filter((t) => t !== tag.value)
                          : [...prev, tag.value]
                      )
                    }
                  >
                    <MingcuteTagFill /> {tag.label}
                  </motion.div>
                )
              })}
            </div>
          </Squircle>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
