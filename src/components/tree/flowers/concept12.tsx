import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F1: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => ({
      angle,
      rx: 0.12,
      ry: 0.28,
      cy: -0.3,
    })),
  });

export const concept12Flowers: FlowerRenderer[] = [F1, F1];
