"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { formatTimeLeft } from "@/components/Chart/ChartProvider";
import { twMerge } from "tailwind-merge";
import { getUserName } from "@/components/utils";

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

const defaultSettings = {
  name: "",
  isPrivate: false,
  durationHours: 24,
  xLeft: "",
  xRight: "",
  yTop: "",
  yBottom: "",
};

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
  const [settings, setSettings] = useState(defaultSettings);
  const set = <K extends keyof typeof defaultSettings>(
    k: K,
    v: (typeof defaultSettings)[K],
  ) => setSettings((s) => ({ ...s, [k]: v }));
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
  const hasX = settings.xLeft.trim() || settings.xRight.trim();
  const hasY = settings.yTop.trim() || settings.yBottom.trim();
  const canCreate = hasX && hasY;

  const handleCreate = async () => {
    if (!canCreate) return;
    const id = await createComparison({
      name: settings.name.trim() || undefined,
      private: settings.isPrivate || undefined,
      durationHours: settings.durationHours,
      xLabelLeft: settings.xLeft.trim() || undefined,
      xLabelRight: settings.xRight.trim() || undefined,
      yLabelTop: settings.yTop.trim() || undefined,
      yLabelBottom: settings.yBottom.trim() || undefined,
    });
    router.push(`/compare/${id}`);
    setSettings(defaultSettings);
    setCreating(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full flex gap-1">
      <p>Current plot:</p>
      <p
        onClick={() => setOpen(!open)}
        className={twMerge(
          "flex gap-2 text-left cursor-pointer select-none text-[var(--highlight)] hover:bg-[var(--highlight)] hover:text-black truncate",
        )}
      >
        <span className="truncate flex flex-1">
          {selected ? (
            <>
              <u>
                {formatLabel(selected)} by{" "}
                {getUserName({
                  id: selected.creatorId ?? "unknown",
                  name: selected.creatorName,
                })}
              </u>
            </>
          ) : (
            "Select a comparison"
          )}
        </span>
        <span className="flex items-center gap-2">
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </p>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bg-[var(--background)] border border-[1.5px] shadow-lg border-[var(--foreground)]! select-none left-0 right-0 top-full z-[2] mt-1 overflow-hidden rounded-lg max-w-md"
          >
            <div className="max-h-64 overflow-y-auto">
              <p
                onClick={() => {
                  setCreating(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left border-b-[var(--foreground)] border-b-1 hover:bg-[var(--foreground)] hover:text-black cursor-pointer"
              >
                + New plot
              </p>
              {comparisons?.map((c) => (
                <p
                  key={c._id}
                  onClick={() => {
                    router.push(`/compare/${c._id}`);
                    setOpen(false);
                    setCreating(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-[var(--foreground)] hover:text-black ${
                    c._id === selectedId
                      ? "opacity-50 bg-[#101912] pointer-events-none"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {c.private && (
                      <svg
                        className="h-3 w-3 shrink-0"
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
                    {formatLabel(c)}
                    <span className="opacity-50">
                      {c.creatorName ?? c.creatorId}
                    </span>
                  </span>
                  <span className="ml-2 flex items-center gap-2">
                    {c.expiresAt && (
                      <span
                        className={
                          c.expiresAt <= Date.now()
                            ? "opacity-50"
                            : "text-amber-500"
                        }
                      >
                        {formatTimeLeft(c.expiresAt ?? undefined)}
                      </span>
                    )}
                  </span>
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[1] flex items-center justify-center bg-[var(--background)]/60"
            onClick={() => setCreating(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex w-full max-w-2xl gap-5 rounded-xl border border-[var(--foreground)] bg-[var(--background)] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-1 flex-col gap-3">
                <h2 className="font-semibold">New comparison</h2>
                <input
                  value={settings.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Name (optional)"
                  autoFocus
                  className="h-9 rounded-lg border border-zinc-200 bg-transparent px-3 placeholder:text-zinc-400 dark:border-zinc-700"
                />
                <div className="flex gap-2">
                  <input
                    value={settings.xLeft}
                    onChange={(e) => set("xLeft", e.target.value)}
                    placeholder="← left"
                    className="h-9 flex-1 rounded-lg border border-zinc-200 bg-transparent px-3 placeholder:text-zinc-400 dark:border-zinc-700"
                  />
                  <input
                    value={settings.xRight}
                    onChange={(e) => set("xRight", e.target.value)}
                    placeholder="right →"
                    className="h-9 flex-1 rounded-lg border border-zinc-200 bg-transparent px-3 placeholder:text-zinc-400 dark:border-zinc-700"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    value={settings.yTop}
                    onChange={(e) => set("yTop", e.target.value)}
                    placeholder="↑ top"
                    className="h-9 flex-1 rounded-lg border border-zinc-200 bg-transparent px-3 placeholder:text-zinc-400 dark:border-zinc-700"
                  />
                  <input
                    value={settings.yBottom}
                    onChange={(e) => set("yBottom", e.target.value)}
                    placeholder="bottom ↓"
                    className="h-9 flex-1 rounded-lg border border-zinc-200 bg-transparent px-3 placeholder:text-zinc-400 dark:border-zinc-700"
                  />
                </div>
                <label className="flex items-center gap-2 text-zinc-500">
                  <input
                    type="checkbox"
                    checked={settings.isPrivate}
                    onChange={(e) => set("isPrivate", e.target.checked)}
                    className="rounded"
                  />
                  Private (only visible to you)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Locks in</span>
                  <select
                    value={settings.durationHours}
                    onChange={(e) =>
                      set("durationHours", Number(e.target.value))
                    }
                    className="h-8 rounded-lg border border-zinc-200 bg-transparent px-2 dark:border-zinc-700"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>1 day</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => void handleCreate()}
                    disabled={!canCreate}
                    className="h-9 flex-1 rounded-lg bg-zinc-900 font-medium text-white hover:bg-zinc-700 disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="h-9 rounded-lg border border-zinc-200 px-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="hidden sm:flex w-52 shrink-0 items-center">
                <div className="relative w-full aspect-square">
                  <div className="absolute left-1/2 top-[6%] bottom-[6%] w-[1.5px] bg-[var(--foreground)]" />
                  <div className="absolute top-1/2 left-[6%] right-[6%] h-[1.5px] bg-[var(--foreground)]" />
                  {settings.yTop.trim() && (
                    <span className="absolute top-[1%] left-1/2 -translate-x-1/2 text-center text-xs bg-[var(--background)] px-1 whitespace-nowrap">
                      {settings.yTop.trim()}
                    </span>
                  )}
                  {settings.yBottom.trim() && (
                    <span className="absolute bottom-[1%] left-1/2 -translate-x-1/2 text-center text-xs bg-[var(--background)] px-1 whitespace-nowrap">
                      {settings.yBottom.trim()}
                    </span>
                  )}
                  {settings.xRight.trim() && (
                    <span className="absolute right-[1%] top-1/2 -translate-y-1/2 text-right text-xs bg-[var(--background)] px-1 whitespace-nowrap">
                      {settings.xRight.trim()}
                    </span>
                  )}
                  {settings.xLeft.trim() && (
                    <span className="absolute left-[1%] top-1/2 -translate-y-1/2 text-left text-xs bg-[var(--background)] px-1 whitespace-nowrap">
                      {settings.xLeft.trim()}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
