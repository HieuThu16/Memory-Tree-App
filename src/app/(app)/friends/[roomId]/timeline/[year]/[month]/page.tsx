import { redirect } from "next/navigation";

export default async function RedirectToRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  redirect(`/friends/${roomId}`);
}
