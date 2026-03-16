import type { FlowerRenderer } from "./types";
import { concept01Flowers } from "./concept01";
import { concept02Flowers } from "./concept02";
import { concept03Flowers } from "./concept03";
import { concept04Flowers } from "./concept04";
import { concept05Flowers } from "./concept05";
import { concept06Flowers } from "./concept06";
import { concept07Flowers } from "./concept07";
import { concept08Flowers } from "./concept08";
import { concept09Flowers } from "./concept09";
import { concept10Flowers } from "./concept10";

export const FLOWER_CONCEPT_LABELS = [
  "Cột mốc",
  "Cột mốc lần 1",
  "Cột mốc lần 2",
  "Gia đình",
  "Tình yêu",
  "Bạn bè",
  "Du lịch",
  "Sinh nhật",
  "Công việc",
  "Thường ngày",
] as const;

const FLOWER_CATEGORY_TO_CONCEPT = new Map<string, number>(
  FLOWER_CONCEPT_LABELS.map((label, idx) => [label.toLowerCase(), idx + 1]),
);

export const resolveFlowerConceptFromCategory = (category?: string | null) => {
  if (!category) return null;
  return FLOWER_CATEGORY_TO_CONCEPT.get(category.trim().toLowerCase()) ?? null;
};

export const normalizeFlowerConcept = (concept?: number | null) => {
  if (!concept || Number.isNaN(concept)) return 1;
  return ((Math.floor(concept) - 1 + 10) % 10) + 1;
};

export const FLOWER_PALETTES: Array<[string, string]> = [
  ["#f8bbd0", "#ec407a"],
  ["#fff59d", "#f9a825"],
  ["#ef9a9a", "#c62828"],
  ["#f48fb1", "#d81b60"],
  ["#ce93d8", "#8e24aa"],
  ["#ffe082", "#ef6c00"],
  ["#f06292", "#ad1457"],
  ["#b39ddb", "#5e35b1"],
  ["#e0f2f1", "#26a69a"],
  ["#fff176", "#ff8f00"],
  ["#d1c4e9", "#6a1b9a"],
];

export const FLOWER_COMPONENTS: FlowerRenderer[] = [
  concept01Flowers[0],
  concept02Flowers[0],
  concept03Flowers[0],
  concept04Flowers[0],
  concept05Flowers[0],
  concept06Flowers[0],
  concept07Flowers[0],
  concept08Flowers[0],
  concept09Flowers[0],
  concept10Flowers[0],
];

export type { FlowerRenderer, FlowerVisualProps } from "./types";
