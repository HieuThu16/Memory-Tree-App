"use client";

import { useEffect, useRef } from "react";
import { useMusicStore } from "@/lib/stores/musicStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSharedAudio } from "@/lib/music/sharedAudio";
import type { PlaylistTrackRecord } from "@/lib/types";

type SyncPayload = {
  type: "INVITE" | "ACCEPT" | "DECLINE" | "PLAY" | "PAUSE" | "SEEK" | "TRACK_CHANGE";
  fromUserId: string;
  fromUserName: string;
  toUserId?: string;
  time?: number;
  trackContext?: {
    id: string | null;
    url: string | null;
  };
};

export default function MusicSyncProvider({
  roomId,
  currentUserId,
  currentUserName,
}: {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
}) {
  const { syncMode, setSyncMode, setPlayingState } = useMusicStore();
  const channelRef = useRef<any>(null);
  
  // Ref to prevent echo loops when we receive a sync event vs when we initiate an action
  const isRemoteSyncingRef = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channelName = `music-sync:${roomId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel.on(
      "broadcast",
      { event: "sync_action" },
      (payload: { payload: SyncPayload }) => {
        const data = payload.payload;
        
        // Ignore our own broadcasts
        if (data.fromUserId === currentUserId) return;
        
        // Handle direct messages
        if (data.toUserId && data.toUserId !== currentUserId) return;

        const audio = getSharedAudio();
        const state = useMusicStore.getState();

        switch (data.type) {
          case "INVITE":
            // Normally we'd use a nice toast with Accept/Decline. For simplicity, we auto-ask confirm or just use browser confirm.
            const accept = window.confirm(`${data.fromUserName} muốn nghe nhạc đôi cùng bạn. Bạn có đồng ý không?`);
            if (accept) {
              setSyncMode("shared", data.fromUserName);
              channel.send({
                type: "broadcast",
                event: "sync_action",
                payload: {
                  type: "ACCEPT",
                  fromUserId: currentUserId,
                  fromUserName: currentUserName,
                  toUserId: data.fromUserId,
                } satisfies SyncPayload,
              });
            } else {
              channel.send({
                type: "broadcast",
                event: "sync_action",
                payload: {
                  type: "DECLINE",
                  fromUserId: currentUserId,
                  fromUserName: currentUserName,
                  toUserId: data.fromUserId,
                } satisfies SyncPayload,
              });
            }
            break;

          case "ACCEPT":
            setSyncMode("shared", data.fromUserName);
            // Once connected, maybe auto-sync current playback state to them
            if (state.playingUrl) {
              channel.send({
                type: "broadcast",
                event: "sync_action",
                payload: {
                  type: "TRACK_CHANGE",
                  fromUserId: currentUserId,
                  fromUserName: currentUserName,
                  trackContext: {
                    id: state.currentTrackId,
                    url: state.playingUrl,
                  },
                } satisfies SyncPayload,
              });
              if (state.isPlaying) {
                 setTimeout(() => {
                    channel.send({
                      type: "broadcast",
                      event: "sync_action",
                      payload: {
                        type: "PLAY",
                        fromUserId: currentUserId,
                        fromUserName: currentUserName,
                        time: audio.currentTime,
                      } satisfies SyncPayload,
                    });
                 }, 500);
              }
            }
            break;

          case "DECLINE":
            alert(`${data.fromUserName} đã từ chối nghe nhạc đôi.`);
            setSyncMode("solo");
            break;

          case "PLAY":
            if (state.syncMode === "shared") {
              isRemoteSyncingRef.current = true;
              if (data.time !== undefined && Math.abs(audio.currentTime - data.time) > 2) {
                audio.currentTime = data.time;
              }
              setPlayingState(true);
              audio.play().catch(console.error).finally(() => {
                setTimeout(() => { isRemoteSyncingRef.current = false; }, 200);
              });
            }
            break;

          case "PAUSE":
            if (state.syncMode === "shared") {
              isRemoteSyncingRef.current = true;
              if (data.time !== undefined) audio.currentTime = data.time;
              setPlayingState(false);
              audio.pause();
              setTimeout(() => { isRemoteSyncingRef.current = false; }, 200);
            }
            break;

          case "SEEK":
            if (state.syncMode === "shared" && data.time !== undefined) {
              isRemoteSyncingRef.current = true;
              audio.currentTime = data.time;
              setTimeout(() => { isRemoteSyncingRef.current = false; }, 200);
            }
            break;

          case "TRACK_CHANGE":
            if (state.syncMode === "shared" && data.trackContext?.url) {
              isRemoteSyncingRef.current = true;
              
              const currentId = useMusicStore.getState().currentTrackId;
              
              if (data.trackContext.id !== currentId || data.trackContext.url !== useMusicStore.getState().playingUrl) {
                // If it's a known playlist track, play it properly so UI highlights it
                const playlistTracks = useMusicStore.getState().playlistTracks;
                const trackIndex = playlistTracks.findIndex(t => t.id === data.trackContext?.id);
                
                if (trackIndex !== -1) {
                  useMusicStore.getState().playTrack(playlistTracks[trackIndex]);
                } else {
                  // Just a preview URL
                  useMusicStore.getState().playPreview(data.trackContext.url);
                }
              }
              setTimeout(() => { isRemoteSyncingRef.current = false; }, 500);
            }
            break;
        }
      }
    );

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, currentUserId, currentUserName, setSyncMode]);

  // Hook into local audio events to broadcast
  useEffect(() => {
    const audio = getSharedAudio();

    const handlePlay = () => {
      // If we're synced and we initiated this
      if (useMusicStore.getState().syncMode === "shared" && !isRemoteSyncingRef.current && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "sync_action",
          payload: {
            type: "PLAY",
            fromUserId: currentUserId,
            fromUserName: currentUserName,
            time: audio.currentTime,
          } satisfies SyncPayload,
        });
      }
    };

    const handlePause = () => {
      // Detect if it ended vs was artificially paused
      if (audio.ended) return;
      if (useMusicStore.getState().syncMode === "shared" && !isRemoteSyncingRef.current && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "sync_action",
          payload: {
            type: "PAUSE",
            fromUserId: currentUserId,
            fromUserName: currentUserName,
            time: audio.currentTime,
          } satisfies SyncPayload,
        });
      }
    };
    
    // We only need basic play/pause, seeking is a bit excessive and could lag.

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [currentUserId, currentUserName]);

  // Hook to store url changes to broadcast
  useEffect(() => {
    let prevUrl = useMusicStore.getState().playingUrl;
    
    return useMusicStore.subscribe(
      (state) => {
        const currentUrl = state.playingUrl;
        if (currentUrl && currentUrl !== prevUrl && state.syncMode === "shared" && !isRemoteSyncingRef.current && channelRef.current) {
           channelRef.current.send({
             type: "broadcast",
             event: "sync_action",
             payload: {
               type: "TRACK_CHANGE",
               fromUserId: currentUserId,
               fromUserName: currentUserName,
               trackContext: {
                 id: state.currentTrackId,
                 url: currentUrl,
               },
             } satisfies SyncPayload,
           });
           // Explicitly issue PLAY after track changes if we play automatically
           setTimeout(() => {
             if (useMusicStore.getState().isPlaying && channelRef.current) {
                channelRef.current.send({
                  type: "broadcast",
                  event: "sync_action",
                  payload: {
                    type: "PLAY",
                    fromUserId: currentUserId,
                    fromUserName: currentUserName,
                    time: 0,
                  } satisfies SyncPayload,
                });
             }
           }, 300);
        }
        prevUrl = currentUrl;
      }
    );
  }, [currentUserId, currentUserName]);

  // Provide a function on the window to initiate the invite globally easily if needed
  useEffect(() => {
    // @ts-ignore
    window.initiateMusicSync = () => {
      if (!channelRef.current) return;
      const confirmAction = window.confirm("Gửi lời mời nghe nhạc chung cho người ấy?");
      if (!confirmAction) return;

      channelRef.current.send({
        type: "broadcast",
        event: "sync_action",
        payload: {
          type: "INVITE",
          fromUserId: currentUserId,
          fromUserName: currentUserName,
        } satisfies SyncPayload,
      });
      alert("Đã gửi lời mời! Nếu người kia đồng ý, nhạc sẽ tự động đồng bộ.");
    };
    
    // @ts-ignore
    window.stopMusicSync = () => {
      setSyncMode("solo");
      alert("Đã tắt chế độ nghe nhạc chung.");
    };
    
    return () => {
      // @ts-ignore
      delete window.initiateMusicSync;
      // @ts-ignore
      delete window.stopMusicSync;
    }
  }, [currentUserId, currentUserName, setSyncMode]);

  return null;
}
