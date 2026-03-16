import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F17: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 60, 120, 180, 240, 300, 30, 90, 150, 210, 270, 330].map(
      (angle) => ({
        angle,
        rx: 0.08,
        ry: 0.16,
        cy: -0.3,
      }),
    ),
    centerColor: "#7b1fa2",
  });

const F18: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 72, 144, 216, 288].map((angle) => ({
      angle,
      rx: 0.18,
      ry: 0.24,
      cy: -0.26,
    })),
    centerColor: "#fdd835",
  });

export const concept09Flowers: FlowerRenderer[] = [F17, F18];
