import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  comparisons: defineTable({
    date: v.string(),
    creatorId: v.optional(v.id("users")),
    name: v.optional(v.string()),
    private: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
    xLabelLeft: v.optional(v.string()),
    xLabelRight: v.optional(v.string()),
    yLabelTop: v.optional(v.string()),
    yLabelBottom: v.optional(v.string()),
  }).index("by_date", ["date"]),

  placements: defineTable({
    userId: v.id("users"),
    comparisonId: v.id("comparisons"),
    x: v.number(),
    y: v.number(),
  })
    .index("by_comparison", ["comparisonId"])
    .index("by_user_comparison", ["userId", "comparisonId"]),

  fixes: defineTable({
    fixerId: v.id("users"),
    targetUserId: v.id("users"),
    comparisonId: v.id("comparisons"),
    x: v.number(),
    y: v.number(),
  })
    .index("by_comparison", ["comparisonId"])
    .index("by_fixer_comparison", ["fixerId", "comparisonId"])
    .index("by_fixer_target_comparison", [
      "fixerId",
      "targetUserId",
      "comparisonId",
    ]),
});

export default schema;
