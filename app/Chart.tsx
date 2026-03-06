"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { Point, toSvg, Axes, AxisLabels, SvgAvatar, DEFAULT_R } from "./chart-utils";

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

  const fromSvgEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const svgX = ((clientX - rect.left) / rect.width) * 500;
      const svgY = ((clientY - rect.top) / rect.height) * 500;
      return {
        x: Math.max(-1, Math.min(1, (svgX - 250) / 220)),
        y: Math.max(-1, Math.min(1, -(svgY - 250) / 220)),
      };
    },
    [],
  );

  const hitTest = useCallback(
    (e: React.MouseEvent | React.TouchEvent): PlacedPoint | null => {
      const p = fromSvgEvent(e);
      if (!p) return null;
      for (const other of allPlacements.filter((pl) => !pl.isMe)) {
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
        if (p) { setFixPos(p); setFixDirty(true); }
        return;
      }
      const hit = hitTest(e);
      if (hit) {
        setFixTarget(hit);
        const existing = fixes.find((f) => f.isMine && f.targetUserId === hit.userId);
        setFixPos(existing ? { x: existing.x, y: existing.y } : null);
        setFixDirty(false);
        return;
      }
      setDragging(true);
      const p = fromSvgEvent(e);
      if (p) { setPos(p); setHasMovedDot(true); setDirty(true); }
    },
    [isFixing, hitTest, fromSvgEvent, fixes],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragging && !isFixing) {
        setHoveredUserId(hitTest(e)?.userId ?? null);
        return;
      }
      if (dragging && isFixing) {
        const p = fromSvgEvent(e);
        if (p) setFixPos(p);
      } else if (dragging) {
        const p = fromSvgEvent(e);
        if (p) setPos(p);
      }
    },
    [dragging, isFixing, hitTest, fromSvgEvent],
  );

  const handlePointerUp = useCallback(() => setDragging(false), []);

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
  const opacity = (id: Id<"users">) => (!activeFixTargetId || id === activeFixTargetId) ? 1 : 0.2;
  const existingFix = fixTarget
    ? fixes.find((f) => f.isMine && f.targetUserId === fixTarget.userId)
    : null;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {isFixing ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <span>Fixing <strong>{fixTarget.name}</strong></span>
          <span className="text-red-400">— click to place where they should be</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-4 py-2 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <span>Click to place yourself or click on someone to fix their placement</span>
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
        onMouseLeave={() => { handlePointerUp(); if (!isFixing) setHoveredUserId(null); }}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <Axes />
        <AxisLabels labels={[yLabelTop, yLabelBottom, xLabelRight, xLabelLeft]} />

        {/* Existing fixes (hide own fix for active target) */}
        {fixes
          .filter((f) => !(isFixing && f.isMine && f.targetUserId === fixTarget?.userId))
          .map((f) => {
            const { cx, cy } = toSvg(f);
            return (
              <g key={f._id} opacity={(!activeFixTargetId || f.targetUserId === activeFixTargetId) ? 1 : 0.2}>
                <SvgAvatar
                  cx={cx} cy={cy} r={12}
                  image={f.targetImage} name={f.targetName}
                  clipId={`fix-${f._id}`}
                  borderColor={f.targetUserId === fixTarget?.userId && f.isMine ? "#dc2626" : "#ef4444"}
                  borderWidth={2}
                />
                <text x={cx} y={cy - 18} textAnchor="middle" className="text-[10px]" fill="#ef4444">
                  {f.fixerName.split(" ")[0]}&apos;s fix
                </text>
              </g>
            );
          })}

        {/* Other placements */}
        {allPlacements.filter((p) => !p.isMe).map((p) => {
          const { cx, cy } = toSvg(p);
          const isHovered = hoveredUserId === p.userId;
          const isFixingThis = fixTarget?.userId === p.userId;
          const border = isFixingThis ? "#ef4444" : isHovered ? "#f87171" : undefined;
          return (
            <g key={p._id} opacity={opacity(p.userId)}>
              <SvgAvatar
                cx={cx} cy={cy}
                image={p.image} name={p.name}
                clipId={`user-${p._id}`}
                borderColor={border} borderWidth={border ? 3 : 0}
              />
              <text
                x={cx} y={cy - DEFAULT_R - 6}
                textAnchor="middle" className="text-[12px]"
                fill={isFixingThis || isHovered ? "#dc2626" : "#71717a"}
              >
                {p.name}
              </text>
            </g>
          );
        })}

        {/* Active fix placement */}
        {isFixing && fixPos && (() => {
          const from = toSvg(fixTarget);
          const to = toSvg(fixPos);
          return (
            <g>
              <line
                x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
              />
              <SvgAvatar
                cx={to.cx} cy={to.cy} r={12}
                image={fixTarget.image} name={fixTarget.name}
                clipId="fix-active" borderColor="#ef4444" borderWidth={2}
              />
              <text x={to.cx} y={to.cy - 18} textAnchor="middle" className="text-[11px]" fill="#dc2626">
                fix
              </text>
            </g>
          );
        })()}

        {/* My dot */}
        {hasMovedDot && (
          <g style={{ cursor: "grab" }} opacity={activeFixTargetId ? 0.2 : 1}>
            <SvgAvatar
              cx={myDot.cx} cy={myDot.cy}
              image={myImage} name={myName}
              clipId="me" borderColor="#18181b" borderWidth={2}
            />
            <text
              x={myDot.cx} y={myDot.cy - DEFAULT_R - 6}
              textAnchor="middle" className="text-[12px] fill-zinc-900 dark:fill-zinc-100"
            >
              me
            </text>
          </g>
        )}
      </svg>

      <div className="flex gap-2">
        {isFixing && (
          <>
            {fixDirty && (
              <button onClick={saveFix} className="h-10 rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-500">
                Save fix
              </button>
            )}
            {existingFix && (
              <button
                onClick={() => { onDeleteFix(existingFix._id); cancelFix(); }}
                className="h-10 rounded-lg border border-red-200 px-5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
              >
                Delete fix
              </button>
            )}
            <button onClick={cancelFix} className="h-10 rounded-lg border border-zinc-200 px-5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Cancel
            </button>
          </>
        )}
        {!isFixing && dirty && (
          <button
            onClick={() => { onPlace(pos.x, pos.y); setDirty(false); }}
            className="h-10 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {myPlacement ? "Update" : "Lock in"}
          </button>
        )}
      </div>
    </div>
  );
}
