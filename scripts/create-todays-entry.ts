#!/usr/bin/env bun
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

async function ensureEntry(date: string) {
  console.log(`Checking if entry exists for ${date} (America/New_York)`);
  
  // First check if entry exists
  const existing = await convex.query(api.entries.getEntryByDate, { date });
  
  if (existing) {
    console.log(`Entry already exists for ${date} with ID: ${existing._id}`);
    return existing;
  }
  
  console.log(`No entry found for ${date}. Creating new entry...`);
  const result = await convex.mutation(api.entries.addEntry, {
    date,
    things: [],
  });
  
  console.log(`Successfully created entry for ${date} with ID: ${result}`);
  return result;
}

const inputDate = process.argv[2];
const targetDate = inputDate || easternDateString();

console.log(`Running script for date: ${targetDate}`);

ensureEntry(targetDate)
  .then(() => {
    console.log(`Done ensuring entry for ${targetDate}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to ensure entry:", err);
    process.exit(1);
  });
