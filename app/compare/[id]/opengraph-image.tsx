import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { formatLabel } from "@/components/utils";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const BG = "#013423";
const FG = "#f3edb2";
const FG_DIM = "rgba(243, 237, 178, 0.12)";
const FG_MID = "rgba(243, 237, 178, 0.35)";

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let label = "comparefish";
  let axes: string[] = [];
  let dimCount = 2;

  try {
    const comparison = await convex.query(api.comparisons.get, { id });
    if (comparison) {
      label = formatLabel(comparison);
      dimCount = comparison.dimensions?.length ?? 2;
      if (dimCount === 3 && comparison.dimensions) {
        axes = comparison.dimensions
          .flatMap((d: { posLabel?: string; negLabel?: string }) => [d.posLabel, d.negLabel])
          .filter((s): s is string => Boolean(s));
      } else {
        axes = [
          comparison.yLabelTop,
          comparison.yLabelBottom,
          comparison.xLabelLeft,
          comparison.xLabelRight,
        ].filter((s): s is string => Boolean(s));
      }
    }
  } catch {}

  // Decorative fish scattered around the chart
  const fishPositions = [
    { x: 280, y: 200, r: -15 },
    { x: 820, y: 350, r: 20 },
    { x: 600, y: 180, r: -5 },
    { x: 400, y: 420, r: 10 },
    { x: 900, y: 160, r: -25 },
  ];

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
          background: BG,
          color: FG,
          fontFamily: "sans-serif",
          padding: 60,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Chart axes — centered crosshair */}
        {dimCount === 3 ? (
          <>
            {[0, 60, 120].map((deg) => (
              <div key={deg} style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 500,
                height: 2,
                marginLeft: -250,
                marginTop: -1,
                background: FG,
                opacity: 0.15,
                transform: `rotate(${deg}deg)`,
                display: "flex",
              }} />
            ))}
          </>
        ) : (<>
          <div style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            marginLeft: -1,
            marginTop: -250,
            width: 2,
            height: 500,
            background: FG,
            display: "flex",
          }} />
          <div style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            marginLeft: -250,
            marginTop: -1,
            width: 500,
            height: 2,
            background: FG,
            display: "flex",
          }} />
        </>)}

        {/* Decorative fish emoji as dots on the chart */}
        {fishPositions.map((f, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: f.x,
              top: f.y,
              fontSize: 40,
              transform: `rotate(${f.r}deg)`,
              opacity: 0.25,
              display: "flex",
            }}
          >
            🐟
          </div>
        ))}

        {/* Site name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            opacity: 0.5,
            fontSize: 28,
            letterSpacing: 2,
          }}
        >
          comparefish
        </div>

        {/* Plot title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 900,
            wordBreak: "break-word",
          }}
        >
          {label}
        </div>

        {/* Axis labels */}
        {axes.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 28,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {axes.map((a) => (
              <div
                key={a}
                style={{
                  background: FG_DIM,
                  border: `1px solid ${FG_MID}`,
                  borderRadius: 8,
                  padding: "6px 20px",
                  fontSize: 24,
                  color: FG,
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
