import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all non-deleted entries with pagination, sorted by date descending (newest first)
export const getEntries = query({
  args: {
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("entries")
      .withIndex("by_date")
      .order("desc")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .paginate(args.paginationOpts ?? { numItems: 10, cursor: null });

    return result;
  },
});

// Add a new entry for a specific date
export const addEntry = mutation({
  args: {
    date: v.string(),
    things: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if non-deleted entry already exists for this date
    const existing = await ctx.db
      .query("entries")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        things: args.things,
      });
      return existing._id;
    } else {
      // Create new entry
      const id = await ctx.db.insert("entries", {
        date: args.date,
        things: args.things,
      });
      return id;
    }
  },
});

// Get entry for a specific date
export const getEntryByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("entries")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    return entry;
  },
});

// Soft delete an entry by ID
export const deleteEntry = mutation({
  args: { id: v.id("entries") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
    });
  },
});
