import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserRooms } from "@/lib/supabase/queries/rooms";
import NatureParticles from "@/components/ui/NatureParticles";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rooms = await getUserRooms();

  if (!rooms.length) {
    return (
      <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4 relative min-h-screen">
        <NatureParticles />
        <section className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4 relative z-10">
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <h1 className="text-base font-semibold text-foreground">Dự định</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Bạn chưa có phòng chung nào. Vào tab Bạn bè để tạo hoặc tham gia
              phòng.
            </p>
            <Link
              href="/friends"
              className="mt-3 inline-flex rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary"
            >
              Mở tab Bạn bè
            </Link>
          </div>
        </section>
      </main>
    );
  }

  redirect(`/plans/${rooms[0].id}`);
}
