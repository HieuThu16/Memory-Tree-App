import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/queries/rooms";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const inviteCode = resolvedSearchParams.code?.trim().toUpperCase();

  if (!inviteCode) {
    return (
      <main className="px-4 py-10 sm:px-6">
        <section className="mx-auto max-w-xl">
          <div className="glass-card rounded-[32px] p-6 text-center sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-accent">
              Lời mời nhanh
            </p>
            <h1 className="mt-3 text-3xl text-foreground">Thiếu mã mời</h1>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Link mời này chưa có mã phòng. Hãy mở lại link đầy đủ hoặc nhập mã
              trực tiếp ở khu vườn chung.
            </p>
            <Link
              href="/friends"
              className="btn-primary mt-6 inline-flex px-5 py-3 text-sm"
            >
              Mở khu vườn chung
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(
      `/login?redirectedFrom=${encodeURIComponent(`/join?code=${inviteCode}`)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: roomId, error: joinError } = await supabase.rpc(
    "join_room_by_code",
    {
      invite_code_input: inviteCode,
    },
  );

  const friendlyMessage = joinError?.message.includes("chính khu vườn mình tạo")
    ? joinError.message
    : joinError?.message.includes("đủ 2 người")
      ? "Khu vườn này đã đủ 2 người, không thể tham gia thêm."
      : null;

  if (joinError || !roomId) {
    return (
      <main className="px-4 py-10 sm:px-6">
        <section className="mx-auto max-w-xl">
          <div className="glass-card rounded-[32px] p-6 text-center sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-accent">
              Lời mời nhanh
            </p>
            <h1 className="mt-3 text-3xl text-foreground">
              Mã mời không hợp lệ
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {friendlyMessage ? (
                friendlyMessage
              ) : (
                <>
                  Mã{" "}
                  <span className="font-mono font-semibold text-accent">
                    {inviteCode}
                  </span>{" "}
                  không tồn tại hoặc đã hết hiệu lực.
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/friends"
                className="btn-primary inline-flex px-5 py-3 text-sm"
              >
                Đi tới khu vườn chung
              </Link>
              <Link
                href="/login"
                className="btn-secondary inline-flex px-5 py-3 text-sm"
              >
                Đăng nhập lại
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  redirect(`/friends/${roomId}`);
}
