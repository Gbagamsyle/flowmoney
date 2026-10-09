import { FeatureStrip } from "@/components/landing/feature-strip";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FlowMoneyIllustration } from "@/components/brand/flowmoney-illustration";

export default function Home() {
  return (
    <div className="min-h-svh bg-white text-[#0a2522]">
      <SiteHeader />
      <main>
        <section className="bg-[#f7faf8]">
          <div className="mx-auto grid max-w-[1000px] items-center gap-7 px-5 py-8 md:grid-cols-[0.9fr_1.1fr] md:gap-8 md:px-0 md:py-10">
            <div className="flex flex-col items-start">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#13816c]">
                FOR LIFE WITH IRREGULAR INCOME
              </p>
              <h1 className="mt-3 max-w-[460px] text-5xl leading-[1.02] font-bold text-[#082421] md:text-[64px]">
                More clarity. Less money guesswork.
              </h1>
              <p className="mt-4 max-w-[430px] text-xl leading-[1.35] text-slate-600">
                Know what you can safely spend, even when payday changes.
              </p>
              <WaitlistForm />
            </div>
            <figure className="mx-auto w-full max-w-[590px] md:ml-auto">
              <FlowMoneyIllustration />
              <figcaption className="mt-1 text-center text-sm text-slate-600">
                Your money. A clearer plan.
              </figcaption>
            </figure>
          </div>
        </section>
        <FeatureStrip />
        <section
          id="why-flowmoney"
          className="scroll-mt-6 bg-[#e8f6f0] px-5 py-5 text-center"
        >
          <h2 className="text-lg font-bold text-[#102a27]">
            A plan for your money. Not a place to keep it.
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            FlowMoney does not hold or move your funds.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
