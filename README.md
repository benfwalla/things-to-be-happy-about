# Things to Be Happy About

A web app to collect and generate weekly collages of things that make people happy.

## Features

- Daily entries of things to be happy about
- Weekly AI-generated collages using OpenAI's image generation
- Authentication and session management
- Admin panel for managing entries

## Weekly Collage Generation

The app automatically generates weekly collages every Sunday at 8pm UTC via GitHub Actions.

### How it works:

1. **Fetches entries** for the past week
2. **Creates a mural-style prompt** with up to 50 things to be happy about, styled as a Midwestern building mural
3. **Generates a landscape image** using OpenAI's `gpt-image-1.5` model (1536x1024)
4. **Stores the image** in Convex file storage
5. **Saves metadata** to the `weeklyImages` table

### Manual Testing

To test the collage generation manually:

```bash
# Make sure you have these environment variables set:
# - OPENAI_API_KEY
# - CONVEX_DEPLOYMENT or NEXT_PUBLIC_CONVEX_URL
# - CONVEX_ACCESS_TOKEN

# Run the test script
bun run scripts/test-collage.ts

# Or run directly with specific dates
bun run scripts/generate-weekly-collage.ts 2024-01-01 2024-01-07
```

### Environment Variables

Required for the script to work:

- `OPENAI_API_KEY`: Your OpenAI API key with image generation access
- `CONVEX_DEPLOYMENT`: Your Convex deployment URL (e.g., "dev:myapp" or "prod:myapp")
- `CONVEX_ACCESS_TOKEN`: Your Convex admin access token
- `NEXT_PUBLIC_CONVEX_URL`: Full Convex URL (alternative to CONVEX_DEPLOYMENT)

## OpenAI Image Generation

The script uses OpenAI's Image API with the following parameters:

- **Model**: `gpt-image-1.5` (latest model with superior quality)
- **Size**: `1536x1024` (landscape format for mural-style images)
- **Quality**: `high`
- **Style**: Midwestern building murals with interconnected scenes

## File Storage

Images are stored using Convex's built-in file storage:

1. Base64 image data is converted to bytes
2. Stored as a blob in Convex storage
3. A storage ID and URL are generated
4. Metadata is saved to the `weeklyImages` table

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Start Convex backend
bun run convex:dev
```

## Deployment

The app is configured to deploy to Vercel with Convex backend. The weekly collage generation runs automatically via GitHub Actions.
