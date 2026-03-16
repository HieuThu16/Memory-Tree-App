import { FlowerBase } from "./FlowerBase";
import type { FlowerRenderer } from "./types";

const F9: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 51, 103, 154, 206, 257, 309].map((angle) => ({
      angle,
      rx: 0.09,
      ry: 0.23,
      cy: -0.3,
    })),
    centerColor: "#e8f5e9",
  });

const F10: FlowerRenderer = (p) =>
  FlowerBase({
    ...p,
    petals: [0, 60, 120, 180, 240, 300].map((angle) => ({
      angle,
      rx: 0.15,
      ry: 0.22,
      cy: -0.27,
    })),
    innerR: 0.17,
  });

export const concept05Flowers: FlowerRenderer[] = [F9, F10];
