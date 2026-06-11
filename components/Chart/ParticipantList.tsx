"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useChart } from "./ChartProvider";
import { resolveImage } from "./utils";
import { getUserName } from "../utils";

export default function ParticipantList() {
  const ctx = useChart();
  const [search, setSearch] = useState("");
  // Visibility applied to rows dragged over; null = not dragging
  const dragTo = useRef<boolean | null>(null);

  useEffect(() => {
    const stop = () => { dragTo.current = null; };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  if (!ctx) return null;
  const { allPlacements, hiddenUserIds, toggleUser, showAllUsers, hideAllUsers } = ctx;

  if (allPlacements.length === 0) return null;

  const filtered = search
    ? allPlacements.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : allPlacements;

  const allVisible = hiddenUserIds.size === 0;
  const noneVisible = hiddenUserIds.size >= allPlacements.length;

  return (
    <div className="flex flex-col gap-1 w-40 bg-[var(--background)]">
      <div className="flex items-center justify-between gap-1">
        <span>{allPlacements.length} fish</span>
      </div>
      <div className="flex gap-2 items-center">
        <button
          onClick={showAllUsers}
          className={`${allVisible ? "bg-[var(--foreground)]! text-black!" : "opacity-60"} h-7`}
          disabled={allVisible}
        >
          All
        </button>
        <button
          onClick={hideAllUsers}
          className={`${noneVisible ? "bg-[var(--foreground)]! text-black!" : "opacity-60"} h-7`}
          disabled={noneVisible}
        >
          None
        </button>
      </div>

      <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[40vh]">
        {filtered.flat().map((p, idx) => {
          const visible = !hiddenUserIds.has(p.userId);
          const img = resolveImage({ name: p.name, avatar: p.avatar });
          return (
            <a
              key={p.userId}
              onClick={() => toggleUser(p.userId)}
              className={`flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-[var(--foreground)]/10 transition-opacity cursor-pointer hover:underline ${
                visible ? "opacity-100" : "opacity-30"
              }`}
            >
              {img && (
                <Image
                  src={img}
                  alt={p.name}
                  width={20}
                  height={20}
                  className="shrink-0"
                />
              )}
              <span className="truncate text-left">
                {p.isMe ? "me" : getUserName({ id: p.userId, name: p.name })}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
