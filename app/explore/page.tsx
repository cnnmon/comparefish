"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { formatTimeLeft } from "@/components/Chart/ChartProvider";
import { formatLabel, getUserName } from "@/components/utils";
import { twMerge } from "tailwind-merge";
import { toPos, toPos3D, resolveImage, getQuadrantMode, getDimensions, type AxisLabels } from "@/components/Chart/utils";
import { Avatar, Axes, TriangleAxes } from "@/components/Chart/Avatar";
import Shell from "@/components/Shell";
import { Dropdown } from "@/components/Dropdown";
import FeatheredScroll from "@/components/FeatheredScroll";
import { CreatePlotModal } from "../ComparisonPicker";
import { useLoginModal } from "@/components/LoginModal";

function PlotPreview({ comparisonId, labels, dimCount = 2, shape }: {
  comparisonId: Id<"comparisons">;
  labels?: AxisLabels;
  dimCount?: number;
  shape?: string;
}) {
  const placements = useQuery(api.placements.getAll, { comparisonId });
  const qm = labels ? getQuadrantMode(labels) : null;
  const isTriangle = shape === "triangle" && dimCount === 3;
  const is3D = dimCount === 3 && !isTriangle;

  return (
    <div
      className="relative w-full aspect-square rounded-lg overflow-hidden"
      style={{ containerType: "inline-size" }}
    >
      {isTriangle ? <TriangleAxes /> : <Axes quadrantMode={qm} dimCount={dimCount} />}
      {placements?.map((p) => {
        const pos = (is3D || isTriangle) && p.values
          ? toPos3D(p.values)
          : toPos(p, qm);
        return (
          <Avatar
            key={p._id}
            pos={pos}
            size={18}
            image={resolveImage({ name: p.name, avatar: p.avatar })}
            name={p.name}
          />
        );
      })}
    </div>
  );
}

type SortKey = "newest" | "oldest" | "fish" | "ongoing";
type Sortable = { _creationTime: number; placementCount?: number; expiresAt?: number };

const sorters: Record<SortKey, (a: Sortable, b: Sortable) => number> = {
  newest: (a, b) => b._creationTime - a._creationTime,
  oldest: (a, b) => a._creationTime - b._creationTime,
  fish: (a, b) => (b.placementCount ?? 0) - (a.placementCount ?? 0),
  // "ongoing" filters instead of ordering; falls back to newest
  ongoing: (a, b) => b._creationTime - a._creationTime,
};

const isOngoing = (c: Sortable) => !c.expiresAt || c.expiresAt > Date.now();

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const comparisons = useQuery(api.comparisons.list);
  const user = useQuery(api.users.currentUser);
  const [creating, setCreating] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const { requireAuth } = useLoginModal();
  const myPlots = comparisons
    ?.filter((c) => user && c.creatorId === user._id)
    .filter((c) => sort !== "ongoing" || isOngoing(c))
    .sort(sorters[sort]);
  const publicPlots = comparisons
    ?.filter((c) => !c.private)
    .filter((c) => sort !== "ongoing" || isOngoing(c))
    .sort(sorters[sort]);
  const hasMyPlots = isAuthenticated && !!myPlots?.length;
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (scrolledRef.current || !comparisons) return;
    const id = sessionStorage.getItem("explore-scroll-to");
    if (!id) return;
    sessionStorage.removeItem("explore-scroll-to");
    scrolledRef.current = true;
    requestAnimationFrame(() => {
      document.getElementById(`plot-${id}`)?.scrollIntoView({ behavior: "instant", block: "center" });
    });
  }, [comparisons]);
  return (
    <Shell comparisonId={null} ready={comparisons !== undefined}>
      <CreatePlotModal open={creating} onClose={() => setCreating(false)} />
      <FeatheredScroll
        direction="vertical"
        className="flex-col w-full overflow-y-auto pb-10"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl!">{hasMyPlots ? "Your plots" : "Public plots"}</h2>
          <div className="flex items-center gap-2">
            <Dropdown
              className="h-10"
              value={sort}
              onChange={setSort}
              options={[
                { value: "newest", label: "Newest" },
                { value: "fish", label: "Most fish" },
                { value: "ongoing", label: "Ongoing" },
              ]}
            />
            <button onClick={() => requireAuth() && setCreating(true)} className="h-10">+ New plot</button>
          </div>
        </div>
        {hasMyPlots && (
          <FeatheredScroll direction="horizontal" className="gap-3">
            {myPlots.map((c) => {
              const isLocked = c.expiresAt ? c.expiresAt <= Date.now() : false;
              return (
                <motion.div
                  id={`plot-${c._id}`}
                  key={c._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => router.push(`/compare/${c._id}`)}
                  className="flex flex-col rounded-lg border border-[var(--foreground)] cursor-pointer hover:bg-[var(--foreground)]/5 transition-colors overflow-hidden shrink-0 w-40"
                >
                  <PlotPreview comparisonId={c._id} labels={c} dimCount={getDimensions(c).length} shape={c.shape} />
                  <div className="px-2 py-1.5 flex items-center gap-1">
                    {c.private && (
                      <svg
                        className="h-3 w-3 shrink-0 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    {isLocked && (
                      <svg
                        className="h-3 w-3 shrink-0 opacity-50"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/>
                      </svg>
                    )}
                    <span className="truncate text-sm font-medium">
                      {formatLabel(c)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </FeatheredScroll>
        )}

        {hasMyPlots && <h2 className="text-3xl! mb-2 mt-4">Public plots</h2>}

        {publicPlots === undefined ? (
          <p className="opacity-50">Loading...</p>
        ) : publicPlots.length === 0 ? (
          <p className="opacity-50">No public plots yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {publicPlots.map((c) => {
              const isExpired = c.expiresAt ? c.expiresAt <= Date.now() : false;
              return (
                <motion.div
                  id={`plot-${c._id}`}
                  key={c._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => router.push(`/compare/${c._id}`)}
                  className="flex flex-col rounded-lg border border-[var(--foreground)] cursor-pointer hover:bg-[var(--foreground)]/5 transition-colors overflow-hidden"
                >
                  <PlotPreview comparisonId={c._id} labels={c} dimCount={getDimensions(c).length} shape={c.shape} />
                  <div className="px-3 py-2 flex flex-col gap-0.5">
                    <span className="truncate font-medium">
                      {formatLabel(c)}
                    </span>
                    <span className="flex flex-col justify-between text-sm opacity-60">
                      <span>
                        {getUserName({
                          id: c.creatorId ?? "unknown",
                          name: c.creatorName,
                        })}
                        {" · "}
                        {c.placementCount} fish
                      </span>
                      {c.expiresAt && (
                        <span
                          className={twMerge(
                            "flex items-center gap-1",
                            isExpired
                              ? "opacity-50"
                              : "text-amber-500 opacity-100"
                          )}
                        >
                          {isExpired && (
                            <svg
                              className="h-3 w-3 shrink-0"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/>
                            </svg>
                          )}
                          {formatTimeLeft(c.expiresAt)}
                        </span>
                      )}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </FeatheredScroll>
    </Shell>
  );
}
