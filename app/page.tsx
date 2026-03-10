"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const comparisons = useQuery(api.comparisons.list);
  const createComparison = useMutation(api.comparisons.create);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (comparisons && comparisons.length > 0) {
      router.replace(`/compare/${comparisons[0]._id}`);
    }
  }, [isLoading, isAuthenticated, comparisons, router]);

  if (isLoading || !isAuthenticated || comparisons === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const handleCreate = async () => {
    const id = await createComparison({
      durationHours: 24,
      xLabelLeft: "left",
      xLabelRight: "right",
      yLabelTop: "top",
      yLabelBottom: "bottom",
    });
    router.push(`/compare/${id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex min-h-screen items-center justify-center"
    >
      <button onClick={handleCreate}>
        Create a comparison!
      </button>
    </motion.div>
  );
}
