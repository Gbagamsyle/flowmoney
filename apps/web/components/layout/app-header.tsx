import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:justify-end lg:px-8">
      <Link href="/dashboard" aria-label="FlowMoney dashboard" className="lg:hidden">
        <BrandMark className="gap-2" iconClassName="size-8" textClassName="text-base font-semibold" />
      </Link>
      <UserButton />
    </header>
  );
}
