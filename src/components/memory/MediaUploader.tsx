"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";

export type UploadableFile = {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
};

export default function MediaUploader({
  files,
  setFiles,
}: {
  files: UploadableFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadableFile[]>>;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsProcessing(true);
      const newFiles: UploadableFile[] = [];

      for (const file of acceptedFiles) {
        let processedFile = file;

        // Compress images if needed
        if (file.type.startsWith("image/")) {
          try {
            processedFile = await imageCompression(file, {
              maxSizeMB: 2,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
          } catch (error) {
            console.error("Compression error:", error);
          }
        }

        const previewUrl = URL.createObjectURL(processedFile);
        newFiles.push({
          id: Math.random().toString(36).substring(7),
          file: processedFile,
          previewUrl,
          progress: 0,
          status: "pending",
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setIsProcessing(false);
    },
    [setFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".png", ".jpg", ".webp"],
      "video/*": [".mp4", ".ts", ".mov"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB max
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx !== -1) {
        URL.revokeObjectURL(prev[idx].previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors ${
          isDragActive
            ? "border-accent bg-accent/10"
            : "border-border hover:border-border-strong hover:bg-surface-2"
        }`}
      >
        <input {...getInputProps()} />
        <span className="text-3xl opacity-60">
          {isProcessing ? "⏳" : "☁️"}
        </span>
        <p className="mt-3 text-center text-[13px] font-medium text-text-secondary">
          {isProcessing
            ? "Đang xử lý ảnh nhỏ lại..."
            : isDragActive
              ? "Thả file vào đây..."
              : "Thả ảnh/video vào đây, hoặc click để chọn"}
        </p>
        <p className="mt-1 text-center text-[10px] text-text-muted">
          Ảnh tối đa 5MB, Video tối đa 50MB
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {files.map((f) => (
            <div
              key={f.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2"
            >
              {f.file.type.startsWith("image/") ? (
                <img
                  src={f.previewUrl}
                  alt="preview"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <video
                  src={f.previewUrl}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              )}
              {f.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-white">
                    {Math.round(f.progress)}%
                  </div>
                </div>
              )}
              {f.status !== "uploading" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-[10px] leading-none text-white backdrop-blur transition hover:bg-red-500/80"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
