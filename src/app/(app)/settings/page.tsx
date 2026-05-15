import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/queries/rooms";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4 animate-fade-in-up">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          ⚙️ Cài đặt
        </h1>
        <SettingsClient user={user} />
      </section>
    </main>
  );
}
