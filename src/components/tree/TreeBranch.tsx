"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { TreeBranch } from "./types";

function TreeBranchPath({ branch, index }: { branch: TreeBranch; index: number }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      setLength(pathRef.current.getTotalLength());
    }
  }, [branch.path]);

  return (
    <path
      ref={pathRef}
      d={branch.path}
      fill="none"
      stroke="url(#branchGradient)"
      strokeWidth={2.5}
      strokeLinecap="round"
      opacity={0.75}
      style={{
        strokeDasharray: length || 300,
        strokeDashoffset: length ? length : 300,
        animation: `drawBranch 0.7s ease forwards ${index * 0.1 + 0.2}s`,
      }}
    />
  );
}

export default memo(TreeBranchPath);
