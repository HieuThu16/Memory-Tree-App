import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F11: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [-30, 30, -110, 110, 90].map((angle) => ({
      angle,
      rx: 0.16,
      ry: 0.24,
      cy: -0.3,
    })),
  });

const F12: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: Array.from({ length: 9 }).flatMap((_, i) => [
      { angle: i * 40, rx: 0.15, ry: 0.26, cy: -0.3 },
      { angle: i * 40 + 20, rx: 0.1, ry: 0.2, cy: -0.26 },
    ]),
    innerR: 0.1,
  });

export const concept06Flowers: FlowerRenderer[] = [F11, F12];
