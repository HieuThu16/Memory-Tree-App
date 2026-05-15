import { normalizeFlowerConcept } from "@/components/tree/flowers";
import type { MemoryRecord } from "@/lib/types";

export const FLOWER_SPECIES = [
  { id: 1, name: "Tháng 1", icon: "🌸", motionClass: "flower-icon-motion-1" },
  { id: 2, name: "Tháng 2", icon: "🌻", motionClass: "flower-icon-motion-2" },
  { id: 3, name: "Tháng 3", icon: "🌹", motionClass: "flower-icon-motion-3" },
  { id: 4, name: "Tháng 4", icon: "🌺", motionClass: "flower-icon-motion-4" },
  { id: 5, name: "Tháng 5", icon: "🌷", motionClass: "flower-icon-motion-5" },
  { id: 6, name: "Tháng 6", icon: "🌼", motionClass: "flower-icon-motion-6" },
  { id: 7, name: "Tháng 7", icon: "🪷", motionClass: "flower-icon-motion-7" },
  { id: 8, name: "Tháng 8", icon: "🪻", motionClass: "flower-icon-motion-8" },
  { id: 9, name: "Tháng 9", icon: "💐", motionClass: "flower-icon-motion-9" },
  { id: 10, name: "Tháng 10", icon: "🏵️", motionClass: "flower-icon-motion-10" },
  { id: 11, name: "Tháng 11", icon: "💮", motionClass: "flower-icon-motion-11" },
  { id: 12, name: "Tháng 12", icon: "🥀", motionClass: "flower-icon-motion-12" },
] as const;

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const randomFlowerConcept = () => Math.floor(Math.random() * 12) + 1;

export const flowerConceptFromSeed = (seed: string) =>
  normalizeFlowerConcept((hashSeed(seed) % 12) + 1);

export const flowerConceptFromMemory = (
  memory: Pick<MemoryRecord, "id" | "title" | "date" | "created_at">,
) => {
  const dateStr = memory.date || memory.created_at;
  if (!dateStr) return 1;
  const dateObj = new Date(dateStr);
  const month = dateObj.getMonth() + 1; // 1 to 12
  return normalizeFlowerConcept(month);
};

export const getFlowerThemeClass = (concept: number) =>
  `flower-theme-${normalizeFlowerConcept(concept)}`;

export const getFlowerSpeciesByConcept = (concept: number) =>
  FLOWER_SPECIES[normalizeFlowerConcept(concept) - 1];
