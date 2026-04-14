import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

async function getUserDisplay(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const name = user?.name
    || (user?.email ? String(user.email).split("@")[0] : null)
    || "Anonymous";
  return {
    name,
    image: user?.image ?? null,
    avatar: profile?.avatar ?? null,
  };
}

export const submit = mutation({
  args: {
    comparisonId: v.id("comparisons"),
    x: v.number(),
    y: v.number(),
    dimX: v.optional(v.number()),
    dimY: v.optional(v.number()),
  },
  handler: async (ctx, { comparisonId, x, y, dimX, dimY }) => {
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

    const dimCount = comparison?.dimensions?.length ?? 2;
    const ix = dimX ?? 0;
    const iy = dimY ?? 1;

    if (existing) {
      const vals = existing.values ? [...existing.values] : Array(dimCount).fill(0);
      while (vals.length < dimCount) vals.push(0);
      vals[ix] = x;
      vals[iy] = y;
      await ctx.db.patch(existing._id, { x: vals[0], y: vals[1], values: vals });
      return existing._id;
    }

    const vals = Array(dimCount).fill(0);
    vals[ix] = x;
    vals[iy] = y;
    return await ctx.db.insert("placements", {
      userId, comparisonId, x: vals[0], y: vals[1], values: vals,
    });
  },
});

export const deleteMine = mutation({
  args: { comparisonId: v.id("comparisons") },
  handler: async (ctx, { comparisonId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("placements")
      .withIndex("by_user_comparison", (q) =>
        q.eq("userId", userId).eq("comparisonId", comparisonId),
      )
      .unique();
    if (!existing) return;
    // Also delete any fixes targeting or made by this user for this comparison
    const fixes = await ctx.db
      .query("fixes")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", comparisonId))
      .collect();
    for (const fix of fixes) {
      if (fix.fixerId === userId || fix.targetUserId === userId) {
        await ctx.db.delete(fix._id);
      }
    }
    await ctx.db.delete(existing._id);
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
        const display = await getUserDisplay(ctx, p.userId);
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
          ...display,
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

    const all = await ctx.db
      .query("placements")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", comparisonId))
      .collect();

    const withUsers = await Promise.all(
      all.map(async (p) => {
        const display = await getUserDisplay(ctx, p.userId);
        return { ...p, ...display, isMe: !!userId && p.userId === userId };
      }),
    );
    return withUsers;
  },
});
