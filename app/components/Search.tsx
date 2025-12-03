import { Search as SearchIcon, Plus, Loader } from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getPageMetadata } from "../actions";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Editor as TipTapEditor } from "@tiptap/react";
import Editor from "./Editor";

interface PendingBookmark {
  id: string;
  url: string;
  favicon: string;
}

interface SearchProps {
  onPendingBookmark?: (bookmark: PendingBookmark) => void;
  onBookmarkSaved?: (id: string) => void;
  existingUrls?: string[];
  onSearchChange?: (query: string) => void;
  isRefreshing?: boolean;
}

export default function Search({
  onPendingBookmark,
  onBookmarkSaved,
  existingUrls = [],
  onSearchChange,
  isRefreshing = false,
}: SearchProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const addBookmark = useMutation(api.bookmarks.createBookmark);

  function padUrl(url: string) {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      return url;
    } else {
      return `https://${url}`;
    }
  }

  // Memoize existingUrls as a Set for O(1) lookup
  const existingUrlsSet = useMemo(() => new Set(existingUrls), [existingUrls]);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputUrl(text);
      onSearchChange?.(text.trim());
      if (!text.trim()) {
        setAlreadyExists(false);
        return;
      }
      const fullUrl = padUrl(text.trim());
      setAlreadyExists(existingUrlsSet.has(fullUrl));
    },
    [onSearchChange, existingUrlsSet]
  );

  async function getExtractedTitle(url: string) {
    setInputUrl(url);
    console.log("received url to extract", url);
    const metadata = await getPageMetadata(url);
    console.log(metadata);
    setIsProcessing(false);
    return metadata.title;
  }

  function getFaviconUrl(url: string): string {
    try {
      const parsed = new URL(url.includes("://") ? url : `https://${url}`);
      return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(parsed.hostname)}.ico`;
    } catch {
      return "https://www.google.com/s2/favicons?domain=example.com&sz=128";
    }
  }

  const editorRef = useRef<TipTapEditor | null>(null);

  async function handleSubmit(data: {
    tags: string[];
    text: string;
    comment: string;
  }) {
    const urlText = data.text.trim();
    if (!urlText) return;

    const fullUrl = padUrl(urlText);

    // Don't allow adding if URL already exists
    if (existingUrls.some((url) => url === fullUrl)) {
      return;
    }
    const pendingId = crypto.randomUUID();

    // Clear the editor immediately
    editorRef.current?.commands.clearContent();

    // Add optimistic bookmark
    onPendingBookmark?.({
      id: pendingId,
      url: fullUrl,
      favicon: getFaviconUrl(fullUrl),
    });

    setIsProcessing(true);
    const extractedTitle = await getExtractedTitle(fullUrl);

    // Log the extracted data
    console.log(extractedTitle);
    console.log(data.tags);
    console.log(data.comment);

    await addBookmark({
      url: fullUrl,
      title: extractedTitle ?? "Untitled",
      comment: data.comment,
      tags: data.tags,
    });

    // Remove pending bookmark after save
    onBookmarkSaved?.(pendingId);
    setInputUrl("");
    setAlreadyExists(false);
  }

  return (
    <motion.div
      className={`rounded-4xl [corner-shape:squircle] font-inter bg-[#FEFFFF] border border-[#ECEDED] w-[50%] h-28 px-5 py-5 flex flex-col justify-between`}
      onMouseDown={() => {
        console.log("focusing");
        editorRef.current?.commands.focus("end");
      }}
    >
      <div className="flex items-center gap-3">
        <SearchIcon size={17} color="gray" />
        <Editor
          ref={editorRef}
          className="w-full max-w-[90%]"
          onSubmit={handleSubmit}
          onTextChange={handleTextChange}
        />
      </div>
      <div className="flex items-center justify-between">
        <p
          className={`text-[#FD2B38]/87 text-[13.5px] font-[410] antialiased font-rounded rounded-full px-3 py-1 bg-[#FD2B38]/10 translate-y-1 ${
            alreadyExists ? "opacity-100 blur-0" : "opacity-0 blur-[2px]"
          } transition-all duration-150`}
        >
          Already Exists
        </p>
        <div
          className={`rounded-full cursor-pointer p-1.25 transition-colors`}
          style={{
            backgroundColor: inputUrl.length > 0 ? "black" : "#F2F3F3",
          }}
        >
          <AnimatePresence mode="popLayout">
            {!isProcessing && !isRefreshing ? (
              <motion.div
                key={"plus"}
                initial={{ scale: 0.5, opacity: 0, filter: "blur(1px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                exit={{ scale: 0.5, opacity: 0, filter: "blur(1px)" }}
                transition={{ duration: 0.1 }}
              >
                <Plus
                  className="ml-auto rounded-full"
                  size={19}
                  style={{
                    color: inputUrl.length > 0 ? "white" : "#B4B4B4",
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key={"loading"}
                initial={{ scale: 0.5, opacity: 0.5, filter: "blur(1px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                exit={{ scale: 0.5, opacity: 0.5, filter: "blur(1px)" }}
                transition={{ duration: 0.05 }}
              >
                <Loader
                  className="ml-auto rounded-full animate-spin"
                  size={19}
                  color="#B4B4B4"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
