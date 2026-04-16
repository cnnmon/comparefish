"use client";

import { useEffect, useState } from "react";
import { nameToColor, ISO_AXES as ISO_AX, TRI_VERTS, type QuadrantMode, type Dimension } from "./utils";
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
  wiggle,
  dim,
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
  wiggle?: boolean;
  dim?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [image]);
  const initial = (name || "?")[0].toUpperCase();
  const showImage = image && !imgFailed;
  const color = nameToColor(name);
  const displaySize = showImage ? size : size * 0.6;
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
      className={`absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 select-none${dim ? " animate-wiggle-hard" : wiggle ? " animate-wiggle" : ""}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        opacity: dim ? 0.3 : opacity,
        cursor,
        transition: "opacity 0.15s",
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
          width: `${displaySize}cqw`,
          height: `${displaySize}cqw`,
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
            className="rounded-full flex items-center justify-center font-medium"
            style={{
              width: `${displaySize}cqw`,
              height: `${displaySize}cqw`,
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

  const [dimX, dimY] = activePair ?? [0, 1];
  const xDim = dimensions?.[dimX];
  const yDim = dimensions?.[dimY];

  // labels order: [yTop, yBottom, xRight, xLeft]
  // descriptions paired with each label position
  const descs = [
    yDim?.posDescription,  // yTop
    yDim?.negDescription,  // yBottom
    xDim?.posDescription,  // xRight
    xDim?.negDescription,  // xLeft
  ];

  if (dimCount === 1) {
    return (
      <>
        {labels[3] && (
          <span className="absolute z-10 left-[1%] top-1/2 -translate-y-1/2 bg-[var(--background)] px-2 pointer-events-none">
            <span className="whitespace-nowrap">{labels[3]}</span>
            {descs[3] && <span className="block opacity-40 truncate max-w-32 pointer-events-auto cursor-help" title={descs[3]}>{descs[3]}</span>}
          </span>
        )}
        {labels[2] && (
          <span className="absolute z-10 right-[1%] top-1/2 -translate-y-1/2 bg-[var(--background)] px-2 text-right pointer-events-none">
            <span className="whitespace-nowrap">{labels[2]}</span>
            {descs[2] && <span className="block opacity-40 truncate max-w-32 pointer-events-auto cursor-help" title={descs[2]}>{descs[2]}</span>}
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
    const yDesc = signY === 1 ? descs[0] : descs[1];
    const xLabel = signX === 1 ? labels[2] : labels[3];
    const xDesc = signX === 1 ? descs[2] : descs[3];
    return (
      <>
        {yLabel && (
          <span
            className="absolute z-10 bg-[var(--background)] px-2 -translate-x-1/2 text-center pointer-events-none"
            style={{ [signY === 1 ? "top" : "bottom"]: "1%", left: vAxisLeft }}
          >
            <span className="whitespace-nowrap">{yLabel}</span>
            {yDesc && <span className="block opacity-40 truncate max-w-32 pointer-events-auto cursor-help" title={yDesc}>{yDesc}</span>}
          </span>
        )}
        {xLabel && (
          <span
            className="absolute z-10 bg-[var(--background)] px-2 -translate-y-1/2 pointer-events-none"
            style={{ [signX === 1 ? "right" : "left"]: "1%", top: hAxisTop }}
          >
            <span className="whitespace-nowrap">{xLabel}</span>
            {xDesc && <span className="block opacity-40 truncate max-w-32 pointer-events-auto cursor-help" title={xDesc}>{xDesc}</span>}
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
        const desc = descs[i];
        return label ? (
          <span
            key={cls}
            className={`absolute z-10 bg-[var(--background)] px-2 pointer-events-none ${cls}`}
          >
            <span className="whitespace-nowrap">{label}</span>
            {desc && <span className="block opacity-40 truncate max-w-32 pointer-events-auto cursor-help" title={desc}>{desc}</span>}
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
      { label: dim.posLabel, desc: dim.posDescription, left: 50 + ax.x, top: 50 + ax.y, dimIdx: i },
      { label: dim.negLabel, desc: dim.negDescription, left: 50 - ax.x, top: 50 - ax.y, dimIdx: i },
    ];
  });
  return (
    <>
      {endpoints.map((ep, idx) => {
        if (!ep.label && !ep.desc) return null;
        const isActive = !activePair || activePair.includes(ep.dimIdx);
        return (
          <span
            key={idx}
            className="absolute z-10 bg-[var(--background)] px-1 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
            style={{
              left: `${ep.left}%`,
              top: `${ep.top}%`,
              opacity: isActive ? 0.9 : 0.25,
              transition: "opacity 0.2s",
            }}
          >
            {ep.label && <span className="whitespace-nowrap">{ep.label}</span>}
            {ep.desc && <span className="block opacity-45 truncate max-w-24 pointer-events-auto cursor-help" title={ep.desc}>{ep.desc}</span>}
          </span>
        );
      })}
    </>
  );
}

// 3 sectors, one per vertex. Highest value wins.
function triSectorFromValues(values: number[]): number {
  let best = 0;
  for (let i = 1; i < 3; i++) {
    if ((values[i] ?? 0) > (values[best] ?? 0)) best = i;
  }
  return best;
}

export function TriangleQuadrants({
  values,
  dimensions,
}: {
  values: number[] | null;
  dimensions?: Dimension[];
}) {
  const active = values ? triSectorFromValues(values) : null;
  const v = TRI_VERTS;
  // Edge midpoints: between vertex i and vertex (i+1)%3
  const mids = v.map((_, i) => ({
    x: (v[i].x + v[(i + 1) % 3].x) / 2,
    y: (v[i].y + v[(i + 1) % 3].y) / 2,
  }));
  // Sector i: center → mid before vertex i → vertex i → mid after vertex i
  // dim order is [0=bottom-right, 1=top, 2=bottom-left]
  const sectors = v.map((_, i) => {
    const prevMid = mids[(i + 2) % 3];
    const nextMid = mids[i];
    return `50,50 ${prevMid.x},${prevMid.y} ${v[i].x},${v[i].y} ${nextMid.x},${nextMid.y}`;
  });

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {sectors.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="var(--foreground)"
          opacity={active === i ? 0.05 : 0}
          style={{ transition: "opacity 0.15s" }}
        />
      ))}
      {active !== null && dimensions && (() => {
        const label = dimensions[active]?.posLabel;
        if (!label) return null;
        const cx = (50 + v[active].x) / 2;
        const cy = (50 + v[active].y) / 2;
        return (
          <text
            x={cx} y={cy}
            textAnchor="middle" dominantBaseline="central"
            fill="var(--foreground)"
            opacity={0.35}
            fontSize={3.5}
          >
            {label}
          </text>
        );
      })()}
    </svg>
  );
}

export function TriangleAxes() {
  const v = TRI_VERTS;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polygon
        points={v.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none" stroke="var(--foreground)" strokeWidth="0.5" strokeLinejoin="round"
      />
    </svg>
  );
}

export function TriangleAxisLabels({ dimensions }: { dimensions: Dimension[] }) {
  const v = TRI_VERTS;
  // Offset labels outward from the triangle vertices
  const labels = dimensions.slice(0, 3).map((dim, i) => {
    const dx = v[i].x - 50;
    const dy = v[i].y - 50;
    const len = Math.sqrt(dx * dx + dy * dy);
    const scale = 1.18;
    return {
      label: dim.posLabel || dim.negLabel,
      desc: dim.posDescription || dim.negDescription,
      left: 50 + dx * scale,
      top: 50 + dy * scale,
    };
  });
  return (
    <>
      {labels.map((l, i) => {
        if (!l.label && !l.desc) return null;
        return (
          <span
            key={i}
            className="absolute z-10 bg-[var(--background)] px-1 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
            style={{ left: `${l.left}%`, top: `${l.top}%` }}
          >
            {l.label && <span className="whitespace-nowrap">{l.label}</span>}
            {l.desc && <span className="block opacity-45 truncate max-w-24 pointer-events-auto cursor-help" title={l.desc}>{l.desc}</span>}
          </span>
        );
      })}
    </>
  );
}
