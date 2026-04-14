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
  onDeleteFix,
  quadrantMode,
  requireAuth,
  dimCount = 2,
  activePair = [0, 1] as [number, number],
  fixedDimIdx = -1,
  flat = false,
  onLiveUpdate,
  onDeletePlacement,
}: {
  myPlacement: Point | null;
  myValues: number[] | null;
  allPlacements: PlacedPoint[];
  fixes: Fix[];
  onPlace: (x: number, y: number) => void;
  onFix: (targetUserId: Id<"users">, x: number, y: number) => void;
  onDeleteFix?: (fixId: Id<"fixes">) => void;
  onDeletePlacement?: () => void;
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
  const [selfNearEdge, setSelfNearEdge] = useState(false);

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

  const fromClientXY = useCallback(
    (clientX: number, clientY: number, unclamped = false): Point | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const pctX = (clientX - rect.left) / rect.width;
      const pctY = (clientY - rect.top) / rect.height;
      const clamp = unclamped
        ? (v: number) => v
        : (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      if (use3D) {
        return fromScreen3D(pctX, pctY, activePair, fixedDimIdx, fixedVal);
      }
      if (dimCount === 1) {
        return { x: clamp((pctX - 0.5) / 0.44, -1, 1), y: 0 };
      }
      if (quadrantMode) {
        const { signX, signY } = quadrantMode;
        return {
          x: clamp((pctX - 0.5 + signX * 0.44) / 0.88, signX === 1 ? 0 : -1, signX === 1 ? 1 : 0),
          y: clamp(-(pctY - 0.5 - signY * 0.44) / 0.88, signY === 1 ? 0 : -1, signY === 1 ? 1 : 0),
        };
      }
      return {
        x: clamp((pctX - 0.5) / 0.44, -1, 1),
        y: clamp(-(pctY - 0.5) / 0.44, -1, 1),
      };
    },
    [quadrantMode, dimCount, activePair, fixedDimIdx, fixedVal, use3D],
  );

  const fromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent, unclamped = false): Point | null => {
      const clientX =
        "touches" in e
          ? (e.touches[0]?.clientX ?? (e as unknown as { changedTouches: TouchList }).changedTouches?.[0]?.clientX)
          : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e
          ? (e.touches[0]?.clientY ?? (e as unknown as { changedTouches: TouchList }).changedTouches?.[0]?.clientY)
          : (e as React.MouseEvent).clientY;
      if (clientX == null || clientY == null) return null;
      return fromClientXY(clientX, clientY, unclamped);
    },
    [fromClientXY],
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
        // Self-drag position is handled by window-level listeners
        if (dragRef.current.type === "self") return;
        if (p) setFixPos(p);
        return;
      }
      setHoveredUserId(hitTest(e)?.userId ?? null);
    },
    [hitTest, fromEvent],
  );

  const onDeletePlacementRef = useRef(onDeletePlacement);
  onDeletePlacementRef.current = onDeletePlacement;
  const selfNearEdgeRef = useRef(false);
  selfNearEdgeRef.current = selfNearEdge;

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag.type === "self") {
      const wasNearEdge = selfNearEdgeRef.current;
      setDraggingSelf(false);
      setSelfNearEdge(false);
      broadcastLive(null);
      if (wasNearEdge && onDeletePlacementRef.current) {
        onDeletePlacementRef.current();
        setHasPlaced(false);
        return;
      }
      const p = posRef.current;
      const cx = Math.max(-1, Math.min(1, p.x));
      const cy = Math.max(-1, Math.min(1, p.y));
      setPos({ x: cx, y: cy });
      onPlace(cx, cy);
    } else if (drag.target) {
      const p = fixPosRef.current;
      if (p) {
        const dx = p.x - drag.target.x;
        const dy = p.y - drag.target.y;
        const nearOrigin = Math.sqrt(dx * dx + dy * dy) < 0.12;
        const existingFix = fixes.find(
          (f) => f.isMine && f.targetUserId === drag.target!.userId,
        );
        if (nearOrigin && existingFix && onDeleteFix) {
          onDeleteFix(existingFix._id);
        } else {
          onFix(drag.target.userId as Id<"users">, p.x, p.y);
        }
      }
    }
    setFixTarget(null);
    setFixPos(null);
    setHoveredUserId(null);
  }, [onPlace, onFix, onDeleteFix, fixes, broadcastLive]);

  const handlePointerLeave = useCallback(() => {
    if (dragRef.current) {
      // During self-drag, window listeners handle the release — don't cancel here
      if (dragRef.current.type === "self") return;
      dragRef.current = null;
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

  // Attach window-level listeners during self-drag so we can detect
  // the pointer leaving the chart area and releasing outside it
  const fromClientXYRef = useRef(fromClientXY);
  fromClientXYRef.current = fromClientXY;
  useEffect(() => {
    if (!draggingSelf) return;
    const onMouseMove = (e: MouseEvent) => {
      const p = fromClientXYRef.current(e.clientX, e.clientY, true);
      if (!p) return;
      setSelfNearEdge(Math.abs(p.x) > 1.3 || Math.abs(p.y) > 1.3);
      setPos(p);
      broadcastLive(p);
    };
    const onMouseUp = () => {
      if (!dragRef.current || dragRef.current.type !== "self") return;
      handlePointerUp();
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingSelf, handlePointerUp, broadcastLive]);

  const fixNearOrigin = (() => {
    if (!fixTarget || !fixPos) return false;
    const dx = fixPos.x - fixTarget.x;
    const dy = fixPos.y - fixTarget.y;
    return Math.sqrt(dx * dx + dy * dy) < 0.12;
  })();

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
    fixNearOrigin,
    selfNearEdge,
  };
}

export type ChartPlacementState = ReturnType<typeof useChartPlacement>;
