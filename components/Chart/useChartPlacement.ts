"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { Point, toPos, toPos3D, fromScreen3D, PlacedPoint, Fix, type QuadrantMode } from "./utils";

export function useChartPlacement({
  myPlacement,
  myValues,
  allPlacements,
  fixes,
  onPlace,
  onFix,
  quadrantMode,
  requireAuth,
  dimCount = 2,
  activePair = [0, 1] as [number, number],
  fixedDimIdx = -1,
  flat = false,
  onLiveUpdate,
}: {
  myPlacement: Point | null;
  myValues: number[] | null;
  allPlacements: PlacedPoint[];
  fixes: Fix[];
  onPlace: (x: number, y: number) => void;
  onFix: (targetUserId: Id<"users">, x: number, y: number) => void;
  quadrantMode?: QuadrantMode | null;
  requireAuth?: () => boolean;
  dimCount?: number;
  activePair?: [number, number];
  fixedDimIdx?: number;
  flat?: boolean;
  onLiveUpdate?: (values: number[] | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Point>(myPlacement ?? { x: 0, y: 0 });
  const [hasPlaced, setHasPlaced] = useState(!!myPlacement);

  const [fixTarget, setFixTarget] = useState<PlacedPoint | null>(null);
  const [fixPos, setFixPos] = useState<Point | null>(null);
  const [hoveredUserId, setHoveredUserId] = useState<Id<"users"> | null>(null);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<number | null>(null);
  const [draggingSelf, setDraggingSelf] = useState(false);

  // Drag tracking via ref to avoid stale closures in move/up handlers
  const dragRef = useRef<{ type: "self" | "fix"; target?: PlacedPoint } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const fixPosRef = useRef(fixPos);
  fixPosRef.current = fixPos;
  const myPlacementRef = useRef(myPlacement);
  myPlacementRef.current = myPlacement;
  const myValuesRef = useRef(myValues);
  myValuesRef.current = myValues;
  const activePairRef = useRef(activePair);
  activePairRef.current = activePair;
  const onLiveUpdateRef = useRef(onLiveUpdate);
  onLiveUpdateRef.current = onLiveUpdate;

  const broadcastLive = useCallback((p: Point | null) => {
    if (!onLiveUpdateRef.current) return;
    if (!p) { onLiveUpdateRef.current(null); return; }
    const vals = myValuesRef.current ? [...myValuesRef.current] : Array(Math.max(dimCount, 2)).fill(0);
    vals[activePairRef.current[0]] = p.x;
    vals[activePairRef.current[1]] = p.y;
    onLiveUpdateRef.current(vals);
  }, [dimCount]);

  useEffect(() => {
    if (myPlacement) {
      setPos(myPlacement);
      setHasPlaced(true);
    }
  }, [myPlacement?.x, myPlacement?.y]);

  const use3D = dimCount === 3 && !flat;
  const fixedVal = use3D && myValues ? (myValues[fixedDimIdx] ?? 0) : 0;

  const fromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const clientX =
        "touches" in e
          ? (e.touches[0]?.clientX ?? (e as unknown as { changedTouches: TouchList }).changedTouches?.[0]?.clientX)
          : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e
          ? (e.touches[0]?.clientY ?? (e as unknown as { changedTouches: TouchList }).changedTouches?.[0]?.clientY)
          : (e as React.MouseEvent).clientY;
      if (clientX == null || clientY == null) return null;
      const pctX = (clientX - rect.left) / rect.width;
      const pctY = (clientY - rect.top) / rect.height;
      if (use3D) {
        return fromScreen3D(pctX, pctY, activePair, fixedDimIdx, fixedVal);
      }
      if (dimCount === 1) {
        return {
          x: Math.max(-1, Math.min(1, (pctX - 0.5) / 0.44)),
          y: 0,
        };
      }
      if (quadrantMode) {
        const { signX, signY } = quadrantMode;
        return {
          x: Math.max(signX === 1 ? 0 : -1, Math.min(signX === 1 ? 1 : 0, (pctX - 0.5 + signX * 0.44) / 0.88)),
          y: Math.max(signY === 1 ? 0 : -1, Math.min(signY === 1 ? 1 : 0, -(pctY - 0.5 - signY * 0.44) / 0.88)),
        };
      }
      return {
        x: Math.max(-1, Math.min(1, (pctX - 0.5) / 0.44)),
        y: Math.max(-1, Math.min(1, -(pctY - 0.5) / 0.44)),
      };
    },
    [quadrantMode, dimCount, activePair, fixedDimIdx, fixedVal, use3D],
  );

  const hitTest = useCallback(
    (e: React.MouseEvent | React.TouchEvent): PlacedPoint | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY;
      if (clientX == null || clientY == null) return null;
      const clickPx = { x: clientX - rect.left, y: clientY - rect.top };
      const hitRadius = rect.width * 0.07;
      for (const other of allPlacements) {
        const sp = use3D && other.values
          ? toPos3D(other.values)
          : toPos(other, quadrantMode);
        const ox = (sp.left / 100) * rect.width;
        const oy = (sp.top / 100) * rect.height;
        const dx = clickPx.x - ox;
        const dy = clickPx.y - oy;
        if (Math.sqrt(dx * dx + dy * dy) < hitRadius) return other;
      }
      return null;
    },
    [allPlacements, quadrantMode, use3D],
  );

  // Starts a drag if pressing on a fish. Returns true if drag started.
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent): boolean => {
      if (requireAuth && !requireAuth()) return false;
      const hit = hitTest(e);
      if (!hit) return false;
      if (hit.isMe) {
        dragRef.current = { type: "self" };
        setDraggingSelf(true);
      } else {
        dragRef.current = { type: "fix", target: hit };
        setFixTarget(hit);
        const existing = fixes.find(
          (f) => f.isMine && f.targetUserId === hit.userId,
        );
        setFixPos(existing ? { x: existing.x, y: existing.y } : { x: hit.x, y: hit.y });
        setHoveredUserId(hit.userId);
      }
      return true;
    },
    [hitTest, fixes, requireAuth],
  );

  // Initial placement on empty space (tap/click)
  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (requireAuth && !requireAuth()) return;
      if (hasPlaced) return;
      const p = fromEvent(e);
      if (p) {
        setPos(p);
        setHasPlaced(true);
        onPlace(p.x, p.y);
      }
    },
    [hasPlaced, fromEvent, onPlace, requireAuth],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const p = fromEvent(e);
      if (p) {
        const col = p.x >= 0 ? 1 : 0;
        const row = p.y > 0 ? 0 : 1;
        setHoveredQuadrant(row * 2 + col);
      }
      if (dragRef.current) {
        if (p) {
          if (dragRef.current.type === "self") {
            setPos(p);
            broadcastLive(p);
          } else {
            setFixPos(p);
          }
        }
        return;
      }
      setHoveredUserId(hitTest(e)?.userId ?? null);
    },
    [hitTest, fromEvent],
  );

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag.type === "self") {
      const p = posRef.current;
      onPlace(p.x, p.y);
      setDraggingSelf(false);
      broadcastLive(null);
    } else if (drag.target) {
      const p = fixPosRef.current;
      if (p) onFix(drag.target.userId as Id<"users">, p.x, p.y);
    }
    setFixTarget(null);
    setFixPos(null);
    setHoveredUserId(null);
  }, [onPlace, onFix, broadcastLive]);

  const handlePointerLeave = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = null;
      setDraggingSelf(false);
      const mp = myPlacementRef.current;
      if (mp) setPos(mp);
      setFixTarget(null);
      setFixPos(null);
      broadcastLive(null);
    }
    setHoveredQuadrant(null);
    setHoveredUserId(null);
  }, [broadcastLive]);

  const myDot = (() => {
    if (use3D) {
      const vals = myValues ? [...myValues] : Array(3).fill(0);
      vals[activePair[0]] = pos.x;
      vals[activePair[1]] = pos.y;
      return toPos3D(vals);
    }
    return toPos(pos, quadrantMode);
  })();
  const activeFixTargetId = fixTarget?.userId ?? null;

  return {
    containerRef,
    myDot,
    hasPlaced,
    fixTarget,
    fixPos,
    hoveredUserId,
    hoveredQuadrant,
    activeFixTargetId,
    draggingSelf,
    dragRef,
    handlePointerDown,
    handleTap,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  };
}

export type ChartPlacementState = ReturnType<typeof useChartPlacement>;
