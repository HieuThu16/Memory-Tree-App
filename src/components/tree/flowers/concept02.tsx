import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F3: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [18, 90, 162, 234, 306, 54, 126, 198, 270, 342].map((angle) => ({
      angle,
      rx: 0.12,
      ry: 0.23,
      cy: -0.3,
    })),
  });

const F4: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: Array.from({ length: 8 }).map((_, i) => ({
      angle: i * 45,
      rx: 0.13,
      ry: 0.28,
      cy: -0.28,
    })),
  });

export const concept02Flowers: FlowerRenderer[] = [F3, F4];
