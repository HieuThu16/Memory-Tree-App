"use client";

import { useUiStore } from "@/lib/stores/uiStore";

export default function InviteLinkButton({
  inviteCode,
}: {
  inviteCode: string | null;
}) {
  const addToast = useUiStore((state) => state.addToast);

  const handleCopy = async () => {
    if (!inviteCode) {
      addToast("Room này chưa có mã mời hoạt động.", "error");
      return;
    }

    const inviteUrl = `${window.location.origin}/join?code=${encodeURIComponent(inviteCode)}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      addToast("Đã sao chép link mời một chạm.", "success");
    } catch {
      addToast("Không thể sao chép link mời lúc này.", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!inviteCode}
      className="btn-secondary px-4 py-2 text-xs"
    >
      {inviteCode ? "Sao chép link mời nhanh" : "Chưa có mã mời"}
    </button>
  );
}
