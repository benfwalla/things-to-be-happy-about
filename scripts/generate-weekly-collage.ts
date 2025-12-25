#!/usr/bin/env bun
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Don't load .env.local - rely on environment variables passed in
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Verify required environment variables
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_DEPLOYMENT;
if (!convexUrl) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL or CONVEX_DEPLOYMENT must be set");
  process.exit(1);
}

// Handle special Convex URL formats
let finalConvexUrl = convexUrl;
if (convexUrl.startsWith("dev:") || convexUrl.startsWith("prod:")) {
  // Convert dev:xxx to https://xxx.convex.cloud
  const deploymentName = convexUrl.split(":")[1];
  finalConvexUrl = `https://${deploymentName}.convex.cloud`;
}

const convex = new ConvexHttpClient(finalConvexUrl);

// Verify Convex connection
console.log("Original Convex URL:", convexUrl);
console.log("Final Convex URL:", finalConvexUrl);
console.log("Convex Deployment:", process.env.CONVEX_DEPLOYMENT);

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
    console.log("Calling OpenAI API...");
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });
    
    console.log("OpenAI API response received");
    const imageData = response.data?.[0]?.b64_json;
    if (!imageData) {
      console.error("OpenAI response:", JSON.stringify(response, null, 2));
      throw new Error("No image data received from OpenAI");
    }
    
    // Upload image to Convex storage via HTTP
    console.log("Image data length:", imageData.length);
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Store the image via HTTP endpoint
    const convexUrl = process.env.CONVEX_DEPLOYMENT || process.env.NEXT_PUBLIC_CONVEX_URL;
    const storeUrl = `${convexUrl}/storeImage?weekStart=${weekStart}&contentType=image/png`;
    console.log("Store URL:", storeUrl);
    const storeResponse = await fetch(storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
      },
      body: imageBuffer,
    });
    
    if (!storeResponse.ok) {
      throw new Error(`Failed to store image: ${storeResponse.statusText}`);
    }
    
    const { imageUrl } = await storeResponse.json();
    
    console.log("Image stored successfully");
    console.log("Image URL:", imageUrl);
    
    // Save to Convex database
    console.log("Saving weekly image to database...");
    console.log("Week start:", weekStart);
    console.log("Image URL length:", imageUrl.length);
    console.log("Prompt length:", fullPrompt.length);
    console.log("Thing count:", allThings.length);
    
    try {
      const result = await convex.mutation(api.weeklyImages.saveWeeklyImage, {
        weekStart,
        imageUrl,
        prompt: fullPrompt,
        thingCount: allThings.length,
      });
      console.log("Save successful, ID:", result);
    } catch (convexError) {
      console.error("Convex mutation failed:");
      console.error("Error:", convexError);
      if (convexError instanceof Error) {
        console.error("Error message:", convexError.message);
        console.error("Error stack:", convexError.stack);
      }
      throw convexError;
    }
    
    console.log(`Successfully generated and saved weekly collage for ${weekStart}`);
    console.log(`Included ${allThings.length} things from ${entries.length} entries`);
    
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
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
