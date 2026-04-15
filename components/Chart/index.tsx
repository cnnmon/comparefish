"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  toPos, toPos3D, resolveImage, getQuadrantMode, projectPoint,
  type Point, type PlacedPoint, type Fix, type Dimension,
} from "./utils";
import { Avatar, Quadrants, IsoQuadrants, Axes, AxisLabels } from "./Avatar";
import { useChart } from "./ChartProvider";
import { useChartPlacement } from "./useChartPlacement";
import { motion } from "framer-motion";
import { getUserName } from "../utils";
import { Id } from "../../convex/_generated/dataModel";

export { ChartProvider } from "./ChartProvider";

function CursorLabel({
  containerRef,
  label,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  label: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.left = `${e.clientX + 14}px`;
        ref.current.style.top = `${e.clientY}px`;
      }
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [containerRef]);

  if (!label) return null;

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-50 text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity duration-75 bg-[var(--background)] border-1 border-[var(--foreground)]"
      style={{ opacity: label ? 1 : 0, transform: "translateY(-50%)" }}
    >
      {label}
    </div>
  );
}

function MiniChart2D({ pair }: { pair: [number, number] }) {
  const ctx = useChart();
  if (!ctx) return null;
  const {
    locked, myName, myAvatar,
    allPlacements, fixes, dimensions,
    placePair, fixPair, authGate,
    liveValues, setLiveValues,
  } = ctx;

  const [dimX, dimY] = pair;
  const xDim = dimensions[dimX];
  const yDim = dimensions[dimY];
  const axisLabels = {
    xLabelLeft: xDim?.negLabel,
    xLabelRight: xDim?.posLabel,
    yLabelTop: yDim?.posLabel,
    yLabelBottom: yDim?.negLabel,
  };
  const qm = getQuadrantMode(axisLabels);

  const myPlacement: Point | null = ctx.rawMine
    ? projectPoint(ctx.rawMine.values, ctx.rawMine.x, ctx.rawMine.y, dimX, dimY)
    : null;
  const myValues = ctx.rawMine?.values ?? (ctx.rawMine ? [ctx.rawMine.x, ctx.rawMine.y] : null);

  const projected = allPlacements.map((p) => {
    const proj = projectPoint(p.values, p.x, p.y, dimX, dimY);
    return { ...p, x: proj.x, y: proj.y };
  });
  const projectedFixes = fixes.map((f) => {
    const proj = projectPoint(f.values, f.x, f.y, dimX, dimY);
    return { ...f, x: proj.x, y: proj.y };
  });

  const onPlace = useCallback(
    (x: number, y: number) => placePair({ x, y, dimX, dimY }),
    [placePair, dimX, dimY],
  );
  const onFix = useCallback(
    (targetUserId: Id<"users">, x: number, y: number) =>
      fixPair({ targetUserId, x, y, dimX, dimY }),
    [fixPair, dimX, dimY],
  );

  const {
    containerRef, myDot, hasPlaced, fixTarget, fixPos,
    hoveredUserId, hoveredQuadrant, activeFixTargetId,
    draggingSelf, handlePointerDown, handleTap,
    handlePointerMove, handlePointerUp, handlePointerLeave,
    fixNearOrigin, selfNearEdge: miniSelfNearEdge,
  } = useChartPlacement({
    myPlacement,
    myValues,
    allPlacements: projected,
    fixes: projectedFixes,
    onPlace,
    onFix,
    onDeleteFix: ctx.onDeleteFix,
    onDeletePlacement: ctx.onDeletePlacement,
    quadrantMode: qm,
    requireAuth: authGate,
    dimCount: 2,
    activePair: pair,
    fixedDimIdx: -1,
    flat: true,
    onLiveUpdate: setLiveValues,
  });

  const myUserId = projected.find((p) => p.isMe)?.userId;
  const effectiveMyDot = liveValues && !draggingSelf
    ? toPos(projectPoint(liveValues, 0, 0, dimX, dimY), qm)
    : myDot;

  const sp = (p: Point) => toPos(p, qm);
  const mid = `fix-${dimX}-${dimY}`;

  const displayFixes = projectedFixes.filter(
    (f) => !(fixTarget && f.isMine && f.targetUserId === fixTarget.userId),
  );
  const fixOpacity = (uid: string) =>
    activeFixTargetId ? (uid === activeFixTargetId ? 0.7 : 0.15) : 0.4;

  const onDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!handlePointerDown(e)) handleTap(e);
    },
    [handlePointerDown, handleTap],
  );
  const onUp = useCallback(() => {
    handlePointerUp();
    handlePointerLeave();
  }, [handlePointerUp, handlePointerLeave]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square touch-none select-none"
      style={{
        containerType: "inline-size",
        cursor: locked ? "default"
          : draggingSelf || fixTarget ? "grabbing"
          : hoveredUserId ? "grab"
          : !hasPlaced ? "crosshair"
          : "default",
      }}
      onMouseDown={locked ? undefined : onDown}
      onMouseUp={onUp}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchStart={locked ? undefined : onDown}
      onTouchEnd={onUp}
      onTouchMove={handlePointerMove}
    >
      <Quadrants active={null} labels={axisLabels} quadrantMode={qm} />
      <Axes quadrantMode={qm} dimCount={2} />
      <AxisLabels
        labels={[axisLabels.yLabelTop, axisLabels.yLabelBottom, axisLabels.xLabelRight, axisLabels.xLabelLeft]}
        quadrantMode={qm}
        dimCount={2}
        dimensions={dimensions}
        activePair={pair}
      />

      {displayFixes.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
          <defs>
            <marker id={mid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>
          {displayFixes.map((f) => {
            const origin = projected.find((p) => p.userId === f.targetUserId);
            if (!origin) return null;
            const from = origin.isMe && hasPlaced ? effectiveMyDot : sp(origin);
            const to = sp(f);
            return (
              <line key={f._id} x1={from.left} y1={from.top} x2={to.left} y2={to.top}
                stroke="#ef4444" strokeWidth="0.3" strokeDasharray="1 0.75"
                opacity={fixOpacity(f.targetUserId)} markerEnd={`url(#${mid})`}
              />
            );
          })}
        </svg>
      )}
      {displayFixes.map((f) => (
        <Avatar key={f._id} pos={sp(f)} size={11}
          image={resolveImage({ name: f.targetName, avatar: f.targetAvatar })}
          name={f.targetName}
          label={f.isMine ? "Your fix" : `${getUserName({ id: f.fixerId ?? "unknown", name: f.fixerName })}'s fix`}
          status={
            f.targetUserId === activeFixTargetId ? "fixing"
              : hoveredUserId === f.targetUserId ? "hovering"
              : "hidden"
          }
        />
      ))}

      {projected.filter((p) => !p.isMe).map((p) => (
        <Avatar key={p._id} pos={sp(p)}
          image={resolveImage({ name: p.name, avatar: p.avatar })}
          name={p.name} label={p.name}
          wiggle={hoveredUserId === p.userId && !fixTarget}
          status={
            fixTarget?.userId === p.userId ? undefined
              : hoveredUserId === p.userId ? "hovering"
              : hoveredUserId ? "hidden"
              : undefined
          }
        />
      ))}

      {fixTarget && fixPos && (() => {
        const from = sp(fixTarget);
        const to = sp(fixPos);
        const amid = `fix-active-${dimX}-${dimY}`;
        return (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              <defs>
                <marker id={amid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
              </defs>
              <line x1={from.left} y1={from.top} x2={to.left} y2={to.top}
                stroke="#ef4444" strokeWidth="0.3" strokeDasharray="1 0.75" opacity="0.5"
                markerEnd={`url(#${amid})`}
              />
            </svg>
            <Avatar pos={to}
              image={resolveImage({ name: fixTarget.name, avatar: fixTarget.avatar })}
              name={fixTarget.name} label="Your fix" status="fixing"
            />
          </>
        );
      })()}

      {hasPlaced && (
        <Avatar pos={effectiveMyDot}
          image={resolveImage({ name: myName, avatar: myAvatar })}
          name={myName} label={draggingSelf && miniSelfNearEdge ? "" : "me"}
          dim={draggingSelf && miniSelfNearEdge}
          wiggle={hoveredUserId === myUserId && !fixTarget && !draggingSelf}
          status={
            fixTarget?.userId === myUserId ? "fixing"
              : hoveredUserId === myUserId ? "hovering"
              : hoveredUserId ? "hidden"
              : undefined
          }
        />
      )}

      <CursorLabel containerRef={containerRef} label={
        draggingSelf && miniSelfNearEdge ? "Clear placement?"
          : fixTarget && fixNearOrigin ? "Cancel fix?"
          : null
      } />
    </div>
  );
}

