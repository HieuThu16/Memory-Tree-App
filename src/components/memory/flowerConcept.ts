import { normalizeFlowerConcept } from "@/components/tree/flowers";
import type { MemoryRecord } from "@/lib/types";

export const FLOWER_SPECIES = [
  {
    id: 1,
    name: "Anh Dao",
    icon: "🌸",
    motionClass: "flower-icon-motion-1",
  },
  {
    id: 2,
    name: "Huong Duong",
    icon: "🌻",
    motionClass: "flower-icon-motion-2",
  },
  { id: 3, name: "Hoa Hong", icon: "🌹", motionClass: "flower-icon-motion-3" },
  { id: 4, name: "Mau Don", icon: "🌺", motionClass: "flower-icon-motion-4" },
  { id: 5, name: "Tulip", icon: "🌷", motionClass: "flower-icon-motion-5" },
  { id: 6, name: "Cuc Hoa Mi", icon: "🌼", motionClass: "flower-icon-motion-6" },
  { id: 7, name: "Sen", icon: "🪷", motionClass: "flower-icon-motion-7" },
  { id: 8, name: "Oai Huong", icon: "🪻", motionClass: "flower-icon-motion-8" },
  { id: 9, name: "Bo Hoa", icon: "💐", motionClass: "flower-icon-motion-9" },
  {
    id: 10,
    name: "Hoa Cac Canh",
    icon: "🏵️",
    motionClass: "flower-icon-motion-10",
  },
] as const;

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const randomFlowerConcept = () => Math.floor(Math.random() * 10) + 1;

export const flowerConceptFromSeed = (seed: string) =>
  normalizeFlowerConcept((hashSeed(seed) % 10) + 1);

export const flowerConceptFromMemory = (
  memory: Pick<MemoryRecord, "id" | "title" | "date" | "created_at">,
) =>
  flowerConceptFromSeed(
    `${memory.id}|${memory.title}|${memory.date ?? ""}|${memory.created_at}`,
  );

export const getFlowerThemeClass = (concept: number) =>
  `flower-theme-${normalizeFlowerConcept(concept)}`;

export const getFlowerSpeciesByConcept = (concept: number) =>
  FLOWER_SPECIES[normalizeFlowerConcept(concept) - 1];
