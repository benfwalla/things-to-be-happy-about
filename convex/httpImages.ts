import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// HTTP action to store an image
export const storeImage = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");
  
  if (!weekStart) {
    return new Response("Missing weekStart parameter", { status: 400 });
  }
  
  try {
    // Get the image from the request body
    const blob = await request.blob();
    
    // Convert to base64
    const imageBytes = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
    
    // Call the action to store the image
    const result = await ctx.runAction(api.storeImage.storeImageAction, {
      weekStart,
      imageData: base64,
    });
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error storing image:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
