import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const submit = mutation({
  args: {
    targetUserId: v.id("users"),
    comparisonId: v.id("comparisons"),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, { targetUserId, comparisonId, x, y }) => {
    const fixerId = await auth.getUserId(ctx);
    if (!fixerId) throw new Error("Not authenticated");
    const comparison = await ctx.db.get(comparisonId);
    if (comparison?.expiresAt && Date.now() >= comparison.expiresAt)
      throw new Error("This comparison is locked");

    const existing = await ctx.db
      .query("fixes")
      .withIndex("by_fixer_target_comparison", (q) =>
        q
          .eq("fixerId", fixerId)
          .eq("targetUserId", targetUserId)
          .eq("comparisonId", comparisonId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { x, y });
      return existing._id;
    }
    return await ctx.db.insert("fixes", {
      fixerId,
      targetUserId,
      comparisonId,
      x,
      y,
    });
  },
});

export const remove = mutation({
  args: { fixId: v.id("fixes") },
  handler: async (ctx, { fixId }) => {
    const fixerId = await auth.getUserId(ctx);
    if (!fixerId) throw new Error("Not authenticated");
    const fix = await ctx.db.get(fixId);
    if (!fix || fix.fixerId !== fixerId) throw new Error("Not authorized");
    await ctx.db.delete(fixId);
  },
});

export const getAll = query({
  args: {
    comparisonId: v.optional(v.id("comparisons")),
    showAll: v.optional(v.boolean()),
  },
  handler: async (ctx, { comparisonId, showAll }) => {
    if (!comparisonId) return [];
    const userId = await auth.getUserId(ctx);

    const comparison = await ctx.db.get(comparisonId);
    const isLocked =
      comparison?.expiresAt ? Date.now() >= comparison.expiresAt : false;

    const all = await ctx.db
      .query("fixes")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", comparisonId))
      .collect();

    const relevant = isLocked || showAll || !userId
      ? all
      : all.filter(
          (f) => f.targetUserId === userId || f.fixerId === userId,
        );

    const withDetails = await Promise.all(
      relevant.map(async (f) => {
        const fixer = await ctx.db.get(f.fixerId);
        const target = await ctx.db.get(f.targetUserId);
        const targetProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", f.targetUserId))
          .unique();
        return {
          ...f,
          fixerName: fixer?.name ?? "Anonymous",
          targetName: target?.name ?? "Anonymous",
          targetImage: target?.image ?? null,
          targetAvatar: targetProfile?.avatar ?? null,
          isMine: !!userId && f.fixerId === userId,
        };
      }),
    );
    return withDetails;
  },
});
