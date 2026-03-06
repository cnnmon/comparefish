import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const submit = mutation({
  args: {
    comparisonId: v.id("comparisons"),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, { comparisonId, x, y }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comparison = await ctx.db.get(comparisonId);
    if (comparison?.expiresAt && Date.now() >= comparison.expiresAt)
      throw new Error("This comparison is locked");

    const existing = await ctx.db
      .query("placements")
      .withIndex("by_user_comparison", (q) =>
        q.eq("userId", userId).eq("comparisonId", comparisonId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { x, y });
      return existing._id;
    }
    return await ctx.db.insert("placements", { userId, comparisonId, x, y });
  },
});

export const getMine = query({
  args: { comparisonId: v.optional(v.id("comparisons")) },
  handler: async (ctx, { comparisonId }) => {
    if (!comparisonId) return null;
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("placements")
      .withIndex("by_user_comparison", (q) =>
        q.eq("userId", userId).eq("comparisonId", comparisonId),
      )
      .unique();
  },
});

export const getResults = query({
  args: { comparisonId: v.optional(v.id("comparisons")) },
  handler: async (ctx, { comparisonId }) => {
    if (!comparisonId) return [];

    const placements = await ctx.db
      .query("placements")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", comparisonId))
      .collect();
    const fixes = await ctx.db
      .query("fixes")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", comparisonId))
      .collect();

    const results = await Promise.all(
      placements.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        const userFixes = fixes.filter((f) => f.targetUserId === p.userId);
        const avg =
          userFixes.length > 0
            ? {
                x: userFixes.reduce((s, f) => s + f.x, 0) / userFixes.length,
                y: userFixes.reduce((s, f) => s + f.y, 0) / userFixes.length,
              }
            : null;
        return {
          userId: p.userId,
          name: user?.name ?? "Anonymous",
          image: user?.image ?? null,
          self: { x: p.x, y: p.y },
          averaged: avg,
          fixCount: userFixes.length,
        };
      }),
    );
    return results;
  },
});

export const getAll = query({
  args: { comparisonId: v.optional(v.id("comparisons")) },
  handler: async (ctx, { comparisonId }) => {
    if (!comparisonId) return [];
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const all = await ctx.db
      .query("placements")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", comparisonId))
      .collect();

    const withUsers = await Promise.all(
      all.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          ...p,
          name: user?.name ?? "Anonymous",
          image: user?.image ?? null,
          isMe: p.userId === userId,
        };
      }),
    );
    return withUsers;
  },
});
