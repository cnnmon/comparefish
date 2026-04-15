"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { formatTimeLeft } from "@/components/Chart/ChartProvider";
import { twMerge } from "tailwind-merge";
import { getUserName, formatLabel } from "@/components/utils";

export type Dimension = { negLabel: string; posLabel: string; negDescription: string; posDescription: string };

const MAX_DIMS = 3;

export const emptyDim = (): Dimension => ({ negLabel: "", posLabel: "", negDescription: "", posDescription: "" });

export function DimensionEditor({
  dimensions,
  onChange,
  allowAddRemove = true,
}: {
  dimensions: Dimension[];
  onChange: (dims: Dimension[]) => void;
  allowAddRemove?: boolean;
}) {
  const setDim = (i: number, field: keyof Dimension, val: string) => {
    const dims = [...dimensions];
    dims[i] = { ...dims[i], [field]: val };
    onChange(dims);
  };
  const addDim = () => onChange([...dimensions, emptyDim()]);
  const removeDim = (i: number) => onChange(dimensions.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-3">
      {dimensions.map((dim, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="opacity-40 w-4 shrink-0">{i === 0 ? "x" : i === 1 ? "y" : "z"[0]}</span>
            <input
              value={dim.negLabel}
              onChange={(e) => setDim(i, "negLabel", e.target.value)}
              placeholder={`← ${i === 0 ? "left" : i === 1 ? "bottom" : "neg"}`}
              className="h-9 flex-1 min-w-0 rounded-lg border bg-transparent px-3 placeholder:text-zinc-400 dark:border-zinc-700"
            />
            <span className="opacity-30">↔</span>
            <input
              value={dim.posLabel}
              onChange={(e) => setDim(i, "posLabel", e.target.value)}
              placeholder={`${i === 0 ? "right" : i === 1 ? "top" : "pos"} →`}
              className="h-9 flex-1 min-w-0 rounded-lg border bg-transparent px-3 placeholder:text-zinc-400 dark:border-zinc-700"
            />
            {allowAddRemove && dimensions.length > 1 && (
              <button
                type="button"
                onClick={() => removeDim(i)}
                className="opacity-30 hover:opacity-100 shrink-0 h-9 w-9 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 shrink-0" />
            <input
              value={dim.negDescription}
              onChange={(e) => setDim(i, "negDescription", e.target.value)}
              placeholder="← description"
              className="flex-1 min-w-0 rounded-lg border bg-transparent px-3 py-1 opacity-50 placeholder:text-zinc-400 dark:border-zinc-700"
            />
            <span className="w-4 shrink-0" />
            <input
              value={dim.posDescription}
              onChange={(e) => setDim(i, "posDescription", e.target.value)}
              placeholder="description →"
              className="flex-1 min-w-0 rounded-lg border bg-transparent px-3 py-1 opacity-50 placeholder:text-zinc-400 dark:border-zinc-700"
            />
            {allowAddRemove && dimensions.length > 1 && (
              <span className="shrink-0 h-9 w-9" />
            )}
          </div>
        </div>
      ))}
      {allowAddRemove && dimensions.length < MAX_DIMS && (
        <button
          type="button"
          onClick={addDim}
          className="text-left opacity-40 hover:opacity-100 transition-opacity"
        >
          + Add dimension ({dimensions.length}/{MAX_DIMS})
        </button>
      )}
    </div>
  );
}

const defaultSettings = {
  name: "",
  isPrivate: false,
  durationHours: 0,
  dimensions: [emptyDim(), emptyDim()] as Dimension[],
};

function CreatePlotPreview({ dims }: { dims: Dimension[] }) {
  const d0 = dims[0] ?? { negLabel: "", posLabel: "" };
  const d1 = dims[1] ?? { negLabel: "", posLabel: "" };

  if (dims.length === 1) {
    return (
      <>
        <div className="absolute left-[6%] right-[6%] h-[1.5px] bg-[var(--foreground)] top-1/2" />
        {d0.negLabel.trim() && (
          <span className="absolute text-xs bg-[var(--background)] px-1 whitespace-nowrap left-[1%] top-1/2 -translate-y-1/2">
            {d0.negLabel.trim()}
          </span>
        )}
        {d0.posLabel.trim() && (
          <span className="absolute text-xs bg-[var(--background)] px-1 whitespace-nowrap right-[1%] top-1/2 -translate-y-1/2 text-right">
            {d0.posLabel.trim()}
          </span>
        )}
      </>
    );
  }

  if (dims.length === 3) {
    const S = 22;
    const C = 0.866;
    const axes = [
      { x1: 50 - S * C, y1: 50 - S * 0.5, x2: 50 + S * C, y2: 50 + S * 0.5 },
      { x1: 50, y1: 50 + S, x2: 50, y2: 50 - S },
      { x1: 50 + S * C, y1: 50 - S * 0.5, x2: 50 - S * C, y2: 50 + S * 0.5 },
    ];
    const labels = dims.slice(0, 3).flatMap((d, i) => {
      const ax = [{ x: S * C, y: S * 0.5 }, { x: 0, y: -S }, { x: -S * C, y: S * 0.5 }][i];
      return [
        { text: d.posLabel.trim(), x: 50 + ax.x, y: 50 + ax.y },
        { text: d.negLabel.trim(), x: 50 - ax.x, y: 50 - ax.y },
      ];
    });
    return (
      <>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {axes.map((a, i) => (
            <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
              stroke="var(--foreground)" strokeWidth="0.3" />
          ))}
        </svg>
        {labels.map((l, i) => l.text ? (
          <span key={i}
            className="absolute text-xs bg-[var(--background)] px-1 whitespace-nowrap -translate-x-1/2 -translate-y-1/2 text-center opacity-80"
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
          >
            {l.text}
          </span>
        ) : null)}
      </>
    );
  }

  return (
    <>
      <div className="absolute top-[6%] bottom-[6%] w-[1.5px] bg-[var(--foreground)] left-1/2" />
      <div className="absolute left-[6%] right-[6%] h-[1.5px] bg-[var(--foreground)] top-1/2" />
      {d1.posLabel.trim() && (
        <span className="absolute text-center text-xs bg-[var(--background)] px-1 whitespace-nowrap top-[1%] left-1/2 -translate-x-1/2">
          {d1.posLabel.trim()}
        </span>
      )}
      {d1.negLabel.trim() && (
        <span className="absolute text-center text-xs bg-[var(--background)] px-1 whitespace-nowrap bottom-[1%] left-1/2 -translate-x-1/2">
          {d1.negLabel.trim()}
        </span>
      )}
      {d0.posLabel.trim() && (
        <span className="absolute text-right text-xs bg-[var(--background)] px-1 whitespace-nowrap right-[1%] top-1/2 -translate-y-1/2">
          {d0.posLabel.trim()}
        </span>
      )}
      {d0.negLabel.trim() && (
        <span className="absolute text-left text-xs bg-[var(--background)] px-1 whitespace-nowrap left-[1%] top-1/2 -translate-y-1/2">
          {d0.negLabel.trim()}
        </span>
      )}
    </>
  );
}

export function CreatePlotModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const createComparison = useMutation(api.comparisons.create);
  const [settings, setSettings] = useState(defaultSettings);
  const set = <K extends keyof typeof defaultSettings>(
    k: K,
    v: (typeof defaultSettings)[K],
  ) => setSettings((s) => ({ ...s, [k]: v }));

  const canCreate = settings.dimensions.length >= 1 &&
    settings.dimensions.length <= MAX_DIMS &&
    settings.dimensions[0] && (settings.dimensions[0].negLabel.trim() || settings.dimensions[0].posLabel.trim());

  const handleCreate = async () => {
    if (!canCreate) return;
    const dims = settings.dimensions.map((d) => ({
      negLabel: d.negLabel.trim(),
      posLabel: d.posLabel.trim(),
      negDescription: d.negDescription.trim() || undefined,
      posDescription: d.posDescription.trim() || undefined,
    }));
    const id = await createComparison({
      name: settings.name.trim() || undefined,
      private: settings.isPrivate || undefined,
      durationHours: settings.durationHours || undefined,
      dimensions: dims,
    });
    router.push(`/compare/${id}`);
    setSettings(defaultSettings);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1] flex items-center justify-center bg-[var(--background)]/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex w-full m-5 rounded-xl border border-[var(--foreground)] bg-[var(--background)] flex-col md:flex-row items-center max-w-"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-1 flex-col gap-3 md:border-r md:border-b-0 border-b p-5 w-full">
              <h2 className="font-semibold">New comparison</h2>
              <input
                value={settings.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Name (optional)"
                autoFocus
                className="h-9 rounded-lg border bg-transparent px-3 placeholder:text-zinc-400 dark:border-zinc-700"
              />
              <DimensionEditor
                dimensions={settings.dimensions}
                onChange={(dims) => set("dimensions", dims)}
              />
              <div className="flex items-center gap-2">
                <span>Visibility</span>
                <select
                  value={settings.isPrivate ? "private" : "public"}
                  onChange={(e) =>
                    set("isPrivate", e.target.value === "private")
                  }
                  className="h-8 rounded-lg border border-zinc-200 bg-transparent px-2 dark:border-zinc-700"
                >
                  <option value="public">Public</option>
                  <option value="private">Private (share via link only)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span>Locks in</span>
                <select
                  value={settings.durationHours}
                  onChange={(e) =>
                    set("durationHours", Number(e.target.value))
                  }
                  className="h-8 rounded-lg border border-zinc-200 bg-transparent px-2 dark:border-zinc-700"
                >
                  <option value={0}>Never</option>
                  <option value={0.001}>Immediately</option>
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
                  onClick={onClose}
                  className="h-9 rounded-lg border border-zinc-200 px-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-1 justify-center items-center">
              <div className="relative aspect-square w-80">
                <CreatePlotPreview dims={settings.dimensions} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ComparisonPicker({
  selectedId,
}: {
  selectedId: Id<"comparisons"> | null;
}) {
  const router = useRouter();
  const comparisons = useQuery(api.comparisons.list);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
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

  return (
    <div ref={ref} className="relative w-full flex gap-1">
      <p>You are at:</p>
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
                      {getUserName({
                        id: c.creatorId ?? "unknown",
                        name: c.creatorName,
                      })}
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
      <CreatePlotModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
