import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Rate limiting storage (in production, use a proper rate limiting service)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Helper function to get client identifier
function getClientId(ctx: any): string {
  // Try to get IP from headers or use a random identifier
  return ctx.request?.headers?.['x-forwarded-for'] || 
         ctx.request?.headers?.['x-real-ip'] || 
         Math.random().toString(36).substring(7);
}

// Login mutation with rate limiting
export const login = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    // Get client IP for rate limiting (basic implementation)
    const clientId = getClientId(ctx);
    const now = Date.now();
    const attempts = loginAttempts.get(clientId) || { count: 0, lastAttempt: 0 };

    // Reset attempts after 15 minutes
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      attempts.count = 0;
    }

    // Lock out after 5 failed attempts
    if (attempts.count >= 5 && now - attempts.lastAttempt < 15 * 60 * 1000) {
      throw new Error("Too many failed attempts. Please try again later.");
    }

    const correctPassword = process.env.ADMIN_PASSWORD;
    if (!correctPassword) {
      throw new Error("Admin password not configured");
    }

    if (args.password !== correctPassword) {
      loginAttempts.set(clientId, {
        count: attempts.count + 1,
        lastAttempt: now,
      });
      throw new Error("Invalid password");
    }

    // Reset attempts on successful login
    loginAttempts.set(clientId, { count: 0, lastAttempt: 0 });

    // Generate a simple session token (in production, use JWT)
    const token = btoa(`${now}-${Math.random()}`);
    
    // Store session in Convex (with expiration)
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
    await ctx.db.insert("sessions", {
      token,
      expiresAt,
    });

    return { token, expiresAt };
  },
});

// Logout mutation
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      // Use ctx.db.delete for mutations
      const db = ctx.db as any;
      await db.delete(session._id);
    }
  },
});

// Check authentication status
export const checkAuth = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) {
      return { authenticated: false };
    }

    try {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", args.token!))
        .first();

      if (!session) {
        return { authenticated: false };
      }

      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        return { authenticated: false };
      }

      return { authenticated: true, expiresAt: session.expiresAt };
    } catch (error) {
      console.error("Auth check error:", error);
      return { authenticated: false };
    }
  },
});

// Clean up expired sessions (can be called periodically)
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    for (const session of expiredSessions) {
      const db = ctx.db as any;
      await db.delete(session._id);
    }

    return { deleted: expiredSessions.length };
  },
});
