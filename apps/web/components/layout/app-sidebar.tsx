"use client";

import {
  CalendarDays,
  Calculator,
  CircleDollarSign,
  FileText,
  House,
  Landmark,
  ListChecks,
  Settings,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@flowmoney/ui/lib/utils";
import { BrandMark } from "@/components/brand-mark";

const navigationGroups = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: House },
      { label: "Planning", href: "/planning", icon: CalendarDays },
      { label: "Statements", href: "/statements", icon: FileText },
      { label: "Scenarios", href: "/scenarios", icon: Landmark },
    ],
  },
  {
    label: "Your money",
    items: [
      { label: "Current Funds", href: "/accounts", icon: WalletCards },
      { label: "Expected Income", href: "/income", icon: CircleDollarSign },
      { label: "Obligations", href: "/obligations", icon: ListChecks },
    ],
  },
  {
    label: "Tools",
    items: [{ label: "Calculator", href: "/calculator", icon: Calculator }],
  },
];
const settingsItem = { label: "Settings", href: "/settings", icon: Settings };
const navigation = [
  ...navigationGroups.flatMap((group) => group.items),
  settingsItem,
];

export function AppSidebar() {
  const pathname = usePathname();
  const desktopLink = (item: (typeof navigation)[number]) => {
    const active = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        data-tour-href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary-ink"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center">
            <BrandMark
              className="gap-2"
              iconClassName="size-8"
              textClassName="text-lg font-semibold tracking-tight"
            />
          </Link>
        </div>

        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-6 overflow-y-auto p-4"
        >
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">{group.items.map(desktopLink)}</div>
            </div>
          ))}
        </nav>
        <div className="border-t p-4">{desktopLink(settingsItem)}</div>
      </aside>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch overflow-x-auto border-t bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden"
      >
        {navigation.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour-href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "flex min-w-[4rem] flex-1 flex-col items-center gap-1 rounded-md px-0.5 py-2 text-[9px] font-medium sm:text-[10px]",
                active ? "text-primary-ink" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="max-w-full truncate">
                {item.label === "Overview"
                  ? "Home"
                  : item.label === "Current Funds"
                    ? "Funds"
                    : item.label === "Expected Income"
                      ? "Income"
                      : item.label === "Obligations"
                        ? "Bills"
                        : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
