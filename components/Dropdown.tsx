"use client";

import { useState, useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={twMerge("whitespace-nowrap", className)}
      >
        {options.find((o) => o.value === value)?.label}
        <span className={twMerge("transition-transform", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-full flex flex-col overflow-hidden rounded-lg border border-[var(--foreground)] bg-[var(--background)]">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={twMerge(
                "border-0! rounded-none! justify-start whitespace-nowrap",
                o.value === value && "text-[var(--highlight)]",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
