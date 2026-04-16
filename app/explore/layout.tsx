import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "explore plots",
  description:
    "Browse public comparison plots and create your own. Place yourself and invite friends to fix your placements.",
  openGraph: {
    title: "explore plots — comparefish",
    description:
      "Browse public comparison plots and create your own.",
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
