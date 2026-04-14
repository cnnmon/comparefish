"use client";

import { useEffect, useState } from "react";
import { nameToColor, ISO_AXES as ISO_AX, type QuadrantMode, type Dimension } from "./utils";
import Image from "next/image";

export function Avatar({
  pos,
  size = 14,
  image,
  name,
  label,
  dashed,
  status,
  cursor,
}: {
  pos: {
    left: number;
    top: number;
  };
  size?: number;
  image: string | null;
  name: string;
  label?: string;
  dashed?: boolean;
  status?: "fixing" | "hovering" | "hidden" | undefined;
  cursor?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [image]);
  const initial = (name || "?")[0].toUpperCase();
  const showImage = image && !imgFailed;
  const color = nameToColor(name);
  const { left, top } = pos;

  const { opacity, labelColor } = (() => {
    if (status === "fixing") {
      return {
        opacity: 1,
        labelColor: "red",
      };
    } else if (status === "hovering") {
      return {
        opacity: 1,
        labelColor: "orange",
      };
    } else if (status === "hidden") {
      return {
        opacity: 0.5,
        labelColor: "green",
      };
    }

    return { opacity: 1, labelColor: "white" };
  })();

  return (
    <div
      className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 select-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        opacity,
        cursor,
      }}
    >
      {label && (
        <span
          className="text-xs leading-none whitespace-nowrap"
          style={{ color: labelColor }}
        >
          {label}
        </span>
      )}
      <div
        className="rounded-full flex items-center justify-center shrink-0"
        style={{
          width: `${size}cqw`,
          height: `${size}cqw`,
        }}
      >
        {showImage ? (
          <Image
            width={200}
            height={200}
            src={image}
            alt={name}
            className="rounded-full object-cover w-full scale-120"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center text-md font-medium"
            style={{
              width: `${size}cqw`,
              height: `${size}cqw`,
              background: dashed ? "white" : color,
              color: dashed ? color : "white",
            }}
          >
            {initial}
          </div>
        )}
      </div>
    </div>
  );
}

