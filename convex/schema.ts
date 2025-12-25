import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  entries: defineTable({
    date: v.string(),
    things: v.array(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_date", ["date"])
    .index("by_deletedAt", ["deletedAt"]),
  sessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_expiresAt", ["expiresAt"]),
  weeklyImages: defineTable({
    weekStart: v.string(),
    imageUrl: v.string(),
    prompt: v.string(),
    thingCount: v.number(),
  })
    .index("by_weekStart", ["weekStart"]),
});
