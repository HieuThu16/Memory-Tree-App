export type PlanBucket = "Gần 1 năm" | "1-2 năm" | "3-5 năm";

export const PLAN_BUCKETS: Array<{
  key: PlanBucket;
  icon: string;
  sub: string;
  tape: string;
  accent: string;
  bg: string;
  hdr: string;
}> = [
  {
    key: "Gần 1 năm",
    icon: "🏠",
    sub: "Hằng ngày",
    tape: "#ffd6e0",
    accent: "#e91e8c",
    bg: "#fff9fb",
    hdr: "#fce4ec",
  },
  {
    key: "1-2 năm",
    icon: "🌿",
    sub: "Thường xuyên",
    tape: "#b5ead7",
    accent: "#2e7d32",
    bg: "#f9fffb",
    hdr: "#e8f5e9",
  },
  {
    key: "3-5 năm",
    icon: "✈️",
    sub: "Đặc biệt",
    tape: "#c7ceea",
    accent: "#1a237e",
    bg: "#f5f7ff",
    hdr: "#e8eaf6",
  },
];

export const TILTS = [-3.5, 2, -1.5, 3.5, -2, 1.5];

export const TAPE_PATTERN = (c: string) =>
  `repeating-linear-gradient(90deg,${c}cc 0,${c}99 6px,${c}bb 6px,${c}77 12px)`;

const toSafeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (value: string | null) => {
  const date = toSafeDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatDateTime = (value: string | null) => {
  const date = toSafeDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const monthLabel = (value: string | null) => {
  const date = toSafeDate(value);
  if (!date) return "Không rõ tháng";
  return `Tháng ${date.getMonth() + 1}`;
};

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const CARD_EMOJIS = ["📌", "🎯", "🧭", "🗓️", "📝", "📍", "🧳", "🎬", "🎂"];

export const iconFromTitle = (title: string) =>
  CARD_EMOJIS[hashString(title) % CARD_EMOJIS.length];

const PLAN_COLOR_THEMES = [
  {
    card: "linear-gradient(160deg, #fff7fb 0%, #ffe9f3 55%, #fffafc 100%)",
    detail: "linear-gradient(180deg, #fff8fc 0%, #ffeef7 100%)",
    accent: "#d63a88",
  },
  {
    card: "linear-gradient(160deg, #f4fff8 0%, #e9fff2 55%, #fbfffd 100%)",
    detail: "linear-gradient(180deg, #f7fff9 0%, #ecfff3 100%)",
    accent: "#2c8f54",
  },
  {
    card: "linear-gradient(160deg, #f6f8ff 0%, #e8edff 55%, #fafbff 100%)",
    detail: "linear-gradient(180deg, #f8f9ff 0%, #eef1ff 100%)",
    accent: "#3e59c8",
  },
  {
    card: "linear-gradient(160deg, #fffaf1 0%, #ffefd8 55%, #fffdf8 100%)",
    detail: "linear-gradient(180deg, #fffbf3 0%, #fff3e2 100%)",
    accent: "#c27a27",
  },
  {
    card: "linear-gradient(160deg, #f5fcff 0%, #e8f8ff 55%, #fbfeff 100%)",
    detail: "linear-gradient(180deg, #f7fcff 0%, #ecf9ff 100%)",
    accent: "#2d89a6",
  },
  {
    card: "linear-gradient(160deg, #fff8f3 0%, #ffece2 55%, #fffdfa 100%)",
    detail: "linear-gradient(180deg, #fffaf6 0%, #fff1e9 100%)",
    accent: "#bc5f3c",
  },
] as const;

export function getPlanColorTheme(seed: string) {
  return PLAN_COLOR_THEMES[hashString(seed) % PLAN_COLOR_THEMES.length];
}

function normalizeBucket(raw: string | null): PlanBucket {
  if (!raw) return "Gần 1 năm";
  if (raw === "Dự định gần") return "Gần 1 năm";
  if (raw === "5-10 năm") return "3-5 năm";
  if (raw === "1-2 năm") return "1-2 năm";
  if (raw === "3-5 năm") return "3-5 năm";
  return "Gần 1 năm";
}

export function parsePlanDescription(desc: string | null): {
  bucket: PlanBucket;
  text: string;
} {
  if (!desc) return { bucket: "Gần 1 năm", text: "" };
  const match = desc.match(/^##CAT:(.*)##\n([\s\S]*)$/);
  if (!match) return { bucket: "Gần 1 năm", text: desc };
  return {
    bucket: normalizeBucket(match[1]?.trim() ?? null),
    text: match[2] ?? "",
  };
}

export function formatPlanDescription(bucket: PlanBucket, text: string) {
  return `##CAT:${bucket}##\n${text}`;
}
