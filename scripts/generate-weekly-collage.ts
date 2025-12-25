#!/usr/bin/env bun
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function generateWeeklyCollage(weekStart: string, weekEnd: string) {
  console.log(`Fetching entries for week ${weekStart} to ${weekEnd}`);
  
  // Get all entries for the week
  const entries = await convex.query(api.weeklyImages.getWeekEntries, {
    weekStart,
    weekEnd,
  });
  
  if (entries.length === 0) {
    console.log("No entries found for this week");
    return;
  }
  
  // Collect all things from the week
  const allThings = entries.flatMap((entry: any) => entry.things);
  console.log(`Found ${allThings.length} things to be happy about`);
  
  // Create a peaceful, nostalgic prompt
  const basePrompt = "Create a peaceful, nostalgic collage that represents these moments of joy and happiness. The image should have a dreamy, gentle quality with soft colors and a warm, comforting atmosphere. Style: artistic collage with mixed media elements, incorporating subtle textures and a sentimental feel. The overall mood should be serene and contemplative.";
  
  const thingsList = allThings.slice(0, 50).join(", "); // Limit to 50 things
  const fullPrompt = `${basePrompt}\n\nElements to include: ${thingsList}`;
  
  console.log("Generating image with prompt...");
  console.log(`Prompt length: ${fullPrompt.length} characters`);
  
  try {
    // Generate image using the latest OpenAI API
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });
    
    const imageData = response.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error("No image data received");
    }
    
    // Upload image to a storage service (for now, we'll use a placeholder)
    // In production, you'd upload to Vercel Blob, AWS S3, or similar
    const imageUrl = `data:image/png;base64,${imageData}`;
    
    // Save to Convex database
    console.log("Saving weekly image to database...");
    await convex.mutation(api.weeklyImages.saveWeeklyImage, {
      weekStart,
      imageUrl,
      prompt: fullPrompt,
      thingCount: allThings.length,
    });
    
    console.log(`Successfully generated and saved weekly collage for ${weekStart}`);
    console.log(`Included ${allThings.length} things from ${entries.length} entries`);
    
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}

// Run the script
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
