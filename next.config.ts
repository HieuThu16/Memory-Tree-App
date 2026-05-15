import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf-8",
  }).stdout?.trim() || crypto.randomUUID();

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV !== "production",
});

const supabaseImageRemotePattern = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? (() => {
      const parsedUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL as string);

      return {
        protocol: parsedUrl.protocol.replace(":", ""),
        hostname: parsedUrl.hostname,
        pathname: "/storage/v1/object/public/**",
      };
    })()
  : undefined;

const nextConfig: NextConfig = {
  turbopack: {},
  images: supabaseImageRemotePattern
    ? {
        remotePatterns: [supabaseImageRemotePattern],
      }
    : undefined,
};

export default withSerwist(nextConfig);
