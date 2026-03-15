import { create } from "zustand";
import type { PlaylistTrackRecord } from "../types";
import { getSharedAudio } from "../music/sharedAudio";

export type PlaybackMode = "off" | "repeat-one" | "repeat-all" | "shuffle";

interface MusicState {
  playlistTracks: PlaylistTrackRecord[];
  currentTrackIndex: number;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  currentTrackId: string | null;
  playingUrl: string | null;

  setPlaylistTracks: (tracks: PlaylistTrackRecord[]) => void;
  playTrack: (track: PlaylistTrackRecord | null) => void;
  playPreview: (url: string | null) => void;
  setPlayingState: (playing: boolean) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  playNext: () => void;
  playPrevious: () => void;

  // Music Sync states
  syncMode: "solo" | "shared";
  syncPartnerName: string | null;
  setSyncMode: (mode: "solo" | "shared", partnerName?: string | null) => void;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  playlistTracks: [],
  currentTrackIndex: -1,
  playbackMode: "off",
  isPlaying: false,
  currentTrackId: null,
  playingUrl: null,
  syncMode: "solo",
  syncPartnerName: null,

  setSyncMode: (mode, partnerName) =>
    set({ syncMode: mode, syncPartnerName: partnerName || null }),

  setPlaylistTracks: (tracks) => {
    const currentTrackId = get().currentTrackId;
    const currentTrackIndex = currentTrackId
      ? tracks.findIndex((track) => track.id === currentTrackId)
      : -1;

    set({ playlistTracks: tracks, currentTrackIndex });
  },

  setPlayingState: (playing) => set({ isPlaying: playing }),

  setPlaybackMode: (mode) => set({ playbackMode: mode }),

  playTrack: (track) => {
    const audio =
      typeof window !== "undefined"
        ? getSharedAudio()
        : (null as HTMLAudioElement | null);

    if (!track?.preview_url) {
      if (audio) {
        audio.pause();
      }
      set({ currentTrackId: null, playingUrl: null, currentTrackIndex: -1 });
      return;
    }

    const state = get();
    // find index if we are jumping
    const index = state.playlistTracks.findIndex((t) => t.id === track.id);

    set({
      currentTrackId: track.id,
      playingUrl: track.preview_url,
      currentTrackIndex: index,
      isPlaying: true, // Optimistically assuming it plays
    });

    if (audio) {
      if (audio.src !== track.preview_url) {
        audio.src = track.preview_url;
      }
      void audio.play().catch(() => {
        set({ isPlaying: false });
      });
    }
  },

  playPreview: (url) => {
    const audio =
      typeof window !== "undefined"
        ? getSharedAudio()
        : (null as HTMLAudioElement | null);

    if (!url) {
      if (audio) {
        audio.pause();
      }
      set({
        playingUrl: null,
        currentTrackId: null,
        currentTrackIndex: -1,
        isPlaying: false,
      });
      return;
    }

    set({
      playingUrl: url,
      currentTrackId: null,
      currentTrackIndex: -1,
      isPlaying: true,
    });

    if (audio) {
      if (audio.src !== url) {
        audio.src = url;
      }
      void audio.play().catch(() => {
        set({ isPlaying: false });
      });
    }
  },

  playNext: () => {
    const state = get();
    const tracks = state.playlistTracks;
    if (tracks.length === 0) return;

    if (state.playbackMode === "shuffle" && tracks.length > 1) {
      let randomIndex = Math.floor(Math.random() * tracks.length);
      while (
        randomIndex === state.currentTrackIndex &&
        state.currentTrackIndex !== -1
      ) {
        randomIndex = Math.floor(Math.random() * tracks.length);
      }
      get().playTrack(tracks[randomIndex] || null);
      return;
    }

    const nextIndex =
      state.currentTrackIndex >= 0
        ? (state.currentTrackIndex + 1) % tracks.length
        : 0;
    get().playTrack(tracks[nextIndex] || null);
  },

  playPrevious: () => {
    const state = get();
    const tracks = state.playlistTracks;
    if (tracks.length === 0) return;

    const prevIndex =
      state.currentTrackIndex > 0
        ? state.currentTrackIndex - 1
        : tracks.length - 1;
    get().playTrack(tracks[prevIndex] || null);
  },
}));