export function Quadrants({
  active,
  labels,
  quadrantMode,
}: {
  active: number | null;
  labels: {
    xLabelLeft?: string;
    xLabelRight?: string;
    yLabelTop?: string;
    yLabelBottom?: string;
  };
  quadrantMode?: QuadrantMode | null;
}) {
  if (quadrantMode) {
    return (
      <div
        className={`absolute top-[6%] left-[6%] right-[6%] bottom-[6%] transition-colors rounded-lg duration-150 flex items-center justify-center ${
          active !== null ? "bg-[var(--foreground)]/5" : ""
        }`}
      />
    );
  }

  const quads = [
    "top-[6%] left-[6%] right-1/2 bottom-1/2",
    "top-[6%] left-1/2 right-[6%] bottom-1/2",
    "top-1/2 left-[6%] right-1/2 bottom-[6%]",
    "top-1/2 left-1/2 right-[6%] bottom-[6%]",
  ];

  const quadLabels = [
    [labels.yLabelTop, labels.xLabelLeft, "high", "low"],
    [labels.yLabelTop, labels.xLabelRight, "high", "high"],
    [labels.yLabelBottom, labels.xLabelLeft, "low", "low"],
    [labels.yLabelBottom, labels.xLabelRight, "low", "high"],
  ] as const;

  return (
    <>
      {quads.map((cls, i) => {
        const [yLabel, xLabel, yFallback, xFallback] = quadLabels[i];
        const yText =
          yLabel ??
          `${yFallback} ${labels.xLabelLeft || labels.xLabelRight ? "vertical" : "y"}`;
        const xText =
          xLabel ??
          `${xFallback} ${labels.yLabelTop || labels.yLabelBottom ? "horizontal" : "x"}`;
        return (
          <div
            key={i}
            className={`absolute transition-colors rounded-lg duration-150 flex items-center justify-center ${cls} ${
              active === i ? "bg-[var(--foreground)]/5" : ""
            }`}
          >
            {active === i && (
              <p className="text-center opacity-40 pointer-events-none px-2">
                {yText},<br />
                {xText}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}

export function Axes({ quadrantMode, dimCount = 2, activePair }: { quadrantMode?: QuadrantMode | null; dimCount?: number; activePair?: [number, number] }) {
  if (dimCount === 3) return <IsoAxes activePair={activePair} />;
  if (dimCount === 1) {
    return (
      <div className="absolute top-1/2 left-[6%] right-[6%] h-[1.5px] bg-[var(--foreground)]" />
    );
  }
  if (quadrantMode) {
    const vLeft = `${50 - quadrantMode.signX * 44}%`;
    const hTop = `${50 + quadrantMode.signY * 44}%`;
    return (
      <>
        <div
          className="absolute top-[6%] bottom-[6%] w-[1.5px] bg-[var(--foreground)]"
          style={{ left: vLeft }}
        />
        <div
          className="absolute left-[6%] right-[6%] h-[1.5px] bg-[var(--foreground)]"
          style={{ top: hTop }}
        />
      </>
    );
  }
  return (
    <>
      <div className="absolute left-1/2 top-[6%] bottom-[6%] w-[1.5px] bg-[var(--foreground)]" />
      <div className="absolute top-1/2 left-[6%] right-[6%] h-[1.5px] bg-[var(--foreground)]" />
    </>
  );
}

// 6 half-axis endpoints clockwise from top, used to define sector triangles
const ISO_SECTOR_ENDPOINTS = (() => {
  const ax = ISO_AX;
  return [
    { x: 50 + ax[1].x, y: 50 + ax[1].y },       // +dim1 (top)
    { x: 50 - ax[2].x, y: 50 - ax[2].y },        // -dim2 (top-right)
    { x: 50 + ax[0].x, y: 50 + ax[0].y },        // +dim0 (bottom-right)
    { x: 50 - ax[1].x, y: 50 - ax[1].y },        // -dim1 (bottom)
    { x: 50 + ax[2].x, y: 50 + ax[2].y },        // +dim2 (bottom-left)
    { x: 50 - ax[0].x, y: 50 - ax[0].y },        // -dim0 (top-left)
  ];
})();

// Each sector is bounded by two adjacent half-axes; labels come from those halves
// [dimIndex, positive?] for each of the 6 clockwise half-axes
const HALF_AXIS_DIM: [number, boolean][] = [
  [1, true], [2, false], [0, true], [1, false], [2, true], [0, false],
];

function isoSectorFromValues(values: number[]): number {
  let sx = 0, sy = 0;
  for (let i = 0; i < 3; i++) {
    sx += (values[i] ?? 0) * ISO_AX[i].x;
    sy += (values[i] ?? 0) * ISO_AX[i].y;
  }
  let angle = Math.atan2(sy, sx) + 5 * Math.PI / 6;
  if (angle < 0) angle += 2 * Math.PI;
  return Math.floor(angle / (Math.PI / 3)) % 6;
}

export function IsoQuadrants({
  values,
  dimensions,
}: {
  values: number[] | null;
  dimensions?: Dimension[];
}) {
  const active = values ? isoSectorFromValues(values) : null;
  const eps = ISO_SECTOR_ENDPOINTS;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {eps.map((_, i) => {
        const next = eps[(i + 1) % 6];
        const pts = `50,50 ${eps[i].x},${eps[i].y} ${next.x},${next.y}`;
        return (
          <polygon
            key={i}
            points={pts}
            fill="var(--foreground)"
            opacity={active === i ? 0.05 : 0}
            style={{ transition: "opacity 0.15s" }}
          />
        );
      })}
      {active !== null && dimensions && (() => {
        const [dimI, posI] = HALF_AXIS_DIM[active];
        const [dimJ, posJ] = HALF_AXIS_DIM[(active + 1) % 6];
        const labelI = posI ? dimensions[dimI]?.posLabel : dimensions[dimI]?.negLabel;
        const labelJ = posJ ? dimensions[dimJ]?.posLabel : dimensions[dimJ]?.negLabel;
        const label = [labelI, labelJ].filter(Boolean).join(", ");
        if (!label) return null;
        const next = eps[(active + 1) % 6];
        const cx = (50 + eps[active].x + next.x) / 3;
        const cy = (50 + eps[active].y + next.y) / 3;
        return (
          <text
            x={cx} y={cy}
            textAnchor="middle" dominantBaseline="central"
            fill="var(--foreground)"
            opacity={0.35}
            fontSize={3}
          >
            {label}
          </text>
        );
      })()}
    </svg>
  );
}

function IsoAxes({ activePair }: { activePair?: [number, number] }) {
  const S = 36;
  const COS = 0.866;
  const axes = [
    { x1: 50 - S * COS, y1: 50 - S * 0.5, x2: 50 + S * COS, y2: 50 + S * 0.5 },
    { x1: 50, y1: 50 + S, x2: 50, y2: 50 - S },
    { x1: 50 + S * COS, y1: 50 - S * 0.5, x2: 50 - S * COS, y2: 50 + S * 0.5 },
  ];
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {axes.map((a, i) => {
        const isActive = !activePair || activePair.includes(i);
        return (
          <line
            key={i}
            x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke="var(--foreground)"
            strokeWidth={isActive ? "0.5" : "0.2"}
            opacity={isActive ? 1 : 0.25}
            style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
          />
        );
      })}
    </svg>
  );
}

export function AxisLabels({
  labels, quadrantMode, dimCount = 2, dimensions, activePair,
}: {
  labels: (string | undefined)[];
  quadrantMode?: QuadrantMode | null;
  dimCount?: number;
  dimensions?: Dimension[];
  activePair?: [number, number];
}) {
  if (dimCount === 3 && dimensions) return <IsoAxisLabels dimensions={dimensions} activePair={activePair} />;

  if (dimCount === 1) {
    return (
      <>
        {labels[3] && (
          <span className="absolute left-[1%] top-1/2 -translate-y-1/2 bg-[var(--background)] px-2 whitespace-nowrap">
            {labels[3]}
          </span>
        )}
        {labels[2] && (
          <span className="absolute right-[1%] top-1/2 -translate-y-1/2 bg-[var(--background)] px-2 whitespace-nowrap text-right">
            {labels[2]}
          </span>
        )}
      </>
    );
  }

  if (quadrantMode) {
    const { signX, signY } = quadrantMode;
    const vAxisLeft = `${50 - signX * 44}%`;
    const hAxisTop = `${50 + signY * 44}%`;
    const yLabel = signY === 1 ? labels[0] : labels[1];
    const xLabel = signX === 1 ? labels[2] : labels[3];
    return (
      <>
        {yLabel && (
          <span
            className="absolute bg-[var(--background)] px-2 whitespace-nowrap -translate-x-1/2 text-center"
            style={{ [signY === 1 ? "top" : "bottom"]: "1%", left: vAxisLeft }}
          >
            {yLabel}
          </span>
        )}
        {xLabel && (
          <span
            className="absolute bg-[var(--background)] px-2 whitespace-nowrap -translate-y-1/2"
            style={{ [signX === 1 ? "right" : "left"]: "1%", top: hAxisTop }}
          >
            {xLabel}
          </span>
        )}
      </>
    );
  }

  const positions = [
    "top-[1%] left-1/2 -translate-x-1/2 text-center",
    "bottom-[1%] left-1/2 -translate-x-1/2 text-center",
    "right-[1%] top-1/2 -translate-y-1/2 text-right",
    "left-[1%] top-1/2 -translate-y-1/2 text-left",
  ];
  return (
    <>
      {positions.map((cls, i) => {
        const label = labels[i];
        return label ? (
          <span
            key={cls}
            className={`absolute bg-[var(--background)] px-2 whitespace-nowrap ${cls}`}
          >
            {label}
          </span>
        ) : null;
      })}
    </>
  );
}

function IsoAxisLabels({ dimensions, activePair }: { dimensions: Dimension[]; activePair?: [number, number] }) {
  const endpoints = dimensions.slice(0, 3).flatMap((dim, i) => {
    const ax = ISO_AX[i];
    return [
      { label: dim.posLabel, left: 50 + ax.x, top: 50 + ax.y, dimIdx: i },
      { label: dim.negLabel, left: 50 - ax.x, top: 50 - ax.y, dimIdx: i },
    ];
  });
  return (
    <>
      {endpoints.map((ep, idx) => {
        if (!ep.label) return null;
        const isActive = !activePair || activePair.includes(ep.dimIdx);
        return (
          <span
            key={idx}
            className="absolute bg-[var(--background)] px-1 whitespace-nowrap -translate-x-1/2 -translate-y-1/2 text-center"
            style={{
              left: `${ep.left}%`,
              top: `${ep.top}%`,
              opacity: isActive ? 0.9 : 0.25,
              transition: "opacity 0.2s",
            }}
          >
            {ep.label}
          </span>
        );
      })}
    </>
  );
}
