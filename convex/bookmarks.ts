import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    const tasks = await ctx.db.query("bookmarks").order("desc").take(100);
    return tasks;
  },
});

export const updateBookmark = mutation({
  args: {
    id: v.id("bookmarks"),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const filteredUpdates: { title?: string; url?: string; favicon?: string } =
      {};
    if (updates.title !== undefined) filteredUpdates.title = updates.title;
    if (updates.url !== undefined) {
      filteredUpdates.url = updates.url;
      // Update favicon if URL changed
      function getHostname(input: string): string | null {
        try {
          const url = new URL(
            input.includes("://") ? input : `https://${input}`
          );
          return url.hostname;
        } catch {
          return null;
        }
      }
      const hostname = getHostname(updates.url);
      filteredUpdates.favicon = hostname
        ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`
        : "https://www.google.com/s2/favicons?domain=example.com&sz=128";
    }
    await ctx.db.patch(id, filteredUpdates);
  },
});

export const createBookmark = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    comment: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    function getHostname(input: string): string | null {
      try {
        // Ensure there's a scheme so URL() can parse strings like "foo.com/path"
        const url = new URL(input.includes("://") ? input : `https://${input}`);
        // Use full hostname for better favicon accuracy (subdomains often have unique favicons)
        return url.hostname;
      } catch {
        return null;
      }
    }

    function buildFaviconUrl(domain: string | null): string {
      if (!domain) {
        // Fallback to a generic icon if domain extraction fails
        return "https://www.google.com/s2/favicons?domain=example.com&sz=128";
      }
      // Use DuckDuckGo's service as primary - more reliable and higher quality icons
      // Falls back gracefully to a default icon for unknown domains
      return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
    }

    const hostname = getHostname(args.url);
    const faviconUrl = buildFaviconUrl(hostname);
    console.log("favicon url", faviconUrl, "for hostname", hostname);
    const newBookmarkId = await ctx.db.insert("bookmarks", {
      url: args.url,
      title: args.title,
      comment: args.comment,
      tags: args.tags,
      favicon: faviconUrl,
    });
    return newBookmarkId;
  },
});
