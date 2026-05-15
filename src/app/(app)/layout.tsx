import type { ReactNode } from "react";
import TabNav from "@/components/layout/TabNav";
import CreateMemoryModal from "@/components/memory/CreateMemoryModal";
import EffectsLayer from "@/components/ui/EffectsLayer";
import { getCurrentUser } from "@/lib/supabase/queries/rooms";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="relative min-h-dvh">
      <EffectsLayer />
      {children}
      <TabNav />
      <CreateMemoryModal />
    </div>
  );
}
