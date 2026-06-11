"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

const HovertextContext = createContext<{
  setHoverText: (text: string | null) => void;
}>({ setHoverText: () => {} });

/** Manually control the global hovertext, e.g. setHoverText(null) on click. */
export function useHovertext() {
  return useContext(HovertextContext);
}

export function HovertextProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  // Track the cursor globally; only re-render while a tooltip is showing.
  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const setHoverText = useCallback((text: string | null) => {
    setTip(text ? { text, ...mouse.current } : null);
  }, []);

  return (
    <HovertextContext.Provider value={{ setHoverText }}>
      {children}
      {tip && (
        <span
          className="pointer-events-none fixed z-50 max-w-60 rounded border border-[var(--foreground)] bg-[var(--background)] px-2 py-0.5 text-sm"
          style={{
            top: tip.y + 12,
            // flip to the other side of the cursor near the screen edge
            ...(tip.x > window.innerWidth / 2
              ? { right: window.innerWidth - tip.x + 12 }
              : { left: tip.x + 12 }),
          }}
        >
          {tip.text}
        </span>
      )}
    </HovertextContext.Provider>
  );
}

export function Hovertext({
  text,
  children,
  className,
}: {
  text: string;
  children: ReactNode;
  className?: string;
}) {
  const { setHoverText } = useHovertext();
  const hovering = useRef(false);

  const clear = useCallback(() => {
    if (hovering.current) setHoverText(null);
    hovering.current = false;
  }, [setHoverText]);

  // Clear the tooltip if we unmount while hovered (e.g. element swapped on click).
  useEffect(() => clear, [clear]);

  return (
    <span
      className={twMerge("w-fit", className)}
      onMouseEnter={() => {
        hovering.current = true;
        setHoverText(text);
      }}
      onMouseLeave={clear}
    >
      {children}
    </span>
  );
}
