"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Id } from "../convex/_generated/dataModel";

type Point = { x: number; y: number };

type PlacedPoint = Point & {
  _id: string;
  userId: Id<"users">;
  name: string;
  image: string | null;
  isMe: boolean;
};

type Fix = Point & {
  _id: Id<"fixes">;
  targetUserId: Id<"users">;
  targetName: string;
  targetImage: string | null;
  fixerName: string;
  isMine: boolean;
};

const R = 16;

const AVATAR_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399",
  "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#e879f9",
];

function nameToColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({
  cx,
  cy,
  r = R,
  image,
  name,
  clipId,
  borderColor,
  borderWidth = 0,
}: {
  cx: number;
  cy: number;
  r?: number;
  image: string | null;
  name: string;
  clipId: string;
  borderColor?: string;
  borderWidth?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (name || "?")[0].toUpperCase();
  const showImage = image && !imgFailed;

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {borderWidth > 0 && borderColor && (
        <circle cx={cx} cy={cy} r={r + borderWidth} fill={borderColor} />
      )}
      {showImage ? (
        <image
          href={image}
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <>
          <circle cx={cx} cy={cy} r={r} fill={nameToColor(name)} />
          <text
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            className="text-[13px] font-medium"
            fill="white"
          >
            {initial}
          </text>
        </>
      )}
    </>
  );
}

