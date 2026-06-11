"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { Id } from "../../convex/_generated/dataModel";
import { Point, toPos, toPos3D, fromScreen3D, fromScreenTriangle, PlacedPoint, Fix, type QuadrantMode } from "./utils";

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
  shape,
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
  shape?: string;
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

  // Drag tracking via ref to avoid stale closures in move/up handlers.
  // pointerId guards against multi-touch: only the finger that started the
  // drag may move/end it (a second finger would otherwise hijack the drag).
  const dragRef = useRef<{ type: "self" | "fix"; target?: PlacedPoint; pointerId: number } | null>(null);
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

  const isTriangle = shape === "triangle" && dimCount === 3;

  const broadcastLive = useCallback((p: Point | null) => {
    if (!onLiveUpdateRef.current) return;
    if (!p) { onLiveUpdateRef.current(null); return; }
    if (isTriangle) {
      onLiveUpdateRef.current([p.x, p.y, -p.x - p.y]);
      return;
    }
    const vals = myValuesRef.current ? [...myValuesRef.current] : Array(Math.max(dimCount, 2)).fill(0);
    vals[activePairRef.current[0]] = p.x;
    vals[activePairRef.current[1]] = p.y;
    onLiveUpdateRef.current(vals);
  }, [dimCount, isTriangle]);

  useEffect(() => {
    if (myPlacement) {
      setPos(myPlacement);
      setHasPlaced(true);
    }
  }, [myPlacement?.x, myPlacement?.y]);

  const use3D = dimCount === 3 && !flat && !isTriangle;
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
      if (isTriangle) {
        const [v0, v1] = fromScreenTriangle(pctX, pctY);
        return { x: v0, y: v1 };
      }
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
    [quadrantMode, dimCount, activePair, fixedDimIdx, fixedVal, use3D, isTriangle],
  );

  const fromEvent = useCallback(
    (e: React.PointerEvent, unclamped = false): Point | null =>
      fromClientXY(e.clientX, e.clientY, unclamped),
    [fromClientXY],
  );

  const hitTest = useCallback(
    (e: React.PointerEvent): PlacedPoint | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const clickPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      // Fingers are less precise than a mouse cursor
      const hitRadius = rect.width * (e.pointerType === "touch" ? 0.09 : 0.07);
      for (const other of allPlacements) {
        const sp = (use3D || isTriangle) && other.values
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
    [allPlacements, quadrantMode, use3D, isTriangle],
  );

  // Starts a drag if pressing on a fish. Returns true if drag started.
  // Captures the pointer so move/up fire reliably on mobile, even off-chart.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent): boolean => {
      if (requireAuth && !requireAuth()) return false;
      // A drag is already in progress: swallow extra touches so they can't
      // start a second drag, tap, or swipe.
      if (dragRef.current) return true;
      const hit = hitTest(e);
      if (!hit) return false;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      if (hit.isMe) {
        dragRef.current = { type: "self", pointerId: e.pointerId };
        setDraggingSelf(true);
      } else {
        dragRef.current = { type: "fix", target: hit, pointerId: e.pointerId };
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
    (e: React.PointerEvent) => {
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

  const [hoveredTriValues, setHoveredTriValues] = useState<number[] | null>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (drag && e.pointerId !== drag.pointerId) return;
      // Clamped position drives hover indicators and fix-drag
      const pClamped = fromEvent(e);
      if (pClamped) {
        if (isTriangle) {
          setHoveredTriValues([pClamped.x, pClamped.y, -pClamped.x - pClamped.y]);
        } else {
          const col = pClamped.x >= 0 ? 1 : 0;
          const row = pClamped.y > 0 ? 0 : 1;
          setHoveredQuadrant(row * 2 + col);
        }
      }
      if (drag) {
        if (drag.type === "self") {
          // Unclamped lets us detect the "drag-off-edge to delete" gesture
          const pUn = fromEvent(e, true);
          if (!pUn) return;
          setSelfNearEdge(Math.abs(pUn.x) > 1.3 || Math.abs(pUn.y) > 1.3);
          setPos(pUn);
          broadcastLive(pUn);
        } else if (pClamped) {
          setFixPos(pClamped);
        }
        return;
      }
      setHoveredUserId(hitTest(e)?.userId ?? null);
    },
    [hitTest, fromEvent, isTriangle, broadcastLive],
  );

  const onDeletePlacementRef = useRef(onDeletePlacement);
  onDeletePlacementRef.current = onDeletePlacement;
  const selfNearEdgeRef = useRef(false);
  selfNearEdgeRef.current = selfNearEdge;

  const handlePointerUp = useCallback((e?: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e && e.pointerId !== drag.pointerId) return;
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
        // Near-origin release: cancel the existing fix, or — if there is
        // none — do nothing, so a bare tap on a fish doesn't create a
        // zero-length fix (easy to do accidentally on touch).
        if (nearOrigin) {
          if (existingFix && onDeleteFix) onDeleteFix(existingFix._id);
        } else {
          onFix(drag.target.userId as Id<"users">, p.x, p.y);
        }
      }
    }
    setFixTarget(null);
    setFixPos(null);
    setHoveredUserId(null);
  }, [onPlace, onFix, onDeleteFix, fixes, broadcastLive]);

  // Abort the drag without committing anything. iOS fires pointercancel for
  // system gestures mid-drag; committing there would place fixes at random
  // spots, so we revert instead.
  const handlePointerCancel = useCallback((e?: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e && e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (drag.type === "self") {
      setDraggingSelf(false);
      setSelfNearEdge(false);
      const mp = myPlacementRef.current;
      if (mp) setPos(mp);
      broadcastLive(null);
    }
    setFixTarget(null);
    setFixPos(null);
    setHoveredUserId(null);
  }, [broadcastLive]);

  // Leave only clears hover state (mouse case). iOS Safari fires spurious
  // pointerleave mid-drag even with pointer capture, so never touch an
  // active drag here — up/cancel handle real endings.
  const handlePointerLeave = useCallback(() => {
    if (dragRef.current) return;
    setHoveredQuadrant(null);
    setHoveredTriValues(null);
    setHoveredUserId(null);
  }, []);

  const myDot = (() => {
    if (isTriangle) {
      return toPos3D([pos.x, pos.y, -pos.x - pos.y]);
    }
    if (use3D) {
      const vals = myValues ? [...myValues] : Array(3).fill(0);
      vals[activePair[0]] = pos.x;
      vals[activePair[1]] = pos.y;
      return toPos3D(vals);
    }
    return toPos(pos, quadrantMode);
  })();
  const activeFixTargetId = fixTarget?.userId ?? null;

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
    hoveredTriValues,
    activeFixTargetId,
    draggingSelf,
    dragRef,
    handlePointerDown,
    handleTap,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handlePointerLeave,
    fixNearOrigin,
    selfNearEdge,
  };
}

export type ChartPlacementState = ReturnType<typeof useChartPlacement>;
