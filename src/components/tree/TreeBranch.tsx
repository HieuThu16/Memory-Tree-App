"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { TreeBranch } from "./types";

export default function TreeBranch({ branch, index }: { branch: TreeBranch; index: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.path
      d={branch.path}
      fill="none"
      stroke="url(#branchGradient)"
      strokeWidth={2.2}
      strokeLinecap="round"
      initial={reduceMotion ? undefined : { pathLength: 0, opacity: 0 }}
      animate={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.9, delay: index * 0.05 + branch.depth * 0.08 }}
    />
  );
}
