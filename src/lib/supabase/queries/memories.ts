import type { MemoryRecord } from "@/lib/types";
import {
  MEMORY_SELECT,
  MEMORY_SELECT_LEGACY,
  MEMORY_SUMMARY_SELECT,
  MEMORY_SUMMARY_SELECT_LEGACY,
} from "@/lib/supabase/selects";
import { createSupabaseServerClient } from "../server";

type GenericMemoryQuery = {
  eq: (column: string, value: unknown) => GenericMemoryQuery;
  is: (column: string, value: unknown) => GenericMemoryQuery;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => Promise<{
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  }>;
};

type GenericMemoryClient = {
  from: (table: "memories") => {
    select: (columns: string) => GenericMemoryQuery;
  };
};

type MemorySelectMode = "summary" | "full";

const isMissingMemoryMetadataColumn = (message?: string) => {
  if (!message) return false;
  const lowered = message.toLowerCase();
  return (
    lowered.includes("column") &&
    (lowered.includes("memories.with_whom") ||
      lowered.includes("memories.event_time"))
  );
};

const normalizeMemoryRow = (
  row: Record<string, unknown>,
  mode: MemorySelectMode,
): MemoryRecord => {
  const base = row as MemoryRecord;

  return {
    ...base,
    content:
      mode === "full" && typeof row.content === "string" ? row.content : null,
    with_whom: typeof row.with_whom === "string" ? row.with_whom : null,
    event_time: typeof row.event_time === "string" ? row.event_time : null,
    media:
      mode === "full" && Array.isArray(row.media)
        ? (row.media as MemoryRecord["media"])
        : undefined,
  };
};

async function queryMemoriesWithFallback(params: {
  roomId?: string | null;
  id?: string;
  mode: MemorySelectMode;
}) {
  const supabase = await createSupabaseServerClient();
  const genericSupabase = supabase as unknown as GenericMemoryClient;
  const primarySelect =
    params.mode === "full" ? MEMORY_SELECT : MEMORY_SUMMARY_SELECT;
  const legacySelect =
    params.mode === "full"
      ? MEMORY_SELECT_LEGACY
      : MEMORY_SUMMARY_SELECT_LEGACY;

  const applyFilters = (builder: GenericMemoryQuery): GenericMemoryQuery => {
    let scoped = builder;
    if (params.roomId !== undefined) {
      if (params.roomId === null) {
        scoped = scoped.is("room_id", null);
      } else {
        scoped = scoped.eq("room_id", params.roomId);
      }
    }
    if (params.id) {
      scoped = scoped.eq("id", params.id);
    }
    return scoped;
  };

  const primaryBuilder = applyFilters(
    genericSupabase.from("memories").select(primarySelect),
  );
  const primary = await primaryBuilder.order("date", { ascending: true });

  if (!primary.error) {
    const rows = (primary.data ?? []) as Record<string, unknown>[];
    return {
      data: rows.map((row) => normalizeMemoryRow(row, params.mode)),
      error: null,
    };
  }

  if (!isMissingMemoryMetadataColumn(primary.error.message)) {
    return { data: [], error: primary.error };
  }

  const legacyBuilder = applyFilters(
    genericSupabase.from("memories").select(legacySelect),
  );
  const legacy = await legacyBuilder.order("date", { ascending: true });

  if (legacy.error) {
    return { data: [], error: legacy.error };
  }

  const rows = (legacy.data ?? []) as Record<string, unknown>[];
  return {
    data: rows.map((row) => normalizeMemoryRow(row, params.mode)),
    error: null,
  };
}

export async function getPersonalMemories(): Promise<MemoryRecord[]> {
  const { data, error } = await queryMemoriesWithFallback({
    roomId: null,
    mode: "summary",
  });

  if (error) {
    console.error("Failed to load memories", error.message);
    return [];
  }

  return data ?? [];
}

export async function getMemoryById(id: string): Promise<MemoryRecord | null> {
  const { data, error } = await queryMemoriesWithFallback({
    id,
    mode: "full",
  });

  if (error) {
    console.error("Failed to load memory", error.message);
    return null;
  }

  return data[0] ?? null;
}

export async function getRoomMemories(roomId: string): Promise<MemoryRecord[]> {
  const { data, error } = await queryMemoriesWithFallback({
    roomId,
    mode: "summary",
  });

  if (error) {
    console.error("Failed to load room memories", error.message);
    return [];
  }

  return data ?? [];
}

export async function getMemoryStats() {
  const supabase = await createSupabaseServerClient();
  const { count: total } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .is("room_id", null);

  const { count: diaryCount } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .is("room_id", null)
    .eq("type", "diary");

  const { count: photoCount } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .is("room_id", null)
    .eq("type", "photo");

  const { count: videoCount } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .is("room_id", null)
    .eq("type", "video");

  return {
    total: total ?? 0,
    diary: diaryCount ?? 0,
    photo: photoCount ?? 0,
    video: videoCount ?? 0,
  };
}
