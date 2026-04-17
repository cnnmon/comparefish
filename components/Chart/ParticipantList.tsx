"use client";

import { useState } from "react";
import Image from "next/image";
import { useChart } from "./ChartProvider";
import { resolveImage } from "./utils";
import { getUserName } from "../utils";

export default function ParticipantList() {
  const ctx = useChart();
  const [search, setSearch] = useState("");

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
        Show
        <button
          onClick={showAllUsers}
          className={`${allVisible ? "opacity-30" : "opacity-60"} hover:opacity-100 transition-opacity h-7`}
          disabled={allVisible}
        >
          All
        </button>
        <button
          onClick={hideAllUsers}
          className={`${noneVisible ? "opacity-30" : "opacity-60"} hover:opacity-100 transition-opacity h-7`}
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
