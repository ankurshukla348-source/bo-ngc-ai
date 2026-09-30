import { v } from "convex/values";
import {
  CHAT_CUSTOMER_LIMIT,
  CHAT_THREAD_LIMIT,
  chatSellerThrottleKey,
  chatThrottleKey,
  threadThrottleKey,
} from "../lib/antiSpam";
import { requireOwner } from "../lib/owner";
import { allowRequest } from "./throttle";
import { mutation, query } from "./_generated/server";

/** Longest body we accept in one line of chat (keeps the inbox readable). */
const MAX_BODY = 2000;
const MAX_LABEL = 120;

/** Conversation ids are browser-generated; keep them short and opaque. */
function cleanConversationId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

function cleanText(raw: string | undefined, max: number): string | undefined {
  const value = raw?.trim().slice(0, max);
  return value ? value : undefined;
}

/**
 * Append a message to a chat thread.
 *
 * Both sides (customer widget and seller inbox) go through this one mutation,
 * so a new message is always a single append — no read-modify-write on the
 * thread that could race. The insert is wrapped in try/catch: a rejected
 * insert leaves the conversation untouched instead of crashing the client.
 */
export const send = mutation({
  args: {
    conversationId: v.string(),
    body: v.string(),
    author: v.union(v.literal("customer"), v.literal("seller")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Only the owner may post as the shop; a customer can only ever post as
    // themselves, so nobody can forge a reply from Bảo Ngọc.
    if (args.author === "seller") await requireOwner(ctx);
    const conversationId = cleanConversationId(args.conversationId);
    const body = args.body.trim().slice(0, MAX_BODY);
    if (!conversationId) throw new Error("Missing conversation");
    if (!body) return null;

    const createdAt = Date.now();

    // Rate limit before writing: the widget is public, and an unbounded write
    // path is both a spam problem and a way to run up the database bill. The
    // seller has their own bucket so replying to a customer is never blocked.
    const allowed = await allowRequest(
      ctx,
      args.author === "seller"
        ? chatSellerThrottleKey(conversationId)
        : chatThrottleKey(conversationId),
      CHAT_CUSTOMER_LIMIT,
    );
    if (!allowed) throw new Error("Too many messages — please slow down");
    const threadAllowed = await allowRequest(
      ctx,
      threadThrottleKey(conversationId),
      CHAT_THREAD_LIMIT,
    );
    if (!threadAllowed) {
      throw new Error("This conversation is busy — please try again later");
    }

    try {
      return await ctx.db.insert("messages", {
        conversationId,
        author: args.author,
        body,
        ...(cleanText(args.name, MAX_LABEL)
          ? { name: cleanText(args.name, MAX_LABEL) }
          : {}),
        ...(cleanText(args.email, MAX_LABEL)
          ? { email: cleanText(args.email, MAX_LABEL) }
          : {}),
        ...(args.userId ? { userId: args.userId } : {}),
        // Seller messages start read; customer messages start unread.
        ...(args.author === "seller" ? { readAt: createdAt } : {}),
        createdAt,
      });
    } catch {
      return null;
    }
  },
});

/** Full thread, oldest first, for the chat panel on either side. */
export const conversation = query({
  args: { conversationId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const conversationId = cleanConversationId(args.conversationId);
    if (!conversationId) return [];
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .take(Math.min(args.limit ?? 200, 500));

    return rows.map((row) => ({
      _id: row._id,
      author: row.author,
      body: row.body,
      name: row.name ?? null,
      email: row.email ?? null,
      readAt: row.readAt ?? null,
      createdAt: row.createdAt,
    }));
  },
});

export type ThreadSummary = {
  conversationId: string;
  name: string | null;
  email: string | null;
  lastBody: string;
  lastAt: number;
  lastFrom: "customer" | "seller";
  unread: number;
  messageCount: number;
};

/**
 * Seller inbox: every conversation with its last message, newest first.
 *
 * Messages are scanned newest-first and folded per conversation, so the
 * common case (a handful of live threads) is one paginated read.
 */
export const threads = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ThreadSummary[]> => {
    await requireOwner(ctx);
    const rows = await ctx.db
      .query("messages")
      .order("desc")
      .take(Math.min(args.limit ?? 1000, 2000));

    const byConversation = new Map<string, ThreadSummary>();

    for (const row of rows) {
      const existing = byConversation.get(row.conversationId);
      if (!existing) {
        byConversation.set(row.conversationId, {
          conversationId: row.conversationId,
          name: row.name ?? null,
          email: row.email ?? null,
          lastBody: row.body,
          lastAt: row.createdAt,
          lastFrom: row.author,
          unread: row.author === "customer" && row.readAt === undefined ? 1 : 0,
          messageCount: 1,
        });
        continue;
      }
      // Rows arrive newest-first, so the first hit is always the latest.
      existing.messageCount += 1;
      if (row.author === "customer" && row.readAt === undefined) {
        existing.unread += 1;
      }
      // Keep the most recent contact details we have for the visitor.
      if (!existing.name && row.name) existing.name = row.name;
      if (!existing.email && row.email) existing.email = row.email;
    }

    return [...byConversation.values()].sort((a, b) => b.lastAt - a.lastAt);
  },
});

/** Unread customer messages across all threads — drives the seller badge. */
export const unreadTotal = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("messages").order("desc").take(2000);
    return rows.filter(
      (row) => row.author === "customer" && row.readAt === undefined,
    ).length;
  },
});

/** Mark a thread read. Each patch is independent so one failure is not fatal. */
export const markRead = mutation({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const conversationId = cleanConversationId(args.conversationId);
    if (!conversationId) return 0;

    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    const at = Date.now();
    let marked = 0;
    for (const row of rows) {
      if (row.readAt !== undefined) continue;
      try {
        await ctx.db.patch(row._id, { readAt: at });
        marked += 1;
      } catch {
        // Already deleted or patched concurrently — nothing else to do.
      }
    }
    return marked;
  },
});

/** Delete a single message from a thread (seller moderation). */
export const remove = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    try {
      await ctx.db.delete(args.id);
      return { removed: true };
    } catch {
      return { removed: false };
    }
  },
});

/** Delete an entire conversation (seller moderation). */
export const clearThread = mutation({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const conversationId = cleanConversationId(args.conversationId);
    if (!conversationId) return { removed: 0 };

    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    let removed = 0;
    for (const row of rows) {
      try {
        await ctx.db.delete(row._id);
        removed += 1;
      } catch {
        // Already gone — keep clearing the rest of the thread.
      }
    }
    return { removed };
  },
});
