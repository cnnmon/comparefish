"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import type { Point, PlacedPoint, Fix } from "./utils";
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
  showAllFixes: boolean;
  toggleShowAllFixes: () => void;
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

  const submitPlacement = useMutation(api.placements.submit);
  const submitFix = useMutation(api.fixes.submit);
  const deleteFix = useMutation(api.fixes.remove);

  const onPlace = useCallback(
    (x: number, y: number) => void submitPlacement({ comparisonId, x, y }),
    [submitPlacement, comparisonId],
  );
  const onFix = useCallback(
    (targetUserId: Id<"users">, x: number, y: number) =>
      void submitFix({ targetUserId, comparisonId, x, y }),
    [submitFix, comparisonId],
  );
  const onDeleteFix = useCallback(
    (fixId: Id<"fixes">) => void deleteFix({ fixId }),
    [deleteFix],
  );

  const myPlacement: Point | null = mine ? { x: mine.x, y: mine.y } : null;
  const resolvedPlacements = allPlacements ?? [];
  const resolvedFixes = fixes ?? [];

  const placement = useChartPlacement({
    myPlacement,
    allPlacements: resolvedPlacements,
    fixes: resolvedFixes,
    onPlace,
    onFix,
    onDeleteFix,
  });

  const value: ChartContextValue = {
    labels: {
      xLabelLeft: comparison?.xLabelLeft,
      xLabelRight: comparison?.xLabelRight,
      yLabelTop: comparison?.yLabelTop,
      yLabelBottom: comparison?.yLabelBottom,
    },
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
    showAllFixes,
    toggleShowAllFixes,
    ...placement,
  };

  return (
    <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
  );
}
