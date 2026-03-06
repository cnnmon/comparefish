"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { ComparisonPicker } from "./ComparisonPicker";
import { Shell, SignIn } from "./Shell";

function Main() {
  const router = useRouter();
  const comparisons = useQuery(api.comparisons.list);

  useEffect(() => {
    if (comparisons && comparisons.length > 0) {
      router.replace(`/c/${comparisons[0]._id}`);
    }
  }, [comparisons, router]);

  if (comparisons === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (comparisons.length > 0) return null;

  return (
    <Shell>
      <ComparisonPicker selectedId={null} />
      <p className="py-16 text-sm text-zinc-400">
        No comparisons yet. Create one above!
      </p>
    </Shell>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? <Main /> : <SignIn />;
}
