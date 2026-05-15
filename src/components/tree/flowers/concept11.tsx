import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F1: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => ({
      angle,
      rx: 0.15,
      ry: 0.35,
      cy: -0.32,
    })),
  });

export const concept11Flowers: FlowerRenderer[] = [F1, F1];
