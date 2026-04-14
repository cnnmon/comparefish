"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useLoginModal } from "../LoginModal";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  getQuadrantMode, getDimensions, getDimensionPairs, projectPoint, toPos3D,
  type Point, type PlacedPoint, type Fix, type QuadrantMode, type Dimension,
} from "./utils";
import {
  useChartPlacement,
  type ChartPlacementState,
} from "./useChartPlacement";

export function formatTimeLeft(expiresAt: number | undefined) {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  if (diff <= 0) {
    if (hours >= 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `ended ${mins}m ago`;
  }
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
  if (hours > 0) return `${hours}h left`;
  return `${mins}m left`;
}

type ChartContextValue = {
  labels: {
    xLabelLeft?: string;
    xLabelRight?: string;
    yLabelTop?: string;
    yLabelBottom?: string;
  };
  quadrantMode: QuadrantMode | null;
  countdown: string | null;
  locked: boolean;
  myPlacement: Point | null;
  myImage: string | null;
  myAvatar: string | null;
  myName: string;
  allPlacements: PlacedPoint[];
  fixes: Fix[];
  onPlace: (x: number, y: number) => void;
  onFix: (targetUserId: Id<"users">, x: number, y: number) => void;
  onDeleteFix: (fixId: Id<"fixes">) => void;
  onDeletePlacement: () => void;
  showAllFixes: boolean;
  toggleShowAllFixes: () => void;
  dimensions: Dimension[];
  dimCount: number;
  dimensionPairs: [number, number][];
  activePair: [number, number];
  viewIndex: number;
  setViewIndex: (i: number) => void;
  totalViews: number;
  flat: boolean;
  comparisonId: Id<"comparisons">;
  rawMine: { x: number; y: number; values?: number[] } | null;
  placePair: (args: { x: number; y: number; dimX: number; dimY: number }) => void;
  fixPair: (args: { targetUserId: Id<"users">; x: number; y: number; dimX: number; dimY: number }) => void;
  authGate: (() => boolean) | undefined;
  liveValues: number[] | null;
  setLiveValues: (v: number[] | null) => void;
} & ChartPlacementState;

const ChartContext = createContext<ChartContextValue | null>(null);

export function useChart() {
  return useContext(ChartContext);
}

export function ChartProvider({
  comparisonId,
  children,
}: {
  comparisonId: Id<"comparisons">;
  children: ReactNode;
}) {
  const comparison = useQuery(api.comparisons.get, { id: comparisonId });
  const locked = comparison?.locked ?? false;
  const countdown = formatTimeLeft(comparison?.expiresAt ?? undefined);
  const mine = useQuery(api.placements.getMine, { comparisonId });
  const allPlacements = useQuery(api.placements.getAll, { comparisonId });
  const [showAllFixes, setShowAllFixes] = useState(true);
  const toggleShowAllFixes = useCallback(() => setShowAllFixes((v) => !v), []);
  const fixes = useQuery(api.fixes.getAll, { comparisonId, showAll: showAllFixes });
  const user = useQuery(api.users.currentUser);
  const { isAuthenticated } = useConvexAuth();
  const { requireAuth } = useLoginModal();

  const submitPlacement = useMutation(api.placements.submit);
  const submitFix = useMutation(api.fixes.submit);
  const deleteFix = useMutation(api.fixes.remove);
  const deletePlacement = useMutation(api.placements.deleteMine);

  const dims = comparison ? getDimensions(comparison) : [];
  const dimPairs = getDimensionPairs(dims.length);
  const dimCount = dims.length;
  const is3D = dimCount === 3;
  const totalViews = is3D ? 1 + dimPairs.length : Math.max(dimPairs.length, 1);
  const [viewIndex, setViewIndex] = useState(0);
  const flat = is3D ? viewIndex > 0 : true;
  const activePairIndex = is3D ? Math.max(0, viewIndex - 1) : viewIndex;
  const activePair = dimPairs[activePairIndex] ?? [0, 1];
  const [dimX, dimY] = activePair;

  const onPlace = useCallback(
    (x: number, y: number) =>
      void submitPlacement({ comparisonId, x, y, dimX, dimY }),
    [submitPlacement, comparisonId, dimX, dimY],
  );
  const onFix = useCallback(
    (targetUserId: Id<"users">, x: number, y: number) =>
      void submitFix({ targetUserId, comparisonId, x, y, dimX, dimY }),
    [submitFix, comparisonId, dimX, dimY],
  );
  const onDeleteFix = useCallback(
    (fixId: Id<"fixes">) => void deleteFix({ fixId }),
    [deleteFix],
  );
  const onDeletePlacement = useCallback(
    () => void deletePlacement({ comparisonId }),
    [deletePlacement, comparisonId],
  );

  const placePair = useCallback(
    ({ x, y, dimX: dx, dimY: dy }: { x: number; y: number; dimX: number; dimY: number }) =>
      void submitPlacement({ comparisonId, x, y, dimX: dx, dimY: dy }),
    [submitPlacement, comparisonId],
  );
  const fixPair = useCallback(
    ({ targetUserId, x, y, dimX: dx, dimY: dy }: { targetUserId: Id<"users">; x: number; y: number; dimX: number; dimY: number }) =>
      void submitFix({ targetUserId, comparisonId, x, y, dimX: dx, dimY: dy }),
    [submitFix, comparisonId],
  );
  const rawMine = mine ? { x: mine.x, y: mine.y, values: mine.values } : null;
  const authGate = isAuthenticated ? undefined : requireAuth;
  const [liveValues, setLiveValues] = useState<number[] | null>(null);

  // Derive labels from the active dimension pair
  const xDim = dims[dimX];
  const yDim = dims[dimY];
  const labels = {
    xLabelLeft: xDim?.negLabel || comparison?.xLabelLeft,
    xLabelRight: xDim?.posLabel || comparison?.xLabelRight,
    yLabelTop: yDim?.posLabel || comparison?.yLabelTop,
    yLabelBottom: yDim?.negLabel || comparison?.yLabelBottom,
  };
  const quadrantMode = getQuadrantMode(labels);

  const fixedDimIdx = dimCount === 3
    ? [0, 1, 2].find((i) => i !== dimX && i !== dimY) ?? 2
    : -1;

  // Project placements and fixes to the active dimension pair
  const myPlacement: Point | null = mine
    ? projectPoint(mine.values, mine.x, mine.y, dimX, dimY)
    : null;
  const myValues: number[] | null = mine
    ? (mine.values ?? [mine.x, mine.y])
    : null;

  const resolvedPlacements: PlacedPoint[] = (allPlacements ?? []).map((p) => {
    const proj = projectPoint(p.values, p.x, p.y, dimX, dimY);
    return { ...p, x: proj.x, y: proj.y };
  });

  const resolvedFixes: Fix[] = (fixes ?? []).map((f) => {
    const proj = projectPoint(f.values, f.x, f.y, dimX, dimY);
    return { ...f, x: proj.x, y: proj.y };
  });

  const placement = useChartPlacement({
    myPlacement,
    myValues,
    allPlacements: resolvedPlacements,
    fixes: resolvedFixes,
    onPlace,
    onFix,
    onDeleteFix,
    onDeletePlacement,
    quadrantMode,
    requireAuth: isAuthenticated ? undefined : requireAuth,
    dimCount,
    activePair,
    fixedDimIdx,
    flat,
    onLiveUpdate: setLiveValues,
  });

  const value: ChartContextValue = {
    labels,
    quadrantMode,
    countdown,
    locked,
    myPlacement,
    myImage: user?.image ?? null,
    myAvatar: user?.avatar ?? null,
    myName: user?.name ?? "Me",
    allPlacements: resolvedPlacements,
    fixes: resolvedFixes,
    onPlace,
    onFix,
    onDeleteFix,
    onDeletePlacement,
    showAllFixes,
    toggleShowAllFixes,
    dimensions: dims,
    dimCount,
    dimensionPairs: dimPairs,
    activePair,
    viewIndex,
    setViewIndex,
    totalViews,
    flat,
    comparisonId,
    rawMine,
    placePair,
    fixPair,
    authGate,
    liveValues,
    setLiveValues,
    ...placement,
  };

  return (
    <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
  );
}
