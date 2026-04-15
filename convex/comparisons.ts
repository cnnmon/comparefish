import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { containsBlockedWord } from "./moderation";

function moderateTexts(...texts: (string | undefined)[]) {
  for (const t of texts) {
    if (t && containsBlockedWord(t))
      throw new Error("Input contains inappropriate language");
  }
}

function getDisplayName(user: Record<string, unknown> | null): string {
  if (!user) return "Unknown";
  const name = typeof user.name === "string" && user.name ? user.name : null;
  if (name) return name;
  const email = typeof user.email === "string" && user.email ? user.email : null;
  if (email) return email.split("@")[0];
  return "Unknown";
}

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    const normalized = ctx.db.normalizeId("comparisons", id);
    if (!normalized) return null;
    const comparison = await ctx.db.get(normalized);
    if (!comparison) return null;
    const locked = comparison.expiresAt ? Date.now() >= comparison.expiresAt : false;
    const creator = comparison.creatorId ? await ctx.db.get(comparison.creatorId) : null;
    const creatorName = getDisplayName(creator as Record<string, unknown> | null);
    return { ...comparison, isMine: comparison.creatorId === userId, locked, creatorName };
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
        const creatorName = getDisplayName(creator as Record<string, unknown> | null);
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
    dimensions: v.optional(v.array(v.object({
      negLabel: v.string(),
      posLabel: v.string(),
      negDescription: v.optional(v.string()),
      posDescription: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, { durationHours, dimensions, ...rest }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    moderateTexts(
      rest.name, rest.xLabelLeft, rest.xLabelRight, rest.yLabelTop, rest.yLabelBottom,
      ...((dimensions ?? []).flatMap((d) => [d.negLabel, d.posLabel, d.negDescription, d.posDescription])),
    );
    if (dimensions && dimensions.length >= 1) {
      rest.xLabelLeft = dimensions[0].negLabel || undefined;
      rest.xLabelRight = dimensions[0].posLabel || undefined;
      if (dimensions.length >= 2) {
        rest.yLabelBottom = dimensions[1].negLabel || undefined;
        rest.yLabelTop = dimensions[1].posLabel || undefined;
      }
    } else {
      if (!rest.xLabelLeft && !rest.xLabelRight)
        throw new Error("At least one x-axis label required");
      if (!rest.yLabelTop && !rest.yLabelBottom)
        throw new Error("At least one y-axis label required");
    }
    const date = new Date().toISOString().slice(0, 10);
    const expiresAt = durationHours
      ? Date.now() + durationHours * 60 * 60 * 1000
      : undefined;
    const dims = dimensions && dimensions.length >= 1 ? dimensions : undefined;
    return await ctx.db.insert("comparisons", { date, creatorId: userId, expiresAt, dimensions: dims, ...rest });
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
    moderateTexts(name);
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

export const setExpiry = mutation({
  args: {
    id: v.id("comparisons"),
    durationHours: v.optional(v.number()),
  },
  handler: async (ctx, { id, durationHours }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comparison = await ctx.db.get(id);
    if (!comparison) throw new Error("Not found");
    if (comparison.creatorId !== userId) throw new Error("Not authorized");
    const expiresAt = durationHours
      ? Date.now() + durationHours * 60 * 60 * 1000
      : undefined;
    await ctx.db.patch(id, { expiresAt });
  },
});

const dimensionValidator = v.object({
  negLabel: v.string(),
  posLabel: v.string(),
  negDescription: v.optional(v.string()),
  posDescription: v.optional(v.string()),
});

export const updateDimensions = mutation({
  args: {
    id: v.id("comparisons"),
    dimensions: v.array(dimensionValidator),
  },
  handler: async (ctx, { id, dimensions }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comparison = await ctx.db.get(id);
    if (!comparison) throw new Error("Not found");
    if (comparison.creatorId !== userId) throw new Error("Not authorized");
    moderateTexts(...dimensions.flatMap((d) => [d.negLabel, d.posLabel, d.negDescription, d.posDescription]));
    const patch: Record<string, unknown> = { dimensions };
    if (dimensions.length >= 1) {
      patch.xLabelLeft = dimensions[0].negLabel || undefined;
      patch.xLabelRight = dimensions[0].posLabel || undefined;
    }
    if (dimensions.length >= 2) {
      patch.yLabelBottom = dimensions[1].negLabel || undefined;
      patch.yLabelTop = dimensions[1].posLabel || undefined;
    }
    await ctx.db.patch(id, patch);
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
