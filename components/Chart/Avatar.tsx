"use client";

import { useEffect, useState } from "react";
import { nameToColor, type QuadrantMode } from "./utils";
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

export function Axes({ quadrantMode }: { quadrantMode?: QuadrantMode | null }) {
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

export function AxisLabels({ labels, quadrantMode }: { labels: (string | undefined)[]; quadrantMode?: QuadrantMode | null }) {
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
