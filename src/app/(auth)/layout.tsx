import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-xl">{children}</div>
    </main>
  );
}
