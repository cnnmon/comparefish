import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import ComparisonPage from "./ComparisonPage";
import { formatLabel } from "@/components/utils";
import { Id } from "../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const comparison = await convex.query(api.comparisons.get, { id });
    if (!comparison) return { title: "comparefish" };
    const label = formatLabel(comparison);
    const description = "place yourself and fix your friends";
    return {
      title: `compare: ${label}`,
      description,
      openGraph: {
        title: label,
        description,
        siteName: "comparefish",
      },
    };
  } catch {
    return { title: "comparefish" };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ComparisonPage comparisonId={id as Id<"comparisons">} />;
}