export function Chart({
  xLabelLeft,
  xLabelRight,
  yLabelTop,
  yLabelBottom,
  onPlace,
  onFix,
  onDeleteFix,
  myPlacement,
  myImage,
  myName,
  allPlacements,
  fixes,
}: {
  xLabelLeft?: string;
  xLabelRight?: string;
  yLabelTop?: string;
  yLabelBottom?: string;
  onPlace: (x: number, y: number) => void;
  onFix: (targetUserId: Id<"users">, x: number, y: number) => void;
  onDeleteFix: (fixId: Id<"fixes">) => void;
  myPlacement: Point | null;
  myImage: string | null;
  myName: string;
  allPlacements: PlacedPoint[];
  fixes: Fix[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState<Point>(myPlacement ?? { x: 0, y: 0 });
  const [hasMovedDot, setHasMovedDot] = useState(!!myPlacement);
  const [dirty, setDirty] = useState(false);

  const [fixTarget, setFixTarget] = useState<PlacedPoint | null>(null);
  const [fixPos, setFixPos] = useState<Point | null>(null);
  const [fixDirty, setFixDirty] = useState(false);
  const [hoveredUserId, setHoveredUserId] = useState<Id<"users"> | null>(null);

  const isFixing = fixTarget !== null;

  useEffect(() => {
    if (myPlacement && !dragging) {
      setPos(myPlacement);
      setHasMovedDot(true);
    }
  }, [myPlacement?.x, myPlacement?.y]);

  const toSvg = (p: Point) => ({
    cx: 250 + p.x * 220,
    cy: 250 - p.y * 220,
  });

  const fromSvgEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const svgX = ((clientX - rect.left) / rect.width) * 500;
      const svgY = ((clientY - rect.top) / rect.height) * 500;
      const x = Math.max(-1, Math.min(1, (svgX - 250) / 220));
      const y = Math.max(-1, Math.min(1, -(svgY - 250) / 220));
      return { x, y };
    },
    [],
  );

  const hitTest = useCallback(
    (e: React.MouseEvent | React.TouchEvent): PlacedPoint | null => {
      const p = fromSvgEvent(e);
      if (!p) return null;
      const others = allPlacements.filter((pl) => !pl.isMe);
      for (const other of others) {
        const dx = (p.x - other.x) * 220;
        const dy = (p.y - other.y) * 220;
        if (Math.sqrt(dx * dx + dy * dy) < 22) return other;
      }
      return null;
    },
    [allPlacements, fromSvgEvent],
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isFixing) {
        setDragging(true);
        const p = fromSvgEvent(e);
        if (p) {
          setFixPos(p);
          setFixDirty(true);
        }
        return;
      }

      const hit = hitTest(e);
      if (hit) {
        setFixTarget(hit);
        const existingFix = fixes.find(
          (f) => f.isMine && f.targetUserId === hit.userId,
        );
        setFixPos(existingFix ? { x: existingFix.x, y: existingFix.y } : null);
        setFixDirty(false);
        return;
      }

      setDragging(true);
      const p = fromSvgEvent(e);
      if (p) {
        setPos(p);
        setHasMovedDot(true);
        setDirty(true);
      }
    },
    [isFixing, hitTest, fromSvgEvent, fixes],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragging && !isFixing) {
        const hit = hitTest(e);
        setHoveredUserId(hit?.userId ?? null);
        return;
      }
      if (dragging && isFixing) {
        const p = fromSvgEvent(e);
        if (p) setFixPos(p);
        return;
      }
      if (dragging) {
        const p = fromSvgEvent(e);
        if (p) setPos(p);
      }
    },
    [dragging, isFixing, hitTest, fromSvgEvent],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const cancelFix = useCallback(() => {
    setFixTarget(null);
    setFixPos(null);
    setFixDirty(false);
    setHoveredUserId(null);
  }, []);

  const saveFix = useCallback(() => {
    if (fixTarget && fixPos) {
      onFix(fixTarget.userId, fixPos.x, fixPos.y);
      setFixDirty(false);
    }
  }, [fixTarget, fixPos, onFix]);

  const myDot = toSvg(pos);
  const activeFixTargetId = fixTarget?.userId ?? hoveredUserId;

  const getOpacity = (userId: Id<"users">) => {
    if (!activeFixTargetId) return 1;
    if (userId === activeFixTargetId) return 1;
    return 0.2;
  };

  const getFixOpacity = (fix: Fix) => {
    if (!activeFixTargetId) return 1;
    if (fix.targetUserId === activeFixTargetId) return 1;
    return 0.2;
  };

  const myOpacity = activeFixTargetId ? 0.2 : 1;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {isFixing && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <span>Fixing <strong>{fixTarget.name}</strong></span>
          <span className="text-red-400">— click to place where they should be</span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox="0 0 500 500"
        className="w-full max-w-[500px] touch-none select-none"
        style={{ cursor: isFixing ? "crosshair" : hoveredUserId ? "pointer" : "crosshair" }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => {
          handlePointerUp();
          if (!isFixing) setHoveredUserId(null);
        }}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* Axes */}
        <line x1="250" y1="30" x2="250" y2="470" stroke="#d4d4d8" strokeWidth="1" />
        <line x1="30" y1="250" x2="470" y2="250" stroke="#d4d4d8" strokeWidth="1" />

        {/* Axis labels */}
        {[
          { x: 250, y: 20, anchor: "middle" as const, label: yLabelTop },
          { x: 250, y: 490, anchor: "middle" as const, label: yLabelBottom },
          { x: 485, y: 254, anchor: "end" as const, label: xLabelRight },
          { x: 15, y: 254, anchor: "start" as const, label: xLabelLeft },
        ].map(({ x, y, anchor, label }) =>
          label ? (
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
          ) : null,
        )}

        {/* Existing fixes */}
        {fixes.map((f) => {
          const { cx, cy } = toSvg(f);
          const isActiveTarget = f.targetUserId === fixTarget?.userId;
          return (
            <g key={f._id} opacity={getFixOpacity(f)}>
              <Avatar
                cx={cx}
                cy={cy}
                r={12}
                image={f.targetImage}
                name={f.targetName}
                clipId={`fix-${f._id}`}
                borderColor={isActiveTarget && f.isMine ? "#dc2626" : "#ef4444"}
                borderWidth={2}
              />
              <text
                x={cx}
                y={cy - 18}
                textAnchor="middle"
                className="text-[10px]"
                fill="#ef4444"
              >
                {f.fixerName.split(" ")[0]}'s fix
              </text>
            </g>
          );
        })}

        {/* Other placements */}
        {allPlacements
          .filter((p) => !p.isMe)
          .map((p) => {
            const { cx, cy } = toSvg(p);
            const isHovered = hoveredUserId === p.userId;
            const isFixingThis = fixTarget?.userId === p.userId;
            const borderColor =
              isFixingThis ? "#ef4444" : isHovered ? "#f87171" : undefined;
            return (
              <g key={p._id} opacity={getOpacity(p.userId)}>
                <Avatar
                  cx={cx}
                  cy={cy}
                  image={p.image}
                  name={p.name}
                  clipId={`user-${p._id}`}
                  borderColor={borderColor}
                  borderWidth={borderColor ? 3 : 0}
                />
                <text
                  x={cx}
                  y={cy - R - 6}
                  textAnchor="middle"
                  className="text-[12px]"
                  fill={isFixingThis || isHovered ? "#dc2626" : "#71717a"}
                >
                  {p.name}
                </text>
              </g>
            );
          })}

        {/* Current fix being placed */}
        {isFixing && fixPos && (
          <g>
            <line
              x1={toSvg(fixTarget).cx}
              y1={toSvg(fixTarget).cy}
              x2={toSvg(fixPos).cx}
              y2={toSvg(fixPos).cy}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.5"
            />
            <Avatar
              cx={toSvg(fixPos).cx}
              cy={toSvg(fixPos).cy}
              r={12}
              image={fixTarget.image}
              name={fixTarget.name}
              clipId="fix-active"
              borderColor="#ef4444"
              borderWidth={2}
            />
            <text
              x={toSvg(fixPos).cx}
              y={toSvg(fixPos).cy - 18}
              textAnchor="middle"
              className="text-[11px]"
              fill="#dc2626"
            >
              fix
            </text>
          </g>
        )}

        {/* My dot */}
        {hasMovedDot && (
          <g style={{ cursor: "grab" }} opacity={myOpacity}>
            <Avatar
              cx={myDot.cx}
              cy={myDot.cy}
              image={myImage}
              name={myName}
              clipId="me"
              borderColor="#18181b"
              borderWidth={2}
            />
            <text
              x={myDot.cx}
              y={myDot.cy - R - 6}
              textAnchor="middle"
              className="text-[12px] fill-zinc-900 dark:fill-zinc-100"
            >
              me
            </text>
          </g>
        )}
      </svg>

      {/* Buttons */}
      <div className="flex gap-2">
        {isFixing && (
          <>
            {fixDirty && (
              <button
                onClick={saveFix}
                className="h-10 rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Save fix
              </button>
            )}
            {fixes.find(
              (f) => f.isMine && f.targetUserId === fixTarget.userId,
            ) && (
              <button
                onClick={() => {
                  const existing = fixes.find(
                    (f) => f.isMine && f.targetUserId === fixTarget.userId,
                  );
                  if (existing) onDeleteFix(existing._id);
                  cancelFix();
                }}
                className="h-10 rounded-lg border border-red-200 px-5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
              >
                Delete fix
              </button>
            )}
            <button
              onClick={cancelFix}
              className="h-10 rounded-lg border border-zinc-200 px-5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </>
        )}

        {!isFixing && dirty && (
          <button
            onClick={() => {
              onPlace(pos.x, pos.y);
              setDirty(false);
            }}
            className="h-10 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {myPlacement ? "Update" : "Lock in"}
          </button>
        )}
      </div>
    </div>
  );
}
