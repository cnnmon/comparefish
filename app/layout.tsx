import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.comparefish.site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "comparefish — compare you and your friends",
    template: "%s | comparefish",
  },
  description:
    "Create comparison plots, place yourself, and invite friends to fix your placements. Personality charts reimagined as a social game.",
  keywords: [
    "comparison chart",
    "personality chart",
    "friend comparison",
    "alignment chart",
    "comparison plot",
    "comparefish",
    "social game",
  ],
  icons: { icon: "/assets/fish/fish-1.png" },
  openGraph: {
    type: "website",
    siteName: "comparefish",
    title: "comparefish — compare you and your friends",
    description:
      "Create comparison plots, place yourself, and invite friends to fix your placements.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "comparefish — compare you and your friends",
    description:
      "Create comparison plots, place yourself, and invite friends to fix your placements.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
