import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F13: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 72, 144, 216, 288].map((angle) => ({
      angle,
      rx: 0.14,
      ry: 0.21,
      cy: -0.25,
    })),
  });

const F14: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 72, 144, 216, 288].map((angle) => ({
      angle,
      rx: 0.14,
      ry: 0.24,
      cy: -0.29,
    })),
  });

export const concept07Flowers: FlowerRenderer[] = [F13, F14];
