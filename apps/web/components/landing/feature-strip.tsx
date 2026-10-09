import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Wallet,
} from "lucide-react";

export function FeatureStrip() {
  return (
    <section
      id="how-it-works"
      aria-label="How FlowMoney helps"
      className="scroll-mt-6 border-t border-slate-100 bg-white"
    >
      <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-6 px-5 py-7 md:grid-cols-3 md:gap-0 md:px-0">
        <article className="flex gap-4 border-b border-slate-100 pb-5 md:border-r md:border-b-0 md:px-8 md:pl-0 md:pb-0">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#e9f7f1] text-[#087363]">
            <Wallet aria-hidden="true" focusable="false" size={32} strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              See what is available
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Get a clear view of your current funds, so you know what you can
              safely spend.
            </p>
          </div>
        </article>
        <article className="flex gap-4 border-b border-slate-100 pb-5 md:border-r md:border-b-0 md:px-8 md:pb-0">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#e9f7f1] text-[#087363]">
            <CalendarDays aria-hidden="true" focusable="false" size={32} strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Protect what matters
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Keep track of upcoming bills and essentials, even when income is
              unpredictable.
            </p>
          </div>
        </article>
        <article className="flex gap-4 md:px-8 md:pr-0">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#f0edff] text-[#087363]">
            <ChartNoAxesColumnIncreasing
              aria-hidden="true"
              focusable="false"
              size={32}
              strokeWidth={1.8}
            />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Plan for what is next
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Build a plan that adapts to changing income, so you can move
              forward with confidence.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}