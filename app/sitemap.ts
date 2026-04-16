import type { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://comparefish.vercel.app";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const comparisons = await convex.query(api.comparisons.list);
    const comparisonRoutes: MetadataRoute.Sitemap = (comparisons ?? [])
      .filter((c) => !c.private)
      .map((c) => ({
        url: `${SITE_URL}/compare/${c._id}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    return [...staticRoutes, ...comparisonRoutes];
  } catch {
    return staticRoutes;
  }
}
