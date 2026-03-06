"use client";

import { toSvg, Axes, AxisLabels, SvgAvatar, nameToColor, DEFAULT_R } from "./chart-utils";

type ResultEntry = {
  userId: string;
  name: string;
  image: string | null;
  self: { x: number; y: number };
  averaged: { x: number; y: number } | null;
  fixCount: number;
};

export function ResultsChart({
  xLabelLeft,
  xLabelRight,
  yLabelTop,
  yLabelBottom,
  results,
}: {
  xLabelLeft?: string;
  xLabelRight?: string;
  yLabelTop?: string;
  yLabelBottom?: string;
  results: ResultEntry[];
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-zinc-400" />
          Self-reported
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-zinc-400" />
          Others&apos; average
        </span>
      </div>

      <svg viewBox="0 0 500 500" className="w-full max-w-[500px] select-none">
        <Axes />
        <AxisLabels labels={[yLabelTop, yLabelBottom, xLabelRight, xLabelLeft]} />

        {results.map((r) => {
          const selfPt = toSvg(r.self);
          const avgPt = r.averaged ? toSvg(r.averaged) : null;
          return (
            <g key={r.userId}>
              {avgPt && (
                <line
                  x1={selfPt.cx} y1={selfPt.cy} x2={avgPt.cx} y2={avgPt.cy}
                  stroke={nameToColor(r.name)} strokeWidth={1}
                  strokeDasharray="4 3" opacity={0.5}
                />
              )}
              <SvgAvatar
                cx={selfPt.cx} cy={selfPt.cy}
                image={r.image} name={r.name}
                clipId={`self-${r.userId}`}
                borderColor={nameToColor(r.name)} borderWidth={2}
              />
              {avgPt && (
                <SvgAvatar
                  cx={avgPt.cx} cy={avgPt.cy}
                  image={r.image} name={r.name}
                  clipId={`avg-${r.userId}`} dashed
                />
              )}
              <text
                x={selfPt.cx} y={selfPt.cy - DEFAULT_R - 6}
                textAnchor="middle" className="text-[11px]" fill="#71717a"
              >
                {r.name}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="text-center text-sm text-zinc-500">
        {results.length} {results.length === 1 ? "person" : "people"} placed
      </p>
    </div>
  );
}
