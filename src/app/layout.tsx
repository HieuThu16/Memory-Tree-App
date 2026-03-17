import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import Toasts from "@/components/ui/Toasts";
import GlobalMiniPlayer from "@/components/music/GlobalMiniPlayer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Memory Tree",
    template: "%s | Memory Tree",
  },
  description:
    "Write, grow, and share your memories inside a living tree built for calm reflection.",
  applicationName: "Memory Tree",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-tree-512.png",
    apple: "/icon-tree-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fff8ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${fraunces.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          {children}
          <GlobalMiniPlayer />
          <Toasts />
        </QueryProvider>
      </body>
    </html>
  );
}
