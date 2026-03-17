import type { ReactNode } from "react";
import TabNav from "@/components/layout/TabNav";
import AppHeader from "@/components/layout/AppHeader";
import CreateMemoryModal from "@/components/memory/CreateMemoryModal";
import EffectsLayer from "@/components/ui/EffectsLayer";
import { getCurrentUser } from "@/lib/supabase/queries/rooms";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="relative min-h-dvh pb-40">
      <EffectsLayer />
      <AppHeader user={user} />
      {children}
      <TabNav />
      <CreateMemoryModal />
    </div>
  );
}
