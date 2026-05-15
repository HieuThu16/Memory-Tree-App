import path from "node:path";
import { readdir } from "node:fs/promises";

const ALLOWED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".ogg"]);

type LocalMusicTrack = {
  id: string;
  title: string;
  url: string;
};

export async function getLocalMusicTracks(): Promise<LocalMusicTrack[]> {
  const musicDir = path.join(process.cwd(), "music");

  try {
    const entries = await readdir(musicDir, { withFileTypes: true });

    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          ALLOWED_AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
      )
      .map((entry) => {
        const fileName = entry.name;
        const title = path.parse(fileName).name;

        return {
          id: fileName,
          title,
          url: `/api/music/local/${encodeURIComponent(fileName)}`,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title, "vi", { sensitivity: "base" }));
  } catch (error) {
    console.error("Failed to load local music files", error);
    return [];
  }
}
