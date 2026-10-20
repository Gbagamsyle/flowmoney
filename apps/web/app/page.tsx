import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, CircleDollarSign, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { buttonVariants } from "@flowmoney/ui/components/button";
import { BrandMark } from "@/components/brand-mark";

const steps = [
  {
    number: "01",
    title: "See the real picture",
    description:
      "Get a clear snapshot of your accounts, expected income, and obligations in one place.",
  },
  {
    number: "02",
    title: "Plan around reality",
    description:
      "Model cash flow across weeks and months instead of pretending income is evenly distributed.",
  },
  {
    number: "03",
    title: "Spend with confidence",
    description:
      "Know exactly what is safe to spend before the next invoice, payment, or bill lands.",
  },
];

const capabilities = [
  {
    icon: CircleDollarSign,
    title: "Money visibility",
    text: "Track what you have, what is incoming, and what is already committed.",
  },
  {
    icon: TrendingUp,
    title: "Income-aware planning",
    text: "Build plans around seasonal work, contract income, and uneven cash flow.",
  },
  {
    icon: ShieldCheck,
    title: "Boundary-setting",
    text: "Protect essentials first and see your runway before making new commitments.",
  },
  {
    icon: Sparkles,
    title: "Clear financial rhythm",
    text: "Turn noisy monthly finance into a calm, repeatable spending plan.",
  },
];

const audiences = [
  "Freelancers",
  "Contractors",
  "Creators",
  "Consultants",
  "Small business owners",
  "Anyone with irregular income",
];

