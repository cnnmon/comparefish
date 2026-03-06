"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Chart } from "../../Chart";
import { ComparisonPicker } from "../../ComparisonPicker";
import { Shell, SignIn } from "../../Shell";
import { ResultsChart } from "../../ResultsChart";

function useCountdown(expiresAt: number | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt || Date.now() >= expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const diff = expiresAt - now;
  if (diff <= 0) return "Locked";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m ${s}s remaining`;
}

function ComparisonView({
  comparisonId,
  onDeleted,
}: {
  comparisonId: Id<"comparisons">;
  onDeleted: () => void;
}) {
  const comparison = useQuery(api.comparisons.get, { id: comparisonId });
  const validId = comparison?._id ?? null;
  const locked = comparison?.locked ?? false;
  const mine = useQuery(api.placements.getMine, validId ? { comparisonId: validId } : "skip");
  const all = useQuery(api.placements.getAll, validId && !locked ? { comparisonId: validId } : "skip");
  const allFixes = useQuery(api.fixes.getAll, validId && !locked ? { comparisonId: validId } : "skip");
  const results = useQuery(api.placements.getResults, validId && locked ? { comparisonId: validId } : "skip");
  const submitPlacement = useMutation(api.placements.submit);
  const submitFix = useMutation(api.fixes.submit);
  const deleteFix = useMutation(api.fixes.remove);
  const deleteComparison = useMutation(api.comparisons.remove);
  const togglePrivate = useMutation(api.comparisons.togglePrivate);
  const user = useQuery(api.users.currentUser);
  const countdown = useCountdown(comparison?.expiresAt);

  if (!comparison) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      {countdown && (
        <p className={`text-center text-sm font-medium ${locked ? "text-zinc-500" : "text-amber-600"}`}>
          {countdown}
        </p>
      )}

      {locked ? (
        <ResultsChart
          xLabelLeft={comparison.xLabelLeft}
          xLabelRight={comparison.xLabelRight}
          yLabelTop={comparison.yLabelTop}
          yLabelBottom={comparison.yLabelBottom}
          results={results ?? []}
        />
      ) : (
        <>
          <Chart
            xLabelLeft={comparison.xLabelLeft}
            xLabelRight={comparison.xLabelRight}
            yLabelTop={comparison.yLabelTop}
            yLabelBottom={comparison.yLabelBottom}
            myPlacement={mine ? { x: mine.x, y: mine.y } : null}
            myImage={user?.image ?? null}
            myName={user?.name ?? "Me"}
            allPlacements={all ?? []}
            fixes={allFixes ?? []}
            onPlace={async (x, y) => {
              await submitPlacement({ comparisonId, x, y });
            }}
            onFix={async (targetUserId, x, y) => {
              await submitFix({ targetUserId, comparisonId, x, y });
            }}
            onDeleteFix={async (fixId) => {
              await deleteFix({ fixId });
            }}
          />

          {(all?.length ?? 0) > 0 && (
            <p className="text-center text-sm text-zinc-500">
              {all!.length} {all!.length === 1 ? "person" : "people"} placed
            </p>
          )}
        </>
      )}

      {comparison.isMine && (
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={async () => {
              if (!confirm("Delete this comparison and all its data?")) return;
              await deleteComparison({ id: comparisonId });
              onDeleted();
            }}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            Delete comparison
          </button>
          <button
            onClick={() => void togglePrivate({ id: comparisonId })}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {comparison.private ? "Make public" : "Make private"}
          </button>
        </div>
      )}
    </div>
  );
}

function ComparisonPage({ comparisonId }: { comparisonId: Id<"comparisons"> }) {
  const router = useRouter();

  return (
    <Shell>
      <ComparisonPicker selectedId={comparisonId} />
      <ComparisonView comparisonId={comparisonId} onDeleted={() => router.push("/")} />
    </Shell>
  );
}

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <SignIn />;

  return <ComparisonPage comparisonId={id as Id<"comparisons">} />;
}
