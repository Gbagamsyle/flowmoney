import Link from "next/link";
import { FlowMoneyLogo } from "@/components/brand/flowmoney-logo";

export function SiteHeader() {
  return (
    <header className="bg-[#f7faf8]">
      <div className="mx-auto flex w-full max-w-[1000px] flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-2 md:px-0 md:py-3">
        <Link
          href="/"
          aria-label="FlowMoney home"
          className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          <FlowMoneyLogo className="block h-auto w-36 sm:w-40" />
        </Link>
        <nav
          aria-label="Page navigation"
          className="order-3 flex w-full items-center justify-center gap-8 pb-1 text-sm text-slate-800 md:order-none md:w-auto md:pb-0"
        >
          <Link
            href="#how-it-works"
            className="rounded-sm hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            How it works
          </Link>
          <Link
            href="#why-flowmoney"
            className="rounded-sm hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            Why FlowMoney
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-4 text-sm text-slate-900 sm:gap-6">
          <Link
            href="/signin"
            className="inline-flex min-w-20 items-center justify-center rounded-md border border-slate-500 px-4 py-2 font-medium hover:border-emerald-800 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-slate-500 px-4 py-2 font-medium hover:border-emerald-800 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}