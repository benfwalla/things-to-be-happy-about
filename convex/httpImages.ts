import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// HTTP action to store an image
export const storeImage = httpAction(async (ctx, request) => {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");
  
  if (!weekStart) {
    return new Response("Missing weekStart parameter", { status: 400 });
  }
  
  // Get the image from the request body
  const blob = await request.blob();
  
  // Store in Convex storage
  const storageId = await ctx.storage.store(blob);
  
  // Get the URL
  const url = await ctx.storage.getUrl(storageId);
  
  if (!url) {
    return new Response("Failed to get image URL", { status: 500 });
  }
  
  // Save metadata to database
  await ctx.runMutation(api.weeklyImages.saveWeeklyImage, {
    weekStart,
    imageUrl: url,
    prompt: `Generated weekly collage for ${weekStart}`,
    thingCount: 0, // We'll update this later if needed
  });
  
  return new Response(JSON.stringify({ storageId, url }), {
    headers: { "Content-Type": "application/json" },
  });
});
