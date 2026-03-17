import { useMemo, useRef, useState } from "react";
import type { RoomPlanRecord } from "@/lib/types";
import PlanNoteCard from "./PlanNoteCard";
import {
  PLAN_BUCKETS,
  TILTS,
  TAPE_PATTERN,
  formatDate,
  iconFromTitle,
  getPlanColorTheme,
  parsePlanDescription,
} from "./plansJournalConfig";
import type { PlanBucket } from "./plansJournalConfig";

type Props = {
  plansByBucket: Map<PlanBucket, RoomPlanRecord[]>;
  onOpenPlan: (planId: string) => void;
};

export default function PlanNotesCarousel({
  plansByBucket,
  onOpenPlan,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const bucketData = useMemo(
    () =>
      PLAN_BUCKETS.map((bucket) => ({
        ...bucket,
        plans: plansByBucket.get(bucket.key) ?? [],
      })),
    [plansByBucket],
  );

  const handleTabClick = (index: number) => {
    setActiveIndex(Math.min(Math.max(index, 0), bucketData.length - 1));
  };

  const goPrev = () => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  };

  const goNext = () => {
    setActiveIndex((prev) => Math.min(prev + 1, bucketData.length - 1));
  };

  const activeBucket = bucketData[activeIndex];

  return (
    <div className="relative z-10">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={activeIndex === 0}
          className="h-8 w-8 flex-shrink-0 rounded-full border border-[#d6c7b1] bg-white/80 text-sm text-[#7d6245] disabled:opacity-35"
          aria-label="Khung trước"
        >
          ◀
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {bucketData.map((bucket, idx) => (
            <button
              key={bucket.key}
              type="button"
              onClick={() => handleTabClick(idx)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                idx === activeIndex
                  ? "border-[#8f7e66] bg-white text-[#523a23] shadow-sm"
                  : "border-[#d6c7b1] bg-white/70 text-[#7d6245]"
              }`}
            >
              {bucket.icon} {bucket.key}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={activeIndex === bucketData.length - 1}
          className="h-8 w-8 flex-shrink-0 rounded-full border border-[#d6c7b1] bg-white/80 text-sm text-[#7d6245] disabled:opacity-35"
          aria-label="Khung sau"
        >
          ▶
        </button>
      </div>

      <div className="px-0.5">
        <section
          key={activeBucket.key}
          className="w-full"
          style={{ touchAction: "pan-y" }}
          onTouchStart={(event) => {
            const touch = event.changedTouches[0];
            if (touch)
              touchRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchCancel={() => {
            touchRef.current = null;
          }}
          onTouchEnd={(event) => {
            const start = touchRef.current;
            touchRef.current = null;
            if (!start) return;
            const touch = event.changedTouches[0];
            if (!touch) return;
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;

            if (Math.abs(deltaX) < 36) return;
            if (Math.abs(deltaY) > Math.abs(deltaX) * 0.8) return;

            if (deltaX > 0) {
              goPrev();
            } else {
              goNext();
            }
          }}
        >
          <div
            className="mb-2 rounded-t-md border-b-[3px] p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,.06)]"
            style={{
              background: activeBucket.hdr,
              borderBottomColor: activeBucket.tape,
            }}
          >
            <div className="mb-1 text-xl">{activeBucket.icon}</div>
            <div
              className="text-base font-bold"
              style={{ color: activeBucket.accent }}
            >
              {activeBucket.key}
            </div>
            <div className="text-xs text-black/45">{activeBucket.sub}</div>
          </div>

          <div className="space-y-3 pb-1">
            {activeBucket.plans.length === 0 ? (
              <div className="rounded-md border border-[#dccbb3] bg-white/45 px-3 py-5 text-center text-xs text-[#9b7a59]">
                Chưa có dự định
              </div>
            ) : (
              activeBucket.plans.map((plan, idx) => {
                const parsed = parsePlanDescription(plan.description);
                const visual = getPlanColorTheme(`${plan.id}:${plan.title}`);
                return (
                  <PlanNoteCard
                    key={plan.id}
                    plan={plan}
                    tilt={TILTS[idx % TILTS.length]}
                    tape={TAPE_PATTERN(activeBucket.tape)}
                    background={
                      plan.is_completed
                        ? "linear-gradient(145deg,#fff,#f8f8f8)"
                        : visual.card
                    }
                    accent={visual.accent}
                    icon={iconFromTitle(plan.title)}
                    dateLabel={formatDate(plan.created_at)}
                    descriptionText={parsed.text}
                    onOpen={onOpenPlan}
                  />
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
