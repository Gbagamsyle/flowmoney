import Link from "next/link";
import { FlowMoneyLogo } from "@/components/brand/flowmoney-logo";

export function SiteFooter() {
  return (
    <footer className="bg-white">
      <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-0">
        <Link
          href="/"
          aria-label="FlowMoney home"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          <FlowMoneyLogo className="block h-auto w-32" />
        </Link>
        <p className="text-xs text-slate-500">Privacy and Terms links pending.</p>
      </div>
    </footer>
  );
}