"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  {
    href: "/",
    label: "Cá nhân",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <nav className="fixed inset-x-0 bottom-5 z-40 mx-auto w-[min(400px,88vw)]">
      <div className="glass-card glow-accent flex items-center gap-1 rounded-full p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-active"
                  className="absolute inset-0 rounded-full bg-accent/15"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span
                className={`relative z-10 transition-colors ${
                  isActive ? "text-accent" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`relative z-10 transition-colors ${
                  isActive ? "text-accent" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
