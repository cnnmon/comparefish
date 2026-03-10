"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Chart, { ChartProvider } from "@/components/Chart";
import Shell from "@/components/Shell";
import { formatLabel } from "@/components/utils";

function ComparisonPage({ comparisonId }: { comparisonId: Id<"comparisons"> }) {
  const comparison = useQuery(api.comparisons.get, { id: comparisonId });

  useEffect(() => {
    if (comparison) {
      document.title = `Comparison: ${formatLabel(comparison)}`;
    }
    return () => { document.title = "comparisons"; };
  }, [comparison]);

  return (
    <ChartProvider comparisonId={comparisonId}>
      <Shell comparisonId={comparisonId}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4 w-full"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key="chart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              <Chart />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </Shell>
    </ChartProvider>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <ComparisonPage comparisonId={id as Id<"comparisons">} />;
}
