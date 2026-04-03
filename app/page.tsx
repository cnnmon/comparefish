"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";

export default function Home() {
  const { isLoading } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasOAuthCode = searchParams.has("code");

  useEffect(() => {
    if (hasOAuthCode && isLoading) return;
    router.replace("/explore");
  }, [isLoading, hasOAuthCode, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}
