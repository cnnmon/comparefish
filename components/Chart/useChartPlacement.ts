"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { Point, toPos, PlacedPoint, Fix } from "./utils";

export function useChartPlacement({
  myPlacement,
  allPlacements,
  fixes,
  onPlace,
  onFix,
  onDeleteFix,
}: {
  myPlacement: Point | null;
  allPlacements: PlacedPoint[];
  fixes: Fix[];
  onPlace: (x: number, y: number) => void;
  onFix: (targetUserId: Id<"users">, x: number, y: number) => void;
  onDeleteFix: (fixId: Id<"fixes">) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Point>(myPlacement ?? { x: 0, y: 0 });
  const [hasPlaced, setHasPlaced] = useState(!!myPlacement);

  const [fixTarget, setFixTarget] = useState<PlacedPoint | null>(null);
  const [fixPos, setFixPos] = useState<Point | null>(null);
  const [hoveredUserId, setHoveredUserId] = useState<Id<"users"> | null>(null);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<number | null>(null);
  const [editingSelf, setEditingSelf] = useState(false);

  const isFixing = fixTarget !== null;

  useEffect(() => {
    if (myPlacement) {
      setPos(myPlacement);
      setHasPlaced(true);
    }
  }, [myPlacement?.x, myPlacement?.y]);

  const fromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const clientX =
        "touches" in e
          ? e.touches[0].clientX
          : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e
          ? e.touches[0].clientY
          : (e as React.MouseEvent).clientY;
      const pctX = (clientX - rect.left) / rect.width;
      const pctY = (clientY - rect.top) / rect.height;
      return {
        x: Math.max(-1, Math.min(1, (pctX - 0.5) / 0.44)),
        y: Math.max(-1, Math.min(1, -(pctY - 0.5) / 0.44)),
      };
    },
    [],
  );

  const hitTest = useCallback(
    (e: React.MouseEvent | React.TouchEvent): PlacedPoint | null => {
      const p = fromEvent(e);
      const el = containerRef.current;
      if (!p || !el) return null;
      const scale = el.getBoundingClientRect().width * 0.44;
      const hitRadius = 22;
      for (const other of allPlacements) {
        const dx = (p.x - other.x) * scale;
        const dy = (p.y - other.y) * scale;
        if (Math.sqrt(dx * dx + dy * dy) < hitRadius) return other;
      }
      return null;
    },
    [allPlacements, fromEvent],
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isFixing) {
        const p = fromEvent(e);
        if (p && fixTarget) {
          setFixPos(p);
          onFix(fixTarget.userId, p.x, p.y);
        }
        return;
      }
      if (editingSelf) {
        const hit = hitTest(e);
        if (hit && !hit.isMe) {
          setEditingSelf(false);
          setFixTarget(hit);
          const existing = fixes.find(
            (f) => f.isMine && f.targetUserId === hit.userId,
          );
          setFixPos(existing ? { x: existing.x, y: existing.y } : null);
          return;
        }
        const p = fromEvent(e);
        if (p) {
          setPos(p);
          onPlace(p.x, p.y);
        }
        return;
      }
      const hit = hitTest(e);
      if (hit) {
        if (hit.isMe) {
          setEditingSelf(true);
        } else {
          setFixTarget(hit);
          const existing = fixes.find(
            (f) => f.isMine && f.targetUserId === hit.userId,
          );
          setFixPos(existing ? { x: existing.x, y: existing.y } : null);
        }
        return;
      }
      if (!hasPlaced) {
        const p = fromEvent(e);
        if (p) {
          setPos(p);
          setHasPlaced(true);
          onPlace(p.x, p.y);
        }
      }
    },
    [isFixing, editingSelf, hasPlaced, hitTest, fromEvent, fixes, fixTarget, onFix, onPlace],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const p = fromEvent(e);
      if (p) {
        const col = p.x >= 0 ? 1 : 0;
        const row = p.y > 0 ? 0 : 1;
        setHoveredQuadrant(row * 2 + col);
      }
      if (!isFixing && !editingSelf) {
        setHoveredUserId(hitTest(e)?.userId ?? null);
      }
    },
    [isFixing, editingSelf, hitTest, fromEvent],
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredQuadrant(null);
    if (!isFixing) setHoveredUserId(null);
  }, [isFixing]);

  const cancelFix = useCallback(() => {
    setFixTarget(null);
    setFixPos(null);
    setHoveredUserId(null);
  }, []);

  const startEditingSelf = useCallback(() => setEditingSelf(true), []);
  const cancelEditingSelf = useCallback(() => setEditingSelf(false), []);

  const myDot = toPos(pos);
  const activeFixTargetId = fixTarget?.userId ?? null;
  const existingFix = fixTarget
    ? fixes.find((f) => f.isMine && f.targetUserId === fixTarget.userId)
    : null;

  const deleteExistingFix = useCallback(() => {
    if (existingFix) {
      onDeleteFix(existingFix._id);
      cancelFix();
    }
  }, [existingFix, onDeleteFix, cancelFix]);

  return {
    containerRef,
    myDot,
    hasPlaced,
    fixTarget,
    fixPos,
    hoveredUserId,
    hoveredQuadrant,
    activeFixTargetId,
    existingFix,
    editingSelf,
    startEditingSelf,
    cancelEditingSelf,
    handlePointerDown,
    handlePointerMove,
    handlePointerLeave,
    cancelFix,
    deleteExistingFix,
  };
}

export type ChartPlacementState = ReturnType<typeof useChartPlacement>;
