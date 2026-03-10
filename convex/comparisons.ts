import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    const normalized = ctx.db.normalizeId("comparisons", id);
    if (!normalized) return null;
    const comparison = await ctx.db.get(normalized);
    if (!comparison) return null;
    const locked = comparison.expiresAt ? Date.now() >= comparison.expiresAt : false;
    return { ...comparison, isMine: comparison.creatorId === userId, locked };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    const all = await ctx.db.query("comparisons").order("desc").collect();
    const visible = all.filter(
      (c) => !c.private || c.creatorId === userId,
    );
    const withCounts = await Promise.all(
      visible.map(async (c) => {
        const placements = await ctx.db
          .query("placements")
          .withIndex("by_comparison", (q) => q.eq("comparisonId", c._id))
          .collect();
        const creator = c.creatorId ? await ctx.db.get(c.creatorId) : null;
        const creatorName =
          (creator && "name" in creator && typeof creator.name === "string"
            ? creator.name
            : null) ?? "Unknown";
        return { ...c, placementCount: placements.length, creatorName };
      }),
    );
    return withCounts;
  },
});

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    private: v.optional(v.boolean()),
    durationHours: v.optional(v.number()),
    xLabelLeft: v.optional(v.string()),
    xLabelRight: v.optional(v.string()),
    yLabelTop: v.optional(v.string()),
    yLabelBottom: v.optional(v.string()),
  },
  handler: async (ctx, { durationHours, ...rest }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!rest.xLabelLeft && !rest.xLabelRight)
      throw new Error("At least one x-axis label required");
    if (!rest.yLabelTop && !rest.yLabelBottom)
      throw new Error("At least one y-axis label required");
    const date = new Date().toISOString().slice(0, 10);
    const hours = durationHours ?? 24;
    const expiresAt = Date.now() + hours * 60 * 60 * 1000;
    return await ctx.db.insert("comparisons", { date, creatorId: userId, expiresAt, ...rest });
  },
});

export const rename = mutation({
  args: { id: v.id("comparisons"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comparison = await ctx.db.get(id);
    if (!comparison) throw new Error("Not found");
    if (comparison.creatorId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(id, { name: name.trim() || undefined });
  },
});

export const togglePrivate = mutation({
  args: { id: v.id("comparisons") },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comparison = await ctx.db.get(id);
    if (!comparison) throw new Error("Not found");
    if (comparison.creatorId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(id, { private: !comparison.private });
  },
});

export const remove = mutation({
  args: { id: v.id("comparisons") },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comparison = await ctx.db.get(id);
    if (!comparison) throw new Error("Not found");
    if (comparison.creatorId !== userId) throw new Error("Not authorized");

    const placements = await ctx.db
      .query("placements")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", id))
      .collect();
    for (const p of placements) await ctx.db.delete(p._id);

    const fixes = await ctx.db
      .query("fixes")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", id))
      .collect();
    for (const f of fixes) await ctx.db.delete(f._id);

    await ctx.db.delete(id);
  },
});
