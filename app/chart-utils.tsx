"use client";

import { useState } from "react";

export const COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399",
  "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#e879f9",
];

export function nameToColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export type Point = { x: number; y: number };

export const toSvg = (p: Point) => ({
  cx: 250 + p.x * 220,
  cy: 250 - p.y * 220,
});

export const AXIS_LABELS = [
  { x: 250, y: 20, anchor: "middle" as const },
  { x: 250, y: 490, anchor: "middle" as const },
  { x: 485, y: 254, anchor: "end" as const },
  { x: 15, y: 254, anchor: "start" as const },
] as const;

export function AxisLabels({
  labels,
}: {
  labels: (string | undefined)[];
}) {
  return (
    <>
      {AXIS_LABELS.map(({ x, y, anchor }, i) => {
        const label = labels[i];
        return label ? (
          <text
            key={`${x}-${y}`}
            x={x}
            y={y}
            textAnchor={anchor}
            className="fill-zinc-400 text-[13px]"
            stroke="white"
            strokeWidth={4}
            paintOrder="stroke"
          >
            {label}
          </text>
        ) : null;
      })}
    </>
  );
}

export function Axes() {
  return (
    <>
      <line x1="250" y1="30" x2="250" y2="470" stroke="#d4d4d8" strokeWidth="1" />
      <line x1="30" y1="250" x2="470" y2="250" stroke="#d4d4d8" strokeWidth="1" />
    </>
  );
}

export const DEFAULT_R = 16;

export function SvgAvatar({
  cx,
  cy,
  r = DEFAULT_R,
  image,
  name,
  clipId,
  borderColor,
  borderWidth = 0,
  dashed,
}: {
  cx: number;
  cy: number;
  r?: number;
  image: string | null;
  name: string;
  clipId: string;
  borderColor?: string;
  borderWidth?: number;
  dashed?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (name || "?")[0].toUpperCase();
  const showImage = image && !imgFailed;
  const color = borderColor || nameToColor(name);

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {dashed ? (
        <circle
          cx={cx} cy={cy} r={r + 3}
          fill="none" stroke={nameToColor(name)}
          strokeWidth={2} strokeDasharray="4 3"
        />
      ) : borderWidth > 0 && borderColor ? (
        <circle cx={cx} cy={cy} r={r + borderWidth} fill={borderColor} />
      ) : null}
      {showImage ? (
        <image
          href={image}
          x={cx - r} y={cy - r}
          width={r * 2} height={r * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <>
          <circle cx={cx} cy={cy} r={r} fill={dashed ? "white" : nameToColor(name)} />
          <text
            x={cx} y={cy + 5}
            textAnchor="middle"
            className="text-[13px] font-medium"
            fill={dashed ? nameToColor(name) : "white"}
          >
            {initial}
          </text>
        </>
      )}
    </>
  );
}
