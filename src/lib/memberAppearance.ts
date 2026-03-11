import type { MemoryParticipant } from "@/lib/types";

const memberPalette = [
  { accent: "#f47c4c", soft: "#fff1e8", strong: "#d95b28" },
  { accent: "#58b981", soft: "#effdf5", strong: "#2c9b5d" },
  { accent: "#6e8cff", soft: "#eef2ff", strong: "#4c67d6" },
  { accent: "#ef8a83", soft: "#fff0ef", strong: "#d66861" },
  { accent: "#8e6df2", soft: "#f3efff", strong: "#6b49cf" },
  { accent: "#f4c35d", soft: "#fff8e7", strong: "#cf9f2e" },
];

const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

export const getParticipantInitials = (displayName: string) => {
  const parts = displayName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "MT";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export const getParticipantAppearance = (
  participant: Pick<MemoryParticipant, "userId" | "displayName" | "avatarUrl">,
) => {
  const palette =
    memberPalette[hashString(participant.userId) % memberPalette.length];

  return {
    ...participant,
    initials: getParticipantInitials(participant.displayName),
    accentColor: palette.accent,
    softColor: palette.soft,
    strongColor: palette.strong,
  };
};
