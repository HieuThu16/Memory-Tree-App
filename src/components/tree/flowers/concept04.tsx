import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F7: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [-28, 0, 28, -14, 14].map((angle) => ({
      angle,
      rx: 0.16,
      ry: 0.27,
      cy: -0.25,
    })),
  });

const F8: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 30, 150, 60, 120].map((angle) => ({
      angle,
      rx: 0.14,
      ry: 0.24,
      cy: -0.26,
    })),
  });

export const concept04Flowers: FlowerRenderer[] = [F7, F8];