export default function Chart() {
  const ctx = useChart();
  if (!ctx) throw new Error("Chart must be used within a ChartProvider");
  const {
    labels,
    quadrantMode,
    countdown,
    locked,
    myDot,
    myAvatar,
    myName,
    allPlacements,
    fixes,
    containerRef,
    hasPlaced,
    fixTarget,
    fixPos,
    hoveredUserId,
    activeFixTargetId,
    draggingSelf,
    dragRef,
    handlePointerDown,
    handleTap,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    hoveredQuadrant,
    fixNearOrigin,
    selfNearEdge,
    showAllFixes,
    toggleShowAllFixes,
    dimensions,
    dimCount,
    dimensionPairs,
    activePair,
    viewIndex,
    setViewIndex,
    totalViews,
    flat,
  } = ctx;
  const use3D = dimCount === 3 && !flat;
  const multiDim = totalViews > 1 && !use3D;
  const qm = quadrantMode;
  const myUserId = allPlacements.find((p) => p.isMe)?.userId;
  const { liveValues } = ctx;

  // When another chart is being dragged, use liveValues for "me" position
  const effectiveMyDot = liveValues && !draggingSelf
    ? (use3D ? toPos3D(liveValues) : toPos(projectPoint(liveValues, 0, 0, activePair[0], activePair[1]), qm))
    : myDot;

  const sp = (p: Point & { values?: number[] }) =>
    use3D ? toPos3D(p.values ?? [p.x, p.y, 0]) : toPos(p, qm);

  // Swipe detection for multi-dim rotation (distinguishes swipe from drag/tap)
  const swipeRef = useRef<{ x: number; y: number; event: React.MouseEvent | React.TouchEvent } | null>(null);

  const wrappedDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const dragStarted = handlePointerDown(e);
      if (dragStarted) return;
      if (multiDim) {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        swipeRef.current = { x: clientX, y: clientY, event: e };
      } else {
        handleTap(e);
      }
    },
    [multiDim, handlePointerDown, handleTap],
  );

  const wrappedUp = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      handlePointerUp();
      if (swipeRef.current) {
        const clientX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
        const clientY = "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY;
        const dx = clientX - swipeRef.current.x;
        const dy = clientY - swipeRef.current.y;
        const origEvent = swipeRef.current.event;
        swipeRef.current = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          setViewIndex(
            dx < 0
              ? (viewIndex + 1) % totalViews
              : (viewIndex - 1 + totalViews) % totalViews,
          );
        } else {
          handleTap(origEvent);
        }
      }
      handlePointerLeave();
    },
    [handlePointerUp, handlePointerLeave, handleTap, viewIndex, totalViews, setViewIndex],
  );

  const hoverLabel = (() => {
    if (locked) return null;
    if (draggingSelf && selfNearEdge) return "Clear placement?";
    if (fixTarget && fixNearOrigin) return "Cancel fix?";
    if (hoveredUserId && !fixTarget && !draggingSelf)
      return hoveredUserId === myUserId
        ? "Drag to re-place"
        : `Drag to fix ${getUserName({
            id: hoveredUserId ?? "unknown",
            name:
              allPlacements.find((p) => p.userId === hoveredUserId)?.name ?? "",
          })}`;
    return null;
  })();

  // Users connected to the hovered fish via fixes
  const connectedToHovered = new Set<string>();
  if (hoveredUserId) {
    connectedToHovered.add(hoveredUserId);
    for (const f of fixes) {
      if (f.targetUserId === hoveredUserId) connectedToHovered.add(f.fixerId);
      if (f.fixerId === hoveredUserId) connectedToHovered.add(f.targetUserId);
    }
  }

  const fixAvatarOpacity = (targetUserId: string) => {
    if (activeFixTargetId)
      return targetUserId === activeFixTargetId ? 0.7 : 0.15;
    return 0.4;
  };

  const displayFixes = fixes.filter(
    (f) => !(fixTarget && f.isMine && f.targetUserId === fixTarget.userId),
  );

  const chartEl = (
      <div
        ref={containerRef}
        className="relative w-full aspect-square touch-none select-none"
        style={{
          containerType: "inline-size",
          cursor: locked
            ? "default"
            : draggingSelf || fixTarget
              ? "grabbing"
              : hoveredUserId
                ? "grab"
                : !hasPlaced
                  ? "crosshair"
                  : "default",
        }}
        onMouseDown={locked ? undefined : wrappedDown}
        onMouseUp={wrappedUp}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onTouchStart={locked ? undefined : wrappedDown}
        onTouchEnd={wrappedUp}
        onTouchMove={handlePointerMove}
      >
        {!use3D && <Quadrants active={hoveredQuadrant} labels={labels} quadrantMode={qm} />}
        <Axes quadrantMode={qm} dimCount={use3D ? 3 : Math.min(dimCount, 2)} activePair={activePair} />
        <AxisLabels
          labels={[
            labels.yLabelTop,
            labels.yLabelBottom,
            labels.xLabelRight,
            labels.xLabelLeft,
          ]}
          quadrantMode={qm}
          dimCount={use3D ? 3 : Math.min(dimCount, 2)}
          dimensions={dimensions}
          activePair={activePair}
        />

        {displayFixes.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
          >
            <defs>
              <marker
                id="fix-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
              </marker>
            </defs>
            {displayFixes.map((f) => {
              const origin = allPlacements.find(
                (p) => p.userId === f.targetUserId,
              );
              if (!origin) return null;
              const from = origin.isMe && hasPlaced ? effectiveMyDot : sp(origin);
              const to = sp(f);
              return (
                <line
                  key={f._id}
                  x1={from.left}
                  y1={from.top}
                  x2={to.left}
                  y2={to.top}
                  stroke="#ef4444"
                  strokeWidth="0.3"
                  strokeDasharray="1 0.75"
                  opacity={fixAvatarOpacity(f.targetUserId)}
                  markerEnd="url(#fix-arrow)"
                />
              );
            })}
          </svg>
        )}
        {displayFixes.map((f) => {
          const pos = sp(f);
          return (
            <Avatar
              key={f._id}
              pos={pos}
              size={11}
              image={resolveImage({
                name: f.targetName,
                avatar: f.targetAvatar,
              })}
              name={f.targetName}
              label={
                f.isMine
                  ? "Your fix"
                  : `${getUserName({
                      id: f.fixerId ?? "unknown",
                      name: f.fixerName,
                    })}'s fix`
              }
              status={
                f.targetUserId === activeFixTargetId
                  ? "fixing"
                  : hoveredUserId === f.targetUserId
                    ? "hovering"
                    : "hidden"
              }
            />
          );
        })}

        {allPlacements
          .filter((p) => !p.isMe)
          .map((p) => {
            const pos = sp(p);
            const isFixingThis = fixTarget?.userId === p.userId;
            return (
              <Avatar
                key={p._id}
                pos={pos}
                image={resolveImage({
                  name: p.name,
                  avatar: p.avatar,
                })}
                name={p.name}
                label={p.name}
                wiggle={hoveredUserId === p.userId && !fixTarget}
                status={
                  isFixingThis
                    ? undefined
                    : hoveredUserId === p.userId
                      ? "hovering"
                      : hoveredUserId
                        ? "hidden"
                        : undefined
                }
              />
            );
          })}

        {fixTarget &&
          fixPos &&
          (() => {
            const from = sp(fixTarget);
            const to = sp(fixPos);
            return (
              <>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                >
                  <defs>
                    <marker
                      id="fix-arrow-active"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="4"
                      markerHeight="4"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                    </marker>
                  </defs>
                  <line
                    x1={from.left}
                    y1={from.top}
                    x2={to.left}
                    y2={to.top}
                    stroke="#ef4444"
                    strokeWidth="0.3"
                    strokeDasharray="1 0.75"
                    opacity="0.5"
                    markerEnd="url(#fix-arrow-active)"
                  />
                </svg>
                <Avatar
                  pos={to}
                  image={resolveImage({
                    name: fixTarget.name,
                    avatar: fixTarget.avatar,
                  })}
                  name={fixTarget.name}
                  label="Your fix"
                  status={"fixing"}
                />
              </>
            );
          })()}

        {hasPlaced && (
          <Avatar
            pos={effectiveMyDot}
            image={resolveImage({
              name: myName,
              avatar: myAvatar,
            })}
            name={myName}
            label={draggingSelf && selfNearEdge ? "" : "me"}
            dim={draggingSelf && selfNearEdge}
            wiggle={hoveredUserId === myUserId && !fixTarget && !draggingSelf}
            status={
              fixTarget?.userId === myUserId
                ? "fixing"
                : hoveredUserId === myUserId
                  ? "hovering"
                  : hoveredUserId
                    ? "hidden"
                    : undefined
            }
          />
        )}

        <CursorLabel containerRef={containerRef} label={hoverLabel} />
      </div>
  );

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {chartEl}
      {use3D && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          {dimensionPairs.map((pair) => (
            <MiniChart2D key={pair.join(",")} pair={pair} />
          ))}
        </div>
      )}

      <motion.div
        className="p-4 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, delay: 0.4 }}
      >
        <div className="flex gap-2">
          {!fixTarget && !draggingSelf && hasPlaced && !showAllFixes && (
            <button
              onClick={toggleShowAllFixes}
              className="text-xs opacity-40 hover:opacity-100 transition-opacity"
            >
              See all fixes
            </button>
          )}
        </div>

        {!locked ? (
          <p className="text-center text-sm italic opacity-50">
            {fixTarget
              ? `Fixing ${fixTarget.name} — drag to place.`
              : draggingSelf
                ? "Drag to re-place yourself."
                : !hasPlaced
                  ? "Click to place yourself."
                  : "Drag fish to fix their placements."}
          </p>
        ) : (
          <p className="text-center text-sm italic opacity-75">This plot is locked{countdown ? ` (${countdown})` : ""}.</p>
        )}

        {multiDim && (
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setViewIndex(
                  (viewIndex - 1 + totalViews) % totalViews,
                )
              }
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              ←
            </button>
            <span className="text-xs opacity-60">
              {viewIndex === 0 && dimCount === 3 ? "3D" : `(${viewIndex + 1}/${totalViews})`}
            </span>
            <button
              onClick={() =>
                setViewIndex(
                  (viewIndex + 1) % totalViews,
                )
              }
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
