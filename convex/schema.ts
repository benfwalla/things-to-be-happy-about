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
});
