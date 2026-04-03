"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { formatTimeLeft } from "@/components/Chart/ChartProvider";
import { formatLabel, getUserName } from "@/components/utils";
import { toPos, resolveImage, getQuadrantMode, type AxisLabels } from "@/components/Chart/utils";
import { Avatar, Axes } from "@/components/Chart/Avatar";
import Shell from "@/components/Shell";
import FeatheredScroll from "@/components/FeatheredScroll";
import { CreatePlotModal } from "../ComparisonPicker";
import { useLoginModal } from "@/components/LoginModal";

function PlotPreview({ comparisonId, labels }: { comparisonId: Id<"comparisons">; labels?: AxisLabels }) {
  const placements = useQuery(api.placements.getAll, { comparisonId });
  const qm = labels ? getQuadrantMode(labels) : null;

  return (
    <div
      className="relative w-full aspect-square rounded-lg overflow-hidden"
      style={{ containerType: "inline-size" }}
    >
      <Axes quadrantMode={qm} />
      {placements?.map((p) => {
        const pos = toPos(p, qm);
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

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const comparisons = useQuery(api.comparisons.list);
  const user = useQuery(api.users.currentUser);
  const [creating, setCreating] = useState(false);
  const { requireAuth } = useLoginModal();
  const myPlots = comparisons?.filter((c) => user && c.creatorId === user._id);
  const publicPlots = comparisons?.filter((c) => !c.private);

  return (
    <Shell comparisonId={null}>
      <CreatePlotModal open={creating} onClose={() => setCreating(false)} />
      <FeatheredScroll
        direction="vertical"
        className="flex-col! w-full gap-6 overflow-y-auto py-8"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg">{isAuthenticated ? "Your plots" : "Public plots"}</h2>
          <button onClick={() => requireAuth() && setCreating(true)}>+ New plot</button>
        </div>
        {isAuthenticated && (
          <div>
            {myPlots === undefined ? (
              <p className="opacity-50">Loading...</p>
            ) : myPlots.length === 0 ? (
              <p className="opacity-50">No plots yet.</p>
            ) : (
              <FeatheredScroll direction="horizontal" className="gap-3">
                {myPlots.map((c) => (
                  <motion.div
                    key={c._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => router.push(`/compare/${c._id}`)}
                    className="flex flex-col rounded-lg border border-[var(--foreground)] cursor-pointer hover:bg-[var(--foreground)]/5 transition-colors overflow-hidden shrink-0 w-40"
                  >
                    <PlotPreview comparisonId={c._id} labels={c} />
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
                      <span className="truncate text-sm font-medium">
                        {formatLabel(c)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </FeatheredScroll>
            )}
          </div>
        )}

        {!isAuthenticated ? null : <h2 className="text-lg mb-2">Public plots</h2>}

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
                  key={c._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => router.push(`/compare/${c._id}`)}
                  className="flex flex-col rounded-lg border border-[var(--foreground)] cursor-pointer hover:bg-[var(--foreground)]/5 transition-colors overflow-hidden"
                >
                  <PlotPreview comparisonId={c._id} labels={c} />
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
                          className={
                            isExpired
                              ? "opacity-50"
                              : "text-amber-500 opacity-100"
                          }
                        >
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
