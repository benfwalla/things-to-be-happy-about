#!/usr/bin/env bun
// Test script to verify the weekly collage generation works
import { execSync } from "child_process";

console.log("Testing weekly collage generation...");

// Get last week's dates
const weekStart = new Date();
weekStart.setDate(weekStart.getDate() - weekStart.getDay() - 7); // Last Monday
const weekStartStr = weekStart.toISOString().split('T')[0];

const weekEnd = new Date(weekStart);
weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
const weekEndStr = weekEnd.toISOString().split('T')[0];

console.log(`Testing with week: ${weekStartStr} to ${weekEndStr}`);

try {
  // Run the script
  const output = execSync(
    `bun run scripts/generate-weekly-collage.ts "${weekStartStr}" "${weekEndStr}"`,
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        // Make sure environment variables are set
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
        CONVEX_ACCESS_TOKEN: process.env.CONVEX_ACCESS_TOKEN,
        NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      }
    }
  );
  
  console.log("Output:");
  console.log(output);
  console.log("\n✅ Test completed successfully!");
} catch (error) {
  console.error("❌ Test failed:");
  const errorObj = error as unknown;
  if (errorObj && typeof errorObj === 'object' && 'stdout' in errorObj) {
    console.error(String((errorObj as any).stdout || (errorObj as Error).message));
  } else if (errorObj instanceof Error) {
    console.error(errorObj.message);
  } else {
    console.error(String(errorObj));
  }
  process.exit(1);
}
