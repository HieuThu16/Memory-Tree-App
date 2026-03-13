let sharedAudio: HTMLAudioElement | null = null;

export function getSharedAudio(): HTMLAudioElement {
  if (typeof window === "undefined") {
    throw new Error("Shared audio is only available in browser runtime.");
  }

  if (!sharedAudio) {
    sharedAudio = new Audio();
  }

  return sharedAudio;
}
