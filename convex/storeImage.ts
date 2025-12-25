"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Action to store an image (can use "use node")
export const storeImageAction = action({
  args: {
    weekStart: v.string(),
    imageData: v.string(), // base64 encoded image
    prompt: v.string(), // The prompt used for generation
    thingCount: v.number(), // How many things were included
  },
  handler: async (ctx, args) => {
    // Convert base64 to bytes using Buffer (Node.js environment)
    const imageBytes = Buffer.from(args.imageData, "base64");
    
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
      prompt: args.prompt,
      thingCount: args.thingCount,
    });
    
    return { storageId, url };
  },
});
