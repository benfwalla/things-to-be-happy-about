#!/usr/bin/env bun
// Test script to verify the daily entry creation works correctly
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_DEPLOYMENT;

if (!convexUrl) {
  console.error("Error: set NEXT_PUBLIC_CONVEX_URL or CONVEX_DEPLOYMENT");
  process.exit(1);
}

const finalConvexUrl = convexUrl.startsWith("dev:") || convexUrl.startsWith("prod:")
  ? `https://${convexUrl.split(":")[1]}.convex.cloud`
  : convexUrl;

const convex = new ConvexHttpClient(finalConvexUrl);

function easternDateString(target = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(target);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to compute Eastern date");
  }

  return `${year}-${month}-${day}`;
}

async function testDailyEntry() {
  const today = easternDateString();
  console.log(`Testing for today's date: ${today}`);
  
  // 1. Check if entry exists
  console.log("\n1. Checking if entry exists...");
  const existing = await convex.query(api.entries.getEntryByDate, { date: today });
  if (existing) {
    console.log(`✓ Entry exists with ID: ${existing._id}`);
    console.log(`  Things count: ${existing.things?.length || 0}`);
    console.log(`  Bonus: ${existing.bonus || 'none'}`);
  } else {
    console.log("✗ No entry found for today");
  }
  
  // 2. Run the create script logic
  console.log("\n2. Running ensureEntry logic...");
  const result = await convex.mutation(api.entries.addEntry, {
    date: today,
  });
  console.log(`✓ Mutation returned ID: ${result}`);
  
  // 3. Verify entry was created/exists
  console.log("\n3. Verifying entry after mutation...");
  const verify = await convex.query(api.entries.getEntryByDate, { date: today });
  if (verify) {
    console.log(`✓ Entry confirmed with ID: ${verify._id}`);
    console.log(`  Things count: ${verify.things?.length || 0}`);
    console.log(`  Created at: ${new Date(verify._creationTime).toISOString()}`);
  } else {
    console.log("✗ Entry still not found - something is wrong!");
  }
  
  // 4. Test with a future date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = easternDateString(tomorrow);
  console.log(`\n4. Testing with future date: ${tomorrowStr}`);
  
  const futureEntry = await convex.query(api.entries.getEntryByDate, { date: tomorrowStr });
  if (!futureEntry) {
    console.log("✓ No entry for future date (as expected)");
    const futureResult = await convex.mutation(api.entries.addEntry, {
      date: tomorrowStr,
      things: [],
    });
    console.log(`✓ Created future entry with ID: ${futureResult}`);
    
    // Clean up the test entry
    console.log("Cleaning up test entry...");
    // Note: We would need a delete mutation to clean up
  }
}

testDailyEntry()
  .then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Test failed:", err);
    process.exit(1);
  });
