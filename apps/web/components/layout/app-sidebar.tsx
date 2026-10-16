"use client";

import {
  CircleDollarSign,
  Gauge,
  Landmark,
  ListChecks,
  Settings,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@flowmoney/ui/lib/utils";

const navigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: Gauge,
  },
  {
    label: "Current Funds",
    href: "/accounts",
    icon: WalletCards,
  },
  {
    label: "Expected Income",
    href: "/income",
    icon: CircleDollarSign,
  },
  {
    label: "Obligations",
    href: "/obligations",
    icon: ListChecks,
  },
  {
    label: "Scenarios",
    href: "/scenarios",
    icon: Landmark,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="text-xl font-semibold tracking-tight">
            FlowMoney
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

      </aside>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden">
        {navigation.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-0.5 py-2 text-[9px] font-medium sm:text-[10px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="max-w-full truncate">{item.label === "Overview" ? "Home" : item.label === "Current Funds" ? "Funds" : item.label === "Expected Income" ? "Income" : item.label === "Obligations" ? "Bills" : item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
