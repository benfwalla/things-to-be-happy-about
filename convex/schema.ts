import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  entries: defineTable({
    date: v.string(), // Store as ISO date string (YYYY-MM-DD)
    things: v.array(v.string()), // Array of things to be happy about
    deletedAt: v.optional(v.number()), // Timestamp for soft delete
    createdAt: v.optional(v.number()), // Legacy field from old schema
  })
    .index("by_date", ["date"])
    .index("by_deletedAt", ["deletedAt"]),
  sessions: defineTable({
    token: v.string(), // Session token
    expiresAt: v.number(), // Expiration timestamp
    createdAt: v.number(), // Creation timestamp
  })
    .index("by_token", ["token"])
    .index("by_expiresAt", ["expiresAt"]),
  weeklyImages: defineTable({
    weekStart: v.string(), // ISO date string (Monday of that week)
    imageUrl: v.string(), // URL to generated image
    prompt: v.string(), // The prompt used for generation
    thingCount: v.number(), // How many things were included
    createdAt: v.number(),
  })
    .index("by_weekStart", ["weekStart"]),
});
