"use client";

import { useEffect, useRef } from "react";
import { toPos, resolveImage } from "./utils";
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

  if (!label) {
    return null;
  }

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
  const {
    labels,
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
    existingFix,
    editingSelf,
    cancelEditingSelf,
    handlePointerDown,
    handlePointerMove,
    handlePointerLeave,
    cancelFix,
    deleteExistingFix,
    hoveredQuadrant,
  } = useChart();
  const myUserId = allPlacements.find((p) => p.isMe)?.userId;

  const hoverLabel =
    hoveredUserId && !fixTarget && !editingSelf
      ? hoveredUserId === myUserId
        ? "Re-place yourself"
        : `Fix ${getUserName({
            id: hoveredUserId ?? "unknown",
            name:
              allPlacements.find((p) => p.userId === hoveredUserId)?.name ?? "",
          })}'s placement`
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
          cursor: locked
            ? "default"
            : fixTarget || editingSelf || !hasPlaced
              ? "crosshair"
              : hoveredUserId
                ? "pointer"
                : "default",
        }}
        onMouseDown={locked ? undefined : handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onTouchStart={locked ? undefined : handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerLeave}
      >
        <Quadrants active={hoveredQuadrant} labels={labels} />
        <Axes />
        <AxisLabels
          labels={[
            labels.yLabelTop,
            labels.yLabelBottom,
            labels.xLabelRight,
            labels.xLabelLeft,
          ]}
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
              const from = origin.isMe && hasPlaced ? myDot : toPos(origin);
              const to = toPos(f);
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
          const pos = toPos(f);
          return (
            <Avatar
              key={f._id}
              pos={pos}
              size={80}
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
                  : editingSelf && f.targetUserId === myUserId
                    ? undefined
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
            const pos = toPos(p);
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
            const from = toPos(fixTarget);
            const to = toPos(fixPos);
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
          {fixTarget && (
            <>
              {existingFix && (
                <button
                  onClick={deleteExistingFix}
                  className="h-10 rounded-lg border border-[var(--rust)]! px-5 text-sm font-medium text-[var(--rust)]! transition-colors hover:bg-[var(--rust)]! hover:text-[var(--background)]!"
                >
                  Delete fix
                </button>
              )}
              <button
                onClick={cancelFix}
                className="h-10 rounded-lg border border-zinc-200 px-5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Exit fix mode
              </button>
            </>
          )}
          {editingSelf && (
            <button
              onClick={cancelEditingSelf}
              className="h-10 rounded-lg border border-zinc-200 px-5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Exit self-placement
            </button>
          )}
        </div>

        {allPlacements.length > 0 && (
          <p className="text-center text-sm opacity-50">
            {allPlacements.length}{" "}
            {allPlacements.length === 1 ? "person" : "people"} placed.
          </p>
        )}
      </motion.div>
    </div>
  );
}
