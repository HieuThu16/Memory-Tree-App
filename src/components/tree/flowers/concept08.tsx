import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F15: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: Array.from({ length: 18 }).map((_, i) => ({
      angle: i * 20,
      rx: 0.09,
      ry: 0.21,
      cy: -0.29,
    })),
  });

const F16: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 72, 144, 216, 288].map((angle) => ({
      angle,
      rx: 0.17,
      ry: 0.25,
      cy: -0.29,
    })),
  });

export const concept08Flowers: FlowerRenderer[] = [F15, F16];
