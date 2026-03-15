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
  {
    href: "/plans",
    label: "Dự định",
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
        <path d="M7 20h10" />
        <path d="M12 20v-8" />
        <path d="M12 12c-3.5 0-6-2.5-6-6 0 6 6 6 6 6z" />
        <path d="M12 12c3.5 0 6-2.5 6-6 0 6-6 6-6 6z" />
      </svg>
    ),
  },
  {
    href: "/countdown",
    label: "Đếm ngược",
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
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M5 3L2 6" />
        <path d="M22 6l-3-3" />
        <path d="M12 2v2" />
      </svg>
    ),
  },
  {
    href: "/music",
    label: "Nhạc",
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
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
];

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed inset-x-0 z-50 mx-auto w-[min(480px,calc(100vw-0.9rem))] pb-2"
      style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex justify-between gap-1 rounded-[2rem] border border-white/60 bg-white/40 p-2 shadow-[0_12px_40px_-16px_rgba(124,92,230,0.4)] backdrop-blur-2xl">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[1.5rem] py-2 transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-tr from-accent to-accent-soft text-white shadow-[0_4px_12px_rgba(124,92,230,0.4)] scale-105"
                  : "text-text-secondary hover:bg-white/60 hover:scale-105"
              }`}
            >
              <span className="scale-110 mb-0.5">{tab.icon}</span>
              <span className="text-[9px] font-bold tracking-wide">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
