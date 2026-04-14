"use client";

import { useCallback, useEffect, useRef } from "react";
import { toPos, toPos3D, resolveImage, type Point } from "./utils";
import { Avatar, Quadrants, Axes, AxisLabels } from "./Avatar";
import { useChart } from "./ChartProvider";
import { motion } from "framer-motion";
import { getUserName } from "../utils";

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
  const multiDim = totalViews > 1;
  const use3D = dimCount === 3 && !flat;
  const qm = quadrantMode;
  const myUserId = allPlacements.find((p) => p.isMe)?.userId;

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

  const hoverLabel =
    hoveredUserId && !fixTarget && !draggingSelf && !locked
      ? hoveredUserId === myUserId
        ? "Drag to re-place"
        : `Drag to fix ${getUserName({
            id: hoveredUserId ?? "unknown",
            name:
              allPlacements.find((p) => p.userId === hoveredUserId)?.name ?? "",
          })}`
      : null;

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

  return (
    <div className="flex w-full flex-col items-center gap-4">
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
              const from = origin.isMe && hasPlaced ? myDot : sp(origin);
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
            pos={myDot}
            image={resolveImage({
              name: myName,
              avatar: myAvatar,
            })}
            name={myName}
            label="me"
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

      <motion.div
        className="absolute bottom-0 p-4 flex flex-col items-center gap-2"
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
