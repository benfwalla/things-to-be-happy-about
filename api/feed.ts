import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Get the Convex deployment URL from environment variable
    const convexUrl = process.env.VITE_CONVEX_URL;

    if (!convexUrl) {
      return res.status(500).send('Convex URL not configured');
    }

    // Convert convex.cloud URL to convex.site for HTTP endpoints
    const convexSiteUrl = convexUrl.replace('.convex.cloud', '.convex.site');
    const feedUrl = `${convexSiteUrl}/feed`;

    // Fetch the RSS feed from Convex
    const response = await fetch(feedUrl);

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch feed');
    }

    const feedXml = await response.text();

    // Forward the RSS feed with proper headers
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(feedXml);
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    res.status(500).send('Error generating RSS feed');
  }
}
