import { ImageResponse } from "next/og";
import { connectToDB } from "@/utils/database";
import Post, { IPost } from "@/models/post";

import { backgroundOptions } from "@/lib/backgrounds";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MindFuel Reflection";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let postText = "Keep fueling your mind.";
  let authorName = "MindFuel";
  let authorHandle = "@mindfuel";
  let bgValue = "#171717";
  let textColor = "#ffffff";

  try {
    await connectToDB();
    const post = await Post.findById(id).populate("userId", "name").lean() as IPost | null;

    if (post) {
      postText = post.text || postText;
      // @ts-expect-error userId is populated
      authorName = post.userId?.name || authorName;
      authorHandle = `@${authorName.replace(/\s+/g, "").toLowerCase()}`;

      
      // Try to find theme by ID first (new posts)
      let theme = post.backgroundStyle?.id ? backgroundOptions.find((b) => b.id === post.backgroundStyle.id) : null;
      
      // Fallback: Try to find theme by value (for older posts or if ID mismatch)
      if (!theme && post.backgroundStyle?.value) {
        theme = backgroundOptions.find((b) => b.value === post.backgroundStyle.value);
      }

      if (theme) {
        bgValue = theme.value;
        textColor = theme.text;
      } else if (post.backgroundStyle?.value) {
        // Ultimate fallback: use whatever value is in the database
        bgValue = post.backgroundStyle.value;
        textColor = post.backgroundStyle.text || "#ffffff";
      }
    }

  } catch (err) {
    console.error("OG Image generation failed:", err);
  }
  
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: bgValue,
          color: textColor,
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: "80px",
            justifyContent: "space-between",
          }}
        >
          {/* Quote Section */}
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              fontSize: postText.length > 150 ? "48px" : "64px",
              fontWeight: 600,
              lineHeight: 1.4,
              letterSpacing: "-0.02em",
            }}
          >
            {postText}
          </div>

          {/* Footer Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingTop: "40px",
            }}
          >
            {/* User Info */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "36px", fontWeight: "bold" }}>
                {authorName}
              </span>
              <span style={{ fontSize: "24px", opacity: 0.7, marginTop: "8px" }}>
                {authorHandle}
              </span>
            </div>

            {/* Logo / Brand Watermark fallback */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "rgba(0,0,0,0.2)",
                padding: "16px 28px",
                borderRadius: "100px",
                border: "2px solid rgba(255,255,255,0.1)",
              }}
            >
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                MindFuel
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.7)",
                  marginTop: "6px",
                }}
              >
                www.mind-fuel.app
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
