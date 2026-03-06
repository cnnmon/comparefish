"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

function formatTimeLeft(expiresAt: number | undefined) {
  if (!expiresAt) return null;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Locked";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
  if (hours > 0) return `${hours}h left`;
  return `${mins}m left`;
}

function formatLabel(p: {
  name?: string;
  xLabelLeft?: string;
  xLabelRight?: string;
  yLabelTop?: string;
  yLabelBottom?: string;
}) {
  if (p.name) return p.name;
  const x = [p.xLabelLeft, p.xLabelRight].filter(Boolean).join(" ↔ ");
  const y = [p.yLabelTop, p.yLabelBottom].filter(Boolean).join(" ↕ ");
  return `${y} × ${x}`;
}

export function ComparisonPicker({
  selectedId,
}: {
  selectedId: Id<"comparisons"> | null;
}) {
  const router = useRouter();
  const comparisons = useQuery(api.comparisons.list);
  const createComparison = useMutation(api.comparisons.create);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [durationHours, setDurationHours] = useState(24);
  const [xLeft, setXLeft] = useState("");
  const [xRight, setXRight] = useState("");
  const [yTop, setYTop] = useState("");
  const [yBottom, setYBottom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = comparisons?.find((c) => c._id === selectedId);
  const hasX = xLeft.trim() || xRight.trim();
  const hasY = yTop.trim() || yBottom.trim();
  const canCreate = hasX && hasY;

  const handleCreate = async () => {
    if (!canCreate) return;
    const id = await createComparison({
      name: name.trim() || undefined,
      private: isPrivate || undefined,
      durationHours,
      xLabelLeft: xLeft.trim() || undefined,
      xLabelRight: xRight.trim() || undefined,
      yLabelTop: yTop.trim() || undefined,
      yLabelBottom: yBottom.trim() || undefined,
    });
    router.push(`/c/${id}`);
    setName("");
    setIsPrivate(false);
    setDurationHours(24);
    setXLeft("");
    setXRight("");
    setYTop("");
    setYBottom("");
    setCreating(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <span className="truncate">
          {selected ? formatLabel(selected) : "Select a comparison"}
        </span>
        <div className="flex items-center gap-2">
          {selected && (
            <span className="text-xs tabular-nums text-zinc-400">
              {selected.placementCount}
            </span>
          )}
          <svg
            className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="max-h-64 overflow-y-auto">
            {comparisons?.map((c) => (
              <button
                key={c._id}
                onClick={() => {
                  router.push(`/c/${c._id}`);
                  setOpen(false);
                  setCreating(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  c._id === selectedId
                    ? "bg-zinc-50 font-medium dark:bg-zinc-800"
                    : ""
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  {c.private && (
                    <svg className="h-3 w-3 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                  {formatLabel(c)}
                </span>
                <span className="ml-2 flex items-center gap-2 text-xs tabular-nums text-zinc-400">
                  {c.expiresAt && (
                    <span className={c.expiresAt <= Date.now() ? "text-zinc-500 font-medium" : "text-amber-500"}>
                      {formatTimeLeft(c.expiresAt)}
                    </span>
                  )}
                  {c.placementCount}
                </span>
              </button>
            ))}
          </div>

          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 border-t border-zinc-200 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <span className="text-zinc-400">+</span>
              New comparison
            </button>
          ) : (
            <div className="flex flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-700">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                autoFocus
                className="h-8 rounded border border-zinc-200 bg-transparent px-2 text-xs placeholder:text-zinc-400 dark:border-zinc-700"
              />
              <div className="flex gap-2">
                <input
                  value={xLeft}
                  onChange={(e) => setXLeft(e.target.value)}
                  placeholder="← left"
                  className="h-8 flex-1 rounded border border-zinc-200 bg-transparent px-2 text-xs placeholder:text-zinc-400 dark:border-zinc-700"
                />
                <input
                  value={xRight}
                  onChange={(e) => setXRight(e.target.value)}
                  placeholder="right →"
                  className="h-8 flex-1 rounded border border-zinc-200 bg-transparent px-2 text-xs placeholder:text-zinc-400 dark:border-zinc-700"
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={yTop}
                  onChange={(e) => setYTop(e.target.value)}
                  placeholder="↑ top"
                  className="h-8 flex-1 rounded border border-zinc-200 bg-transparent px-2 text-xs placeholder:text-zinc-400 dark:border-zinc-700"
                />
                <input
                  value={yBottom}
                  onChange={(e) => setYBottom(e.target.value)}
                  placeholder="bottom ↓"
                  className="h-8 flex-1 rounded border border-zinc-200 bg-transparent px-2 text-xs placeholder:text-zinc-400 dark:border-zinc-700"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded"
                />
                Private (only visible to you)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Locks in</span>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="h-7 rounded border border-zinc-200 bg-transparent px-1.5 text-xs dark:border-zinc-700"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>1 day</option>
                  <option value={72}>3 days</option>
                  <option value={168}>1 week</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleCreate()}
                  disabled={!canCreate}
                  className="h-8 flex-1 rounded bg-zinc-900 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Create
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="h-8 rounded border border-zinc-200 px-3 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
