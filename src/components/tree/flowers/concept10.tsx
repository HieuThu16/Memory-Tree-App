import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F19: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: Array.from({ length: 13 }).map((_, i) => ({
      angle: i * (360 / 13),
      rx: 0.1,
      ry: 0.22,
      cy: -0.31,
    })),
    centerColor: "#5d4037",
  });

const F20: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: Array.from({ length: 16 }).map((_, i) => ({
      angle: i * (360 / 16),
      rx: 0.08,
      ry: 0.13,
      cy: -0.33,
    })),
    centerColor: "#fffde7",
  });

export const concept10Flowers: FlowerRenderer[] = [F19, F20];
