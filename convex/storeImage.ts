"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Action to store an image (can use "use node")
export const storeImageAction = action({
  args: {
    weekStart: v.string(),
    imageData: v.string(), // base64 encoded image
  },
  handler: async (ctx, args) => {
    // Convert base64 to bytes
    const imageBytes = Uint8Array.from(atob(args.imageData), c => c.charCodeAt(0));
    
    // Store in Convex storage
    const storageId = await ctx.storage.store(new Blob([imageBytes], { type: 'image/png' }));
    
    // Get the URL
    const url = await ctx.storage.getUrl(storageId);
    
    if (!url) {
      throw new Error("Failed to get image URL");
    }
    
    // Save metadata to database
    await ctx.runMutation(api.weeklyImages.saveWeeklyImage, {
      weekStart: args.weekStart,
      imageUrl: url,
      prompt: `Generated weekly collage for ${args.weekStart}`,
      thingCount: 0,
    });
    
    return { storageId, url };
  },
});
