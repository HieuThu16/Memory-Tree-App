import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F5: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: Array.from({ length: 14 }).map((_, i) => ({
      angle: i * (360 / 14),
      rx: 0.08,
      ry: 0.24,
      cy: -0.29,
    })),
  });

const F6: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: Array.from({ length: 16 }).map((_, i) => ({
      angle: i * 22.5,
      rx: 0.1,
      ry: 0.2,
      cy: -0.31,
    })),
    centerColor: "#4e342e",
  });

export const concept03Flowers: FlowerRenderer[] = [F5, F6];
