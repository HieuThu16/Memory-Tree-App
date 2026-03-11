"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Cá nhân",
    emoji: "🌸",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
        <path d="M12 8c-2 0-3 1.5-3 3s1 3 3 3 3-1.5 3-3-1-3-3-3z" />
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
  },
  {
    href: "/friends",
    label: "Bạn bè",
    emoji: "🌿",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-2 z-40 mx-auto w-[min(320px,calc(100vw-1rem))]">
      <div className="mx-auto grid grid-cols-2 gap-0.5 rounded-2xl border border-white/60 bg-white/92 p-1 shadow-[0_14px_32px_-20px_rgba(71,54,126,0.36)] backdrop-blur-md">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                isActive
                  ? "bg-accent text-white shadow-[0_10px_20px_-14px_rgba(108,76,215,0.9)]"
                  : "text-text-muted hover:bg-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
