import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// RSS Feed endpoint
http.route({
  path: "/feed",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Fetch all entries (limit to recent 100 for performance)
    const entries = await ctx.runQuery(api.entries.getEntries, {
      paginationOpts: {
        numItems: 100,
        cursor: null,
      },
    });

    // Site metadata - update these with your actual site details
    const siteUrl = new URL(request.url).origin;
    const feedUrl = `${siteUrl}/feed`;
    const siteTitle = "Things to be Happy About";
    const siteDescription =
      "A daily journal of things to be happy about - capturing life's joyful moments, one day at a time.";

    // Build RSS feed
    const rssItems = entries.page
      .map((entry) => {
        // Create a unique URL for each entry
        const entryUrl = `${siteUrl}/?date=${entry.date}`;

        // Create HTML content from the things array
        const contentHtml = `
          <ul>
            ${entry.things.map((thing) => `<li>${escapeXml(thing)}</li>`).join("\n            ")}
          </ul>
        `.trim();

        // Parse date and create RFC-822 formatted date
        const dateObj = new Date(entry.date + "T12:00:00Z"); // Noon UTC to avoid timezone issues
        const pubDate = dateObj.toUTCString();

        return `
    <item>
      <title>${escapeXml(entry.date)} - Things to be Happy About</title>
      <link>${escapeXml(entryUrl)}</link>
      <guid isPermaLink="true">${escapeXml(entryUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${contentHtml}]]></description>
    </item>`;
      })
      .join("\n");

    // Get the most recent entry date for lastBuildDate
    const lastBuildDate =
      entries.page.length > 0
        ? new Date(entries.page[0].date + "T12:00:00Z").toUTCString()
        : new Date().toUTCString();

    // Construct RSS 2.0 XML
    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <generator>Convex RSS Generator</generator>
${rssItems}
  </channel>
</rss>`;

    // Return RSS feed with proper content type
    return new Response(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        // Cache for 1 hour
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }),
});

// Helper function to escape XML special characters
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default http;