const scenarios = [
  "A slower month after a large client payment",
  "Seasonal work with uneven inflows",
  "Higher obligations before the next invoice lands",
  "Saving for taxes, travel, and business costs without guessing",
];

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-5 lg:py-6">
          <Link href="/" className="flex items-center text-foreground">
            <BrandMark className="gap-3" iconClassName="size-9" textClassName="text-base" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <Link href="#how-it-works" className="transition hover:text-foreground">
              How it works
            </Link>
            <Link href="#why-flowmoney" className="transition hover:text-foreground">
              Why FlowMoney
            </Link>
            <Link href="#for-you" className="transition hover:text-foreground">
              Who it&apos;s for
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className: "h-9 px-4 text-sm",
              })}
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="-mx-4 pb-8 pt-2 sm:-mx-6 sm:pb-12 lg:-mx-8 lg:min-h-[calc(100vh-96px)] lg:pb-0 lg:pt-0">
          <div className="grid min-h-[calc(100vh-140px)] items-end gap-8 lg:min-h-[calc(100vh-96px)] lg:grid-cols-[0.48fr_0.52fr] lg:gap-0">
            <div className="flex max-w-[500px] flex-col justify-center px-4 pb-2 sm:px-6 lg:pb-10 lg:pl-8 lg:pr-8">
              <p
                className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Personal finance for irregular income
              </p>

              <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.07em] text-foreground sm:text-5xl lg:text-[5.1rem]">
                Calm money
                <span className="mt-2 block text-foreground/70">for real life.</span>
              </h1>

              <p className="mt-6 max-w-[30rem] text-base leading-7 text-muted-foreground sm:text-lg">
                FlowMoney helps you understand your cash flow, protect what matters, and
                spend with confidence — even when income is unpredictable.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/sign-up"
                  className={buttonVariants({
                    variant: "default",
                    size: "lg",
                    className: "h-11 px-5 text-sm shadow-[0_18px_30px_rgba(17,24,39,0.12)]",
                  })}
                >
                  Get started
                </Link>

                <Link
                  href="/sign-in"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "h-11 px-5 text-sm",
                  })}
                >
                  Sign in
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-foreground" />
                  Built for irregular income
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-foreground" />
                  See what&apos;s safe to spend
                </div>
              </div>
            </div>

            <div className="relative lg:ml-0 lg:flex lg:justify-end">
              <div className="absolute -left-5 top-8 h-28 w-28 rounded-full bg-foreground/8 blur-3xl" />
              <div className="absolute -bottom-8 right-4 h-32 w-32 rounded-full bg-foreground/8 blur-3xl" />

              <div className="relative overflow-hidden bg-[#111111] lg:h-[calc(100vh-96px)] lg:w-full">
                <Image
                  src="/flow2.jpg"
                  alt="Person managing finances on a laptop and phone"
                  priority
                  width={1000}
                  height={1200}
                  className="h-[560px] w-full object-cover object-center sm:h-[640px] lg:h-full lg:w-full lg:object-[center_18%]"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="why-flowmoney" className="border-t border-border py-12 sm:py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
            <div>
              <p
                className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Why FlowMoney
              </p>
              <h2 className="mt-5 max-w-md text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
                Most people don&apos;t need more budgeting.
                <span className="block text-foreground/70">They need clarity.</span>
              </h2>
            </div>

            <div className="space-y-5 text-base leading-7 text-muted-foreground sm:text-lg">
              <p>
                Irregular income creates a different problem than a regular paycheck. It is
                not just about saving more - it is about seeing what is actually available,
                what is coming, and what can safely be spent without creating stress later.
              </p>
              <p>
                FlowMoney gives you a grounded view of your cash flow so you can feel in
                control even when the month is messy, seasonal, or uneven.
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-border py-12 sm:py-16 lg:py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p
                className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                How it works
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
                A simpler system for changing income.
              </h2>
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-[28px] border border-border bg-card p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]"
              >
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {step.number}
                </p>
                <h3 className="mt-5 text-2xl font-medium tracking-[-0.05em] text-foreground">
                  {step.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border py-12 sm:py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
            <div>
              <p
                className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Core capabilities
              </p>
              <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
                Financial clarity without the spreadsheet chaos.
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-[24px] border border-border bg-muted/30 p-5">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="text-xl font-medium tracking-[-0.04em] text-foreground">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="for-you" className="border-t border-border py-12 sm:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-12">
            <div className="rounded-[32px] border border-border bg-foreground p-6 text-background sm:p-8">
              <p
                className="text-[11px] font-medium uppercase tracking-[0.22em] text-background/70"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Who it&apos;s for
              </p>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-background sm:text-4xl">
                Built for people with work that does not look the same every month.
              </h2>
              <div className="mt-8 flex flex-wrap gap-2">
                {audiences.map((audience) => (
                  <span
                    key={audience}
                    className="rounded-full border border-background/20 bg-background/5 px-3 py-2 text-sm text-background/85"
                  >
                    {audience}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[32px] border border-border bg-card p-6 sm:p-8">
              <div>
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Why it matters
                </p>
                <h3 className="mt-5 text-2xl font-medium tracking-[-0.05em] text-foreground">
                  Stability comes from planning around your actual cash flow, not an idealized paycheck.
                </h3>
              </div>

              <div className="mt-8 space-y-4">
                {[
                  "Know what your essentials really cost.",
                  "Avoid over-spending before the next payment arrives.",
                  "Build a calmer rhythm into your financial life.",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3">
                    <span className="mt-1 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-3" />
                    </span>
                    <p className="text-base leading-6 text-muted-foreground">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-12 sm:py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.98fr_1.02fr] lg:gap-10">
            <div className="rounded-[32px] border border-border bg-muted/30 p-6 sm:p-8">
              <p
                className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Safe-to-spend
              </p>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
                Know what you can actually use right now.
              </h2>

              <div className="mt-8 rounded-[24px] border border-border bg-background p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Available now
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-foreground">
                      $1,480
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Safe amount
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    "Essential bills protected",
                    "Upcoming obligations accounted for",
                    "Minimum buffer retained",
                  ].map((item) => (
                    <div key={item} className="flex items-center justify-between gap-4 border-t border-border pt-3">
                      <span className="text-sm text-muted-foreground">{item}</span>
                      <span className="text-sm font-medium text-foreground">Yes</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Scenario planning
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
                  Prepare for the real shape of your month.
                </h2>
              </div>

              <div className="space-y-3">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario}
                    className="flex items-start gap-3 rounded-[22px] border border-border bg-card p-4"
                  >
                    <span className="mt-1 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                      <ArrowRight className="size-3" />
                    </span>
                    <p className="text-base leading-6 text-muted-foreground">{scenario}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-12 sm:py-16 lg:py-20">
          <div className="rounded-[32px] border border-border bg-card p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Product philosophy
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
                  Financial systems should feel supportive, not stressful.
                </h2>
              </div>

              <div className="space-y-5 text-base leading-7 text-muted-foreground sm:text-lg">
                <p>
                  FlowMoney is designed to reduce uncertainty, not add more complexity. It
                  focuses on what matters most: your current reality, upcoming obligations,
                  and the money you can safely use.
                </p>
                <p>
                  When your income is irregular, the goal is not perfection - it is calm,
                  grounded decision-making.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col items-center justify-center rounded-[32px] border border-border bg-foreground px-6 py-12 text-center text-background sm:px-10 lg:px-16">
            <p
              className="text-[11px] font-medium uppercase tracking-[0.22em] text-background/70"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Start with clarity
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.06em] text-background sm:text-4xl lg:text-5xl">
              Build a money plan that fits the life you actually live.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                  className: "h-11 border-white/20 bg-background text-foreground hover:bg-background/90",
                })}
              >
                Get started
              </Link>
              <Link
                href="/sign-in"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-11 border-white/20 bg-transparent text-background hover:bg-white/5 hover:text-background",
                })}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-5 border-t border-border py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <BrandMark className="gap-3" iconClassName="size-7" textClassName="text-sm" />

          <div className="flex items-center gap-5">
            <Link href="#how-it-works" className="transition hover:text-foreground">
              How it works
            </Link>
            <Link href="#why-flowmoney" className="transition hover:text-foreground">
              Why FlowMoney
            </Link>
            <Link href="/sign-in" className="transition hover:text-foreground">
              Sign in
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
