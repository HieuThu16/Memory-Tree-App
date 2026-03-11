import { getUserRooms } from "@/lib/supabase/queries/rooms";
import ClientFriendsSection from "./ClientFriendsSection";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const rooms = await getUserRooms();

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
        <ClientFriendsSection initialRooms={rooms} />
      </section>
    </main>
  );
}
