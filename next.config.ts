import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: false, // process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withSerwist(nextConfig);
