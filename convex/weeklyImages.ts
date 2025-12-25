import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save a generated weekly image
export const saveWeeklyImage = mutation({
  args: {
    weekStart: v.string(),
    imageUrl: v.string(),
    prompt: v.string(),
    thingCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if an image for this week already exists
    const existing = await ctx.db
      .query("weeklyImages")
      .withIndex("by_weekStart", (q) => q.eq("weekStart", args.weekStart))
      .first();
    
    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        imageUrl: args.imageUrl,
        prompt: args.prompt,
        thingCount: args.thingCount,
      });
      return existing._id;
    } else {
      // Create new
      return await ctx.db.insert("weeklyImages", args);
    }
  },
});

// Get weekly image by week start date
export const getWeeklyImage = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("weeklyImages")
      .withIndex("by_weekStart", (q) => q.eq("weekStart", args.weekStart))
      .first();
  },
});

// Get all weekly images (for admin/debug purposes)
export const getAllWeeklyImages = query({
  handler: async (ctx) => {
    return await ctx.db.query("weeklyImages").order("desc").collect();
  },
});

// Get entries for a specific week range (for the GitHub Action)
export const getWeekEntries = query({
  args: { 
    weekStart: v.string(),
    weekEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_date", (q) => 
        q.gte("date", args.weekStart).lte("date", args.weekEnd)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    
    return entries;
  },
});
