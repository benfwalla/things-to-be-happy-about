# Manual Testing Instructions for Daily Entry Creation

## 1. Test the Script Directly

```bash
# Run the test script
bun run scripts/test-daily-entry.ts

# Or run the actual script for today
bun run scripts/create-todays-entry.ts

# Or run it for a specific date
bun run scripts/create-todays-entry.ts 2024-12-25
```

## 2. Test in the Browser

1. Open the app in your browser at http://localhost:5173
2. Log in as admin
3. Before midnight: You should see a placeholder entry for today (empty with "Done" button)
4. After the GitHub Action runs (or after manually running the script):
   - Refresh the page
   - The entry should still be there with the same date
   - It should now have a real ID (check in Network tab)
   - You should be able to edit it normally

## 3. Simulate the GitHub Action

To test what happens when the script runs:

1. Clear today's entry (if it exists) via the UI
2. Run the script manually:
   ```bash
   CONVEX_DEPLOYMENT=prod:your-convex-url bun run scripts/create-todays-entry.ts
   ```
3. Refresh the browser - the entry should appear

## 4. Check Console Logs

Keep the browser console open to see:
- When the placeholder is created
- When the real entry is fetched
- Any errors in the replacement logic

## 5. Verify Timezone Handling

The script uses America/New_York timezone. Verify:
- At 11:59 PM ET: Should create entry for current day
- At 12:01 AM ET: Should create entry for next day
- During DST changes: Should still work correctly

## Common Issues to Check

1. **Placeholder not replaced**: Check if the frontend logic in App.tsx is correctly detecting and replacing the temp-today entry
2. **Duplicate entries**: The addEntry mutation should be idempotent - check if it's creating duplicates
3. **Timezone issues**: Verify the date formatting matches between script and frontend
4. **Network delays**: The frontend might show the placeholder briefly before fetching the real entry
