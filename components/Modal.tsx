"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-[var(--background)]/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border border-[var(--foreground)] bg-[var(--background)] flex flex-col max-h-[70vh] w-full max-w-xl mx-4 overflow-y-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="border-b border-[var(--foreground)] px-4 py-3">
                <h2 className="text-[var(--foreground)]">{title}</h2>
              </div>
            )}
            <div className="overflow-y-auto p-4 text-[var(--foreground)]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
