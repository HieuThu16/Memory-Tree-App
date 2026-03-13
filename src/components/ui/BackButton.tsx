"use client";

import Link from "next/link";

type BackButtonProps = {
  label?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  title?: string;
};

const baseClassName =
  "inline-flex items-center gap-1 rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-accent hover:text-accent";

function ArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function BackButton({
  label = "Quay lại",
  href,
  onClick,
  className = "",
  title,
}: BackButtonProps) {
  const mergedClassName = `${baseClassName} ${className}`.trim();
  const displayTitle = title ?? label;

  if (href) {
    return (
      <Link
        href={href}
        prefetch={true}
        className={mergedClassName}
        title={displayTitle}
      >
        <ArrowIcon />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={mergedClassName}
      title={displayTitle}
      aria-label={displayTitle}
    >
      <ArrowIcon />
      <span>{label}</span>
    </button>
  );
}
