import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { containsBlockedWord } from "./moderation";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return { ...user, avatar: profile?.avatar };
  },
});

export const setDisplayName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) throw new Error("Name cannot be empty");
    if (containsBlockedWord(trimmed)) throw new Error("Name contains inappropriate language");
    await ctx.db.patch(userId, { name: trimmed });
  },
});

export const setAvatar = mutation({
  args: { avatar: v.string() },
  handler: async (ctx, { avatar }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { avatar });
    } else {
      await ctx.db.insert("userProfiles", { userId, avatar });
    }
  },
});
