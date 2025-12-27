import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function todayInEastern(): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to compute Eastern date");
  }

  return `${year}-${month}-${day}`;
}

async function isValidAdmin(ctx: any, token?: string | null) {
  if (!token) return false;

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session) return false;

  return Date.now() <= session.expiresAt;
}

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
    bonus: v.optional(v.string()),
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
        bonus: args.bonus ?? existing.bonus,
      });
      return existing._id;
    } else {
      // Create new entry
      const id = await ctx.db.insert("entries", {
        date: args.date,
        things: args.things,
        bonus: args.bonus,
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

// Add or edit the public Bonus line with daily lock at midnight ET
export const updateBonus = mutation({
  args: {
    date: v.string(),
    bonus: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isAdmin = await isValidAdmin(ctx, args.adminToken);
    const easternToday = todayInEastern();
    const isSameDay = args.date === easternToday;

    if (!isAdmin && !isSameDay) {
      throw new Error("Bonus editing window has closed for this day");
    }

    const trimmedBonus = args.bonus.trim();
    if (trimmedBonus.length > 250) {
      throw new Error("Bonus must be 250 characters or less");
    }

    const entry = await ctx.db
      .query("entries")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (entry) {
      await ctx.db.patch(entry._id, {
        bonus: trimmedBonus === "" ? undefined : trimmedBonus,
      });
      return entry._id;
    }

    return await ctx.db.insert("entries", {
      date: args.date,
      things: [],
      bonus: trimmedBonus === "" ? undefined : trimmedBonus,
    });
  },
});
