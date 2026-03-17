import type { RoomPlanRecord } from "@/lib/types";

type Props = {
  plan: RoomPlanRecord;
  tilt: number;
  tape: string;
  background: string;
  accent: string;
  icon: string;
  dateLabel: string;
  descriptionText: string;
  onOpen: (planId: string) => void;
};

export default function PlanNoteCard({
  plan,
  tilt,
  tape,
  background,
  accent,
  icon,
  dateLabel,
  descriptionText,
  onOpen,
}: Props) {
  return (
    <div
      style={{
        ["--tilt" as string]: `${tilt}deg`,
        animation: "paperReveal .45s ease both",
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(plan.id)}
        className="relative block w-full rounded-md border border-[#e8dcc9] p-3 text-center shadow-[2px_3px_10px_rgba(0,0,0,.1)] transition-transform hover:scale-[1.02]"
        style={{
          transform: `rotate(${tilt}deg)`,
          background,
        }}
      >
        <div
          className="absolute -top-2 left-1/2 h-4 w-9 -translate-x-1/2 rounded-sm opacity-95"
          style={{ background: tape }}
        />
        <div className="mb-1 text-lg">{icon}</div>
        <div
          className={`line-clamp-2 text-[13px] font-bold leading-snug ${
            plan.is_completed ? "text-[#8f7d67] line-through" : "text-[#3a2010]"
          }`}
        >
          {plan.title}
        </div>
        <div className="mt-1 text-[11px] italic" style={{ color: accent }}>
          {dateLabel}
        </div>
        {descriptionText ? (
          <div className="mt-1 line-clamp-1 text-[11px] text-[#6d4b2d]/80">
            {descriptionText}
          </div>
        ) : null}
      </button>
    </div>
  );
}
