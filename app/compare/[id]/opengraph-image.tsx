import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { formatLabel } from "@/components/utils";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let label = "comparefish";
  let axes: string[] = [];

  try {
    const comparison = await convex.query(api.comparisons.get, { id });
    if (comparison) {
      label = formatLabel(comparison);
      axes = [
        comparison.yLabelTop,
        comparison.yLabelBottom,
        comparison.xLabelLeft,
        comparison.xLabelRight,
      ].filter((s): s is string => Boolean(s));
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
            opacity: 0.6,
          }}
        >
          <span style={{ fontSize: 28 }}>comparefish</span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 900,
            wordBreak: "break-word",
          }}
        >
          {label}
        </div>
        {axes.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 32,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {axes.map((a) => (
              <div
                key={a}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 24,
                }}
              >
                {a}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
