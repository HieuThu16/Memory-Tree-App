import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F1: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 72, 144, 216, 288].map((angle) => ({
      angle,
      rx: 0.18,
      ry: 0.27,
      cy: -0.3,
    })),
  });

const F2: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 60, 120, 180, 240, 300].map((angle) => ({
      angle,
      rx: 0.16,
      ry: 0.23,
      cy: -0.28,
    })),
    innerR: 0.14,
  });

export const concept01Flowers: FlowerRenderer[] = [F1, F2];
