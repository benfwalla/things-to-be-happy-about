#!/usr/bin/env bun
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_DEPLOYMENT;
if (!convexUrl) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL or CONVEX_DEPLOYMENT must be set");
  process.exit(1);
}

const finalConvexUrl = convexUrl.startsWith("dev:") || convexUrl.startsWith("prod:")
  ? `https://${convexUrl.split(":")[1]}.convex.cloud`
  : convexUrl;

const convex = new ConvexHttpClient(finalConvexUrl);

async function generateWeeklyCollage(weekStart: string, weekEnd: string) {
  console.log(`Fetching entries for week ${weekStart} to ${weekEnd}`);
  
  const entries = await convex.query(api.weeklyImages.getWeekEntries, {
    weekStart,
    weekEnd,
  });
  
  if (entries.length === 0) {
    console.log("No entries found for this week");
    return;
  }
  
  const allThings = entries.flatMap((entry: any) => entry.things);
  console.log(`Found ${allThings.length} things to be happy about`);
  
  if (allThings.length === 0) {
    console.log("No things to be happy about found in entries. Skipping collage generation.");
    return;
  }
  
  const basePrompt = "Create a large-scale mural painting in the style of Midwestern town building murals. The artwork should span horizontally like a wraparound mural on a brick building, featuring interconnected scenes of everyday joy and community life. Use a warm, nostalgic palette with soft blues, warm yellows, and earth tones. The style should be reminiscent of regional American muralists like Thomas Hart Benton, with flowing lines and slightly exaggerated, heartfelt perspectives. Each element should blend into the next, creating a continuous narrative of happiness and small moments that make life meaningful.";
  
  const thingsList = allThings.slice(0, 50).join(", ");
  const fullPrompt = `${basePrompt}\n\nMural scenes to incorporate: ${thingsList}`;
  
  console.log("Generating image...");
  
  try {
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt: fullPrompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
    });
    
    const imageData = response.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error("No image data received from OpenAI");
    }
    
    console.log(`Generated image size: ${imageData.length} characters`);
    
    const storeResult = await convex.action(api.storeImage.storeImageAction, {
      weekStart,
      imageData,
      prompt: fullPrompt,
      thingCount: allThings.length,
    });
    
    console.log("Image stored successfully:");
    console.log("- Storage ID:", storeResult.storageId);
    console.log("- URL:", storeResult.url);
    
    console.log(`Successfully generated and saved weekly collage for ${weekStart}`);
    console.log(`Included ${allThings.length} things from ${entries.length} entries`);
    
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}

const weekStart = process.argv[2];
const weekEnd = process.argv[3];

if (!weekStart || !weekEnd) {
  console.error("Usage: bun run generate-weekly-collage.ts <weekStart> <weekEnd>");
  console.error("Example: bun run generate-weekly-collage.ts 2024-01-01 2024-01-07");
  process.exit(1);
}

generateWeeklyCollage(weekStart, weekEnd)
  .then(() => {
    console.log("Weekly collage generation completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to generate weekly collage:", error);
    process.exit(1);
  });
